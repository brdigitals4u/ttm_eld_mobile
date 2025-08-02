const sharp = require('sharp');
const path = require('path');

async function createSplashIcon() {
  const assetsDir = path.join(__dirname, '../assets/images');
  
  console.log('🎨 Creating splash icon (1024x1024)...');
  
  try {
    // Create a splash icon from the logo
    await sharp(path.join(assetsDir, 'logo.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'splash-icon.png'));
    
    console.log('✅ Successfully created splash-icon.png (1024x1024)');
    console.log('📱 This icon will be used for the splash screen');
  } catch (error) {
    console.error('❌ Error creating splash icon:', error.message);
  }
}

createSplashIcon().catch(console.error); 