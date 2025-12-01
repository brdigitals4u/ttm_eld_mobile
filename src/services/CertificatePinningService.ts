/**
 * Certificate Pinning Service
 * Provides certificate pinning for API calls to prevent MITM attacks
 *
 * Note: Certificate pinning is implemented via the native CertificatePinningModule
 * which uses OkHttp CertificatePinner for Android.
 */

import { Platform } from "react-native"

// Certificate hashes (SHA-256) for pinned domains
// These should be obtained from your server's SSL certificate
const PINNED_CERTIFICATES: Record<string, string[]> = {
  "api.ttmkonnect.com": [
    // Add your actual certificate SHA-256 hashes here
    // Example: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
  ],
  "oy47qb63f3.execute-api.us-east-1.amazonaws.com": [
    // AWS API Gateway certificate hashes
  ],
}

class CertificatePinningService {
  /**
   * Check if certificate pinning is enabled for a domain
   */
  isPinningEnabled(domain: string): boolean {
    if (Platform.OS !== "android") {
      // Certificate pinning on iOS requires different implementation
      return false
    }

    return domain in PINNED_CERTIFICATES && PINNED_CERTIFICATES[domain].length > 0
  }

  /**
   * Get pinned certificates for a domain
   */
  getPinnedCertificates(domain: string): string[] {
    return PINNED_CERTIFICATES[domain] || []
  }

  /**
   * Validate certificate pinning (placeholder - implement with native module)
   * In production, this should be handled by native HTTP client
   */
  async validateCertificate(domain: string, certificateHash: string): Promise<boolean> {
    const pinnedCerts = this.getPinnedCertificates(domain)

    if (pinnedCerts.length === 0) {
      // No pinning configured for this domain
      return true
    }

    // In production, this validation should happen at the native HTTP client level
    // This is a placeholder that always returns true
    // Actual implementation should use OkHttp CertificatePinner or similar
    return pinnedCerts.includes(certificateHash)
  }

  /**
   * Add certificate hash for a domain
   */
  addPinnedCertificate(domain: string, certificateHash: string): void {
    if (!PINNED_CERTIFICATES[domain]) {
      PINNED_CERTIFICATES[domain] = []
    }

    if (!PINNED_CERTIFICATES[domain].includes(certificateHash)) {
      PINNED_CERTIFICATES[domain].push(certificateHash)
    }
  }
}

export const certificatePinningService = new CertificatePinningService()

/**
 * Instructions for implementing certificate pinning:
 *
 * 1. Extract certificate hashes from your server certificates:
 *    openssl s_client -connect api.ttmkonnect.com:443 -showcerts | \
 *    openssl x509 -pubkey -noout | \
 *    openssl pkey -pubin -outform der | \
 *    openssl dgst -sha256 -binary | \
 *    openssl enc -base64
 *
 * 2. Add the hashes to PINNED_CERTIFICATES above
 *
 * 3. For production, implement native certificate pinning:
 *    - Android: Use OkHttp CertificatePinner in a native module
 *    - iOS: Use NSURLSession with certificate pinning
 *
 * 4. Update API client to use pinned requests for critical endpoints
 */
