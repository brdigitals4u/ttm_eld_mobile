#!/usr/bin/env node
/**
 * Dependency Analysis Script
 * Analyzes dependencies for size, duplicates, and optimization opportunities
 */

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const PACKAGE_JSON = path.join(__dirname, "../package.json")
const NODE_MODULES = path.join(__dirname, "../node_modules")
const REPORT_DIR = path.join(__dirname, "../dependency-analysis")

let depcheck

try {
  depcheck = require("depcheck")
} catch (error) {
  console.warn("⚠️  depcheck not found. Install with: npm install -D depcheck")
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getPackageSize(packageName) {
  const packagePath = path.join(NODE_MODULES, packageName)
  if (!fs.existsSync(packagePath)) {
    return 0
  }

  function getDirSize(dir) {
    let size = 0
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        try {
          if (entry.isDirectory()) {
            size += getDirSize(fullPath)
          } else {
            size += fs.statSync(fullPath).size
          }
        } catch (e) {
          // Skip symlinks and inaccessible files
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
    return size
  }

  return getDirSize(packagePath)
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function analyzeUnusedDependencies() {
  if (!depcheck) {
    console.warn("⚠️  Skipping unused dependency check - depcheck not available")
    return null
  }

  console.log("🔍 Checking for unused dependencies...")

  try {
    const result = await depcheck(path.dirname(PACKAGE_JSON), {
      ignoreMatches: [
        "@types/*",
        "eslint*",
        "prettier*",
        "jest*",
        "@testing-library/*",
        "ts-jest",
        "ts-node",
        "babel-jest",
        "react-test-renderer",
        "reactotron-*",
        "@babel/*",
      ],
    })

    return {
      unused: result.dependencies || [],
      missing: result.missing || {},
      invalidFiles: result.invalidFiles || [],
      invalidDirs: result.invalidDirs || [],
    }
  } catch (error) {
    console.error("❌ Error running depcheck:", error.message)
    return null
  }
}

function findDuplicateDependencies() {
  console.log("🔍 Checking for duplicate dependencies...")

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"))
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const duplicates = []
  const packageMap = new Map()

  // Check for packages with similar names (potential duplicates)
  Object.keys(allDeps).forEach((pkg) => {
    const baseName = pkg.replace(/^@[^/]+\//, "").replace(/^react-native-/, "")
    if (!packageMap.has(baseName)) {
      packageMap.set(baseName, [])
    }
    packageMap.get(baseName).push(pkg)
  })

  packageMap.forEach((packages, baseName) => {
    if (packages.length > 1) {
      duplicates.push({
        baseName,
        packages,
      })
    }
  })

  return duplicates
}

function analyzePackageSizes() {
  console.log("📦 Analyzing package sizes...")

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"))
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const sizes = []

  Object.keys(allDeps).forEach((pkg) => {
    const size = getPackageSize(pkg)
    if (size > 0) {
      sizes.push({
        name: pkg,
        size,
        sizeFormatted: formatSize(size),
        version: allDeps[pkg],
      })
    }
  })

  // Sort by size
  sizes.sort((a, b) => b.size - a.size)

  return sizes
}

function identifyLargeDependencies(sizes) {
  const largeThreshold = 5 * 1024 * 1024 // 5 MB
  const knownLarge = [
    "realm",
    "@shopify/react-native-skia",
    "react-native-pdf",
    "victory",
    "victory-native",
    "react-native-chart-kit",
  ]

  const large = sizes.filter(
    (pkg) => pkg.size > largeThreshold || knownLarge.some((name) => pkg.name.includes(name)),
  )

  return large
}

function generateRecommendations(data) {
  const recommendations = []

  // Unused dependencies
  if (data.unused && data.unused.length > 0) {
    recommendations.push({
      type: "warning",
      priority: "high",
      category: "unused",
      message: `Found ${data.unused.length} unused dependencies that can be removed`,
      items: data.unused,
      action: "Remove unused dependencies to reduce bundle size",
    })
  }

  // Duplicate dependencies
  if (data.duplicates && data.duplicates.length > 0) {
    recommendations.push({
      type: "info",
      priority: "medium",
      category: "duplicates",
      message: `Found ${data.duplicates.length} potential duplicate dependencies`,
      items: data.duplicates,
      action: "Review and consolidate duplicate packages",
    })
  }

  // Large dependencies
  if (data.large && data.large.length > 0) {
    recommendations.push({
      type: "warning",
      priority: "high",
      category: "large",
      message: `Found ${data.large.length} large dependencies (>5 MB)`,
      items: data.large.map((pkg) => ({
        name: pkg.name,
        size: pkg.sizeFormatted,
      })),
      action: "Consider alternatives or lazy loading for large dependencies",
    })
  }

  // Missing dependencies
  if (data.missing && Object.keys(data.missing).length > 0) {
    recommendations.push({
      type: "error",
      priority: "high",
      category: "missing",
      message: `Found ${Object.keys(data.missing).length} missing dependencies`,
      items: Object.keys(data.missing),
      action: "Install missing dependencies",
    })
  }

  return recommendations
}

async function generateReport(data) {
  ensureDir(REPORT_DIR)

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalDependencies: data.sizes.length,
      totalSize: data.sizes.reduce((sum, pkg) => sum + pkg.size, 0),
      unusedCount: data.unused ? data.unused.length : 0,
      duplicatesCount: data.duplicates ? data.duplicates.length : 0,
      largeCount: data.large ? data.large.length : 0,
    },
    unused: data.unused || [],
    duplicates: data.duplicates || [],
    large: data.large || [],
    top20: data.sizes.slice(0, 20),
    recommendations: generateRecommendations(data),
  }

  const reportPath = path.join(REPORT_DIR, `dependency-analysis-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Generate text summary
  const summaryPath = path.join(REPORT_DIR, "summary.txt")
  let summary = "Dependency Analysis Summary\n"
  summary += "=".repeat(50) + "\n\n"
  summary += `Timestamp: ${report.timestamp}\n`
  summary += `Total Dependencies: ${report.summary.totalDependencies}\n`
  summary += `Total Size: ${formatSize(report.summary.totalSize)}\n\n`

  summary += "Recommendations:\n"
  summary += "-".repeat(50) + "\n"
  report.recommendations.forEach((rec, i) => {
    const icon = rec.type === "warning" ? "⚠️" : rec.type === "error" ? "❌" : "ℹ️"
    summary += `${i + 1}. ${icon} [${rec.priority.toUpperCase()}] ${rec.message}\n`
    if (rec.items && rec.items.length > 0) {
      rec.items.slice(0, 5).forEach((item) => {
        const itemStr =
          typeof item === "string" ? item : `${item.name} (${item.sizeFormatted || ""})`
        summary += `   - ${itemStr}\n`
      })
      if (rec.items.length > 5) {
        summary += `   ... and ${rec.items.length - 5} more\n`
      }
    }
    summary += `   Action: ${rec.action}\n\n`
  })

  summary += "\nTop 20 Largest Dependencies:\n"
  summary += "-".repeat(50) + "\n"
  report.top20.forEach((pkg, i) => {
    summary += `${i + 1}. ${pkg.name}: ${pkg.sizeFormatted}\n`
  })

  fs.writeFileSync(summaryPath, summary)

  console.log(`\n✅ Report saved to: ${reportPath}`)
  console.log(`✅ Summary saved to: ${summaryPath}`)

  return report
}

// Main execution
async function main() {
  console.log("🚀 Starting Dependency Analysis\n")

  try {
    const [unused, duplicates, sizes] = await Promise.all([
      analyzeUnusedDependencies(),
      Promise.resolve(findDuplicateDependencies()),
      Promise.resolve(analyzePackageSizes()),
    ])

    const large = identifyLargeDependencies(sizes)

    const data = {
      unused,
      duplicates,
      sizes,
      large,
      missing: unused?.missing || {},
    }

    const report = await generateReport(data)

    console.log("\n📊 Analysis Summary:")
    console.log(`   Total dependencies: ${report.summary.totalDependencies}`)
    console.log(`   Total size: ${formatSize(report.summary.totalSize)}`)
    console.log(`   Unused: ${report.summary.unusedCount}`)
    console.log(`   Duplicates: ${report.summary.duplicatesCount}`)
    console.log(`   Large (>5MB): ${report.summary.largeCount}`)

    console.log("\n📋 Recommendations:")
    report.recommendations.forEach((rec, i) => {
      const icon = rec.type === "warning" ? "⚠️" : rec.type === "error" ? "❌" : "ℹ️"
      console.log(`   ${icon} ${rec.message}`)
    })

    console.log("\n✅ Dependency analysis complete!")
  } catch (error) {
    console.error("❌ Error during analysis:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { analyzeUnusedDependencies, findDuplicateDependencies, analyzePackageSizes }












