#!/bin/bash
# Certificate Hash Extraction Script
# Extracts SHA-256 certificate hashes for certificate pinning

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

function log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function extract_cert_hash() {
    local domain=$1
    local port=${2:-443}
    
    log_info "Extracting certificate hash for ${domain}:${port}..."
    
    # Extract certificate and get SHA-256 hash
    local hash=$(echo | openssl s_client -connect "${domain}:${port}" -servername "${domain}" 2>/dev/null | \
        openssl x509 -pubkey -noout 2>/dev/null | \
        openssl pkey -pubin -outform der 2>/dev/null | \
        openssl dgst -sha256 -binary 2>/dev/null | \
        openssl enc -base64 2>/dev/null)
    
    if [ -z "$hash" ] || [ "$hash" == "" ]; then
        log_warn "Failed to extract hash for ${domain}"
        return 1
    fi
    
    echo "sha256/${hash}"
    return 0
}

function extract_all_certs() {
    local domain=$1
    local port=${2:-443}
    
    log_info "Extracting all certificate hashes (including chain) for ${domain}:${port}..."
    
    # Get all certificates in the chain
    echo | openssl s_client -connect "${domain}:${port}" -servername "${domain}" -showcerts 2>/dev/null | \
        awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/ {print}' | \
        while IFS= read -r line; do
            if [[ $line == *"BEGIN CERTIFICATE"* ]]; then
                cert=""
            fi
            cert="${cert}${line}\n"
            if [[ $line == *"END CERTIFICATE"* ]]; then
                echo -e "$cert" | openssl x509 -pubkey -noout 2>/dev/null | \
                    openssl pkey -pubin -outform der 2>/dev/null | \
                    openssl dgst -sha256 -binary 2>/dev/null | \
                    openssl enc -base64 2>/dev/null | \
                    xargs -I {} echo "sha256/{}"
            fi
        done
}

# Main execution
function main() {
    echo "🔐 Certificate Hash Extraction Tool"
    echo "===================================="
    echo ""
    
    # Domains to extract
    DOMAINS=(
        "api.ttmkonnect.com"
        "oy47qb63f3.execute-api.us-east-1.amazonaws.com"
    )
    
    echo "Extracting certificate hashes for the following domains:"
    for domain in "${DOMAINS[@]}"; do
        echo "  - ${domain}"
    done
    echo ""
    
    # Extract hashes
    RESULTS=()
    for domain in "${DOMAINS[@]}"; do
        hash=$(extract_cert_hash "$domain")
        if [ $? -eq 0 ]; then
            RESULTS+=("${domain}: ${hash}")
            echo "✅ ${domain}: ${hash}"
        else
            RESULTS+=("${domain}: FAILED")
            echo "❌ ${domain}: Failed to extract"
        fi
        echo ""
    done
    
    # Show where to update
    echo "===================================="
    echo "📝 Update CertificatePinningModule.java"
    echo "===================================="
    echo ""
    echo "File location:"
    echo "  android/app/src/main/java/com/ttmkonnect/eld/CertificatePinningModule.java"
    echo ""
    echo "Update these constants (around lines 31-32):"
    echo ""
    
    for result in "${RESULTS[@]}"; do
        domain=$(echo "$result" | cut -d: -f1)
        hash=$(echo "$result" | cut -d: -f2 | xargs)
        
        if [[ "$hash" == "FAILED" ]]; then
            echo "  # ${domain}: Extraction failed - check domain/port"
        else
            if [[ "$domain" == "api.ttmkonnect.com" ]]; then
                echo "  private static final String API_CERT_HASH = \"${hash}\";"
            elif [[ "$domain" == *"execute-api"* ]]; then
                echo "  private static final String AWS_CERT_HASH = \"${hash}\";"
            fi
        fi
    done
    
    echo ""
    echo "💡 Tip: You can pin multiple certificates for the same domain for redundancy"
    echo "   Example: .add(API_DOMAIN, \"sha256/HASH1\").add(API_DOMAIN, \"sha256/HASH2\")"
}

# Check for openssl
if ! command -v openssl &> /dev/null; then
    echo "❌ openssl is required but not installed"
    echo "   Install with: brew install openssl (macOS) or apt-get install openssl (Linux)"
    exit 1
fi

main "$@"













