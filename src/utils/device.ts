/**
 * Device utilities for mobile app
 * Provides device ID, app version, and other device-specific information
 */

import { Platform } from "react-native"
import Constants from "expo-constants"
import * as Device from "expo-device"

import { asyncStorage } from "./storage"

const DEVICE_ID_KEY = "@ttm_eld_device_id"

/**
 * Get or create a unique device ID
 * Uses a stored UUID or generates a new one
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get stored device ID
    const storedId = await asyncStorage.getItem(DEVICE_ID_KEY)
    if (storedId) {
      return storedId
    }

    // Generate a new device ID
    // Format: platform-modelId-timestamp-random
    const platform = Platform.OS
    const modelId = Device.modelId || "unknown"
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const deviceId = `${platform}-${modelId}-${timestamp}-${random}`

    // Store it
    await asyncStorage.setItem(DEVICE_ID_KEY, deviceId)
    return deviceId
  } catch (error) {
    console.error("Error getting device ID:", error)
    // Fallback to a simple ID
    return `device-${Platform.OS}-${Date.now()}`
  }
}

/**
 * Get app version string
 */
export function getAppVersion(): string {
  return Constants.expoConfig?.version || "1.0.0"
}

/**
 * Get device information for API calls
 */
export async function getDeviceInfo(): Promise<{
  deviceId: string
  appVersion: string
  platform: string
  modelName: string | null
  osVersion: string | null
}> {
  return {
    deviceId: await getDeviceId(),
    appVersion: getAppVersion(),
    platform: Platform.OS,
    modelName: Device.modelName || null,
    osVersion: Device.osVersion || null,
  }
}

/**
 * Get ELD device ID from storage (if connected)
 */
export async function getEldDeviceId(): Promise<string | null> {
  try {
    const { getEldDevice } = await import("./eldStorage")
    const eldDevice = await getEldDevice()
    return eldDevice?.address || null
  } catch {
    return null
  }
}
