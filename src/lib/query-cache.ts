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
