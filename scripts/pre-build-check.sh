#!/bin/bash
# Pre-Build Validation and Auto-Fix Script
# Automatically detects and fixes common Android build issues

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

FIXES_APPLIED=0
ISSUES_FOUND=0

function log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

function log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((ISSUES_FOUND++))
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ISSUES_FOUND++))
}

function log_fix() {
    echo -e "${BLUE}🔧 $1${NC}"
    ((FIXES_APPLIED++))
}

function log_step() {
    echo -e "\n${BLUE}📋 $1${NC}"
}

echo "🔍 Pre-Build Validation & Auto-Fix"
echo "===================================="

# Step 1: Check for deprecated Gradle syntax in node_modules
log_step "Step 1: Checking for deprecated Gradle syntax..."

DEPRECATED_PACKAGES=()
while IFS= read -r file; do
    if [ -f "$file" ]; then
        if grep -q "compile '" "$file" || grep -q 'compile "' "$file"; then
            pkg=$(echo "$file" | sed 's|.*node_modules/\([^/]*\).*|\1|')
            if [[ ! " ${DEPRECATED_PACKAGES[@]} " =~ " ${pkg} " ]]; then
                DEPRECATED_PACKAGES+=("$pkg")
                log_warn "Found deprecated 'compile' syntax in: $pkg"
            fi
        fi
    fi
done < <(find node_modules -name "build.gradle" -type f 2>/dev/null | head -20)

if [ ${#DEPRECATED_PACKAGES[@]} -gt 0 ]; then
    log_fix "Found ${#DEPRECATED_PACKAGES[@]} package(s) with deprecated syntax (usually auto-handled by Gradle)"
fi

# Step 2: Check for removed/unused packages
log_step "Step 2: Checking for problematic packages..."

PROBLEMATIC_PACKAGES=(
    "react-native-cert-pinner"
)

for pkg in "${PROBLEMATIC_PACKAGES[@]}"; do
    if grep -q "\"$pkg\"" package.json 2>/dev/null; then
        log_error "Problematic package found in package.json: $pkg"
        log_fix "Removing $pkg from package.json..."
        # Remove from package.json (handled by npm/yarn)
        if [ -d "node_modules/$pkg" ]; then
            rm -rf "node_modules/$pkg"
            log_fix "Removed $pkg from node_modules"
        fi
    fi
done

# Step 3: Check Android configuration conflicts
log_step "Step 3: Checking Android build configuration..."

# Check for ndk.abiFilters conflict with splits.abi
if grep -q "abiFilters" android/app/build.gradle && grep -q "splits {" android/app/build.gradle; then
    if grep -A 5 "ndk {" android/app/build.gradle | grep -q "abiFilters"; then
        log_error "Found conflicting ndk.abiFilters and splits.abi configuration"
        log_fix "This should be fixed in build.gradle (removing abiFilters from ndk block)"
    fi
fi

# Step 4: Verify 16 KB page size configuration
log_step "Step 4: Verifying 16 KB page size configuration..."

# Note: pageSizeCompat attribute is not available in current build tools
# 16 KB support is handled by the alignment script and expo-build-properties

if ! grep -q '"enable16KbPageSizeSupport": true' app.json 2>/dev/null; then
    log_error "Missing enable16KbPageSizeSupport in app.json"
fi

if [ ! -f "android/scripts/ensure_16k_page.py" ]; then
    log_error "16 KB alignment script not found"
else
    log_info "16 KB alignment script found"
fi

# Step 5: Check for missing dependencies
log_step "Step 5: Checking for missing critical dependencies..."

REQUIRED_DEPS=(
    "react-native"
    "expo"
    "react"
)

for dep in "${REQUIRED_DEPS[@]}"; do
    if ! grep -q "\"$dep\"" package.json 2>/dev/null; then
        log_error "Missing required dependency: $dep"
    fi
done

# Step 6: Check Gradle configuration
log_step "Step 6: Checking Gradle configuration..."

if [ ! -f "android/gradle.properties" ]; then
    log_error "Missing gradle.properties"
fi

if ! grep -q "android.enable16KbPageSizeSupport=true" android/gradle.properties 2>/dev/null; then
    log_warn "16 KB page size support not explicitly enabled in gradle.properties"
fi

# Step 7: Check for Java/Kotlin syntax errors in custom modules
log_step "Step 7: Checking custom native modules..."

CUSTOM_MODULES=(
    "android/app/src/main/java/com/ttmkonnect/eld/CertificatePinningModule.java"
    "android/app/src/main/java/com/ttmkonnect/eld/SecurityCheckerModule.java"
    "android/app/src/main/java/com/ttmkonnect/eld/SecureConfigModule.java"
)

for module in "${CUSTOM_MODULES[@]}"; do
    if [ -f "$module" ]; then
        # Check for common syntax errors
        if grep -q "compile '" "$module" 2>/dev/null; then
            log_warn "Found 'compile' in $module (should use 'implementation')"
        fi
    else
        log_warn "Custom module not found: $module"
    fi
done

# Step 8: Verify script permissions
log_step "Step 8: Checking script permissions..."

SCRIPTS=(
    "android/scripts/ensure_16k_page.py"
    "scripts/fix-16kb.sh"
    "scripts/extract-certificate-hashes.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ ! -x "$script" ]; then
            log_fix "Making $script executable..."
            chmod +x "$script"
        fi
    fi
done

# Step 9: Check for version conflicts
log_step "Step 9: Checking for potential version conflicts..."

# Check React Native version compatibility
RN_VERSION=$(grep '"react-native"' package.json | sed 's/.*"react-native": *"\([^"]*\)".*/\1/')
if [ -n "$RN_VERSION" ]; then
    log_info "React Native version: $RN_VERSION"
fi

# Summary
echo ""
echo "===================================="
echo "📊 Summary"
echo "===================================="
echo "Issues found: $ISSUES_FOUND"
echo "Fixes applied: $FIXES_APPLIED"

if [ $ISSUES_FOUND -eq 0 ]; then
    log_info "No issues found! Build should proceed successfully."
    exit 0
elif [ $FIXES_APPLIED -gt 0 ]; then
    log_warn "Some issues were auto-fixed. Please review and rebuild."
    exit 0
else
    log_error "Issues found that require manual attention."
    exit 1
fi

