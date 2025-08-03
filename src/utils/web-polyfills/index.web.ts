// Web-specific polyfills and compatibility fixes

// Fix for global references that might be missing on web
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Polyfill for Buffer if needed
if (typeof Buffer === 'undefined') {
  (global as any).Buffer = require('buffer').Buffer;
}

// Fix for process.nextTick on web
if (typeof process === 'undefined') {
  (global as any).process = require('process/browser');
}

// Web-friendly console enhancements
if (typeof window !== 'undefined') {
  // Ensure console methods exist
  const noop = () => {};
  if (!console.log) console.log = noop;
  if (!console.warn) console.warn = noop;
  if (!console.error) console.error = noop;
  if (!console.info) console.info = noop;
  if (!console.debug) console.debug = noop;
}

// Export an initialization function
export const initializeWebPolyfills = () => {
  console.log('🌐 Web polyfills initialized');
};
