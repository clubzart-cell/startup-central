import { requestDeduplicator } from './request-deduplicator';

// Simple in-memory cache with TTL
class QueryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any, ttl = this.TTL) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  // Get cached data or fetch with deduplication
  async getCached<T>(
    key: string, 
    fetcher: () => Promise<T>,
    ttl = this.TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.get(key);
    if (cached) return cached;

    // Deduplicate concurrent requests
    return requestDeduplicator.dedupe(key, async () => {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    });
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();
