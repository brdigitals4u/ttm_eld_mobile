/**
 * Smart Background History Fetch Service
 *
 * Intelligently fetches history data based on data availability:
 * - If 5 min logs are not empty → fetch 20 min logs
 * - If 20 min logs are not empty → fetch 4 hour logs
 * - If 4 hour logs are not empty → fetch 24 hour logs
 *
 * Works in background based on SDK data availability
 */

import { EldRecord } from "@/utils/eld-deduplication"

import { eldHistoryService } from "./eld-history-service"
import JMBluetoothService from "./JMBluetoothService"

export interface SmartFetchOptions {
  onProgress?: (stage: string, hasData: boolean, recordCount: number) => void
  onComplete?: (allRecords: EldRecord[]) => void
  onError?: (error: Error, stage: string) => void
}

class EldSmartHistoryFetchService {
  private isRunning = false
  private currentFetchId: string | null = null

  /**
   * Check if records array has meaningful data
   * Returns true if records exist and have valid timestamps
   */
  private hasValidData(records: EldRecord[]): boolean {
    if (!records || records.length === 0) {
      return false
    }

    // Check if records have valid timestamps
    const validRecords = records.filter((record) => {
      if (!record.eventTime && !record.receivedAt) {
        return false
      }

      // Check if timestamp is recent (within last 7 days)
      const timestamp = record.eventTime
        ? new Date(record.eventTime).getTime()
        : record.receivedAt.getTime()

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      return timestamp > sevenDaysAgo
    })

    return validRecords.length > 0
  }

  /**
   * Fetch history for a specific time range
   */
  private async fetchTimeRange(
    minutesAgo: number,
    chunkSizeMinutes: number = 60,
  ): Promise<EldRecord[]> {
    const now = new Date()
    const start = new Date(now.getTime() - minutesAgo * 60 * 1000)

    try {
      const result = await eldHistoryService.fetchHistory({
        type: 1,
        start,
        end: now,
        chunkSizeMinutes,
        maxRetries: 2, // Fewer retries for background fetch
      })

      return result.records || []
    } catch (error) {
      console.warn(`Failed to fetch ${minutesAgo}min history:`, error)
      return []
    }
  }

  /**
   * Smart background fetch with escalation based on data availability
   */
  async smartFetch(options: SmartFetchOptions = {}): Promise<EldRecord[]> {
    if (this.isRunning) {
      console.log("Smart history fetch already running, skipping...")
      return []
    }

    this.isRunning = true
    const fetchId = `smart-${Date.now()}`
    this.currentFetchId = fetchId

    const allRecords: EldRecord[] = []

    try {
      // Stage 1: Fetch last 5 minutes
      console.log("📥 Smart Fetch: Checking 5 minutes...")
      options.onProgress?.("5min", false, 0)

      const records5min = await this.fetchTimeRange(5, 5)
      const has5minData = this.hasValidData(records5min)

      if (has5minData) {
        allRecords.push(...records5min)
        console.log(
          `✅ Smart Fetch: Found ${records5min.length} records in 5min, escalating to 20min...`,
        )
        options.onProgress?.("5min", true, records5min.length)

        // Stage 2: Fetch last 20 minutes (since 5min had data)
        options.onProgress?.("20min", false, 0)
        const records20min = await this.fetchTimeRange(20, 10)
        const has20minData = this.hasValidData(records20min)

        if (has20minData) {
          allRecords.push(...records20min)
          console.log(
            `✅ Smart Fetch: Found ${records20min.length} records in 20min, escalating to 4hr...`,
          )
          options.onProgress?.("20min", true, records20min.length)

          // Stage 3: Fetch last 4 hours (since 20min had data)
          options.onProgress?.("4hr", false, 0)
          const records4hr = await this.fetchTimeRange(4 * 60, 60)
          const has4hrData = this.hasValidData(records4hr)

          if (has4hrData) {
            allRecords.push(...records4hr)
            console.log(
              `✅ Smart Fetch: Found ${records4hr.length} records in 4hr, escalating to 24hr...`,
            )
            options.onProgress?.("4hr", true, records4hr.length)

            // Stage 4: Fetch last 24 hours (since 4hr had data)
            options.onProgress?.("24hr", false, 0)
            const records24hr = await this.fetchTimeRange(24 * 60, 60)
            const has24hrData = this.hasValidData(records24hr)

            if (has24hrData) {
              allRecords.push(...records24hr)
              console.log(`✅ Smart Fetch: Found ${records24hr.length} records in 24hr`)
              options.onProgress?.("24hr", true, records24hr.length)
            } else {
              console.log("ℹ️ Smart Fetch: No data in 24hr range, stopping escalation")
              options.onProgress?.("24hr", false, 0)
            }
          } else {
            console.log("ℹ️ Smart Fetch: No data in 4hr range, stopping escalation")
            options.onProgress?.("4hr", false, 0)
          }
        } else {
          console.log("ℹ️ Smart Fetch: No data in 20min range, stopping escalation")
          options.onProgress?.("20min", false, 0)
        }
      } else {
        console.log("ℹ️ Smart Fetch: No data in 5min range, stopping escalation")
        options.onProgress?.("5min", false, 0)
      }

      // Deduplicate all records
      const uniqueRecords = Array.from(
        new Map(
          allRecords.map((record) => [
            record.id || `${record.eventTime}-${record.eventType}`,
            record,
          ]),
        ).values(),
      )

      console.log(`✅ Smart Fetch: Completed with ${uniqueRecords.length} unique records`)
      options.onComplete?.(uniqueRecords)

      return uniqueRecords
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error("❌ Smart Fetch: Error during fetch:", err)
      options.onError?.(err, "unknown")
      return []
    } finally {
      this.isRunning = false
      if (this.currentFetchId === fetchId) {
        this.currentFetchId = null
      }
    }
  }

  /**
   * Cancel current smart fetch
   */
  cancel(): boolean {
    if (this.currentFetchId) {
      const cancelled = eldHistoryService.cancelFetch(this.currentFetchId)
      if (cancelled) {
        this.isRunning = false
        this.currentFetchId = null
        return true
      }
    }
    return false
  }

  /**
   * Check if smart fetch is currently running
   */
  isActive(): boolean {
    return this.isRunning
  }
}

// Singleton instance
export const eldSmartHistoryFetch = new EldSmartHistoryFetchService()
