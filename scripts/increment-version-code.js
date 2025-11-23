const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

try {
  // Read the build.gradle file
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Find and increment versionCode
  const versionCodeRegex = /versionCode\s+(\d+)/;
  const match = content.match(versionCodeRegex);
  
  if (match) {
    const currentVersionCode = parseInt(match[1], 10);
    const newVersionCode = currentVersionCode + 1;
    
    // Replace the version code
    content = content.replace(versionCodeRegex, `versionCode ${newVersionCode}`);
    
    // Write back to file
    fs.writeFileSync(buildGradlePath, content, 'utf8');
    
    console.log(`✅ Incremented versionCode from ${currentVersionCode} to ${newVersionCode}`);
  } else {
    console.error('❌ Could not find versionCode in build.gradle');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error incrementing version code:', error.message);
  process.exit(1);
}


