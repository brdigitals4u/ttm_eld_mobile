/**
 * Security Service
 * Provides security checks including root detection, tamper detection, etc.
 */

import { NativeModules, Platform } from "react-native"

const { SecurityChecker } = NativeModules

interface SecurityStatus {
  isRooted: boolean
  isEmulator: boolean
  isDebuggable: boolean
  isDeveloperOptionsEnabled: boolean
  isSignatureValid: boolean
  isSecure: boolean
}

class SecurityService {
  private lastCheck: SecurityStatus | null = null
  private checkInterval: NodeJS.Timeout | null = null

  /**
   * Perform comprehensive security check
   */
  async performSecurityCheck(): Promise<SecurityStatus> {
    if (Platform.OS !== "android" || !SecurityChecker) {
      // Return safe defaults for non-Android or if module not available
      return {
        isRooted: false,
        isEmulator: false,
        isDebuggable: false,
        isDeveloperOptionsEnabled: false,
        isSignatureValid: true,
        isSecure: true,
      }
    }

    try {
      const status = await SecurityChecker.performSecurityCheck()
      this.lastCheck = status
      return status
    } catch (error) {
      console.error("[SecurityService] Failed to perform security check:", error)
      // Return safe defaults on error
      return {
        isRooted: false,
        isEmulator: false,
        isDebuggable: false,
        isDeveloperOptionsEnabled: false,
        isSignatureValid: true,
        isSecure: true,
      }
    }
  }

  /**
   * Check if device is rooted
   */
  async isRooted(): Promise<boolean> {
    if (Platform.OS !== "android" || !SecurityChecker) {
      return false
    }

    try {
      return await SecurityChecker.isRooted()
    } catch (error) {
      console.error("[SecurityService] Failed to check root status:", error)
      return false
    }
  }

  /**
   * Check if running on emulator
   */
  async isEmulator(): Promise<boolean> {
    if (Platform.OS !== "android" || !SecurityChecker) {
      return false
    }

    try {
      return await SecurityChecker.isEmulator()
    } catch (error) {
      console.error("[SecurityService] Failed to check emulator status:", error)
      return false
    }
  }

  /**
   * Verify APK signature
   */
  async verifySignature(): Promise<boolean> {
    if (Platform.OS !== "android" || !SecurityChecker) {
      return true
    }

    try {
      return await SecurityChecker.verifySignature()
    } catch (error) {
      console.error("[SecurityService] Failed to verify signature:", error)
      return true
    }
  }

  /**
   * Start periodic security checks
   */
  startPeriodicChecks(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      return
    }

    this.checkInterval = setInterval(() => {
      this.performSecurityCheck().catch(console.error)
    }, intervalMs)
  }

  /**
   * Stop periodic security checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Get last security check result
   */
  getLastCheck(): SecurityStatus | null {
    return this.lastCheck
  }

  /**
   * Check if app should continue running based on security status
   */
  async shouldContinueRunning(): Promise<boolean> {
    const status = await this.performSecurityCheck()

    // In production, you might want to block on certain conditions
    // For now, we'll just log warnings
    if (status.isRooted) {
      console.warn("[SecurityService] Device is rooted")
    }

    if (!status.isSignatureValid) {
      console.warn("[SecurityService] APK signature verification failed")
    }

    if (status.isDebuggable) {
      console.warn("[SecurityService] App is debuggable")
    }

    // Return true to allow app to continue (adjust based on your security policy)
    return true
  }
}

export const securityService = new SecurityService()

