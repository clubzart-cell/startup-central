import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed
    const connection = (navigator as any).connection;
    if (connection) {
      const checkSpeed = () => {
        setIsSlowConnection(
          connection.effectiveType === '2g' || 
          connection.effectiveType === 'slow-2g'
        );
      };
      
      checkSpeed();
      connection.addEventListener('change', checkSpeed);
      
      return () => {
        connection.removeEventListener('change', checkSpeed);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlowConnection };
}
