/**
 * URL Normalization Utility
 * 
 * Fixes malformed URLs that may occur in production environments,
 * especially when environment variables are incorrectly set.
 * 
 * Handles cases like:
 * - "http:serverid" -> "http://serverid" (missing //)
 * - "https:serverid" -> "https://serverid"
 * - URLs without protocol
 * - URLs with extra slashes
 */

/**
 * Normalizes a URL string to ensure it's valid
 * @param url The URL to normalize
 * @param defaultProtocol The protocol to use if missing (default: 'http')
 * @returns A normalized URL string
 */
export function normalizeUrl(url: string | undefined | null, defaultProtocol: string = 'http'): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  // Trim whitespace
  let normalized = url.trim()

  // If empty, return empty string
  if (normalized.length === 0) {
    return ''
  }

  // Check if URL has a protocol
  const hasProtocol = /^https?:\/\//i.test(normalized)

  // If URL starts with "http:" or "https:" but missing "//", fix it
  if (/^https?:[^/]/.test(normalized)) {
    normalized = normalized.replace(/^(https?):/, '$1://')
  }

  // If no protocol at all, add default protocol
  if (!hasProtocol && !/^https?:/.test(normalized)) {
    // Check if it looks like a domain/IP (contains dots or is an IP)
    if (/^[\w.-]+(:\d+)?/.test(normalized)) {
      normalized = `${defaultProtocol}://${normalized}`
    }
  }

  // Remove trailing slashes (but keep protocol slashes)
  normalized = normalized.replace(/([^/])\/+$/, '$1')

  // Ensure protocol is followed by //
  normalized = normalized.replace(/^(https?):([^/])/, '$1://$2')

  return normalized
}

/**
 * Validates if a URL is well-formed
 * @param url The URL to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const normalized = normalizeUrl(url)
    if (normalized.length === 0) {
      return false
    }

    const urlObj = new URL(normalized)
    return !!urlObj.hostname && urlObj.hostname !== 'undefined'
  } catch {
    return false
  }
}

/**
 * Gets a safe URL for use in API calls, with fallback
 * @param url The URL to process
 * @param fallbackUrl Fallback URL if the provided one is invalid
 * @returns A valid URL string
 */
export function getSafeUrl(url: string | undefined | null, fallbackUrl?: string): string {
  const normalized = normalizeUrl(url)
  
  if (isValidUrl(normalized)) {
    return normalized
  }

  if (fallbackUrl) {
    const normalizedFallback = normalizeUrl(fallbackUrl)
    if (isValidUrl(normalizedFallback)) {
      return normalizedFallback
    }
  }

  return ''
}


