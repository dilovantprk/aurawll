/**
 * Vercel Speed Insights Integration
 * Tracks and reports web vitals and performance metrics
 */

/**
 * Injects Vercel Speed Insights into the application
 * This will track Core Web Vitals (LCP, FID, CLS, TTFB, INP)
 */
export async function initSpeedInsights() {
  try {
    // Import the Speed Insights package from CDN
    const { injectSpeedInsights } = await import('https://cdn.jsdelivr.net/npm/@vercel/speed-insights@2.0.0/dist/index.mjs');
    
    // Initialize Speed Insights with default configuration
    // Enable debug mode in development for easier testing
    injectSpeedInsights({
      debug: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      sampleRate: 1, // Sample 100% of events (adjust as needed for production)
    });
    
    console.log('✓ Vercel Speed Insights initialized');
  } catch (error) {
    console.warn('Speed Insights initialization failed:', error);
  }
}
