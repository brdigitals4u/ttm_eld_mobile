/**
 * Secure Configuration Service
 * Provides secure access to API keys and sensitive configuration stored in native Android Keystore
 */

import { NativeModules, Platform } from "react-native"

const { SecureConfig } = NativeModules

interface FreshchatConfig {
  appId: string
  appKey: string
  domain: string
}

interface AwsConfig {
  apiGateway: {
    baseUrl: string
  }
  cognito: {
    userPoolId: string
    clientId: string
  }
}

class SecureConfigService {
  private freshchatConfig: FreshchatConfig | null = null
  private awsConfig: AwsConfig | null = null
  private initialized = false

  /**
   * Initialize secure configuration
   * Should be called early in app lifecycle
   */
  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS !== "android") {
      return
    }

    try {
      // Load configurations from secure storage
      await Promise.all([this.loadFreshchatConfig(), this.loadAwsConfig()])
      this.initialized = true
    } catch (error) {
      console.error("[SecureConfig] Failed to initialize:", error)
      // Fallback to environment variables or defaults
    }
  }

  /**
   * Load Freshchat configuration from secure storage
   */
  private async loadFreshchatConfig(): Promise<void> {
    if (!SecureConfig) {
      // Fallback to environment variables
      this.freshchatConfig = {
        appId: process.env.EXPO_PUBLIC_FRESHCHAT_APP_ID || "",
        appKey: process.env.EXPO_PUBLIC_FRESHCHAT_APP_KEY || "",
        domain: process.env.EXPO_PUBLIC_FRESHCHAT_DOMAIN || "",
      }
      return
    }

    try {
      const config = await SecureConfig.getFreshchatConfig()
      this.freshchatConfig = config
    } catch (error) {
      console.warn("[SecureConfig] Failed to load Freshchat config, using fallback:", error)
      // Fallback to environment variables
      this.freshchatConfig = {
        appId: process.env.EXPO_PUBLIC_FRESHCHAT_APP_ID || "",
        appKey: process.env.EXPO_PUBLIC_FRESHCHAT_APP_KEY || "",
        domain: process.env.EXPO_PUBLIC_FRESHCHAT_DOMAIN || "",
      }
    }
  }

  /**
   * Load AWS configuration from secure storage
   */
  private async loadAwsConfig(): Promise<void> {
    if (!SecureConfig) {
      // Fallback to hardcoded values (will be obfuscated)
      this.awsConfig = {
        apiGateway: {
          baseUrl: "https://oy47qb63f3.execute-api.us-east-1.amazonaws.com",
        },
        cognito: {
          userPoolId: "us-east-1_JEeMFBWHc",
          clientId: "3r6e3uq1motr9n3u5b4uonm9th",
        },
      }
      return
    }

    try {
      const config = await SecureConfig.getAwsConfig()
      this.awsConfig = config
    } catch (error) {
      console.warn("[SecureConfig] Failed to load AWS config, using fallback:", error)
      // Fallback to hardcoded values (will be obfuscated)
      this.awsConfig = {
        apiGateway: {
          baseUrl: "https://oy47qb63f3.execute-api.us-east-1.amazonaws.com",
        },
        cognito: {
          userPoolId: "us-east-1_JEeMFBWHc",
          clientId: "3r6e3uq1motr9n3u5b4uonm9th",
        },
      }
    }
  }

  /**
   * Get Freshchat configuration
   */
  getFreshchatConfig(): FreshchatConfig {
    if (!this.freshchatConfig) {
      // Return fallback if not initialized
      return {
        appId: process.env.EXPO_PUBLIC_FRESHCHAT_APP_ID || "",
        appKey: process.env.EXPO_PUBLIC_FRESHCHAT_APP_KEY || "",
        domain: process.env.EXPO_PUBLIC_FRESHCHAT_DOMAIN || "",
      }
    }
    return this.freshchatConfig
  }

  /**
   * Get AWS configuration
   */
  getAwsConfig(): AwsConfig {
    if (!this.awsConfig) {
      // Return fallback if not initialized
      return {
        apiGateway: {
          baseUrl: "https://oy47qb63f3.execute-api.us-east-1.amazonaws.com",
        },
        cognito: {
          userPoolId: "us-east-1_JEeMFBWHc",
          clientId: "3r6e3uq1motr9n3u5b4uonm9th",
        },
      }
    }
    return this.awsConfig
  }

  /**
   * Set a secure value (for initialization from secure backend)
   * This should only be called during app initialization
   */
  async setSecureValue(key: string, value: string): Promise<boolean> {
    if (!SecureConfig || Platform.OS !== "android") {
      return false
    }

    try {
      await SecureConfig.setSecureValue(key, value)
      return true
    } catch (error) {
      console.error("[SecureConfig] Failed to set secure value:", error)
      return false
    }
  }

  /**
   * Get a secure value by key
   */
  async getSecureValue(key: string, defaultValue: string = ""): Promise<string> {
    if (!SecureConfig || Platform.OS !== "android") {
      return defaultValue
    }

    try {
      return await SecureConfig.getSecureValue(key, defaultValue)
    } catch (error) {
      console.error("[SecureConfig] Failed to get secure value:", error)
      return defaultValue
    }
  }
}

export const secureConfigService = new SecureConfigService()
