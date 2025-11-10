import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDB extends DBSchema {
  'query-cache': {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
}

class PersistentCache {
  private db: IDBPDatabase<CacheDB> | null = null;
  private memoryCache = new Map<string, any>();
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      this.db = await openDB<CacheDB>('startup-central-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('query-cache')) {
            db.createObjectStore('query-cache', { keyPath: 'key' });
          }
        },
      });
    })();

    return this.initPromise;
  }

  async get(key: string): Promise<any> {
    // Check memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (Date.now() < cached.timestamp + cached.ttl) {
        return { data: cached.data, isStale: false };
      }
    }

    // Check IndexedDB
    await this.init();
    if (!this.db) return null;

    const cached = await this.db.get('query-cache', key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const isStale = age > cached.ttl;
    const isVeryStale = age > cached.ttl * 3; // 3x TTL = expired

    if (isVeryStale) {
      // Too old, delete it
      await this.delete(key);
      return null;
    }

    // Update memory cache
    this.memoryCache.set(key, cached);

    return {
      data: cached.data,
      isStale // true if stale but still usable
    };
  }

  async set(key: string, data: any, ttl = 5 * 60 * 1000) {
    const entry = {
      key,
      data,
      timestamp: Date.now(),
      ttl
    };

    // Set in memory cache
    this.memoryCache.set(key, entry);

    // Persist to IndexedDB
    await this.init();
    if (this.db) {
      await this.db.put('query-cache', entry);
    }
  }

  async delete(key: string) {
    this.memoryCache.delete(key);
    
    await this.init();
    if (this.db) {
      await this.db.delete('query-cache', key);
    }
  }

  async clear() {
    this.memoryCache.clear();
    
    await this.init();
    if (this.db) {
      await this.db.clear('query-cache');
    }
  }

  async invalidate(pattern: string) {
    // Clear matching keys from memory
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from IndexedDB
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('query-cache', 'readwrite');
    const store = tx.objectStore('query-cache');
    const keys = await store.getAllKeys();
    
    for (const key of keys) {
      if (key.includes(pattern)) {
        await store.delete(key);
      }
    }
    
    await tx.done;
  }
}

export const persistentCache = new PersistentCache();
