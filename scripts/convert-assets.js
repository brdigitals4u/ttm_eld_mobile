const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng(inputPath, outputPath, width, height) {
  try {
    console.log(`Converting ${inputPath} to ${outputPath} (${width}x${height})`);
    
    await sharp(inputPath)
      .resize(width, height)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Successfully converted ${path.basename(inputPath)}`);
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
  }
}

async function convertAllAssets() {
  const assetsDir = path.join(__dirname, '../assets/images');
  
  console.log('🎨 Starting SVG to PNG conversion...\n');
  
  // Convert logo.svg to icon.png (1024x1024)
  await convertSvgToPng(
    path.join(assetsDir, 'logo.svg'),
    path.join(assetsDir, 'icon.png'),
    1024,
    1024
  );
  
  // Convert logo.svg to adaptive-icon.png (1024x1024)
  await convertSvgToPng(
    path.join(assetsDir, 'logo.svg'),
    path.join(assetsDir, 'adaptive-icon.png'),
    1024,
    1024
  );
  
  // Convert splash.svg to splash.png (1242x2688)
  await convertSvgToPng(
    path.join(assetsDir, 'splash.svg'),
    path.join(assetsDir, 'splash.png'),
    1242,
    2688
  );
  
  // Convert logo.svg to favicon.png (32x32)
  await convertSvgToPng(
    path.join(assetsDir, 'logo.svg'),
    path.join(assetsDir, 'favicon.png'),
    32,
    32
  );
  
  console.log('\n🎉 All conversions completed!');
  console.log('\n📱 Your app now has:');
  console.log('   • Professional logo with truck and connectivity elements');
  console.log('   • Dark gradient splash screen');
  console.log('   • Modern branding similar to Samsara');
  console.log('\n🔄 Restart your development server to see the changes:');
  console.log('   npm start');
}

// Run the conversion
convertAllAssets().catch(console.error); 