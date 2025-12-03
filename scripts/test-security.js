#!/usr/bin/env node
/**
 * Security Testing Script
 * Tests various security measures to ensure they're working correctly
 */

const fs = require("fs")
const path = require("path")

const BUNDLE_OUTPUT = path.join(
  __dirname,
  "../android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle",
)
const REPORT_DIR = path.join(__dirname, "../security-test-reports")

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function testObfuscation() {
  console.log("🔍 Testing JavaScript Obfuscation...\n")

  if (!fs.existsSync(BUNDLE_OUTPUT)) {
    console.log("⚠️  Bundle not found. Build the app first.")
    return { passed: false, message: "Bundle not found" }
  }

  const bundle = fs.readFileSync(BUNDLE_OUTPUT, "utf8")

  // Check for obfuscation indicators
  const checks = {
    hasHexIdentifiers: /0x[0-9a-f]+/i.test(bundle),
    hasBase64Strings: /[A-Za-z0-9+\/]{20,}={0,2}/.test(bundle),
    hasObfuscatedCode: bundle.includes("_0x") || bundle.includes("_0X"),
    hasControlFlow: bundle.includes("switch") && bundle.includes("case"),
    readableFunctionNames: /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(bundle),
  }

  const obfuscationScore = Object.values(checks).filter(Boolean).length
  const isObfuscated = obfuscationScore >= 3

  console.log("Obfuscation Indicators:")
  console.log(`  Hex identifiers: ${checks.hasHexIdentifiers ? "✅" : "❌"}`)
  console.log(`  Base64 strings: ${checks.hasBase64Strings ? "✅" : "❌"}`)
  console.log(`  Obfuscated code: ${checks.hasObfuscatedCode ? "✅" : "❌"}`)
  console.log(`  Control flow: ${checks.hasControlFlow ? "✅" : "❌"}`)
  console.log(`  Readable names: ${checks.readableFunctionNames ? "⚠️" : "✅"}`)
  console.log(`\nObfuscation Score: ${obfuscationScore}/5`)

  return {
    passed: isObfuscated,
    score: obfuscationScore,
    message: isObfuscated ? "Bundle appears to be obfuscated" : "Bundle may not be obfuscated",
  }
}

function testApiKeyExposure() {
  console.log("\n🔍 Testing API Key Exposure...\n")

  if (!fs.existsSync(BUNDLE_OUTPUT)) {
    return { passed: false, message: "Bundle not found" }
  }

  const bundle = fs.readFileSync(BUNDLE_OUTPUT, "utf8")

  // Check for exposed API keys
  const sensitivePatterns = [
    /KtaxJejHFh-iCSQ3P6Mu/, // Freshchat API key
    /us-east-1_JEeMFBWHc/, // AWS Cognito User Pool ID
    /3r6e3uq1motr9n3u5b4uonm9th/, // AWS Cognito Client ID
    /api\.ttmkonnect\.com/, // API domain (less sensitive but should be obfuscated)
  ]

  const exposed = []
  sensitivePatterns.forEach((pattern, index) => {
    if (pattern.test(bundle)) {
      exposed.push(`Pattern ${index + 1} found in bundle`)
    }
  })

  const passed = exposed.length === 0

  console.log("API Key Exposure Check:")
  if (exposed.length > 0) {
    console.log("  ⚠️  Potential API key exposure detected:")
    exposed.forEach((msg) => console.log(`    - ${msg}`))
    console.log("  💡 Consider moving to secure storage")
  } else {
    console.log("  ✅ No obvious API key exposure detected")
  }

  return {
    passed,
    exposed,
    message: passed ? "No API keys found in bundle" : "Potential API key exposure",
  }
}

function testSourceMaps() {
  console.log("\n🔍 Testing Source Map Exposure...\n")

  const sourceMapPath = path.join(
    __dirname,
    "../android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map",
  )

  const exists = fs.existsSync(sourceMapPath)

  console.log("Source Map Check:")
  if (exists) {
    console.log("  ⚠️  Source map found (should be excluded from production)")
    console.log("  💡 Ensure source maps are not included in release APK")
  } else {
    console.log("  ✅ No source map found (good for production)")
  }

  return {
    passed: !exists,
    message: exists ? "Source map found" : "No source map found",
  }
}

function generateReport(results) {
  ensureDir(REPORT_DIR)

  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    },
  }

  const reportPath = path.join(REPORT_DIR, `security-test-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Generate text summary
  const summaryPath = path.join(REPORT_DIR, "summary.txt")
  let summary = "Security Test Report\n"
  summary += "=".repeat(50) + "\n\n"
  summary += `Timestamp: ${report.timestamp}\n`
  summary += `Total Tests: ${report.summary.total}\n`
  summary += `Passed: ${report.summary.passed}\n`
  summary += `Failed: ${report.summary.failed}\n\n`

  summary += "Test Results:\n"
  summary += "-".repeat(50) + "\n"
  results.forEach((result, i) => {
    const icon = result.passed ? "✅" : "❌"
    summary += `${i + 1}. ${icon} ${result.name}: ${result.message}\n`
    if (result.details) {
      summary += `   ${result.details}\n`
    }
  })

  fs.writeFileSync(summaryPath, summary)

  console.log(`\n✅ Report saved to: ${reportPath}`)
  console.log(`✅ Summary saved to: ${summaryPath}`)

  return report
}

// Main execution
function main() {
  console.log("🚀 Starting Security Tests\n")

  const results = []

  // Test obfuscation
  const obfuscationResult = testObfuscation()
  results.push({
    name: "JavaScript Obfuscation",
    ...obfuscationResult,
  })

  // Test API key exposure
  const apiKeyResult = testApiKeyExposure()
  results.push({
    name: "API Key Exposure",
    ...apiKeyResult,
  })

  // Test source maps
  const sourceMapResult = testSourceMaps()
  results.push({
    name: "Source Map Exposure",
    ...sourceMapResult,
  })

  // Generate report
  const report = generateReport(results)

  // Print summary
  console.log("\n" + "=".repeat(50))
  console.log("📊 Security Test Summary")
  console.log("=".repeat(50))
  console.log(`Total Tests: ${report.summary.total}`)
  console.log(`Passed: ${report.summary.passed}`)
  console.log(`Failed: ${report.summary.failed}`)

  if (report.summary.failed > 0) {
    console.log("\n⚠️  Some security tests failed. Review the report for details.")
    process.exit(1)
  } else {
    console.log("\n✅ All security tests passed!")
  }
}

if (require.main === module) {
  main()
}

module.exports = { testObfuscation, testApiKeyExposure, testSourceMaps }



