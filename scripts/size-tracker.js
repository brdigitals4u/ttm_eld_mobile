#!/usr/bin/env node
/**
 * Size Tracker Script
 * Tracks APK/AAB size changes over time
 */

const fs = require("fs")
const path = require("path")

const SIZE_HISTORY_FILE = path.join(__dirname, "../size-history.json")
const BUILD_OUTPUT_DIR = path.join(__dirname, "../android/app/build/outputs")

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function findLatestBuild() {
  // Try AAB first
  const aabDir = path.join(BUILD_OUTPUT_DIR, "bundle/release")
  if (fs.existsSync(aabDir)) {
    const aabs = fs
      .readdirSync(aabDir)
      .filter((f) => f.endsWith(".aab"))
      .map((f) => ({
        path: path.join(aabDir, f),
        name: f,
        mtime: fs.statSync(path.join(aabDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (aabs.length > 0) {
      return { ...aabs[0], type: "aab" }
    }
  }

  // Try APK
  const apkDir = path.join(BUILD_OUTPUT_DIR, "apk/release")
  if (fs.existsSync(apkDir)) {
    const apks = fs
      .readdirSync(apkDir)
      .filter((f) => f.endsWith(".apk"))
      .map((f) => ({
        path: path.join(apkDir, f),
        name: f,
        mtime: fs.statSync(path.join(apkDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (apks.length > 0) {
      return { ...apks[0], type: "apk" }
    }
  }

  return null
}

function getBuildSize(buildPath) {
  if (!fs.existsSync(buildPath)) {
    return null
  }

  const stats = fs.statSync(buildPath)
  return {
    size: stats.size,
    sizeFormatted: formatSize(stats.size),
    sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
    mtime: stats.mtime.toISOString(),
  }
}

function loadHistory() {
  if (fs.existsSync(SIZE_HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SIZE_HISTORY_FILE, "utf8"))
    } catch (error) {
      console.warn("⚠️  Could not load size history, starting fresh")
    }
  }

  return {
    builds: [],
    baseline: null,
  }
}

function saveHistory(history) {
  fs.writeFileSync(SIZE_HISTORY_FILE, JSON.stringify(history, null, 2))
}

function addBuildToHistory(history, buildInfo) {
  const build = {
    timestamp: new Date().toISOString(),
    type: buildInfo.type,
    name: buildInfo.name,
    size: buildInfo.size,
    sizeMB: buildInfo.sizeMB,
    sizeFormatted: buildInfo.sizeFormatted,
  }

  history.builds.push(build)

  // Keep only last 50 builds
  if (history.builds.length > 50) {
    history.builds = history.builds.slice(-50)
  }

  // Set baseline if not set
  if (!history.baseline) {
    history.baseline = build
  }

  return build
}

function generateReport(history, currentBuild) {
  const report = {
    timestamp: new Date().toISOString(),
    current: currentBuild,
    baseline: history.baseline,
    comparison: null,
    trend: [],
  }

  if (history.baseline) {
    const sizeDiff = currentBuild.size - history.baseline.size
    const percentDiff = ((sizeDiff / history.baseline.size) * 100).toFixed(2)

    report.comparison = {
      sizeDiff,
      sizeDiffFormatted: formatSize(Math.abs(sizeDiff)),
      percentDiff: parseFloat(percentDiff),
      isLarger: sizeDiff > 0,
    }
  }

  // Calculate trend (last 5 builds)
  if (history.builds.length >= 2) {
    const recent = history.builds.slice(-5)
    report.trend = recent
      .map((build, i) => {
        if (i === 0) return null
        const prev = recent[i - 1]
        const diff = build.size - prev.size
        return {
          from: prev.sizeFormatted,
          to: build.sizeFormatted,
          change: formatSize(Math.abs(diff)),
          percent: ((diff / prev.size) * 100).toFixed(2),
          increased: diff > 0,
        }
      })
      .filter(Boolean)
  }

  return report
}

function printReport(report) {
  console.log("\n" + "=".repeat(50))
  console.log("📊 Build Size Report")
  console.log("=".repeat(50))
  console.log(`Current Build: ${report.current.name}`)
  console.log(`Size: ${report.current.sizeFormatted} (${report.current.sizeMB} MB)`)
  console.log(`Type: ${report.current.type.toUpperCase()}`)

  if (report.comparison) {
    console.log("\n📈 Comparison to Baseline:")
    const icon = report.comparison.isLarger ? "📈" : "📉"
    const sign = report.comparison.isLarger ? "+" : "-"
    console.log(
      `   ${icon} ${sign}${report.comparison.sizeDiffFormatted} (${sign}${Math.abs(report.comparison.percentDiff)}%)`,
    )

    if (report.comparison.isLarger) {
      console.log("   ⚠️  Build size increased from baseline")
    } else {
      console.log("   ✅ Build size decreased from baseline")
    }
  }

  if (report.trend.length > 0) {
    console.log("\n📊 Recent Trend (last 5 builds):")
    report.trend.forEach((change, i) => {
      const icon = change.increased ? "📈" : "📉"
      const sign = change.increased ? "+" : "-"
      console.log(
        `   ${icon} ${sign}${change.change} (${sign}${Math.abs(parseFloat(change.percent))}%)`,
      )
    })
  }

  console.log("\n" + "=".repeat(50))
}

// Main execution
function main() {
  const args = process.argv.slice(2)
  const setBaseline = args.includes("--set-baseline")

  console.log("📏 Starting Size Tracking\n")

  const build = findLatestBuild()
  if (!build) {
    console.error("❌ No build found. Please build the app first:")
    console.error("   ./android/gradlew -p android assembleRelease")
    console.error("   or")
    console.error("   ./android/gradlew -p android bundleRelease")
    process.exit(1)
  }

  console.log(`📦 Found build: ${build.name}`)

  const sizeInfo = getBuildSize(build.path)
  if (!sizeInfo) {
    console.error("❌ Could not read build file")
    process.exit(1)
  }

  const history = loadHistory()

  if (setBaseline) {
    history.baseline = {
      timestamp: new Date().toISOString(),
      type: build.type,
      name: build.name,
      size: sizeInfo.size,
      sizeMB: sizeInfo.sizeMB,
      sizeFormatted: sizeInfo.sizeFormatted,
    }
    console.log("✅ Baseline set")
  }

  const currentBuild = addBuildToHistory(history, {
    ...build,
    ...sizeInfo,
  })

  saveHistory(history)

  const report = generateReport(history, currentBuild)
  printReport(report)

  // Save report
  const reportDir = path.join(__dirname, "../size-reports")
  ensureDir(reportDir)
  const reportPath = path.join(reportDir, `size-report-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n✅ Report saved to: ${reportPath}`)
  console.log(`✅ History saved to: ${SIZE_HISTORY_FILE}`)
}

if (require.main === module) {
  main()
}

module.exports = { findLatestBuild, getBuildSize, loadHistory }
