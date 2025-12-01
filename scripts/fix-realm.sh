#!/bin/bash
# Fix Realm installation and linking

echo "🔧 Fixing Realm installation..."

# Step 1: Clean install
echo "📦 Step 1: Reinstalling dependencies..."
npm install

# Step 2: Clean Android build
echo "🧹 Step 2: Cleaning Android build..."
cd android
./gradlew clean
cd ..

# Step 3: Clear Metro cache
echo "🗑️  Step 3: Clearing Metro bundler cache..."
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Step 4: Clear React Native cache
echo "🗑️  Step 4: Clearing React Native cache..."
rm -rf $TMPDIR/react-*

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Start Metro bundler: npx react-native start --reset-cache"
echo "2. In another terminal, rebuild the app: npm run android"
echo "   OR rebuild in Android Studio"
echo ""
echo "If issues persist, try:"
echo "- Uninstall the app from your device/emulator"
echo "- Rebuild from scratch"
