/**
 * Location Queue Service
 *
 * Manages a write-ahead log of GPS locations for batch upload.
 * Implements sequence numbers, offline persistence, and automatic flushing.
 *
 * Features:
 * - Auto-incrementing sequence numbers
 * - AsyncStorage persistence for offline resilience
 * - Automatic flush every 30 seconds or when 10+ points buffered
 * - Handles server response to drop processed entries
 */

import { driverApi, LocationBatchItem, LocationBatchResponse } from "@/api/driver"
import { mapDriverStatusToAppStatus } from "@/utils/hos-status-mapper"
import { asyncStorage } from "@/utils/storage"

const LOCATION_QUEUE_KEY = "@ttm_eld_location_queue"
const LAST_SEQ_KEY = "@ttm_eld_last_seq"
const LAST_APPLIED_SEQ_KEY = "@ttm_eld_last_applied_seq"

export interface QueuedLocation extends LocationBatchItem {
  queuedAt: number // Timestamp when queued
}

type AutoDutyChangeHandler = (changes: LocationBatchResponse["auto_duty_changes"]) => void

class LocationQueueService {
  private queue: QueuedLocation[] = []
  private lastSeq: number = 0
  private lastAppliedSeq: number = 0
  private flushInterval: ReturnType<typeof setInterval> | null = null
  private isFlushing: boolean = false
  private autoDutyChangeHandler: AutoDutyChangeHandler | null = null
  private initialized: boolean = false
  private initializingPromise: Promise<void> | null = null

  /**
   * Set handler for auto-duty status changes
   */
  setAutoDutyChangeHandler(handler: AutoDutyChangeHandler | null): void {
    this.autoDutyChangeHandler = handler
  }

  /**
   * Initialize the queue from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initializingPromise) {
      return this.initializingPromise
    }

    this.initializingPromise = (async () => {
      try {
        // Load queue from storage
        const queueData = await asyncStorage.getItem(LOCATION_QUEUE_KEY)
        if (queueData) {
          this.queue = JSON.parse(queueData)
        }

        // Load last sequence number
        const lastSeqData = await asyncStorage.getItem(LAST_SEQ_KEY)
        if (lastSeqData) {
          this.lastSeq = parseInt(lastSeqData, 10)
        }

        // Load last applied sequence
        const lastAppliedSeqData = await asyncStorage.getItem(LAST_APPLIED_SEQ_KEY)
        if (lastAppliedSeqData) {
          this.lastAppliedSeq = parseInt(lastAppliedSeqData, 10)
        }

        // Remove any entries that were already processed
        this.queue = this.queue.filter((loc) => loc.seq > this.lastAppliedSeq)

        console.log("📍 LocationQueue: Initialized", {
          queueSize: this.queue.length,
          lastSeq: this.lastSeq,
          lastAppliedSeq: this.lastAppliedSeq,
        })
      } catch (error) {
        console.error("❌ LocationQueue: Failed to initialize", error)
        this.queue = []
        this.lastSeq = 0
        this.lastAppliedSeq = 0
      } finally {
        this.initialized = true
        this.initializingPromise = null
      }
    })()

    return this.initializingPromise
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return
    }
    await this.initialize()
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Add a location to the queue
   */
  async addLocation(location: {
    latitude: number
    longitude: number
    speed_mph?: number
    heading?: number
    odometer?: number
    accuracy_m?: number
  }): Promise<void> {
    await this.ensureInitialized()

    // Increment sequence number
    this.lastSeq += 1

    const queuedLocation: QueuedLocation = {
      seq: this.lastSeq,
      device_time: new Date().toISOString(),
      latitude: location.latitude,
      longitude: location.longitude,
      speed_mph: location.speed_mph,
      heading: location.heading,
      odometer: location.odometer,
      accuracy_m: location.accuracy_m,
      queuedAt: Date.now(),
    }

    this.queue.push(queuedLocation)

    // Persist to storage
    await this.persistQueue()
    await this.persistLastSeq()

    console.log("📍 LocationQueue: Added location", {
      seq: queuedLocation.seq,
      queueSize: this.queue.length,
    })

    // Auto-flush if queue is large enough
    if (this.queue.length >= 10) {
      await this.flush()
    }
  }

