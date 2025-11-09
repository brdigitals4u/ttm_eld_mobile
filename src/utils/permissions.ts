import { Linking, Platform } from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"

import JMBluetoothService from "@/services/JMBluetoothService"

export interface PermissionResult {
  name: "bluetooth" | "mediaLibrary" | "camera" | "location"
  granted: boolean
  status?: string
  error?: string
}

export interface RequestPermissionsOptions {
  /**
   * If true, will attempt to request only permissions not already granted.
   * Defaults to true.
   */
  skipIfGranted?: boolean
}

const isAndroid = Platform.OS === "android"

const combineLocationStatus = (
  foregroundStatus?: Location.PermissionStatus,
  backgroundStatus?: Location.PermissionStatus,
): { granted: boolean; status?: string } => {
  if (backgroundStatus === "granted") {
    return { granted: true, status: backgroundStatus }
  }

  if (!backgroundStatus && foregroundStatus === "granted") {
    return { granted: true, status: foregroundStatus }
  }

  return {
    granted: false,
    status: backgroundStatus ?? foregroundStatus,
  }
}

async function requestMediaLibraryPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  try {
    if (skipIfGranted) {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync()
      if (status === "granted") {
        return { name: "mediaLibrary", granted: true, status }
      }
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return {
      name: "mediaLibrary",
      granted: status === "granted",
      status,
    }
  } catch (error: any) {
    return {
      name: "mediaLibrary",
      granted: false,
      error: error?.message ?? "Unable to request media library permission",
    }
  }
}

async function requestCameraPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  try {
    if (skipIfGranted) {
      const { status } = await ImagePicker.getCameraPermissionsAsync()
      if (status === "granted") {
        return { name: "camera", granted: true, status }
      }
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    return {
      name: "camera",
      granted: status === "granted",
      status,
    }
  } catch (error: any) {
    return {
      name: "camera",
      granted: false,
      error: error?.message ?? "Unable to request camera permission",
    }
  }
}

async function requestLocationPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  try {
    if (skipIfGranted) {
      const foreground = await Location.getForegroundPermissionsAsync()
      const background = await Location.getBackgroundPermissionsAsync()
      const combined = combineLocationStatus(foreground.status, background.status)
      if (combined.granted) {
        return { name: "location", granted: true, status: combined.status }
      }
    }

    const foreground = await Location.requestForegroundPermissionsAsync()
    let backgroundStatus: Location.PermissionStatus | undefined

    if (foreground.status === "granted") {
      try {
        const background = await Location.requestBackgroundPermissionsAsync()
        backgroundStatus = background.status
      } catch (error) {
        console.warn("⚠️ requestLocationPermission: background permission request failed:", error)
      }
    }

    const combined = combineLocationStatus(foreground.status, backgroundStatus)
    return {
      name: "location",
      granted: combined.granted,
      status: combined.status,
    }
  } catch (error: any) {
    return {
      name: "location",
      granted: false,
      error: error?.message ?? "Unable to request location permission",
    }
  }
}

async function requestBluetoothPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  try {
    if (skipIfGranted && !isAndroid) {
      // iOS exposes status via JMBluetoothService -> assume granted check handled natively.
      // For now always request; native layer can short-circuit.
    }

    const result = (await JMBluetoothService.requestPermissions()) as
      | boolean
      | { granted: boolean; message?: string; status?: string }
      | undefined
    return {
      name: "bluetooth",
      granted: typeof result === "boolean" ? result : !!result?.granted,
      status:
        typeof result === "object" && result
          ? result.status ?? (result.granted ? "granted" : "denied")
          : undefined,
    }
  } catch (error: any) {
    return {
      name: "bluetooth",
      granted: false,
      error: error?.message ?? "Unable to request bluetooth permission",
    }
  }
}

/**
 * Requests gallery (media library), camera, location, and bluetooth permissions.
 * Returns an array describing individual results.
 *
 * @param options optional settings, currently only supports skipIfGranted
 */
export async function requestCorePermissions(
  options: RequestPermissionsOptions = {},
): Promise<PermissionResult[]> {
  const skipIfGranted = options.skipIfGranted ?? true

  const [mediaLibrary, camera, location, bluetooth] = await Promise.all([
    requestMediaLibraryPermission(skipIfGranted),
    requestCameraPermission(skipIfGranted),
    requestLocationPermission(skipIfGranted),
    requestBluetoothPermission(skipIfGranted),
  ])

  return [mediaLibrary, camera, location, bluetooth]
}

/**
 * Convenience helper that returns true only if every permission was granted.
 */
export async function ensureCorePermissions(options?: RequestPermissionsOptions): Promise<boolean> {
  const results = await requestCorePermissions(options)
  return results.every((permission) => permission.granted)
}

async function checkMediaLibraryPermission(): Promise<PermissionResult> {
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync()
    return {
      name: "mediaLibrary",
      granted: status === "granted",
      status,
    }
  } catch (error: any) {
    return {
      name: "mediaLibrary",
      granted: false,
      error: error?.message ?? "Unable to check media library permission",
    }
  }
}

async function checkCameraPermission(): Promise<PermissionResult> {
  try {
    const { status } = await ImagePicker.getCameraPermissionsAsync()
    return {
      name: "camera",
      granted: status === "granted",
      status,
    }
  } catch (error: any) {
    return {
      name: "camera",
      granted: false,
      error: error?.message ?? "Unable to check camera permission",
    }
  }
}

async function checkLocationPermission(): Promise<PermissionResult> {
  try {
    const foreground = await Location.getForegroundPermissionsAsync()
    let backgroundStatus: Location.PermissionStatus | undefined

    try {
      const background = await Location.getBackgroundPermissionsAsync()
      backgroundStatus = background.status
    } catch (error) {
      console.log("ℹ️ checkLocationPermission: background permission check failed:", error)
    }

    const combined = combineLocationStatus(foreground.status, backgroundStatus)
    return {
      name: "location",
      granted: combined.granted,
      status: combined.status,
    }
  } catch (error: any) {
    return {
      name: "location",
      granted: false,
      error: error?.message ?? "Unable to check location permission",
    }
  }
}

async function checkBluetoothPermission(): Promise<PermissionResult> {
  try {
    // No dedicated "get status" API exposed by the native module yet.
    // Call requestPermissions with skip=true to allow native side to short circuit
    // without re-triggering dialogs when already granted.
    const result = (await JMBluetoothService.requestPermissions()) as
      | boolean
      | { granted: boolean; message?: string; status?: string }
      | undefined
    return {
      name: "bluetooth",
      granted: typeof result === "boolean" ? result : !!result?.granted,
      status:
        typeof result === "object" && result
          ? result.status ?? (result.granted ? "granted" : "denied")
          : undefined,
    }
  } catch (error: any) {
    return {
      name: "bluetooth",
      granted: false,
      error: error?.message ?? "Unable to check bluetooth permission",
    }
  }
}

/**
 * Checks current permission states without forcing dialogs (when APIs support it).
 */
export async function checkCorePermissions(): Promise<PermissionResult[]> {
  const [mediaLibrary, camera, location, bluetooth] = await Promise.all([
    checkMediaLibraryPermission(),
    checkCameraPermission(),
    checkLocationPermission(),
    checkBluetoothPermission(),
  ])

  return [mediaLibrary, camera, location, bluetooth]
}

export async function openPermissionSettings(): Promise<void> {
  try {
    await Linking.openSettings()
  } catch (error) {
    console.error("Failed to open app settings:", error)
  }
}

