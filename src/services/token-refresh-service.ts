import AsyncStorage from "@react-native-async-storage/async-storage"

import { ApiError } from "@/api/client"
import { API_ENDPOINTS, API_CONFIG } from "@/api/constants"
import { useAuthStore } from "@/stores/authStore"
import { tokenStorage } from "@/utils/storage"

// Token expiry storage key
const TOKEN_EXPIRY_KEY = "token_expiry"

// Constants
const TOKEN_EXPIRY_MINUTES = 10 // Token expires in 10 minutes
const REFRESH_INTERVAL_MS = 8 * 60 * 1000 // Refresh every 8 minutes
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000 // Refresh 2 minutes before expiry (8 minutes into 10 minute token lifetime)

interface RefreshTokenResponse {
  token: string
  refresh_token: string
  token_type?: string
  expires_in: number
}

class TokenRefreshService {
  private refreshLock = false
  private refreshPromise: Promise<boolean> | null = null

  /**
   * Store token expiry time
   */
  async setTokenExpiry(expiresIn: number): Promise<void> {
    try {
      const expiryTime = Date.now() + expiresIn * 1000
      await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
      console.log(
        "⏰ TokenRefreshService: Token expiry stored:",
        new Date(expiryTime).toISOString(),
      )
    } catch (error) {
      console.error("❌ TokenRefreshService: Failed to store token expiry:", error)
    }
  }

  /**
   * Get token expiry time
   */
  async getTokenExpiry(): Promise<number | null> {
    try {
      const expiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY)
      return expiryStr ? parseInt(expiryStr, 10) : null
    } catch (error) {
      console.error("❌ TokenRefreshService: Failed to get token expiry:", error)
      return null
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  async isTokenExpired(): Promise<boolean> {
    const expiryTime = await this.getTokenExpiry()
    if (!expiryTime) {
      return true // No expiry stored, consider expired
    }

    // Check if we're within 9 minutes of expiry
    const timeUntilExpiry = expiryTime - Date.now()
    const shouldRefresh = timeUntilExpiry <= REFRESH_BEFORE_EXPIRY_MS

    if (shouldRefresh) {
      console.log("⏰ TokenRefreshService: Token expires soon, should refresh:", {
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000),
        seconds: "seconds",
      })
    }

    return shouldRefresh
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.refreshLock && this.refreshPromise) {
      console.log("🔒 TokenRefreshService: Refresh already in progress, waiting...")
      return this.refreshPromise
    }

    this.refreshLock = true

    const refreshPromise = (async (): Promise<boolean> => {
      try {
        const refreshTokenValue = await tokenStorage.getRefreshToken()

        if (!refreshTokenValue) {
          console.error("❌ TokenRefreshService: No refresh token available")
          const { logout } = useAuthStore.getState()
          await logout()
          return false
        }

        console.log("🔄 TokenRefreshService: Refreshing token...")

        // Make refresh request without auth header (refresh endpoint doesn't require auth)
        const refreshUrl = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.ORGANIZATION.DRIVER_REFRESH_TOKEN}`
        const response = await fetch(refreshUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            refresh_token: refreshTokenValue,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          // Refresh token expired
          if (response.status === 401 || data.error?.includes("expired")) {
            console.error("❌ TokenRefreshService: Refresh token expired, forcing logout")
            await tokenStorage.removeTokens()
            const { logout } = useAuthStore.getState()
            await logout()
            return false
          }

          throw new ApiError({
            message: data.error || "Failed to refresh token",
            status: response.status,
          })
        }

        // Update tokens
        const tokenResponse = data as RefreshTokenResponse
        await tokenStorage.setTokens(tokenResponse.token, tokenResponse.refresh_token)

        // Store expiry time
        const expiresIn = tokenResponse.expires_in || 600 // Default to 10 minutes (600 seconds)
        await this.setTokenExpiry(expiresIn)

        // Update auth store
        useAuthStore.setState({ token: tokenResponse.token })

        console.log("✅ TokenRefreshService: Token refreshed successfully")
        console.log(
          "⏰ TokenRefreshService: New expiry:",
          new Date(Date.now() + expiresIn * 1000).toISOString(),
        )

        return true
      } catch (error) {
        console.error("❌ TokenRefreshService: Failed to refresh token:", error)

        // If refresh fails, clear tokens and logout
        if (error instanceof ApiError && error.status === 401) {
          await tokenStorage.removeTokens()
          const { logout } = useAuthStore.getState()
          await logout()
        }

        return false
      } finally {
        this.refreshLock = false
        this.refreshPromise = null
      }
    })()

    this.refreshPromise = refreshPromise
    return refreshPromise
  }

  /**
   * Check and refresh token if needed
   */
  async checkAndRefreshToken(): Promise<boolean> {
    const expired = await this.isTokenExpired()
    if (expired) {
      return await this.refreshToken()
    }
    return true
  }

  /**
   * Clear token expiry (on logout)
   */
  async clearTokenExpiry(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY)
      console.log("🗑️ TokenRefreshService: Token expiry cleared")
    } catch (error) {
      console.error("❌ TokenRefreshService: Failed to clear token expiry:", error)
    }
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService()
