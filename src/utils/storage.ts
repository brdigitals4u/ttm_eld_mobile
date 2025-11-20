import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '@/api/constants'

// Secure storage functions for sensitive data
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (error) {
      console.error('Error storing secure item:', error)
      throw error
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (error) {
      console.error('Error retrieving secure item:', error)
      return null
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (error) {
      console.error('Error removing secure item:', error)
      throw error
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = [STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]
      await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)))
    } catch (error) {
      console.error('Error clearing secure storage:', error)
      throw error
    }
  },
}

// Async storage functions for non-sensitive data
export const asyncStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value)
    } catch (error) {
      console.error('Error storing async item:', error)
      throw error
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key)
    } catch (error) {
      console.error('Error retrieving async item:', error)
      return null
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing async item:', error)
      throw error
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear()
    } catch (error) {
      console.error('Error clearing async storage:', error)
      throw error
    }
  },
}

// Token management functions
export const tokenStorage = {
  async setAccessToken(token: string): Promise<void> {
    console.log('💾 TokenStorage: Setting access token:', token ? 'Token provided' : 'No token')
    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    console.log('✅ TokenStorage: Access token stored successfully')
  },

  async getAccessToken(): Promise<string | null> {
    const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    console.log('🔍 TokenStorage: Retrieved access token:', token ? 'Token exists' : 'No token found')
    return token
  },

  async setRefreshToken(token: string): Promise<void> {
    await secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token)
  },

  async getRefreshToken(): Promise<string | null> {
    return await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.setAccessToken(accessToken),
      this.setRefreshToken(refreshToken),
    ])
  },

  async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.getAccessToken(),
      this.getRefreshToken(),
    ])
    return { accessToken, refreshToken }
  },

  async removeTokens(): Promise<void> {
    await Promise.all([
      secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
    ])
  },
}

// User data storage
export const userStorage = {
  async setUserId(userId: string): Promise<void> {
    await asyncStorage.setItem(STORAGE_KEYS.USER_ID, userId)
  },

  async getUserId(): Promise<string | null> {
    return await asyncStorage.getItem(STORAGE_KEYS.USER_ID)
  },

  async removeUserId(): Promise<void> {
    await asyncStorage.removeItem(STORAGE_KEYS.USER_ID)
  },
}

// App settings storage
export const settingsStorage = {
  async setThemeMode(mode: 'light' | 'dark' | 'auto'): Promise<void> {
    await asyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode)
  },

  async getThemeMode(): Promise<'light' | 'dark' | 'auto' | null> {
    const mode = await asyncStorage.getItem(STORAGE_KEYS.THEME_MODE)
    return mode as 'light' | 'dark' | 'auto' | null
  },

  async setLanguage(language: string): Promise<void> {
    await asyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language)
  },

  async getLanguage(): Promise<string | null> {
    return await asyncStorage.getItem(STORAGE_KEYS.LANGUAGE)
  },

  async setRememberMe(remember: boolean): Promise<void> {
    await asyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, remember.toString())
  },

  async getRememberMe(): Promise<boolean> {
    const value = await asyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME)
    return value === 'true'
  },

  async setHasSeenWelcome(hasSeen: boolean): Promise<void> {
    await asyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_WELCOME, hasSeen.toString())
  },

  async getHasSeenWelcome(): Promise<boolean> {
    const value = await asyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)
    return value === 'true'
  },

  async setPrivacyPolicyAccepted(userId: string): Promise<void> {
    await asyncStorage.setItem(`${STORAGE_KEYS.PRIVACY_POLICY_ACCEPTED}_${userId}`, 'true')
  },

  async getPrivacyPolicyAccepted(userId: string): Promise<boolean> {
    const value = await asyncStorage.getItem(`${STORAGE_KEYS.PRIVACY_POLICY_ACCEPTED}_${userId}`)
    return value === 'true'
  },
}

// Helper function to get stored token (for API client)
export const getStoredToken = async (): Promise<string | null> => {
  return await tokenStorage.getAccessToken()
}

// Helper function to remove stored tokens (for logout)
export const removeStoredTokens = async (): Promise<void> => {
  await Promise.all([
    tokenStorage.removeTokens(),
    userStorage.removeUserId(),
  ])
}

// Clear all storage
export const clearAllStorage = async (): Promise<void> => {
  await Promise.all([
    secureStorage.clear(),
    asyncStorage.clear(),
  ])
}
