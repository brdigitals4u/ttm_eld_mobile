#!/bin/bash
# Native Library Analysis Script
# Analyzes .so files in AAB/APK to identify optimization opportunities

set -e

AAB_PATH="${1:-}"
TEMP_DIR="/tmp/native-libs-analysis-$$"
REPORT_DIR="$(dirname "$0")/../native-libs-analysis"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

function log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
}

function ensure_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

function find_aab() {
    # Try to find the most recent AAB
    local aab_dir="$(dirname "$0")/../android/app/build/outputs/bundle/release"
    if [ -d "$aab_dir" ]; then
        local latest_aab=$(ls -t "$aab_dir"/*.aab 2>/dev/null | head -1)
        if [ -n "$latest_aab" ]; then
            echo "$latest_aab"
            return 0
        fi
    fi
    
    # Try APK
    local apk_dir="$(dirname "$0")/../android/app/build/outputs/apk/release"
    if [ -d "$apk_dir" ]; then
        local latest_apk=$(ls -t "$apk_dir"/*.apk 2>/dev/null | head -1)
        if [ -n "$latest_apk" ]; then
            echo "$latest_apk"
            return 0
        fi
    fi
    
    return 1
}

function extract_archive() {
    local archive="$1"
    local output_dir="$2"
    
    log_info "Extracting $archive..."
    unzip -q "$archive" -d "$output_dir"
}

function analyze_native_libs() {
    local lib_dir="$1"
    local report_file="$2"
    
    log_info "Analyzing native libraries..."
    
    local total_size=0
    local arch_count=0
    declare -A arch_sizes
    declare -A lib_sizes
    
    # Find all .so files
    while IFS= read -r -d '' so_file; do
        local size=$(stat -f%z "$so_file" 2>/dev/null || stat -c%s "$so_file" 2>/dev/null)
        total_size=$((total_size + size))
        
        # Extract architecture from path
        local arch=$(echo "$so_file" | grep -oE '(armeabi-v7a|arm64-v8a|x86|x86_64)' | head -1)
        if [ -n "$arch" ]; then
            arch_count=$((arch_count + 1))
            arch_sizes["$arch"]=$((${arch_sizes["$arch"]:-0} + size))
        fi
        
        # Get library name
        local lib_name=$(basename "$so_file")
        lib_sizes["$lib_name"]=$((${lib_sizes["$lib_name"]:-0} + size))
        
    done < <(find "$lib_dir" -name "*.so" -print0 2>/dev/null)
    
    # Generate report
    {
        echo "{"
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"totalSize\": $total_size,"
        echo "  \"totalSizeMB\": $(echo "scale=2; $total_size / 1024 / 1024" | bc),"
        echo "  \"totalLibraries\": ${#lib_sizes[@]},"
        echo "  \"architectures\": {"
        
        local first_arch=true
        for arch in "${!arch_sizes[@]}"; do
            if [ "$first_arch" = true ]; then
                first_arch=false
            else
                echo ","
            fi
            local arch_size_mb=$(echo "scale=2; ${arch_sizes[$arch]} / 1024 / 1024" | bc)
            echo -n "    \"$arch\": {"
            echo -n "\"size\": ${arch_sizes[$arch]},"
            echo -n "\"sizeMB\": $arch_size_mb"
            echo -n "}"
        done
        echo ""
        echo "  },"
        echo "  \"libraries\": ["
        
        # Sort libraries by size
        local sorted_libs=($(
            for lib in "${!lib_sizes[@]}"; do
                echo "${lib_sizes[$lib]}|$lib"
            done | sort -t'|' -k1 -nr | cut -d'|' -f2
        ))
        
        local first_lib=true
        for lib in "${sorted_libs[@]}"; do
            if [ "$first_lib" = true ]; then
                first_lib=false
            else
                echo ","
            fi
            local lib_size=${lib_sizes[$lib]}
            local lib_size_mb=$(echo "scale=2; $lib_size / 1024 / 1024" | bc)
            echo -n "    {"
            echo -n "\"name\": \"$lib\","
            echo -n "\"size\": $lib_size,"
            echo -n "\"sizeMB\": $lib_size_mb"
            echo -n "}"
        done
        echo ""
        echo "  ]"
        echo "}"
    } > "$report_file"
    
    log_info "Analysis complete!"
    echo ""
    echo "📊 Native Libraries Summary:"
    echo "   Total size: $(echo "scale=2; $total_size / 1024 / 1024" | bc) MB"
    echo "   Total libraries: ${#lib_sizes[@]}"
    echo ""
    echo "   Architecture breakdown:"
    for arch in "${!arch_sizes[@]}"; do
        local arch_size_mb=$(echo "scale=2; ${arch_sizes[$arch]} / 1024 / 1024" | bc)
        echo "     $arch: $arch_size_mb MB"
    done
    echo ""
    echo "   Top 10 largest libraries:"
    local count=0
    for lib in "${sorted_libs[@]}"; do
        if [ $count -ge 10 ]; then
            break
        fi
        local lib_size_mb=$(echo "scale=2; ${lib_sizes[$lib]} / 1024 / 1024" | bc)
        echo "     $((count + 1)). $lib: $lib_size_mb MB"
        count=$((count + 1))
    done
}

function generate_recommendations() {
    local report_file="$1"
    local recommendations_file="$2"
    
    log_info "Generating recommendations..."
    
    {
        echo "# Native Library Optimization Recommendations"
        echo ""
        echo "## Analysis Results"
        echo ""
        
        # Extract data from JSON (simplified - would use jq in production)
        local total_mb=$(grep -o '"totalSizeMB":[0-9.]*' "$report_file" | cut -d':' -f2)
        local x86_size=$(grep -oE '"x86":\{"size":[0-9]+' "$report_file" | grep -oE '[0-9]+' | head -1 || echo "0")
        local x86_64_size=$(grep -oE '"x86_64":\{"size":[0-9]+' "$report_file" | grep -oE '[0-9]+' | head -1 || echo "0")
        
        echo "- Total native library size: ${total_mb} MB"
        echo ""
        echo "## Recommendations"
        echo ""
        
        # Check for x86 architectures
        if [ -n "$x86_size" ] && [ "$x86_size" != "0" ]; then
            local x86_mb=$(echo "scale=2; $x86_size / 1024 / 1024" | bc)
            echo "### 1. Remove x86/x86_64 Architectures (Mobile-only app)"
            echo "- **Savings**: ~${x86_mb} MB"
            echo "- **Action**: Remove x86 and x86_64 from build.gradle ABI filters"
            echo "- **Risk**: Low (mobile devices use ARM)"
            echo ""
        fi
        
        echo "### 2. Review Large Native Libraries"
        echo "- Check if all native libraries are necessary"
        echo "- Consider alternatives for libraries > 10 MB"
        echo "- Implement lazy loading for heavy features"
        echo ""
        
        echo "### 3. Check for Duplicate Libraries"
        echo "- Verify no duplicate .so files across architectures"
        echo "- Ensure proper library consolidation"
        echo ""
        
    } > "$recommendations_file"
    
    log_info "Recommendations saved to: $recommendations_file"
}

# Main execution
function main() {
    log_info "Starting Native Library Analysis"
    echo ""
    
    # Find AAB/APK if not provided
    if [ -z "$AAB_PATH" ]; then
        log_info "No archive path provided, searching for latest build..."
        AAB_PATH=$(find_aab)
        if [ $? -ne 0 ]; then
            log_error "No AAB or APK found. Please build the app first or provide path:"
            echo "  Usage: $0 [path-to-aab-or-apk]"
            exit 1
        fi
        log_info "Found: $AAB_PATH"
    fi
    
    if [ ! -f "$AAB_PATH" ]; then
        log_error "Archive not found: $AAB_PATH"
        exit 1
    fi
    
    ensure_dir "$TEMP_DIR"
    ensure_dir "$REPORT_DIR"
    
    # Extract archive
    extract_archive "$AAB_PATH" "$TEMP_DIR"
    
    # Find lib directory
    local lib_dir="$TEMP_DIR/lib"
    if [ ! -d "$lib_dir" ]; then
        # Try base/lib for AAB
        lib_dir="$TEMP_DIR/base/lib"
    fi
    
    if [ ! -d "$lib_dir" ]; then
        log_error "Native libraries directory not found in archive"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Analyze
    local report_file="$REPORT_DIR/native-libs-analysis-$(date +%Y%m%d-%H%M%S).json"
    analyze_native_libs "$lib_dir" "$report_file"
    
    # Generate recommendations
    local recommendations_file="$REPORT_DIR/recommendations.md"
    generate_recommendations "$report_file" "$recommendations_file"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    log_info "Analysis complete! Reports saved to: $REPORT_DIR"
}

# Check for required tools
if ! command -v unzip &> /dev/null; then
    log_error "unzip is required but not installed"
    exit 1
fi

if ! command -v bc &> /dev/null; then
    log_error "bc is required but not installed"
    exit 1
fi

main "$@"


















