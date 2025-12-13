#!/usr/bin/env node
/**
 * JavaScript Bundle Optimization Script
 * Analyzes and suggests optimizations for JavaScript bundle
 */

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const BUNDLE_OUTPUT = path.join(
  __dirname,
  "../android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle",
)
const SOURCE_DIR = path.join(__dirname, "../src")
const REPORT_DIR = path.join(__dirname, "../bundle-optimization")

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function findLargeFiles(dir, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
  const files = []

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.includes(ext)) {
          const stats = fs.statSync(fullPath)
          files.push({
            path: fullPath,
            relativePath: path.relative(dir, fullPath),
            size: stats.size,
          })
        }
      }
    }
  }

  walk(dir)
  return files.sort((a, b) => b.size - a.size)
}

function analyzeImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const imports = []

  // Match import statements
  const importRegex =
    /import\s+(?:(?:\*\s+as\s+\w+)|(?:\{[^}]*\})|(?:\w+)|(?:\w+,\s*\{[^}]*\}))\s+from\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      statement: match[0],
      module: match[1],
    })
  }

  // Match require statements
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push({
      statement: `require('${match[1]}')`,
      module: match[1],
    })
  }

  return imports
}

function findDynamicImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const dynamicImports = []

  // Match dynamic import() statements
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let match

  while ((match = dynamicImportRegex.exec(content)) !== null) {
    dynamicImports.push({
      statement: match[0],
      module: match[1],
    })
  }

  return dynamicImports
}

function identifyHeavyFeatures(files) {
  const heavyPatterns = [
    { pattern: /pdf|PDF|Pdf/, name: "PDF Viewer", suggestion: "Use dynamic import for PDF viewer" },
    {
      pattern: /chart|Chart|victory|Victory/,
      name: "Charts",
      suggestion: "Consider lazy loading chart libraries",
    },
    {
      pattern: /realm|Realm/,
      name: "Realm Database",
      suggestion: "Ensure Realm is tree-shakeable",
    },
    { pattern: /skia|Skia/, name: "Skia Graphics", suggestion: "Use dynamic import if available" },
  ]

  const found = []

  files.forEach((file) => {
    const content = fs.readFileSync(file.path, "utf8")
    heavyPatterns.forEach(({ pattern, name, suggestion }) => {
      if (pattern.test(content)) {
        found.push({
          file: file.relativePath,
          feature: name,
          suggestion,
        })
      }
    })
  })

  return found
}

function generateRecommendations(data) {
  const recommendations = []

  // Large files
  const largeFiles = data.files.filter((f) => f.size > 100 * 1024) // > 100 KB
  if (largeFiles.length > 0) {
    recommendations.push({
      type: "warning",
      priority: "medium",
      category: "large-files",
      message: `Found ${largeFiles.length} large source files (>100 KB)`,
      items: largeFiles.slice(0, 10).map((f) => ({
        file: f.relativePath,
        size: `${(f.size / 1024).toFixed(2)} KB`,
      })),
      action: "Consider splitting large files or using code splitting",
    })
  }

  // Heavy features
  if (data.heavyFeatures.length > 0) {
    recommendations.push({
      type: "info",
      priority: "high",
      category: "heavy-features",
      message: `Found ${data.heavyFeatures.length} files using heavy features`,
      items: data.heavyFeatures.slice(0, 10),
      action: "Implement dynamic imports for heavy features",
    })
  }

  // Static imports that could be dynamic
  const staticImports = data.allImports.filter((imp) => {
    const module = imp.module
    return (
      (module.includes("pdf") ||
        module.includes("chart") ||
        module.includes("victory") ||
        module.includes("realm")) &&
      !imp.isDynamic
    )
  })

  if (staticImports.length > 0) {
    recommendations.push({
      type: "warning",
      priority: "high",
      category: "static-imports",
      message: `Found ${staticImports.length} static imports of heavy modules`,
      items: staticImports.slice(0, 10).map((imp) => ({
        file: imp.file,
        module: imp.module,
      })),
      action: "Convert to dynamic imports for better code splitting",
    })
  }

  return recommendations
}

