/**
 * Metro Transformer with JavaScript Obfuscation
 * This transformer applies obfuscation to JavaScript code in production builds
 */

const { transformSync } = require("@babel/core")
const obfuscator = require("javascript-obfuscator")

// Obfuscation options for production builds
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: "function",
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
}

function obfuscateCode(sourceCode, filename) {
  // Only obfuscate in production builds
  if (process.env.NODE_ENV !== "production") {
    return sourceCode
  }

  // Skip obfuscation for certain files that need to remain readable
  const skipPatterns = [/node_modules/, /\.test\./, /\.spec\./, /__tests__/, /react-native/, /expo/]

  if (skipPatterns.some((pattern) => pattern.test(filename))) {
    return sourceCode
  }

  try {
    const obfuscationResult = obfuscator.obfuscate(sourceCode, {
      ...obfuscationOptions,
      sourceMap: false, // Disable source maps for production
    })

    return obfuscationResult.getObfuscatedCode()
  } catch (error) {
    console.warn(`[Obfuscator] Failed to obfuscate ${filename}:`, error.message)
    return sourceCode // Return original code if obfuscation fails
  }
}

module.exports = {
  obfuscateCode,
  obfuscationOptions,
}
