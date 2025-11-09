import {
  BackgroundFetchResult,
  BackgroundFetchStatus,
  registerTaskAsync,
  unregisterTaskAsync,
  getStatusAsync,
  BackgroundFetchOptions,
} from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"
import { runBackgroundSync } from "@/services/background-sync-service"

export const BACKGROUND_SYNC_TASK = "BACKGROUND_SYNC_TASK"

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log("🔄 Background fetch task running...")
    const syncResult = await runBackgroundSync()

    if (syncResult.status === "new-data") {
      console.log("✅ Background fetch task completed with new data")
      return BackgroundFetchResult.NewData
    }

    if (syncResult.status === "no-data") {
      console.log("ℹ️ Background fetch task completed, no new data to report")
      return BackgroundFetchResult.NoData
    }

    if (syncResult.status === "skipped") {
      console.log("⚠️ Background fetch task skipped", { reason: syncResult.reason })
      return BackgroundFetchResult.NoData
    }

    throw syncResult.error ?? new Error("Unknown background sync failure")
  } catch (error) {
    console.error("❌ Background fetch task failed:", error)
    return BackgroundFetchResult.Failed
  }
})

export async function registerBackgroundFetchAsync(options?: BackgroundFetchOptions) {
  const status = await getStatusAsync()

  if (
    status === BackgroundFetchStatus.Restricted ||
    status === BackgroundFetchStatus.Denied
  ) {
    console.warn("⚠️ Background fetch is disabled or restricted on this device.")
    return
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)
  if (!isRegistered) {
    await registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: options?.minimumInterval ?? 15 * 60,
      stopOnTerminate: options?.stopOnTerminate ?? false,
      startOnBoot: options?.startOnBoot ?? true,
    })
    console.log("✅ Background fetch task registered.")
  }
}

export async function unregisterBackgroundFetchAsync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)
  if (isRegistered) {
    await unregisterTaskAsync(BACKGROUND_SYNC_TASK)
    console.log("🛑 Background fetch task unregistered.")
  }
}


