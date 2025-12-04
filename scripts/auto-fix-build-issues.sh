#!/bin/bash
# Auto-Fix Common Build Issues
# This script automatically fixes known build configuration problems

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function log_fix() {
    echo -e "${BLUE}🔧 $1${NC}"
}

function log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "🔧 Auto-Fixing Build Issues"
echo "=========================="

# Fix 1: Remove problematic packages
log_fix "Removing problematic packages..."

if grep -q "react-native-cert-pinner" package.json 2>/dev/null; then
    log_fix "Removing react-native-cert-pinner from package.json..."
    # Use sed to remove the line (safer than npm uninstall which might fail)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' '/react-native-cert-pinner/d' package.json
    else
        sed -i '/react-native-cert-pinner/d' package.json
    fi
    rm -rf node_modules/react-native-cert-pinner 2>/dev/null || true
    log_info "Removed react-native-cert-pinner"
fi

# Fix 2: Ensure script permissions
log_fix "Setting script permissions..."
chmod +x android/scripts/ensure_16k_page.py 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
log_info "Script permissions set"

# Fix 3: Clean build artifacts
log_fix "Cleaning old build artifacts..."
if [ -d "android/app/build" ]; then
    find android/app/build -name "*.apk" -delete 2>/dev/null || true
    find android/app/build -name "*.aab" -delete 2>/dev/null || true
    log_info "Cleaned build artifacts"
fi

# Fix 4: Verify Gradle wrapper
log_fix "Verifying Gradle wrapper..."
if [ -f "android/gradlew" ]; then
    chmod +x android/gradlew
    log_info "Gradle wrapper is executable"
fi

echo ""
log_info "Auto-fix complete! Run 'npm run prebuild:check' to verify."









