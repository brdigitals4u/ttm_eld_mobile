#!/usr/bin/env node
/**
 * Bundle Analysis Script
 * Analyzes React Native bundle size and identifies optimization opportunities
 */

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const BUNDLE_OUTPUT = path.join(
  __dirname,
  "../android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle",
)
const SOURCE_MAP = path.join(
  __dirname,
  "../android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map",
)
const REPORT_DIR = path.join(__dirname, "../bundle-analysis")

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function analyzeBundleSize() {
  console.log("📊 Analyzing bundle size...\n")

  if (!fs.existsSync(BUNDLE_OUTPUT)) {
    console.error("❌ Bundle file not found. Please build the app first:")
    console.error("   ./android/gradlew -p android assembleRelease")
    process.exit(1)
  }

  const stats = fs.statSync(BUNDLE_OUTPUT)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)

  console.log(`📦 Bundle Size: ${sizeMB} MB (${stats.size.toLocaleString()} bytes)`)

  // Read bundle content for analysis
  const bundleContent = fs.readFileSync(BUNDLE_OUTPUT, "utf8")
  const lines = bundleContent.split("\n")

  console.log(`📝 Total Lines: ${lines.length.toLocaleString()}`)

  // Analyze imports
  const requireMatches = bundleContent.match(/require\(['"]([^'"]+)['"]\)/g) || []
  const importMatches = bundleContent.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || []

  console.log(`📥 Require statements: ${requireMatches.length}`)
  console.log(`📥 Import statements: ${importMatches.length}`)

  // Extract module names
  const modules = new Set()
  ;[...requireMatches, ...importMatches].forEach((match) => {
    const moduleMatch = match.match(/['"]([^'"]+)['"]/)
    if (moduleMatch) {
      const modulePath = moduleMatch[1]
      // Extract package name (first part before /)
      const packageName = modulePath.split("/")[0]
      if (!packageName.startsWith(".") && !packageName.startsWith("@")) {
        modules.add(packageName)
      } else if (packageName.startsWith("@")) {
        const scoped = modulePath.split("/").slice(0, 2).join("/")
        modules.add(scoped)
      }
    }
  })

  console.log(`📚 Unique packages: ${modules.size}`)

  return {
    size: stats.size,
    sizeMB: parseFloat(sizeMB),
    lines: lines.length,
    modules: Array.from(modules).sort(),
  }
}

function generateReport(data) {
  ensureDir(REPORT_DIR)

  const reportPath = path.join(REPORT_DIR, `bundle-analysis-${Date.now()}.json`)
  const report = {
    timestamp: new Date().toISOString(),
    bundle: {
      size: data.size,
      sizeMB: data.sizeMB,
      lines: data.lines,
      modules: data.modules,
    },
    recommendations: generateRecommendations(data),
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n✅ Report saved to: ${reportPath}`)

  // Generate text summary
  const summaryPath = path.join(REPORT_DIR, "summary.txt")
  const summary = generateSummary(report)
  fs.writeFileSync(summaryPath, summary)
  console.log(`✅ Summary saved to: ${summaryPath}`)

  return report
}

function generateRecommendations(data) {
  const recommendations = []

  if (data.sizeMB > 5) {
    recommendations.push({
      type: "warning",
      message: `Bundle size is ${data.sizeMB} MB. Consider code splitting.`,
      priority: "high",
    })
  }

  if (data.modules.length > 100) {
    recommendations.push({
      type: "info",
      message: `Large number of modules (${data.modules.length}). Review for unused dependencies.`,
      priority: "medium",
    })
  }

  // Check for known large libraries
  const largeLibraries = ["victory", "realm", "react-native-pdf", "@shopify/react-native-skia"]

  const foundLarge = data.modules.filter((m) => largeLibraries.some((lib) => m.includes(lib)))

  if (foundLarge.length > 0) {
    recommendations.push({
      type: "warning",
      message: `Large libraries detected: ${foundLarge.join(", ")}. Consider alternatives or lazy loading.`,
      priority: "high",
    })
  }

  return recommendations
}

function generateSummary(report) {
  let summary = "Bundle Analysis Summary\n"
  summary += "=".repeat(50) + "\n\n"
  summary += `Timestamp: ${report.timestamp}\n`
  summary += `Bundle Size: ${report.bundle.sizeMB} MB\n`
  summary += `Total Lines: ${report.bundle.lines.toLocaleString()}\n`
  summary += `Unique Packages: ${report.bundle.modules.length}\n\n`

  summary += "Recommendations:\n"
  summary += "-".repeat(50) + "\n"
  report.recommendations.forEach((rec, i) => {
    summary += `${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}\n`
  })

  summary += "\nTop 20 Packages:\n"
  summary += "-".repeat(50) + "\n"
  report.bundle.modules.slice(0, 20).forEach((mod, i) => {
    summary += `${i + 1}. ${mod}\n`
  })

  return summary
}

function runSourceMapExplorer() {
  if (!fs.existsSync(SOURCE_MAP)) {
    console.log("\n⚠️  Source map not found. Skipping detailed analysis.")
    return
  }

  console.log("\n🔍 Running source-map-explorer...")
  try {
    const output = execSync(`npx source-map-explorer "${BUNDLE_OUTPUT}" "${SOURCE_MAP}" --json`, {
      encoding: "utf8",
      stdio: "pipe",
    })

    const analysis = JSON.parse(output)
    const reportPath = path.join(REPORT_DIR, "source-map-analysis.json")
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2))
    console.log(`✅ Source map analysis saved to: ${reportPath}`)

    // Generate top modules report
    if (analysis.results && analysis.results.bundles) {
      const bundle = analysis.results.bundles[0]
      const modules = Object.entries(bundle.files)
        .map(([file, size]) => ({ file, size }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 20)

      console.log("\n📊 Top 20 Largest Modules:")
      modules.forEach((mod, i) => {
        const sizeKB = (mod.size / 1024).toFixed(2)
        console.log(`  ${i + 1}. ${mod.file}: ${sizeKB} KB`)
      })
    }
  } catch (error) {
    console.log("⚠️  Could not run source-map-explorer:", error.message)
  }
}

// Main execution
function main() {
  console.log("🚀 Starting Bundle Analysis\n")

  try {
    const data = analyzeBundleSize()
    const report = generateReport(data)
    runSourceMapExplorer()

    console.log("\n✅ Bundle analysis complete!")
    console.log(`\n📋 Recommendations:`)
    report.recommendations.forEach((rec, i) => {
      const icon = rec.type === "warning" ? "⚠️" : "ℹ️"
      console.log(`   ${icon} ${rec.message}`)
    })
  } catch (error) {
    console.error("❌ Error during analysis:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { analyzeBundleSize, generateReport }

