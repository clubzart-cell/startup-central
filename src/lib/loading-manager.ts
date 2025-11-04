// Coordinate loading states to prevent UI flickering
class LoadingManager {
  private loadingStates = new Map<string, boolean>();
  private listeners = new Set<() => void>();

  setLoading(key: string, isLoading: boolean) {
    this.loadingStates.set(key, isLoading);
    this.notify();
  }

  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(Boolean);
  }

  getLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }
}

export const loadingManager = new LoadingManager();
