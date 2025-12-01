/**
 * ELD Trip Verification Hook
 *
 * Detects if last live event is recent (<30 seconds)
 * Auto-queries 5-minute history if needed
 * Shows non-blocking warnings for missing engine data
 */

import { useEffect, useState, useCallback, useRef } from "react"

import { useObdData } from "@/contexts/obd-data-context"
import { eldHistoryService } from "@/services/eld-history-service"
import { parseEldDataTimestamp } from "@/utils/eld-timestamp-parser"

export interface TripVerificationStatus {
  isVerified: boolean
  lastLiveEventAge: number | null // seconds
  hasRecentData: boolean
  isChecking: boolean
  warning: string | null
}

export interface UseEldTripVerificationOptions {
  checkInterval?: number // Default: 30 seconds
  warningThreshold?: number // Default: 60 seconds (no engine data)
  autoFetchHistory?: boolean // Default: true
}

export function useEldTripVerification(
  options: UseEldTripVerificationOptions = {},
): TripVerificationStatus & {
  verify: () => Promise<void>
  deferSync: () => void
} {
  const {
    checkInterval = 30000, // 30 seconds
    warningThreshold = 60000, // 60 seconds
    autoFetchHistory = true,
  } = options

  const { isConnected, eldHistoryRecords } = useObdData()
  const [status, setStatus] = useState<TripVerificationStatus>({
    isVerified: false,
    lastLiveEventAge: null,
    hasRecentData: false,
    isChecking: false,
    warning: null,
  })

  const deferSyncRef = useRef(false)
  const checkTimeoutRef = useRef<NodeJS.Timeout>()

  /**
   * Check if we have recent live data
   */
  const verify = useCallback(async () => {
    if (!isConnected || deferSyncRef.current) {
      return
    }

    setStatus((prev) => ({ ...prev, isChecking: true }))

    try {
      // Find most recent live event from history
      const liveEvents = eldHistoryRecords.filter(
        (r) => r.raw?.isLiveEvent === 1 || r.raw?.isLiveEvent === true,
      )

      let lastLiveEvent: any = null
      let lastLiveEventAge: number | null = null

      if (liveEvents.length > 0) {
        // Sort by timestamp (most recent first)
        const sorted = [...liveEvents].sort((a, b) => {
          const timeA = parseEldDataTimestamp({
            eventTime: a.eventTime,
            gpsTime: a.raw?.gpsTime,
            time: a.raw?.time,
            timestamp: a.receivedAt.toISOString(),
          }).date

          const timeB = parseEldDataTimestamp({
            eventTime: b.eventTime,
            gpsTime: b.raw?.gpsTime,
            time: b.raw?.time,
            timestamp: b.receivedAt.toISOString(),
          }).date

          return timeB.getTime() - timeA.getTime()
        })

        lastLiveEvent = sorted[0]
        const eventTime = parseEldDataTimestamp({
          eventTime: lastLiveEvent.eventTime,
          gpsTime: lastLiveEvent.raw?.gpsTime,
          time: lastLiveEvent.raw?.time,
          timestamp: lastLiveEvent.receivedAt.toISOString(),
        }).date

        lastLiveEventAge = Math.round((Date.now() - eventTime.getTime()) / 1000) // seconds
      }

      const hasRecentData = lastLiveEventAge !== null && lastLiveEventAge < 30 // < 30 seconds
      const needsHistoryFetch = !hasRecentData && autoFetchHistory

      // Auto-fetch 5-minute history if needed
      if (needsHistoryFetch) {
        try {
          const now = new Date()
          const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)

          await eldHistoryService.fetchHistory({
            type: 1,
            start: fiveMinAgo,
            end: now,
            chunkSizeMinutes: 5,
            maxRetries: 2,
          })

          // Re-check after fetch
          setTimeout(() => verify(), 2000)
        } catch (error) {
          console.warn("⚠️ Failed to auto-fetch history for verification:", error)
        }
      }

      // Check for warning condition (no engine data >60s)
      let warning: string | null = null
      if (lastLiveEventAge !== null && lastLiveEventAge > warningThreshold / 1000) {
        warning = "No engine data — check connection"
      }

      setStatus({
        isVerified: hasRecentData,
        lastLiveEventAge,
        hasRecentData,
        isChecking: false,
        warning,
      })
    } catch (error) {
      console.error("❌ Trip verification failed:", error)
      setStatus((prev) => ({
        ...prev,
        isChecking: false,
        warning: "Verification failed",
      }))
    }
  }, [isConnected, eldHistoryRecords, autoFetchHistory, warningThreshold])

  /**
   * Defer sync (for poor network conditions)
   */
  const deferSync = useCallback(() => {
    deferSyncRef.current = true
    setStatus((prev) => ({
      ...prev,
      warning: "Sync deferred — check network connection",
    }))

    // Auto-resume after 5 minutes
    setTimeout(
      () => {
        deferSyncRef.current = false
        verify()
      },
      5 * 60 * 1000,
    )
  }, [verify])

  // Periodic check
  useEffect(() => {
    if (!isConnected) {
      setStatus({
        isVerified: false,
        lastLiveEventAge: null,
        hasRecentData: false,
        isChecking: false,
        warning: null,
      })
      return
    }

    // Initial check
    verify()

    // Periodic checks
    checkTimeoutRef.current = setInterval(() => {
      verify()
    }, checkInterval)

    return () => {
      if (checkTimeoutRef.current) {
        clearInterval(checkTimeoutRef.current)
      }
    }
  }, [isConnected, verify, checkInterval])

  return {
    ...status,
    verify,
    deferSync,
  }
}
