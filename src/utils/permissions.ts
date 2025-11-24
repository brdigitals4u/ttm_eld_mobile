// permissions.ts
import { Linking } from "react-native"
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
  /**
   * If true (default), request independent permissions in parallel.
   * If false, runs the permission requests sequentially in media->camera->location->bluetooth order.
   */
  parallel?: boolean
  /**
   * Delay in milliseconds between sequential permission requests.
   * Helps prevent system dialog conflicts, especially for Bluetooth.
   * Defaults to 500ms.
   */
  sequentialDelay?: number
}

/* ----- small helpers ----- */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

function mkResult(
  name: PermissionResult["name"],
  granted: boolean,
  status?: string,
  error?: string,
): PermissionResult {
  return { name, granted, status, error }
  }

/* ----- Media / Camera generic helper ----- */

async function checkThenRequest<TCheck extends { status?: string } | undefined, TReq extends { status?: string }>(
  name: PermissionResult["name"],
  checkFn: () => Promise<TCheck>,
  requestFn: () => Promise<TReq>,
  skipIfGranted: boolean,
  errorMessage: string,
): Promise<PermissionResult> {
  try {
    if (skipIfGranted) {
      const checkRes = await safe(checkFn, undefined)
      const status = (checkRes as any)?.status
      if (status === "granted") return mkResult(name, true, status)
    }

    const reqRes = await requestFn()
    const status = (reqRes as any)?.status
    return mkResult(name, status === "granted", status)
  } catch (err: any) {
    return mkResult(name, false, undefined, err?.message ?? errorMessage)
  }
}

/* ----- Media / Camera implementations ----- */

export async function requestMediaLibraryPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  return checkThenRequest(
    "mediaLibrary",
    () => ImagePicker.getMediaLibraryPermissionsAsync(),
    () => ImagePicker.requestMediaLibraryPermissionsAsync(),
    skipIfGranted,
    "Unable to request media library permission",
  )
}

export async function requestCameraPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  return checkThenRequest(
    "camera",
    () => ImagePicker.getCameraPermissionsAsync(),
    () => ImagePicker.requestCameraPermissionsAsync(),
    skipIfGranted,
    "Unable to request camera permission",
  )
  }

/* ----- Location (foreground only) ----- */

export async function requestLocationPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  try {
    if (skipIfGranted) {
      const check = await Location.getForegroundPermissionsAsync()
      if (check.status === "granted") {
        return mkResult("location", true, check.status)
      }
    }

    const foreground = await Location.requestForegroundPermissionsAsync()
    return mkResult("location", foreground.status === "granted", foreground.status)
  } catch (error: any) {
    return mkResult("location", false, undefined, error?.message ?? "Unable to request location permission")
  }
}

/* ----- Bluetooth (native module) ----- */

/**
 * Expectations (JS side):
 * - JMBluetoothService.requestPermissions({ checkOnly: true }) should return a "check-only" response
 *   without showing any permission dialogs (native short-circuit).
 * - Fallback: if native does not accept an options object, the JS code will still call it with undefined
 *   and treat boolean or object responses identically.
 */

type JBRequestPermsArg = { checkOnly?: boolean } | undefined
type JBResult = boolean | { granted: boolean; message?: string; status?: string } | undefined

async function callJMBluetoothRequest(arg?: JBRequestPermsArg): Promise<JBResult> {
  // Defensive wrapper: if native accepts an object, pass it. If not, passing an object may be ignored by native layer.
  // If your native implementation requires different signature, adjust here.
  try {
    // Some native bridges may not like an undefined arg; explicitly pass arg when provided.
    if (typeof arg !== "undefined") {
      // @ts-ignore - allow passing object if native supports it
      return await JMBluetoothService.requestPermissions(arg)
    }
    // @ts-ignore
    return await JMBluetoothService.requestPermissions()
  } catch (err) {
    // If native throws, propagate up to caller to handle
    throw err
  }
}