  /**
   * Flush the queue to the server
   */
  async flush(): Promise<LocationBatchResponse | null> {
    await this.ensureInitialized()

    if (this.isFlushing) {
      console.log("📍 LocationQueue: Already flushing, skipping")
      return null
    }

    if (this.queue.length === 0) {
      console.log("📍 LocationQueue: Queue is empty, nothing to flush")
      return null
    }

    this.isFlushing = true

    try {
      // Get locations to send (remove queuedAt before sending)
      const locationsToSend: LocationBatchItem[] = this.queue.map(({ queuedAt, ...loc }) => loc)

      console.log("📍 LocationQueue: Flushing", {
        count: locationsToSend.length,
        firstSeq: locationsToSend[0]?.seq,
        lastSeq: locationsToSend[locationsToSend.length - 1]?.seq,
      })

      // Send to server
      const response = await driverApi.submitLocationBatch(locationsToSend)

      // Remove processed entries
      if (response.applied_up_to_seq !== undefined) {
        this.lastAppliedSeq = response.applied_up_to_seq
        this.queue = this.queue.filter((loc) => loc.seq > response.applied_up_to_seq)
        await this.persistLastAppliedSeq()
        await this.persistQueue()

        console.log("✅ LocationQueue: Flush successful", {
          appliedUpToSeq: response.applied_up_to_seq,
          processedCount: response.processed_count,
          remainingInQueue: this.queue.length,
          autoDutyChanges: response.auto_duty_changes?.length || 0,
        })

        // Handle auto-duty changes if any
        if (response.auto_duty_changes && response.auto_duty_changes.length > 0) {
          console.log("🔄 LocationQueue: Auto-duty changes detected", response.auto_duty_changes)
          if (this.autoDutyChangeHandler) {
            this.autoDutyChangeHandler(response.auto_duty_changes)
          }
        }

        // Return response so caller can handle auto-duty changes
        return response
      }

      // If no applied_up_to_seq, assume all were processed
      this.queue = []
      await this.persistQueue()

      return response
    } catch (error) {
      console.error("❌ LocationQueue: Flush failed", error)
      // Keep entries in queue for retry
      return null
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Start automatic flushing (every 30 seconds)
   */
  startAutoFlush(intervalMs: number = 30000): void {
    this.ensureInitialized().catch((error) => {
      console.error("❌ LocationQueue: Failed to ensure initialization before auto-flush", error)
    })

    if (this.flushInterval) {
      this.stopAutoFlush()
    }

    this.flushInterval = setInterval(() => {
      this.flush().catch((error) => {
        console.error("❌ LocationQueue: Auto-flush error", error)
      })
    }, intervalMs)

    console.log("📍 LocationQueue: Auto-flush started", { intervalMs })
  }

  /**
   * Stop automatic flushing
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
      console.log("📍 LocationQueue: Auto-flush stopped")
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * Get last applied sequence number
   */
  getLastAppliedSeq(): number {
    return this.lastAppliedSeq
  }

  /**
   * Clear the queue (for testing or reset)
   */
  async clear(): Promise<void> {
    this.queue = []
    this.lastSeq = 0
    this.lastAppliedSeq = 0
    await asyncStorage.removeItem(LOCATION_QUEUE_KEY)
    await asyncStorage.removeItem(LAST_SEQ_KEY)
    await asyncStorage.removeItem(LAST_APPLIED_SEQ_KEY)
    console.log("📍 LocationQueue: Cleared")
  }

  // Private persistence methods
  private async persistQueue(): Promise<void> {
    try {
      await asyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error("❌ LocationQueue: Failed to persist queue", error)
    }
  }

  private async persistLastSeq(): Promise<void> {
    try {
      await asyncStorage.setItem(LAST_SEQ_KEY, this.lastSeq.toString())
    } catch (error) {
      console.error("❌ LocationQueue: Failed to persist lastSeq", error)
    }
  }

  private async persistLastAppliedSeq(): Promise<void> {
    try {
      await asyncStorage.setItem(LAST_APPLIED_SEQ_KEY, this.lastAppliedSeq.toString())
    } catch (error) {
      console.error("❌ LocationQueue: Failed to persist lastAppliedSeq", error)
    }
  }
}

// Export singleton instance
export const locationQueueService = new LocationQueueService()
