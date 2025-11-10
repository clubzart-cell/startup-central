interface QueuedRequest<T> {
  key: string;
  priority: number;
  fetcher: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private activeRequests = 0;
  private maxConcurrent = 10; // Process max 10 requests at once

  async enqueue<T>(
    key: string,
    fetcher: () => Promise<T>,
    priority: number = 5
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        key,
        priority,
        fetcher,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Sort by priority (higher first), then by timestamp (older first)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Older first
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    if (this.activeRequests >= this.maxConcurrent) return;

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      this.activeRequests++;

      // Process request
      request.fetcher()
        .then(result => {
          request.resolve(result);
        })
        .catch(error => {
          request.reject(error);
        })
        .finally(() => {
          this.activeRequests--;
          this.processQueue(); // Process next in queue
        });
    }

    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();

// Priority levels
export const RequestPriority = {
  CRITICAL: 10,  // User session, profile
  HIGH: 8,       // Current workspace data
  MEDIUM: 5,     // Current page data (tasks, meetings)
  LOW: 3,        // Background data (notifications)
  LOWEST: 1      // Prefetch/analytics
};
