/**
 * Polyfills for deprecated browser APIs
 */

// Extend Window interface to include deprecated styleMedia property
declare global {
  interface Window {
    styleMedia?: {
      type: string;
      matchMedium: (mediaQuery: string) => boolean;
    };
  }
}

// Fix for deprecated window.styleMedia API
// Some libraries still use window.styleMedia which was deprecated in favor of window.matchMedia
if (typeof window !== 'undefined' && !window.styleMedia && window.matchMedia) {
  // Create a polyfill that maps styleMedia calls to matchMedia
  Object.defineProperty(window, 'styleMedia', {
    value: {
      type: 'screen',
      matchMedium: (mediaQuery: string) => {
        console.warn(
          'window.styleMedia is deprecated. Use window.matchMedia instead.',
          'Query:', mediaQuery
        );
        return window.matchMedia(mediaQuery).matches;
      }
    },
    writable: false,
    configurable: false
  });
}

// Additional polyfills can be added here as needed
export {};