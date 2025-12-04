#!/usr/bin/env node
/**
 * Dependency Alternatives Evaluation Script
 * Evaluates large dependencies and suggests lighter alternatives
 */

const fs = require("fs")
const path = require("path")

const PACKAGE_JSON = path.join(__dirname, "../package.json")
const REPORT_DIR = path.join(__dirname, "../dependency-alternatives")

// Known large dependencies and their alternatives
const DEPENDENCY_ALTERNATIVES = {
  "realm": {
    name: "realm",
    size: "~10-15 MB",
    alternatives: [
      {
        name: "react-native-mmkv",
        size: "~50 KB",
        savings: "~10-15 MB",
        notes: "Already using MMKV. Consider removing Realm if not needed for complex queries.",
        risk: "Medium - Requires code migration",
      },
      {
        name: "@react-native-async-storage/async-storage",
        size: "~100 KB",
        savings: "~10-15 MB",
        notes: "Simple key-value storage. Already in dependencies.",
        risk: "Low - Simple replacement",
      },
    ],
  },
  "react-native-pdf": {
    name: "react-native-pdf",
    size: "~5-8 MB",
    alternatives: [
      {
        name: "WebView-based PDF viewer",
        size: "~0 MB (uses system)",
        savings: "~5-8 MB",
        notes: "Use React Native WebView with PDF.js or system PDF viewer",
        risk: "Low - Native solution",
      },
    ],
  },
  "victory-native": {
    name: "victory-native",
    size: "~3-5 MB",
    alternatives: [
      {
        name: "react-native-chart-kit",
        size: "~500 KB",
        savings: "~2.5-4.5 MB",
        notes: "Already in dependencies. Consider consolidating to one chart library.",
        risk: "Medium - Requires chart migration",
      },
      {
        name: "react-native-svg + custom charts",
        size: "~200 KB",
        savings: "~2.8-4.8 MB",
        notes: "Lightweight custom solution using SVG",
        risk: "High - Requires custom implementation",
      },
    ],
  },
  "victory": {
    name: "victory",
    size: "~2-3 MB",
    alternatives: [
      {
        name: "react-native-chart-kit",
        size: "~500 KB",
        savings: "~1.5-2.5 MB",
        notes: "Already in dependencies. Consider consolidating.",
        risk: "Medium - Requires chart migration",
      },
    ],
  },
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function analyzeDependencies() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"))
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const evaluations = []

  Object.keys(DEPENDENCY_ALTERNATIVES).forEach((depName) => {
    if (allDeps[depName]) {
      const depInfo = DEPENDENCY_ALTERNATIVES[depName]
      evaluations.push({
        current: {
          name: depName,
          version: allDeps[depName],
          size: depInfo.size,
        },
        alternatives: depInfo.alternatives,
      })
    }
  })

  return evaluations
}

function generateRecommendations(evaluations) {
  const recommendations = []

  evaluations.forEach((eval) => {
    eval.alternatives.forEach((alt) => {
      recommendations.push({
        type: "info",
        priority: alt.risk === "Low" ? "high" : alt.risk === "Medium" ? "medium" : "low",
        category: "dependency-alternative",
        current: eval.current.name,
        alternative: alt.name,
        savings: alt.savings,
        notes: alt.notes,
        risk: alt.risk,
        action: `Consider replacing ${eval.current.name} with ${alt.name} to save ${alt.savings}`,
      })
    })
  })

  return recommendations
}

function generateReport(evaluations, recommendations) {
  ensureDir(REPORT_DIR)

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      evaluatedDependencies: evaluations.length,
      totalRecommendations: recommendations.length,
      potentialSavings: calculatePotentialSavings(recommendations),
    },
    evaluations,
    recommendations,
  }

  const reportPath = path.join(REPORT_DIR, `dependency-alternatives-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Generate text summary
  const summaryPath = path.join(REPORT_DIR, "summary.txt")
  let summary = "Dependency Alternatives Evaluation\n"
  summary += "=".repeat(50) + "\n\n"
  summary += `Timestamp: ${report.timestamp}\n`
  summary += `Evaluated Dependencies: ${report.summary.evaluatedDependencies}\n`
  summary += `Total Recommendations: ${report.summary.totalRecommendations}\n`
  summary += `Potential Savings: ${report.summary.potentialSavings}\n\n`

  summary += "Evaluations:\n"
  summary += "-".repeat(50) + "\n"
  evaluations.forEach((eval, i) => {
    summary += `\n${i + 1}. ${eval.current.name} (${eval.current.size})\n`
    summary += `   Current Version: ${eval.current.version}\n`
    summary += `   Alternatives:\n`
    eval.alternatives.forEach((alt, j) => {
      summary += `     ${j + 1}. ${alt.name} (${alt.size})\n`
      summary += `        Savings: ${alt.savings}\n`
      summary += `        Risk: ${alt.risk}\n`
      summary += `        Notes: ${alt.notes}\n`
    })
  })

  summary += "\n\nRecommendations (by Priority):\n"
  summary += "-".repeat(50) + "\n"
  const sortedRecs = recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  sortedRecs.forEach((rec, i) => {
    const icon = rec.risk === "Low" ? "✅" : rec.risk === "Medium" ? "⚠️" : "🔴"
    summary += `${i + 1}. ${icon} [${rec.priority.toUpperCase()}] ${rec.action}\n`
    summary += `   Current: ${rec.current}\n`
    summary += `   Alternative: ${rec.alternative}\n`
    summary += `   Savings: ${rec.savings}\n`
    summary += `   Risk: ${rec.risk}\n`
    summary += `   Notes: ${rec.notes}\n\n`
  })

  fs.writeFileSync(summaryPath, summary)

  console.log(`\n✅ Report saved to: ${reportPath}`)
  console.log(`✅ Summary saved to: ${summaryPath}`)

  return report
}

function calculatePotentialSavings(recommendations) {
  // Extract savings from recommendations (simplified)
  const savings = new Set()
  recommendations.forEach((rec) => {
    if (rec.savings) {
      savings.add(rec.savings)
    }
  })

  return Array.from(savings).join(", ")
}

// Main execution
function main() {
  console.log("🚀 Starting Dependency Alternatives Evaluation\n")

  try {
    const evaluations = analyzeDependencies()

    if (evaluations.length === 0) {
      console.log("✅ No large dependencies found that match known alternatives.")
      return
    }

    console.log(`📦 Found ${evaluations.length} dependencies to evaluate\n`)

    const recommendations = generateRecommendations(evaluations)
    const report = generateReport(evaluations, recommendations)

    console.log("\n📊 Evaluation Summary:")
    console.log(`   Evaluated: ${report.summary.evaluatedDependencies} dependencies`)
    console.log(`   Recommendations: ${report.summary.totalRecommendations}`)
    console.log(`   Potential Savings: ${report.summary.potentialSavings}`)

    console.log("\n📋 Top Recommendations:")
    const topRecs = recommendations.filter((r) => r.priority === "high").slice(0, 5)

    topRecs.forEach((rec, i) => {
      const icon = rec.risk === "Low" ? "✅" : "⚠️"
      console.log(`   ${icon} ${rec.action}`)
    })

    console.log("\n✅ Dependency alternatives evaluation complete!")
  } catch (error) {
    console.error("❌ Error during evaluation:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { analyzeDependencies, generateRecommendations }








