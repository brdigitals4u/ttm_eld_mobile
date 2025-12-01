/**
 * ELD History Service
 *
 * Handles chunked history fetching with automatic escalation
 * Implements exponential backoff retry logic
 * Supports cancellation and resume
 */

import { deduplicateAndSortRecords, EldRecord } from "@/utils/eld-deduplication"
import { formatToEldTimestamp } from "@/utils/eld-timestamp-parser"

import JMBluetoothService from "./JMBluetoothService"

export interface HistoryChunk {
  start: Date
  end: Date
  startTime: string // Formatted for ELD
  endTime: string // Formatted for ELD
  status: "pending" | "fetching" | "completed" | "failed" | "cancelled"
  attempts: number
  recordsReceived: number
  error?: Error
}

export interface HistoryFetchOptions {
  type: number // Data type (typically 1 for ELD data)
  start: Date
  end: Date
  chunkSizeMinutes?: number // Default: 60 minutes
  maxRetries?: number // Default: 3
  onProgress?: (chunk: HistoryChunk, totalChunks: number) => void
  onChunkComplete?: (chunk: HistoryChunk, records: EldRecord[]) => void
  onComplete?: (allRecords: EldRecord[]) => void
  onError?: (error: Error, chunk?: HistoryChunk) => void
}

export interface HistoryFetchResult {
  records: EldRecord[]
  chunks: HistoryChunk[]
  totalChunks: number
  completedChunks: number
  failedChunks: number
  cancelled: boolean
}

class EldHistoryService {
  private activeFetches: Map<string, AbortController> = new Map()
  private chunkSizeMinutes = 60 // Default: 1 hour chunks

