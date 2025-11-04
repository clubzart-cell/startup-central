// Coordinate state across browser tabs using localStorage events
class TabSync {
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('tab-sync-')) {
        const eventName = e.key.replace('tab-sync-', '');
        const data = e.newValue ? JSON.parse(e.newValue) : null;
        
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
          callbacks.forEach(cb => cb(data));
        }
      }
    });
  }

  // Broadcast event to other tabs
  broadcast(event: string, data: any) {
    localStorage.setItem(`tab-sync-${event}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    // Clean up immediately (other tabs will catch the event)
    setTimeout(() => {
      localStorage.removeItem(`tab-sync-${event}`);
    }, 100);
  }

  // Listen for events from other tabs
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }
}

export const tabSync = new TabSync();