function analyzeBundle() {
  console.log("📊 Analyzing JavaScript bundle for optimization opportunities...\n")

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error("❌ Source directory not found:", SOURCE_DIR)
    process.exit(1)
  }

  const files = findLargeFiles(SOURCE_DIR)
  console.log(`📁 Found ${files.length} source files\n`)

  const allImports = []
  const heavyFeatures = []

  files.forEach((file) => {
    try {
      const imports = analyzeImports(file.path)
      const dynamicImports = findDynamicImports(file.path)

      imports.forEach((imp) => {
        allImports.push({
          file: file.relativePath,
          module: imp.module,
          isDynamic: false,
        })
      })

      dynamicImports.forEach((imp) => {
        allImports.push({
          file: file.relativePath,
          module: imp.module,
          isDynamic: true,
        })
      })
    } catch (error) {
      // Skip files that can't be read
    }
  })

  const heavy = identifyHeavyFeatures(files)
  heavyFeatures.push(...heavy)

  const data = {
    files,
    allImports,
    heavyFeatures,
  }

  return data
}

function generateReport(data) {
  ensureDir(REPORT_DIR)

  const recommendations = generateRecommendations(data)

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: data.files.length,
      totalImports: data.allImports.length,
      dynamicImports: data.allImports.filter((i) => i.isDynamic).length,
      staticImports: data.allImports.filter((i) => !i.isDynamic).length,
      heavyFeatures: data.heavyFeatures.length,
    },
    top20LargestFiles: data.files.slice(0, 20),
    recommendations,
  }

  const reportPath = path.join(REPORT_DIR, `bundle-optimization-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Generate text summary
  const summaryPath = path.join(REPORT_DIR, "summary.txt")
  let summary = "JavaScript Bundle Optimization Report\n"
  summary += "=".repeat(50) + "\n\n"
  summary += `Timestamp: ${report.timestamp}\n`
  summary += `Total Files: ${report.summary.totalFiles}\n`
  summary += `Total Imports: ${report.summary.totalImports}\n`
  summary += `Dynamic Imports: ${report.summary.dynamicImports}\n`
  summary += `Static Imports: ${report.summary.staticImports}\n\n`

  summary += "Recommendations:\n"
  summary += "-".repeat(50) + "\n"
  report.recommendations.forEach((rec, i) => {
    const icon = rec.type === "warning" ? "⚠️" : "ℹ️"
    summary += `${i + 1}. ${icon} [${rec.priority.toUpperCase()}] ${rec.message}\n`
    if (rec.items && rec.items.length > 0) {
      rec.items.slice(0, 5).forEach((item) => {
        const itemStr =
          typeof item === "string"
            ? item
            : item.file
              ? `${item.file}${item.module ? ` -> ${item.module}` : ""}${item.size ? ` (${item.size})` : ""}`
              : `${item.feature} in ${item.file}`
        summary += `   - ${itemStr}\n`
      })
      if (rec.items.length > 5) {
        summary += `   ... and ${rec.items.length - 5} more\n`
      }
    }
    summary += `   Action: ${rec.action}\n\n`
  })

  summary += "\nTop 20 Largest Source Files:\n"
  summary += "-".repeat(50) + "\n"
  report.top20LargestFiles.forEach((file, i) => {
    const sizeKB = (file.size / 1024).toFixed(2)
    summary += `${i + 1}. ${file.relativePath}: ${sizeKB} KB\n`
  })

  fs.writeFileSync(summaryPath, summary)

  console.log(`\n✅ Report saved to: ${reportPath}`)
  console.log(`✅ Summary saved to: ${summaryPath}`)

  return report
}

// Main execution
function main() {
  console.log("🚀 Starting JavaScript Bundle Optimization Analysis\n")

  try {
    const data = analyzeBundle()
    const report = generateReport(data)

    console.log("\n📊 Analysis Summary:")
    console.log(`   Total files: ${report.summary.totalFiles}`)
    console.log(`   Total imports: ${report.summary.totalImports}`)
    console.log(`   Dynamic imports: ${report.summary.dynamicImports}`)
    console.log(`   Static imports: ${report.summary.staticImports}`)
    console.log(`   Heavy features: ${report.summary.heavyFeatures}`)

    console.log("\n📋 Recommendations:")
    report.recommendations.forEach((rec, i) => {
      const icon = rec.type === "warning" ? "⚠️" : "ℹ️"
      console.log(`   ${icon} ${rec.message}`)
    })

    console.log("\n✅ Bundle optimization analysis complete!")
  } catch (error) {
    console.error("❌ Error during analysis:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { analyzeBundle, generateReport }















