import { requestDeduplicator } from './request-deduplicator';
import { persistentCache } from './persistent-cache';
import { crossDeviceCoordinator } from './cross-device-coordinator';

class QueryCache {
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = Promise.all([
      persistentCache.init(),
      crossDeviceCoordinator.init()
    ]).then(() => {});

    return this.initPromise;
  }

  async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 5 * 60 * 1000,
    options: {
      staleWhileRevalidate?: boolean;
      coordinateAcrossDevices?: boolean;
    } = {}
  ): Promise<T> {
    await this.init();

    const {
      staleWhileRevalidate = true,
      coordinateAcrossDevices = true
    } = options;

    // Try to get from cache
    const cached = await persistentCache.get(key);

    if (cached) {
      if (!cached.isStale) {
        // Fresh data, return immediately
        return cached.data;
      }

      if (staleWhileRevalidate) {
        // Return stale data immediately, fetch fresh in background
        this.refreshInBackground(key, fetcher, ttl, coordinateAcrossDevices);
        return cached.data;
      }
    }

    // No cache or stale-while-revalidate disabled - fetch now
    return this.fetchAndCache(key, fetcher, ttl, coordinateAcrossDevices);
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    coordinateAcrossDevices: boolean
  ): Promise<T> {
    // Deduplicate within this device
    return requestDeduplicator.dedupe(key, async () => {
      let data: T;

      if (coordinateAcrossDevices) {
        // Coordinate with other devices
        data = await crossDeviceCoordinator.coordinateRequest(key, fetcher);
      } else {
        data = await fetcher();
      }

      await persistentCache.set(key, data, ttl);
      return data;
    });
  }

  private refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    coordinateAcrossDevices: boolean
  ) {
    // Fetch in background, don't await
    this.fetchAndCache(key, fetcher, ttl, coordinateAcrossDevices).catch(err => {
      console.error(`Background refresh failed for ${key}:`, err);
    });
  }

  async invalidate(pattern: string) {
    await persistentCache.invalidate(pattern);
  }

  async clear() {
    await persistentCache.clear();
  }
}

export const queryCache = new QueryCache();