export async function requestBluetoothPermission(skipIfGranted: boolean): Promise<PermissionResult> {
  try {
    // When skipIfGranted is requested, first try a check-only invocation to avoid dialogs.
    const result = await safe<JBResult>(() => callJMBluetoothRequest(skipIfGranted ? { checkOnly: true } : undefined), undefined)

    const granted = typeof result === "boolean" ? result : !!(result && (result as any).granted)
    const status =
      typeof result === "object" && result ? (result as any).status ?? (granted ? "granted" : "denied") : undefined

    return mkResult("bluetooth", granted, status)
  } catch (error: any) {
    return mkResult("bluetooth", false, undefined, error?.message ?? "Unable to request bluetooth permission")
    }
  }

/* ----- Public high-level API (optimized: parallel where possible) ----- */

/**
 * Requests gallery (media library), camera, location, and bluetooth permissions.
 * Returns an array describing individual results.
 *
 * @param options optional settings, currently supports skipIfGranted and parallel
 */
export async function requestCorePermissions(
  options: RequestPermissionsOptions = {},
): Promise<PermissionResult[]> {
  const skipIfGranted = options.skipIfGranted ?? true
  const parallel = options.parallel ?? true

  const tasks = [
    () => requestMediaLibraryPermission(skipIfGranted),
    () => requestCameraPermission(skipIfGranted),
    () => requestLocationPermission(skipIfGranted),
    () => requestBluetoothPermission(skipIfGranted),
  ]

  if (parallel) {
    // run all at once (each helper already handles its own errors)
    const results = await Promise.all(tasks.map((t) => t()))
    return results
  }

  // sequential: useful when you explicitly want ordered dialogs
  const delay = options.sequentialDelay ?? 500
  const results: PermissionResult[] = []
  for (let i = 0; i < tasks.length; i++) {
    // Add delay between requests to prevent system dialog conflicts
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    // do not throw — helpers return a PermissionResult with error field if something went wrong
    const r = await tasks[i]()
    results.push(r)
  }
  return results
}

/**
 * Convenience helper that returns true only if every permission was granted.
 */
export async function ensureCorePermissions(options?: RequestPermissionsOptions): Promise<boolean> {
  const results = await requestCorePermissions(options)
  return results.every((permission) => permission.granted)
}

/* ----- Check-only flows (no dialogs when possible) ----- */

async function checkMediaLibraryPermission(): Promise<PermissionResult> {
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync()
    return mkResult("mediaLibrary", status === "granted", status)
  } catch (error: any) {
    return mkResult("mediaLibrary", false, undefined, error?.message ?? "Unable to check media library permission")
  }
}

async function checkCameraPermission(): Promise<PermissionResult> {
  try {
    const { status } = await ImagePicker.getCameraPermissionsAsync()
    return mkResult("camera", status === "granted", status)
  } catch (error: any) {
    return mkResult("camera", false, undefined, error?.message ?? "Unable to check camera permission")
  }
}

async function checkLocationPermission(): Promise<PermissionResult> {
  try {
    const foreground = await Location.getForegroundPermissionsAsync()
    return mkResult("location", foreground.status === "granted", foreground.status)
  } catch (error: any) {
    return mkResult("location", false, undefined, error?.message ?? "Unable to check location permission")
  }
}

async function checkBluetoothPermission(): Promise<PermissionResult> {
  try {
    // Use checkOnly to avoid dialogs when possible
    const result = await safe<JBResult>(() => callJMBluetoothRequest({ checkOnly: true }), undefined)
    const granted = typeof result === "boolean" ? result : !!(result && (result as any).granted)
    const status =
      typeof result === "object" && result ? (result as any).status ?? (granted ? "granted" : "denied") : undefined
    return mkResult("bluetooth", granted, status)
  } catch (error: any) {
    return mkResult("bluetooth", false, undefined, error?.message ?? "Unable to check bluetooth permission")
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

/* ----- Settings helper ----- */

export async function openPermissionSettings(): Promise<void> {
  try {
    await Linking.openSettings()
  } catch (error) {
    console.error("Failed to open app settings:", error)
  }
}
