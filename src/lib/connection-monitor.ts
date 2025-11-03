let activeConnections = 0;
const MAX_CONNECTIONS = 45; // Leave headroom for connection pool

export function withConnectionLimit<T>(
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    // Wait if at connection limit
    while (activeConnections >= MAX_CONNECTIONS) {
      await new Promise(r => setTimeout(r, 100));
    }
    
    activeConnections++;
    
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      activeConnections--;
    }
  });
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, baseDelay * Math.pow(2, i))
      );
    }
  }
  throw new Error('Max retries exceeded');
}
