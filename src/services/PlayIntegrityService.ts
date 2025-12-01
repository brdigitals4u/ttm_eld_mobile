import { NativeModules, Platform } from "react-native"

const { PlayIntegrityModule } = NativeModules

export interface IntegrityTokenResult {
  token: string
  success: boolean
}

export interface IntegrityAvailabilityResult {
  available: boolean
  message: string
}

export interface IntegrityError {
  code: string
  message: string
}

/**
 * Service for Google Play Integrity API
 *
 * This service provides device integrity verification to protect the app
 * from tampering, root detection, and ensure the app is running on a
 * genuine Android device.
 *
 * Note: The integrity token should be verified on your backend server.
 * Never trust client-side verification alone.
 */
class PlayIntegrityService {
  /**
   * Check if Play Integrity API is available on this device
   * @returns Promise with availability status
   */
  async isAvailable(): Promise<IntegrityAvailabilityResult> {
    if (Platform.OS !== "android") {
      return {
        available: false,
        message: "Play Integrity API is only available on Android",
      }
    }

    if (!PlayIntegrityModule) {
      return {
        available: false,
        message: "Play Integrity module not found",
      }
    }

    try {
      return await PlayIntegrityModule.isPlayIntegrityAvailable()
    } catch (error) {
      console.error("Error checking Play Integrity availability:", error)
      return {
        available: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Request an integrity token from Google Play Integrity API
   *
   * @param nonce A unique nonce for this request. For security, this should
   *              be generated server-side and passed to the client.
   *              If not provided, a client-generated nonce will be used (less secure).
   * @returns Promise with integrity token
   *
   * @example
   * ```typescript
   * // Get nonce from your backend
   * const nonce = await fetchNonceFromBackend()
   *
   * // Request integrity token
   * const result = await PlayIntegrityService.requestToken(nonce)
   *
   * // Send token to backend for verification
   * await verifyTokenOnBackend(result.token)
   * ```
   */
  async requestToken(nonce?: string, cloudProjectNumber?: string): Promise<IntegrityTokenResult> {
    if (Platform.OS !== "android") {
      throw new Error("Play Integrity API is only available on Android")
    }

    if (!PlayIntegrityModule) {
      throw new Error("Play Integrity module not found")
    }

    // Generate a nonce if not provided (less secure, but better than nothing)
    const tokenNonce = nonce || this.generateNonce()

    try {
      const result = await PlayIntegrityModule.requestIntegrityToken(
        tokenNonce,
        cloudProjectNumber || null,
      )
      return result as IntegrityTokenResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Error requesting integrity token:", errorMessage)
      throw new Error(`Play Integrity API error: ${errorMessage}`)
    }
  }

  /**
   * Generate a client-side nonce (less secure than server-generated)
   * For production, always use server-generated nonces.
   */
  private generateNonce(): string {
    // Generate a random nonce
    const array = new Uint8Array(16)
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(array)
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
    }
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }

  /**
   * Verify device integrity (convenience method)
   *
   * This method checks if Play Integrity is available and requests a token.
   * The token should be verified on your backend server.
   *
   * @param nonce Optional nonce (should be server-generated for security)
   * @returns Promise with verification result
   */
  async verifyDeviceIntegrity(nonce?: string): Promise<{
    available: boolean
    token?: string
    error?: string
  }> {
    try {
      // Check availability first
      const availability = await this.isAvailable()
      if (!availability.available) {
        return {
          available: false,
          error: availability.message,
        }
      }

      // Request token
      const result = await this.requestToken(nonce)
      return {
        available: true,
        token: result.token,
      }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export const playIntegrityService = new PlayIntegrityService()
