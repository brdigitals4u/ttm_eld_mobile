/**
 * ELD Offline Sync Service
 *
 * Handles offline storage and automatic upload when network returns
 * Stores events locally with synced=false, auto-uploads in batches
 */

import AsyncStorage from "@react-native-async-storage/async-storage"

import { ObdDataPayload } from "@/api/obd"
import { sendObdDataBatch } from "@/api/obd"
import { awsConfig } from "@/config/aws-config"
import { awsApiService, AwsObdPayload } from "@/services/AwsApiService"

const OFFLINE_STORAGE_KEY = "@eld_offline_records"
const SYNC_STATUS_KEY = "@eld_sync_status"
const MAX_BATCH_SIZE = 50

export interface OfflineRecord {
  id: string
  payload: ObdDataPayload
  receivedAt: Date
  synced: boolean
  syncedAt?: Date
  attempts: number
  lastError?: string
}

export interface SyncStatus {
  totalRecords: number
  syncedRecords: number
  unsyncedRecords: number
  lastSyncAttempt?: Date
  lastSyncSuccess?: Date
  isSyncing: boolean
}

class EldOfflineSyncService {
  private syncInProgress = false
  private syncListeners: Set<(status: SyncStatus) => void> = new Set()

  /**
   * Store record offline
   */
  async storeOffline(payload: ObdDataPayload): Promise<void> {
    try {
      const record: OfflineRecord = {
        id: `${payload.timestamp}-${Date.now()}-${Math.random()}`,
        payload,
        receivedAt: new Date(),
        synced: false,
        attempts: 0,
      }

      const existing = await this.getOfflineRecords()
      existing.push(record)

      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(existing))
      await this.updateSyncStatus()

      console.log("📦 Stored record offline:", record.id)
    } catch (error) {
      console.error("❌ Failed to store offline record:", error)
      throw error
    }
  }

  /**
   * Get all offline records
   */
  async getOfflineRecords(): Promise<OfflineRecord[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY)
      if (!data) return []

      const records: OfflineRecord[] = JSON.parse(data)
      // Convert date strings back to Date objects
      return records.map((record) => ({
        ...record,
        receivedAt: new Date(record.receivedAt),
        syncedAt: record.syncedAt ? new Date(record.syncedAt) : undefined,
      }))
    } catch (error) {
      console.error("❌ Failed to get offline records:", error)
      return []
    }
  }

  /**
   * Get unsynced records only
   */
  async getUnsyncedRecords(): Promise<OfflineRecord[]> {
    const all = await this.getOfflineRecords()
    return all.filter((r) => !r.synced)
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const data = await AsyncStorage.getItem(SYNC_STATUS_KEY)
      if (data) {
        const status: SyncStatus = JSON.parse(data)
        // Convert date strings back to Date objects
        return {
          ...status,
          lastSyncAttempt: status.lastSyncAttempt ? new Date(status.lastSyncAttempt) : undefined,
          lastSyncSuccess: status.lastSyncSuccess ? new Date(status.lastSyncSuccess) : undefined,
        }
      }
    } catch (error) {
      console.error("❌ Failed to get sync status:", error)
    }

    // Default status
    const records = await this.getOfflineRecords()
    return {
      totalRecords: records.length,
      syncedRecords: records.filter((r) => r.synced).length,
      unsyncedRecords: records.filter((r) => !r.synced).length,
      isSyncing: false,
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(): Promise<void> {
    const records = await this.getOfflineRecords()
    const status: SyncStatus = {
      totalRecords: records.length,
      syncedRecords: records.filter((r) => r.synced).length,
      unsyncedRecords: records.filter((r) => !r.synced).length,
      isSyncing: this.syncInProgress,
    }

    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status))
    this.notifyListeners(status)
  }

  /**
   * Sync unsynced records to backend
   */
  async syncUnsyncedRecords(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      console.log("⏳ Sync already in progress, skipping")
      return { success: 0, failed: 0 }
    }

    this.syncInProgress = true
    await this.updateSyncStatus()

    try {
      const unsynced = await this.getUnsyncedRecords()
      if (unsynced.length === 0) {
        console.log("✅ No unsynced records to upload")
        return { success: 0, failed: 0 }
      }

      console.log(`📤 Syncing ${unsynced.length} unsynced records...`)

      let successCount = 0
      let failedCount = 0

      // Process in batches
      for (let i = 0; i < unsynced.length; i += MAX_BATCH_SIZE) {
        const batch = unsynced.slice(i, i + MAX_BATCH_SIZE)
        const batchPayloads = batch.map((r) => r.payload)

        try {
          // Try local API first
          await sendObdDataBatch({ data: batchPayloads } as any)

          // Mark as synced
          for (const record of batch) {
            record.synced = true
            record.syncedAt = new Date()
            record.attempts++
          }

          successCount += batch.length
          console.log(`✅ Synced batch ${i / MAX_BATCH_SIZE + 1}: ${batch.length} records`)

          // Also sync to AWS if enabled
          if (awsConfig.features.enableAwsSync) {
            try {
              const awsPayloads: AwsObdPayload[] = batchPayloads.map((payload) => ({
                device_id: payload.device_id || payload.deviceId || "",
                timestamp: payload.timestamp,
                driver_id: payload.driver_id,
                vehicle_speed: payload.vehicle_speed,
                engine_speed: payload.engine_speed,
                coolant_temp: payload.coolant_temp,
                fuel_level: payload.fuel_level,
                odometer: payload.odometer,
                latitude: payload.latitude,
                longitude: payload.longitude,
                raw_data: payload.raw_data,
              })) as any

              await awsApiService.sendBatch(awsPayloads)
            } catch (awsError) {
              console.warn("⚠️ AWS sync failed for batch, but local sync succeeded:", awsError)
            }
          }
        } catch (error) {
          // Mark as failed
          for (const record of batch) {
            record.attempts++
            record.lastError = error instanceof Error ? error.message : String(error)
          }
          failedCount += batch.length
          console.error(`❌ Failed to sync batch ${i / MAX_BATCH_SIZE + 1}:`, error)
        }

        // Save updated records
        const allRecords = await this.getOfflineRecords()
        const updatedRecords = allRecords.map((r) => {
          const updated = batch.find((b) => b.id === r.id)
          return updated || r
        })
        await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedRecords))
      }

      // Update status
      const status = (await this.updateSyncStatus()) as any
      status.lastSyncAttempt = new Date()
      if (failedCount === 0) {
        status.lastSyncSuccess = new Date()
      }
      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status))

      console.log(`✅ Sync complete: ${successCount} succeeded, ${failedCount} failed`)
      return { success: successCount, failed: failedCount }
    } catch (error) {
      console.error("❌ Sync failed:", error)
      throw error
    } finally {
      this.syncInProgress = false
      await this.updateSyncStatus()
    }
  }

  /**
   * Clear synced records (keep only unsynced)
   */
  async clearSyncedRecords(): Promise<number> {
    try {
      const all = await this.getOfflineRecords()
      const unsynced = all.filter((r) => !r.synced)
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(unsynced))
      await this.updateSyncStatus()
      return all.length - unsynced.length
    } catch (error) {
      console.error("❌ Failed to clear synced records:", error)
      return 0
    }
  }

  /**
   * Clear all records
   */
  async clearAllRecords(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_STORAGE_KEY)
      await AsyncStorage.removeItem(SYNC_STATUS_KEY)
      await this.updateSyncStatus()
    } catch (error) {
      console.error("❌ Failed to clear all records:", error)
    }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener)
    return () => {
      this.syncListeners.delete(listener)
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach((listener) => {
      try {
        listener(status)
      } catch (error) {
        console.error("❌ Error in sync status listener:", error)
      }
    })
  }

  /**
   * Auto-sync when network is available
   * Call this periodically or when network state changes
   */
  async autoSyncIfNeeded(): Promise<void> {
    const unsynced = await this.getUnsyncedRecords()
    if (unsynced.length > 0 && !this.syncInProgress) {
      try {
        await this.syncUnsyncedRecords()
      } catch (error) {
        console.warn("⚠️ Auto-sync failed, will retry later:", error)
      }
    }
  }
}

// Singleton instance
export const eldOfflineSyncService = new EldOfflineSyncService()
