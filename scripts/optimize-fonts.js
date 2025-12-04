#!/usr/bin/env node
/**
 * Font Optimization Script
 * Analyzes font usage and generates optimization recommendations
 */

const fs = require("fs")
const path = require("path")

const ASSETS_DIR = path.join(__dirname, "../assets")
const ANDROID_FONTS_DIR = path.join(__dirname, "../android/app/src/main/assets/fonts")
const REPORT_DIR = path.join(__dirname, "../font-analysis")

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function findFontFiles(dir) {
  const fonts = []
  const extensions = [".ttf", ".otf", ".woff", ".woff2"]

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) {
      return
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.includes(ext)) {
          const stats = fs.statSync(fullPath)
          fonts.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            sizeFormatted: formatSize(stats.size),
          })
        }
      }
    }
  }

  walk(dir)
  return fonts
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function analyzeFontUsage() {
  console.log("🔍 Analyzing font usage in source code...\n")

  const sourceDir = path.join(__dirname, "../src")
  const fontReferences = new Set()

  function findFontReferences(dir) {
    const extensions = [".ts", ".tsx", ".js", ".jsx"]

    function walk(currentDir) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          walk(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (extensions.includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, "utf8")

              // Match font family references
              const fontFamilyRegex = /fontFamily:\s*['"]([^'"]+)['"]/g
              let match
              while ((match = fontFamilyRegex.exec(content)) !== null) {
                fontReferences.add(match[1])
              }

              // Match font weight references
              const fontWeightRegex = /fontWeight:\s*['"]?(\d+|normal|bold)['"]?/g
              while ((match = fontWeightRegex.exec(content)) !== null) {
                // Track font weights
              }
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      }
    }

    walk(dir)
  }

  findFontReferences(sourceDir)

  return Array.from(fontReferences)
}

function generateRecommendations(fonts, usedFonts) {
  const recommendations = []

  // Check for unused fonts
  const fontNames = fonts.map((f) => f.name.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/, ""))
  const unusedFonts = fonts.filter((font) => {
    const fontName = font.name.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/, "")
    return !usedFonts.some(
      (used) => fontName.includes(used.toLowerCase()) || used.toLowerCase().includes(fontName),
    )
  })

  if (unusedFonts.length > 0) {
    recommendations.push({
      type: "warning",
      priority: "medium",
      category: "unused-fonts",
      message: `Found ${unusedFonts.length} potentially unused font files`,
      items: unusedFonts.map((f) => ({
        name: f.name,
        size: f.sizeFormatted,
        path: f.path,
      })),
      action: "Remove unused font files to reduce bundle size",
    })
  }

  // Check for large fonts
  const largeFonts = fonts.filter((f) => f.size > 500 * 1024) // > 500 KB
  if (largeFonts.length > 0) {
    recommendations.push({
      type: "info",
      priority: "high",
      category: "large-fonts",
      message: `Found ${largeFonts.length} large font files (>500 KB)`,
      items: largeFonts.map((f) => ({
        name: f.name,
        size: f.sizeFormatted,
      })),
      action: "Consider font subsetting or using system fonts for non-brand text",
    })
  }

  // Check for multiple weights/styles of same font
  const fontFamilies = new Map()
  fonts.forEach((font) => {
    const baseName = font.name.replace(
      /[-_](bold|regular|light|medium|semibold|black|thin|extralight|heavy).*\.(ttf|otf|woff|woff2)$/i,
      "",
    )
    if (!fontFamilies.has(baseName)) {
      fontFamilies.set(baseName, [])
    }
    fontFamilies.get(baseName).push(font)
  })

  const multipleWeights = Array.from(fontFamilies.entries()).filter(
    ([_, variants]) => variants.length > 2,
  )
  if (multipleWeights.length > 0) {
    recommendations.push({
      type: "info",
      priority: "medium",
      category: "multiple-weights",
      message: `Found ${multipleWeights.length} font families with multiple weights`,
      items: multipleWeights.map(([family, variants]) => ({
        family,
        variants: variants.length,
        totalSize: formatSize(variants.reduce((sum, v) => sum + v.size, 0)),
      })),
      action: "Consider removing unused font weights to reduce size",
    })
  }

  return recommendations
}

function generateReport(fonts, usedFonts, recommendations) {
  ensureDir(REPORT_DIR)

  const totalSize = fonts.reduce((sum, f) => sum + f.size, 0)

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFonts: fonts.length,
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      usedFonts: usedFonts.length,
      recommendations: recommendations.length,
    },
    fonts: fonts,
    usedFonts: usedFonts,
    recommendations: recommendations,
  }

  const reportPath = path.join(REPORT_DIR, `font-analysis-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Generate text summary
  const summaryPath = path.join(REPORT_DIR, "summary.txt")
  let summary = "Font Optimization Analysis\n"
  summary += "=".repeat(50) + "\n\n"
  summary += `Timestamp: ${report.timestamp}\n`
  summary += `Total Fonts: ${report.summary.totalFonts}\n`
  summary += `Total Size: ${report.summary.totalSizeMB} MB\n`
  summary += `Used Fonts: ${report.summary.usedFonts}\n\n`

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
            : item.name
              ? `${item.name} (${item.size || ""})`
              : `${item.family} (${item.variants} variants, ${item.totalSize})`
        summary += `   - ${itemStr}\n`
      })
      if (rec.items.length > 5) {
        summary += `   ... and ${rec.items.length - 5} more\n`
      }
    }
    summary += `   Action: ${rec.action}\n\n`
  })

  summary += "\nAll Fonts:\n"
  summary += "-".repeat(50) + "\n"
  report.fonts.forEach((font, i) => {
    summary += `${i + 1}. ${font.name}: ${font.sizeFormatted}\n`
  })

  fs.writeFileSync(summaryPath, summary)

  console.log(`\n✅ Report saved to: ${reportPath}`)
  console.log(`✅ Summary saved to: ${summaryPath}`)

  return report
}

// Main execution
function main() {
  console.log("🚀 Starting Font Optimization Analysis\n")

  try {
    // Find fonts in assets and Android fonts directory
    const fonts = [...findFontFiles(ASSETS_DIR), ...findFontFiles(ANDROID_FONTS_DIR)]

    if (fonts.length === 0) {
      console.log("✅ No font files found. App may be using system fonts.")
      return
    }

    console.log(`📝 Found ${fonts.length} font files\n`)

    const usedFonts = analyzeFontUsage()
    const recommendations = generateRecommendations(fonts, usedFonts)
    const report = generateReport(fonts, usedFonts, recommendations)

    console.log("\n📊 Analysis Summary:")
    console.log(`   Total fonts: ${report.summary.totalFonts}`)
    console.log(`   Total size: ${report.summary.totalSizeMB} MB`)
    console.log(`   Used fonts: ${report.summary.usedFonts}`)
    console.log(`   Recommendations: ${report.summary.recommendations}`)

    console.log("\n📋 Recommendations:")
    report.recommendations.forEach((rec, i) => {
      const icon = rec.type === "warning" ? "⚠️" : "ℹ️"
      console.log(`   ${icon} ${rec.message}`)
    })

    console.log("\n✅ Font optimization analysis complete!")
  } catch (error) {
    console.error("❌ Error during analysis:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { findFontFiles, analyzeFontUsage, generateRecommendations }