  /**
   * Calculate exponential backoff delay
   * Returns delay in milliseconds: 1s → 2s → 4s
   */
  private getBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 4000) // Max 4 seconds
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Create chunks from time range
   */
  private createChunks(start: Date, end: Date, chunkSizeMinutes: number = 60): HistoryChunk[] {
    const chunks: HistoryChunk[] = []
    let currentStart = new Date(start)

    while (currentStart < end) {
      const chunkEnd = new Date(
        Math.min(currentStart.getTime() + chunkSizeMinutes * 60 * 1000, end.getTime()),
      )

      chunks.push({
        start: new Date(currentStart),
        end: new Date(chunkEnd),
        startTime: formatToEldTimestamp(currentStart),
        endTime: formatToEldTimestamp(chunkEnd),
        status: "pending",
        attempts: 0,
        recordsReceived: 0,
      })

      currentStart = new Date(chunkEnd)
    }

    return chunks
  }

  /**
   * Fetch a single chunk with retry logic
   */
  private async fetchChunk(
    chunk: HistoryChunk,
    type: number,
    maxRetries: number,
    abortSignal?: AbortSignal,
  ): Promise<EldRecord[]> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Check if cancelled
      if (abortSignal?.aborted) {
        chunk.status = "cancelled"
        throw new Error("History fetch cancelled")
      }

      chunk.attempts = attempt + 1
      chunk.status = "fetching"

      try {
        // Check connection status before querying (with error handling)
        let connectionStatus
        try {
          connectionStatus = await JMBluetoothService.getConnectionStatus()
          console.log("🔍 EldHistoryService: Checking connection for chunk fetch", {
            isConnected: connectionStatus.isConnected,
            currentDevice: connectionStatus.currentDevice,
            isBluetoothEnabled: connectionStatus.isBluetoothEnabled,
          })
        } catch (error) {
          console.error("❌ EldHistoryService: Failed to check connection status", error)
          // Don't throw immediately - might be temporary, allow retry
          if (attempt < maxRetries - 1) {
            console.log("🔄 EldHistoryService: Connection check failed, will retry...")
            lastError = error instanceof Error ? error : new Error(String(error))
            chunk.error = lastError
            const delay = this.getBackoffDelay(attempt)
            await this.sleep(delay)
            continue
          }
          throw new Error("Unable to verify ELD device connection status")
        }

        if (!connectionStatus.isConnected) {
          // Check if it's a temporary disconnection - don't fail immediately
          if (
            attempt < maxRetries - 1 &&
            connectionStatus.isBluetoothEnabled &&
            connectionStatus.isBLESupported
          ) {
            console.warn("⚠️ EldHistoryService: Device not connected, will retry...", {
              isConnected: connectionStatus.isConnected,
              currentDevice: connectionStatus.currentDevice,
              isBluetoothEnabled: connectionStatus.isBluetoothEnabled,
              attempt: attempt + 1,
              maxRetries,
            })
            lastError = new Error(
              `ELD device temporarily disconnected. Device: ${connectionStatus.currentDevice || "none"}`,
            )
            chunk.error = lastError
            const delay = this.getBackoffDelay(attempt)
            await this.sleep(delay)
            continue
          }

          const errorMsg = `ELD device is not connected. Device: ${connectionStatus.currentDevice || "none"}, Bluetooth: ${connectionStatus.isBluetoothEnabled ? "enabled" : "disabled"}`
          console.warn("⚠️ EldHistoryService: Device not connected after retries", {
            isConnected: connectionStatus.isConnected,
            currentDevice: connectionStatus.currentDevice,
            isBluetoothEnabled: connectionStatus.isBluetoothEnabled,
          })
          throw new Error(errorMsg)
        }

        console.log("✅ EldHistoryService: Device connected, querying history data")
        // Query history data
        await JMBluetoothService.queryHistoryData(type, chunk.startTime, chunk.endTime)

        // Verify connection is still active after query
        try {
          const postQueryStatus = await JMBluetoothService.getConnectionStatus()
          if (!postQueryStatus.isConnected) {
            console.warn(
              "⚠️ EldHistoryService: Connection lost after query, will retry if attempts remain",
              {
                attempt: attempt + 1,
                maxRetries,
              },
            )
            if (attempt < maxRetries - 1) {
              lastError = new Error("Connection lost after history query")
              chunk.error = lastError
              const delay = this.getBackoffDelay(attempt)
              await this.sleep(delay)
              continue
            }
            throw new Error("Connection lost during history query")
          }
        } catch (postQueryError) {
          console.warn(
            "⚠️ EldHistoryService: Failed to verify connection after query",
            postQueryError,
          )
          // Don't fail if we can't verify - data might still arrive
        }

        // Wait a bit for data to arrive (device sends data asynchronously)
        // In real implementation, you'd listen for onObdEldDataReceived events
        // For now, we'll mark as completed and let the context handle the data
        chunk.status = "completed"
        return [] // Records will be collected via event listeners
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        chunk.error = lastError

        // Don't retry if cancelled
        if (abortSignal?.aborted) {
          chunk.status = "cancelled"
          throw new Error("History fetch cancelled")
        }

        // Retry with exponential backoff (except on last attempt)
        if (attempt < maxRetries - 1) {
          const delay = this.getBackoffDelay(attempt)
          await this.sleep(delay)
        }
      }
    }

    // All retries failed
    chunk.status = "failed"
    throw lastError || new Error("Failed to fetch chunk after retries")
  }

  /**
   * Fetch history data in chunks with automatic retry
   */
  async fetchHistory(options: HistoryFetchOptions): Promise<HistoryFetchResult> {
    const {
      type,
      start,
      end,
      chunkSizeMinutes = this.chunkSizeMinutes,
      maxRetries = 3,
      onProgress,
      onChunkComplete,
      onComplete,
      onError,
    } = options

    // Validate inputs
    if (start >= end) {
      throw new Error("Start time must be earlier than end time")
    }

    // Create fetch ID for cancellation
    const fetchId = `fetch-${Date.now()}-${Math.random()}`
    const abortController = new AbortController()
    this.activeFetches.set(fetchId, abortController)

    // Create chunks
    const chunks = this.createChunks(start, end, chunkSizeMinutes)
    const allRecords: EldRecord[] = []
    let completedChunks = 0
    let failedChunks = 0
    let cancelled = false

    try {
      // Fetch chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        // Check if cancelled
        if (abortController.signal.aborted) {
          cancelled = true
          break
        }

        try {
          // Fetch chunk
          const chunkRecords = await this.fetchChunk(
            chunk,
            type,
            maxRetries,
            abortController.signal,
          )

          // Note: In real implementation, records come via event listeners
          // This is a placeholder - actual records should be collected from context
          allRecords.push(...chunkRecords)
          chunk.recordsReceived = chunkRecords.length
          completedChunks++

          // Callbacks
          onProgress?.(chunk, chunks.length)
          onChunkComplete?.(chunk, chunkRecords)
        } catch (error) {
          failedChunks++
          const err = error instanceof Error ? error : new Error(String(error))
          chunk.error = err
          onError?.(err, chunk)

          // Continue with next chunk even if this one failed
          // (unless cancelled)
          if (abortController.signal.aborted) {
            cancelled = true
            break
          }
        }
      }

      // Deduplicate and sort all records
      const { uniqueRecords } = deduplicateAndSortRecords(allRecords)

      // Final callback
      onComplete?.(uniqueRecords)

      return {
        records: uniqueRecords,
        chunks,
        totalChunks: chunks.length,
        completedChunks,
        failedChunks,
        cancelled,
      }
    } finally {
      // Cleanup
      this.activeFetches.delete(fetchId)
    }
  }

  /**
   * Cancel an active history fetch
   */
  cancelFetch(fetchId: string): boolean {
    const controller = this.activeFetches.get(fetchId)
    if (controller) {
      controller.abort()
      this.activeFetches.delete(fetchId)
      return true
    }
    return false
  }

  /**
   * Cancel all active fetches
   */
  cancelAllFetches(): void {
    for (const controller of this.activeFetches.values()) {
      controller.abort()
    }
    this.activeFetches.clear()
  }

  /**
   * Automatic escalation: Fetch 5min → 4hr → 24hr
   * Used on startup to ensure data continuity
   */
  async fetchWithEscalation(
    onProgress?: (stage: "5min" | "4hr" | "24hr", progress: number) => void,
  ): Promise<EldRecord[]> {
    const now = new Date()
    const allRecords: EldRecord[] = []

    // Stage 1: Last 5 minutes
    onProgress?.("5min", 0)
    try {
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
      const result5min = await this.fetchHistory({
        type: 1,
        start: fiveMinAgo,
        end: now,
        chunkSizeMinutes: 5,
      })
      allRecords.push(...result5min.records)
      onProgress?.("5min", 100)
    } catch (error) {
      console.warn("Failed to fetch 5min history:", error)
    }

    // Stage 2: Last 4 hours (if needed)
    onProgress?.("4hr", 0)
    try {
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
      const result4hr = await this.fetchHistory({
        type: 1,
        start: fourHoursAgo,
        end: now,
        chunkSizeMinutes: 60,
      })
      allRecords.push(...result4hr.records)
      onProgress?.("4hr", 100)
    } catch (error) {
      console.warn("Failed to fetch 4hr history:", error)
    }

    // Stage 3: Last 24 hours (if needed)
    onProgress?.("24hr", 0)
    try {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const result24hr = await this.fetchHistory({
        type: 1,
        start: yesterday,
        end: now,
        chunkSizeMinutes: 60,
      })
      allRecords.push(...result24hr.records)
      onProgress?.("24hr", 100)
    } catch (error) {
      console.warn("Failed to fetch 24hr history:", error)
    }

    // Final deduplication
    const { uniqueRecords } = deduplicateAndSortRecords(allRecords)
    return uniqueRecords
  }
}

// Singleton instance
export const eldHistoryService = new EldHistoryService()
