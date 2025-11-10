import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PendingRequest {
  key: string;
  requesterId: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

class CrossDeviceCoordinator {
  private channel: RealtimeChannel | null = null;
  private deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  private pendingRequests = new Map<string, {
    promise: Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private activeRequests = new Map<string, PendingRequest>();

  async init() {
    this.channel = supabase.channel('request-coordinator', {
      config: {
        broadcast: { ack: true }
      }
    });

    // Listen for request announcements from other devices
    this.channel.on('broadcast', { event: 'request-start' }, (payload) => {
      const { key, requesterId, timestamp } = payload.payload as PendingRequest;
      
      // Another device started this request
      if (requesterId !== this.deviceId) {
        this.activeRequests.set(key, { key, requesterId, timestamp, status: 'pending' });
      }
    });

    // Listen for completed requests from other devices
    this.channel.on('broadcast', { event: 'request-complete' }, (payload) => {
      const { key, data, requesterId } = payload.payload as any;
      
      if (requesterId !== this.deviceId) {
        const pending = this.pendingRequests.get(key);
        if (pending) {
          pending.resolve(data);
          this.pendingRequests.delete(key);
        }
      }
      
      this.activeRequests.delete(key);
    });

    // Listen for failed requests
    this.channel.on('broadcast', { event: 'request-failed' }, (payload) => {
      const { key, requesterId } = payload.payload as any;
      
      if (requesterId !== this.deviceId) {
        this.activeRequests.delete(key);
      }
    });

    await this.channel.subscribe();
  }

  async coordinateRequest<T>(
    key: string,
    fetcher: () => Promise<T>,
    waitForOthers = true
  ): Promise<T> {
    // Check if another device is already fetching this
    const existingRequest = this.activeRequests.get(key);
    if (existingRequest && waitForOthers) {
      // Wait for the other device to complete
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(key, {
          promise: Promise.resolve(),
          resolve,
          reject
        });
        
        // Timeout after 5 seconds - fetch ourselves
        setTimeout(() => {
          if (this.pendingRequests.has(key)) {
            this.pendingRequests.delete(key);
            this.executeRequest(key, fetcher).then(resolve).catch(reject);
          }
        }, 5000);
      });
    }

    return this.executeRequest(key, fetcher);
  }

  private async executeRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Announce we're starting this request
    await this.channel?.send({
      type: 'broadcast',
      event: 'request-start',
      payload: {
        key,
        requesterId: this.deviceId,
        timestamp: Date.now(),
        status: 'pending'
      }
    });

    try {
      const data = await fetcher();
      
      // Broadcast the result
      await this.channel?.send({
        type: 'broadcast',
        event: 'request-complete',
        payload: {
          key,
          data,
          requesterId: this.deviceId,
          timestamp: Date.now()
        }
      });

      return data;
    } catch (error) {
      await this.channel?.send({
        type: 'broadcast',
        event: 'request-failed',
        payload: {
          key,
          requesterId: this.deviceId,
          error: String(error)
        }
      });
      throw error;
    }
  }

  destroy() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const crossDeviceCoordinator = new CrossDeviceCoordinator();
