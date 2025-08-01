#!/bin/bash

echo "🔥 Firebase Analytics Release Build Test Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📱 Checking for connected devices...${NC}"
adb devices

DEVICE_COUNT=$(adb devices | grep -v "List of devices attached" | grep -v "^$" | wc -l)

if [ $DEVICE_COUNT -eq 0 ]; then
    echo -e "${RED}❌ No Android devices found${NC}"
    echo -e "${YELLOW}💡 Please:${NC}"
    echo "   1. Connect an Android device via USB with USB debugging enabled"
    echo "   2. OR start an Android emulator"
    echo "   3. Run 'adb devices' to verify connection"
    echo ""
    echo -e "${BLUE}🔧 To enable USB debugging:${NC}"
    echo "   Settings → About phone → Tap 'Build number' 7 times"
    echo "   Settings → Developer options → Enable 'USB debugging'"
    exit 1
fi

echo -e "${GREEN}✅ Found $DEVICE_COUNT device(s)${NC}"

echo -e "${BLUE}🏗️  Building release APK...${NC}"
npm run android:clean
npm run android:release

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}❌ APK not found at $APK_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installing APK on device...${NC}"
adb install -r "$APK_PATH"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Installation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ APK installed successfully${NC}"

echo -e "${BLUE}🚀 Setting up port forwarding...${NC}"
adb reverse tcp:9090 tcp:9090
adb reverse tcp:3000 tcp:3000  
adb reverse tcp:9001 tcp:9001
adb reverse tcp:8081 tcp:8081

echo -e "${GREEN}✅ Port forwarding configured${NC}"

echo -e "${BLUE}📊 Starting logcat for Firebase Analytics...${NC}"
echo -e "${YELLOW}💡 Look for the following in the logs:${NC}"
echo "   - 'Analytics Event Sent'"
echo "   - 'Firebase Analytics'"
echo "   - 'app_open', 'release_test_event'"
echo ""
echo -e "${YELLOW}🔥 Testing Firebase Analytics:${NC}"
echo "1. Navigate to the select-vehicle screen"
echo "2. Look for the black test panel at the top-left (shows 🚀 RELEASE MODE)"
echo "3. Tap 'Send Test Event' button multiple times"
echo "4. Tap 'Force Upload' to push events to Firebase"
echo "5. Check Firebase Console → Analytics → Events (wait 1-2 minutes)"
echo ""
echo -e "${BLUE}📱 Starting filtered logcat...${NC}"
adb logcat | grep -i "firebase\|analytics\|event"
