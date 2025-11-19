/**
 * ELD Timestamp Parser Utility
 *
 * Handles timestamp parsing with priority: eventTime → gpsTime → time → timestamp
 * Supports ELD format "YYMMDDHHmmss" with year rollover validation
 * Detects time drift between ELD device time and app time
 */

export interface ParsedTimestamp {
  date: Date
  source: "eventTime" | "gpsTime" | "time" | "timestamp" | "fallback"
  originalValue: string | null
  hasDrift: boolean
  driftMinutes: number | null
}

export interface TimestampDriftInfo {
  hasDrift: boolean
  driftMinutes: number
  deviceId?: string
  flagged: boolean
}

/**
 * Parse ELD timestamp format: "YYMMDDHHmmss"
 * Handles year rollover (e.g., "991231235959" = Dec 31, 1999)
 */
export function parseEldTimestamp(eldTime: string): Date | null {
  if (!eldTime || typeof eldTime !== "string") {
    return null
  }

  // If it's already a standard ISO format, parse directly
  if (eldTime.includes("-") || eldTime.includes("T") || eldTime.includes("Z")) {
    const parsed = new Date(eldTime)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }

  // Parse ELD format: YYMMDDHHmmss (12 characters)
  if (eldTime.length === 12) {
    try {
      const year = 2000 + parseInt(eldTime.substring(0, 2), 10)
      const month = parseInt(eldTime.substring(2, 4), 10) - 1 // Month is 0-indexed
      const day = parseInt(eldTime.substring(4, 6), 10)
      const hours = parseInt(eldTime.substring(6, 8), 10)
      const minutes = parseInt(eldTime.substring(8, 10), 10)
      const seconds = parseInt(eldTime.substring(10, 12), 10)

      // Validate parsed values
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hours) ||
        isNaN(minutes) ||
        isNaN(seconds)
      ) {
        return null
      }

      // Handle year rollover: if year > current year + 1, assume previous century
      const currentYear = new Date().getFullYear()
      const adjustedYear = year > currentYear + 1 ? year - 100 : year

      const date = new Date(adjustedYear, month, day, hours, minutes, seconds)

      // Validate the date is valid
      if (isNaN(date.getTime())) {
        return null
      }

      return date
    } catch (error) {
      console.warn("Failed to parse ELD timestamp:", eldTime, error)
      return null
    }
  }

  // Try parsing as milliseconds timestamp
  const millis = parseInt(eldTime, 10)
  if (!isNaN(millis) && millis > 0) {
    const date = new Date(millis)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

/**
 * Parse timestamp from ELD data with priority order
 * Priority: eventTime → gpsTime → time → timestamp
 */
export function parseEldDataTimestamp(data: {
  eventTime?: string | null
  gpsTime?: string | null
  time?: string | null
  timestamp?: string | null
}): ParsedTimestamp {
  const now = new Date()
  let date: Date | null = null
  let source: ParsedTimestamp["source"] = "fallback"
  let originalValue: string | null = null

  // Priority 1: eventTime (most accurate for when event occurred)
  if (data.eventTime) {
    const parsed = parseEldTimestamp(data.eventTime)
    if (parsed) {
      date = parsed
      source = "eventTime"
      originalValue = data.eventTime
    }
  }

  // Priority 2: gpsTime (accurate if GPS is available)
  if (!date && data.gpsTime) {
    const parsed = parseEldTimestamp(data.gpsTime)
    if (parsed) {
      date = parsed
      source = "gpsTime"
      originalValue = data.gpsTime
    }
  }

  // Priority 3: time (ELD device time, may drift)
  if (!date && data.time) {
    const parsed = parseEldTimestamp(data.time)
    if (parsed) {
      date = parsed
      source = "time"
      originalValue = data.time
    }
  }

  // Priority 4: timestamp (app receipt time, not event time)
  if (!date && data.timestamp) {
    const parsed = parseEldTimestamp(data.timestamp)
    if (parsed) {
      date = parsed
      source = "timestamp"
      originalValue = data.timestamp
    }
  }

  // Fallback to current time
  if (!date) {
    date = now
    source = "fallback"
  }

  // Detect time drift: compare eventTime/gpsTime with timestamp (app receipt time)
  let hasDrift = false
  let driftMinutes: number | null = null

  if (source === "eventTime" || source === "gpsTime") {
    const appTimestamp = data.timestamp ? parseEldTimestamp(data.timestamp) : now
    if (appTimestamp) {
      const driftMs = Math.abs(date.getTime() - appTimestamp.getTime())
      driftMinutes = Math.round(driftMs / (1000 * 60))
      // Flag drift if > 10 minutes
      hasDrift = driftMinutes > 10
    }
  }

  return {
    date,
    source,
    originalValue,
    hasDrift,
    driftMinutes,
  }
}

/**
 * Detect time drift and flag device if needed
 * Returns drift info with flagging recommendation
 */
export function detectTimeDrift(
  eldTimestamp: Date,
  appTimestamp: Date,
  deviceId?: string,
  thresholdMinutes: number = 10,
): TimestampDriftInfo {
  const driftMs = Math.abs(eldTimestamp.getTime() - appTimestamp.getTime())
  const driftMinutes = Math.round(driftMs / (1000 * 60))
  const hasDrift = driftMinutes > thresholdMinutes

  return {
    hasDrift,
    driftMinutes,
    deviceId,
    flagged: hasDrift,
  }
}

/**
 * Format date to ELD timestamp format: "YYMMDDHHmmss"
 */
export function formatToEldTimestamp(date: Date): string {
  const year = date.getFullYear().toString().slice(-2) // Last 2 digits
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")

  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

/**
 * Get the best available timestamp from ELD data
 * Returns the parsed date and source information
 */
export function getBestTimestamp(data: {
  eventTime?: string | null
  gpsTime?: string | null
  time?: string | null
  timestamp?: string | null
}): Date {
  const parsed = parseEldDataTimestamp(data)
  return parsed.date
}
