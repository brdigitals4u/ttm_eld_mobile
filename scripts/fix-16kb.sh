#!/bin/bash
# Automated script to fix and verify 16 KB page size support
# Run this script to check configuration and guide you through the fix

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

function log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
}

function log_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

echo "🔐 16 KB Page Size Support - Verification & Fix Script"
echo "========================================================"
echo ""

# Step 1: Check AndroidManifest.xml
log_step "Step 1: Checking AndroidManifest.xml..."
if grep -q "pageSizeCompat=\"enabled\"" android/app/src/main/AndroidManifest.xml; then
    log_info "AndroidManifest.xml has pageSizeCompat=\"enabled\""
else
    log_error "AndroidManifest.xml is missing pageSizeCompat=\"enabled\""
    echo "   Fix: Add android:pageSizeCompat=\"enabled\" to the <application> tag"
    exit 1
fi

# Step 2: Check app.json
log_step "Step 2: Checking app.json..."
if grep -q "enable16KbPageSizeSupport" app.json && grep -A 2 "enable16KbPageSizeSupport" app.json | grep -q "true"; then
    log_info "app.json has enable16KbPageSizeSupport: true"
else
    log_error "app.json is missing enable16KbPageSizeSupport: true"
    echo "   Fix: Add \"enable16KbPageSizeSupport\": true to expo-build-properties android config"
    exit 1
fi

# Step 3: Check script exists
log_step "Step 3: Checking 16 KB alignment script..."
if [ -f "android/scripts/ensure_16k_page.py" ]; then
    log_info "Script exists at android/scripts/ensure_16k_page.py"
    
    # Check if executable
    if [ -x "android/scripts/ensure_16k_page.py" ]; then
        log_info "Script is executable"
    else
        log_warn "Script is not executable, making it executable..."
        chmod +x android/scripts/ensure_16k_page.py
        log_info "Script is now executable"
    fi
else
    log_error "Script not found at android/scripts/ensure_16k_page.py"
    exit 1
fi

# Step 4: Check Python 3
log_step "Step 4: Checking Python 3..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    log_info "Python 3 is available: $PYTHON_VERSION"
else
    log_error "Python 3 is not installed"
    echo "   Install with: brew install python3 (macOS) or apt-get install python3 (Linux)"
    exit 1
fi

# Step 5: Check NDK version in app.json
log_step "Step 5: Checking NDK version..."
NDK_VERSION=$(grep -A 10 "expo-build-properties" app.json | grep "ndkVersion" | head -1 | sed 's/.*"ndkVersion": *"\([^"]*\)".*/\1/')
if [ ! -z "$NDK_VERSION" ]; then
    log_info "NDK version configured: $NDK_VERSION"
    # Check if version is 28 or higher
    MAJOR_VERSION=$(echo "$NDK_VERSION" | cut -d. -f1)
    if [ "$MAJOR_VERSION" -ge 28 ]; then
        log_info "NDK version is 28+ (required for 16 KB support)"
    else
        log_warn "NDK version should be 28+ for 16 KB support"
    fi
else
    log_warn "NDK version not found in app.json"
fi

# Step 6: Check AGP version
log_step "Step 6: Checking Android Gradle Plugin version..."
if [ -f "android/build.gradle" ]; then
    AGP_VERSION=$(grep "com.android.tools.build:gradle:" android/build.gradle | head -1 | sed 's/.*gradle:\([0-9.]*\).*/\1/')
    if [ ! -z "$AGP_VERSION" ]; then
        log_info "AGP version: $AGP_VERSION"
        # Check if version is 8.5.1 or higher
        if [[ "$AGP_VERSION" > "8.5.0" ]] || [[ "$AGP_VERSION" == "8.5.1" ]]; then
            log_info "AGP version is 8.5.1+ (required for 16 KB support)"
        else
            log_warn "AGP version should be 8.5.1+ for 16 KB support"
        fi
    fi
fi

echo ""
echo "========================================================"
log_info "All configuration checks passed!"
echo ""
echo "Next steps:"
echo "  1. Clean previous builds:"
echo "     cd android && ./gradlew clean && cd .."
echo ""
echo "  2. Build the app locally:"
echo "     cd android && ./gradlew bundleRelease && cd .."
echo ""
echo "  3. Check build logs for:"
echo "     ✅ Found 16 KB alignment script at..."
echo "     ✅ Aligned X native library(ies) to 16 KB page size"
echo ""
echo "  4. Upload the AAB to Google Play Console"
echo ""

