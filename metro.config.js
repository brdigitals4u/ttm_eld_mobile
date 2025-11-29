/* eslint-env node */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")

// Check if obfuscation should be enabled
const shouldObfuscate = process.env.NODE_ENV === 'production' && 
  process.env.ENABLE_OBFUSCATION !== 'false'

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Note: Obfuscation disabled for now due to Metro serializer compatibility issues
// Obfuscation should be applied post-build or via a different method
// The custom serializer approach conflicts with Expo's build process
if (shouldObfuscate && false) { // Disabled for compatibility
  console.warn('[Metro] Obfuscation is disabled - use post-build obfuscation instead')
}

config.transformer.getTransformOptions = async () => ({
  transform: {
    // Inline requires are very useful for deferring loading of large dependencies/components.
    // For example, we use it in app.tsx to conditionally load Reactotron.
    // However, this comes with some gotchas.
    // Read more here: https://reactnative.dev/docs/optimizing-javascript-loading
    // And here: https://github.com/expo/expo/issues/27279#issuecomment-1971610698
    inlineRequires: true,
    // Enable experimental import support for better tree shaking
    experimentalImportSupport: true,
    // Enable inline constants for better optimization
    inlineConstants: true,
  },
  // Enable aggressive minification for production
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      keep_classnames: false,
      keep_fnames: false,
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
    compress: {
      // Aggressive compression settings
      dead_code: true,
      drop_console: process.env.NODE_ENV === 'production',
      drop_debugger: true,
      evaluate: true,
      reduce_vars: true,
      passes: 3,
    },
  },
})

// This is a temporary fix that helps fixing an issue with axios/apisauce.
// See the following issues in Github for more details:
// https://github.com/infinitered/apisauce/issues/331
// https://github.com/axios/axios/issues/6899
// The solution was taken from the following issue:
// https://github.com/facebook/metro/issues/1272
config.resolver.unstable_conditionNames = ["require", "default", "browser"]

// This helps support certain popular third-party libraries
// such as Firebase that use the extension cjs.
config.resolver.sourceExts.push("cjs")

// Performance optimizations
// Enable better tree shaking
config.resolver.unstable_enablePackageExports = true

// Additional resolver optimizations for better dead code elimination
config.resolver.platforms = ["native", "android", "ios", "web"]

// Cache optimization
// Metro handles cache automatically - no need to override cacheStores
// Cache is optimized by default in Metro

// Optimize serializer for production builds
if (process.env.NODE_ENV === 'production') {
  config.serializer = {
    ...config.serializer,
    // Enable source map optimization
    getModulesRunBeforeMainModule: () => [],
    // Optimize module output
    createModuleIdFactory: () => {
      let nextId = 0
      return () => nextId++
    },
  }
}

// Note: Metro handles asset optimization automatically
// Expo manages assetRegistryPath internally - don't override it

// Additional optimizations are handled by expo-build-properties

module.exports = config
