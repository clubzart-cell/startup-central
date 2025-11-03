export function measurePerformance(name: string) {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      
      // Alert if slow
      if (duration > 3000) {
        console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(0)}ms`);
      }
      
      return duration;
    }
  };
}
