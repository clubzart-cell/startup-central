import { useState, useEffect } from 'react';
import { loadingManager } from '@/lib/loading-manager';

export function useGlobalLoading(key: string) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = loadingManager.subscribe(() => {
      setIsLoading(loadingManager.getLoading(key));
    });

    return () => {
      unsubscribe();
    };
  }, [key]);

  const setLoading = (loading: boolean) => {
    loadingManager.setLoading(key, loading);
  };

  return [isLoading, setLoading] as const;
}
