const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure web-specific settings
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Add web-specific aliases to avoid HammerJS issues
config.resolver.alias = {
  ...config.resolver.alias,
  // Disable HammerJS on web to prevent the touchAction error
  'hammerjs': __dirname + '/src/utils/web-polyfills/hammer-mock.js',
};

// Platform-specific extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx'];

module.exports = config;

