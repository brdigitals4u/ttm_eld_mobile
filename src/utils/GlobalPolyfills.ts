// Global polyfills for server-side rendering compatibility

// Polyfill for window object in server-side environments
if (typeof window === 'undefined') {
  (global as any).window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
  };
}

// Polyfill for document object
if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

// Polyfill for navigator object
if (typeof navigator === 'undefined') {
  (global as any).navigator = {
    userAgent: 'React Native',
    platform: 'React Native',
  };
}

// Polyfill for location object
if (typeof location === 'undefined') {
  (global as any).location = {
    href: 'react-native://',
    origin: 'react-native://',
    protocol: 'react-native:',
    host: '',
    hostname: '',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
  };
}

export {}; 