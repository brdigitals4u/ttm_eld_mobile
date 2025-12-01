import { Platform } from "react-native"
import * as Battery from "expo-battery"

import { deviceHeartbeatService } from "@/services/device-heartbeat-service"
import { locationQueueService } from "@/services/location-queue"

const LOW_BATTERY_THRESHOLD = 0.2

type BackgroundSyncStatus = "new-data" | "no-data" | "skipped" | "failed"

export interface BackgroundSyncResult {
  status: BackgroundSyncStatus
  reason?: string
  error?: Error
}

/**
 * Executes background-friendly sync tasks like flushing the location queue
 * and sending a heartbeat, while respecting battery saver state.
 */
export async function runBackgroundSync(): Promise<BackgroundSyncResult> {
  try {
    const powerState = await Battery.getPowerStateAsync()
    const batteryLevel =
      powerState.batteryLevel !== undefined && powerState.batteryLevel >= 0
        ? powerState.batteryLevel
        : null
    const isLowPowerMode = powerState.lowPowerMode ?? false
    const isBatteryLow = batteryLevel !== null && batteryLevel <= LOW_BATTERY_THRESHOLD

    if (isLowPowerMode || isBatteryLow) {
      console.log("🔋 BackgroundSync: Skipping due to low power state", {
        isLowPowerMode,
        batteryLevel,
      })

      return {
        status: "skipped",
        reason: isLowPowerMode ? "low-power-mode" : "low-battery",
      }
    }

    await locationQueueService.ensureInitialized()

    const queueSizeBefore = locationQueueService.getQueueSize()
    if (queueSizeBefore > 0) {
      console.log("📍 BackgroundSync: Flushing location queue during background fetch", {
        queueSizeBefore,
      })
      await locationQueueService.flush()
    } else {
      console.log("📍 BackgroundSync: Location queue empty during background fetch")
    }

    await deviceHeartbeatService.sendHeartbeatNow()

    const newData = queueSizeBefore > 0

    return {
      status: newData ? "new-data" : "no-data",
    }
  } catch (error: any) {
    console.error("❌ BackgroundSync: Failed during background fetch", error)
    return {
      status: "failed",
      error,
    }
  }
}

/**
 * Utility helper to check battery optimization state on Android.
 */
export async function isBatteryOptimizationEnabled(): Promise<boolean | null> {
  if (Platform.OS !== "android") {
    return null
  }

  try {
    return await Battery.isBatteryOptimizationEnabledAsync()
  } catch (error) {
    console.error("❌ BackgroundSync: Failed to check battery optimization state", error)
    return null
  }
}
