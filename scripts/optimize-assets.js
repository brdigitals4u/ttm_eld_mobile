#!/usr/bin/env node
/**
 * Image Asset Optimization Script
 * Converts PNGs to WebP and optimizes images
 */

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const ASSETS_DIR = path.join(__dirname, "../assets")
const BACKUP_DIR = path.join(__dirname, "../assets-backup")
const OPTIMIZED_DIR = path.join(__dirname, "../assets-optimized")

let imagemin, imageminWebp, imageminPngquant

// Try to load imagemin modules
try {
  imagemin = require("imagemin")
  imageminWebp = require("imagemin-webp")
  imageminPngquant = require("imagemin-pngquant")
} catch (error) {
  console.warn(
    "⚠️  imagemin modules not found. Install with: npm install -D imagemin imagemin-webp imagemin-pngquant",
  )
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function findImageFiles(dir, extensions = [".png", ".jpg", ".jpeg"]) {
  const files = []

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.includes(ext)) {
          files.push(fullPath)
        }
      }
    }
  }

  walk(dir)
  return files
}

function getFileSize(filePath) {
  return fs.statSync(filePath).size
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function optimizeImage(inputPath, outputPath, options = {}) {
  if (!imagemin) {
    console.warn(`⚠️  Skipping ${inputPath} - imagemin not available`)
    return null
  }

  const ext = path.extname(inputPath).toLowerCase()
  const plugins = []

  if (ext === ".png") {
    // Convert PNG to WebP
    if (options.convertToWebp) {
      const webpPath = outputPath.replace(/\.png$/i, ".webp")
      await imagemin([inputPath], {
        destination: path.dirname(webpPath),
        plugins: [imageminWebp({ quality: options.webpQuality || 85 })],
      })
      return webpPath
    } else {
      // Optimize PNG
      plugins.push(imageminPngquant({ quality: [0.6, 0.8] }))
    }
  }

  if (plugins.length === 0) {
    return null
  }

  await imagemin([inputPath], {
    destination: path.dirname(outputPath),
    plugins,
  })

  return outputPath
}

function createBackup() {
  console.log("📦 Creating backup...")
  ensureDir(BACKUP_DIR)

  // Copy assets directory
  execSync(`cp -r "${ASSETS_DIR}" "${BACKUP_DIR}"`, { stdio: "inherit" })
  console.log("✅ Backup created at:", BACKUP_DIR)
}

async function optimizeAssets(options = {}) {
  const { convertToWebp = true, webpQuality = 85, dryRun = false } = options

  console.log("🖼️  Starting asset optimization...\n")

  if (!fs.existsSync(ASSETS_DIR)) {
    console.error("❌ Assets directory not found:", ASSETS_DIR)
    process.exit(1)
  }

  // Create backup
  if (!dryRun && !fs.existsSync(BACKUP_DIR)) {
    createBackup()
  }

  const imageFiles = findImageFiles(ASSETS_DIR)
  console.log(`📸 Found ${imageFiles.length} image files\n`)

  if (imageFiles.length === 0) {
    console.log("✅ No images to optimize")
    return
  }

  const stats = {
    total: imageFiles.length,
    optimized: 0,
    converted: 0,
    skipped: 0,
    originalSize: 0,
    optimizedSize: 0,
    savings: 0,
  }

  ensureDir(OPTIMIZED_DIR)

  for (const imagePath of imageFiles) {
    const relativePath = path.relative(ASSETS_DIR, imagePath)
    const outputPath = path.join(OPTIMIZED_DIR, relativePath)
    ensureDir(path.dirname(outputPath))

    const originalSize = getFileSize(imagePath)
    stats.originalSize += originalSize

    try {
      if (dryRun) {
        console.log(`[DRY RUN] Would optimize: ${relativePath} (${formatSize(originalSize)})`)
        stats.skipped++
        continue
      }

      const ext = path.extname(imagePath).toLowerCase()
      const shouldConvert = convertToWebp && ext === ".png"

      const optimizedPath = await optimizeImage(imagePath, outputPath, {
        convertToWebp: shouldConvert,
        webpQuality,
      })

      if (optimizedPath) {
        const optimizedSize = getFileSize(optimizedPath)
        stats.optimizedSize += optimizedSize
        const saved = originalSize - optimizedSize
        stats.savings += saved

        if (shouldConvert && optimizedPath.endsWith(".webp")) {
          stats.converted++
          console.log(
            `✅ Converted: ${relativePath} → ${path.basename(optimizedPath)} (${formatSize(originalSize)} → ${formatSize(optimizedSize)}, saved ${formatSize(saved)})`,
          )
        } else {
          stats.optimized++
          console.log(
            `✅ Optimized: ${relativePath} (${formatSize(originalSize)} → ${formatSize(optimizedSize)}, saved ${formatSize(saved)})`,
          )
        }
      } else {
        stats.skipped++
        console.log(`⏭️  Skipped: ${relativePath} (no optimization needed)`)
      }
    } catch (error) {
      console.error(`❌ Error optimizing ${relativePath}:`, error.message)
      stats.skipped++
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50))
  console.log("📊 Optimization Summary")
  console.log("=".repeat(50))
  console.log(`Total files: ${stats.total}`)
  console.log(`Optimized: ${stats.optimized}`)
  console.log(`Converted to WebP: ${stats.converted}`)
  console.log(`Skipped: ${stats.skipped}`)
  console.log(`\nOriginal size: ${formatSize(stats.originalSize)}`)
  console.log(`Optimized size: ${formatSize(stats.optimizedSize)}`)
  console.log(`Total savings: ${formatSize(stats.savings)}`)
  console.log(`Savings percentage: ${((stats.savings / stats.originalSize) * 100).toFixed(2)}%`)

  if (!dryRun && stats.optimizedSize > 0) {
    console.log(`\n✅ Optimized assets saved to: ${OPTIMIZED_DIR}`)
    console.log("💡 Review the optimized assets and replace originals if satisfied.")
  }

  return stats
}

function generateManifest() {
  const manifest = {
    timestamp: new Date().toISOString(),
    assets: [],
  }

  function walk(dir, baseDir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(baseDir, fullPath)

      if (entry.isDirectory()) {
        walk(fullPath, baseDir)
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath)
        manifest.assets.push({
          path: relativePath,
          size: stats.size,
          sizeFormatted: formatSize(stats.size),
          modified: stats.mtime.toISOString(),
        })
      }
    }
  }

  if (fs.existsSync(OPTIMIZED_DIR)) {
    walk(OPTIMIZED_DIR, OPTIMIZED_DIR)
  }

  const manifestPath = path.join(OPTIMIZED_DIR, "manifest.json")
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\n📋 Manifest generated: ${manifestPath}`)
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const noWebp = args.includes("--no-webp")

  try {
    await optimizeAssets({
      convertToWebp: !noWebp,
      dryRun,
    })

    if (!dryRun) {
      generateManifest()
    }
  } catch (error) {
    console.error("❌ Error during optimization:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { optimizeAssets, findImageFiles }


