/**
 * ELD Deduplication Utility
 *
 * Handles deduplication of ELD records using composite keys
 * Sorts records by timestamp (eventTime/gpsTime) then receivedAt
 * Handles out-of-order records gracefully
 */

import { getBestTimestamp } from "./eld-timestamp-parser"

export interface EldRecord {
  deviceId?: string | null
  eventTime?: string | null
  eventType?: number
  eventId?: number
  timestamp?: string | null
  gpsTime?: string | null
  time?: string | null
  receivedAt?: Date
  [key: string]: any
}

export interface DeduplicationResult {
  uniqueRecords: EldRecord[]
  duplicatesRemoved: number
  sorted: boolean
}

/**
 * Generate composite key for deduplication
 * Format: deviceId|eventTime|eventType|eventId
 */
export function generateCompositeKey(record: EldRecord): string {
  const deviceId = record.deviceId || "unknown"
  const eventTime = record.eventTime || record.gpsTime || record.time || ""
  const eventType = record.eventType ?? -1
  const eventId = record.eventId ?? -1

  return `${deviceId}|${eventTime}|${eventType}|${eventId}`
}

/**
 * Generate hash from record payload for deduplication
 * Simple hash function for raw payload comparison
 */
export function hashRecord(record: EldRecord): string {
  try {
    const key = generateCompositeKey(record)
    // Simple hash - in production, consider using crypto library
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  } catch (error) {
    console.warn("Failed to hash record:", error)
    return generateCompositeKey(record)
  }
}

/**
 * Deduplicate records using composite key
 * Returns unique records and count of duplicates removed
 */
export function deduplicateRecords(records: EldRecord[]): DeduplicationResult {
  const seen = new Set<string>()
  const uniqueRecords: EldRecord[] = []
  let duplicatesRemoved = 0

  for (const record of records) {
    const key = generateCompositeKey(record)

    if (!seen.has(key)) {
      seen.add(key)
      uniqueRecords.push(record)
    } else {
      duplicatesRemoved++
    }
  }

  return {
    uniqueRecords,
    duplicatesRemoved,
    sorted: false,
  }
}

/**
 * Sort records by timestamp (eventTime/gpsTime) then by receivedAt
 * Handles out-of-order records by preserving original order in raw storage
 */
export function sortRecordsByTimestamp(records: EldRecord[]): EldRecord[] {
  return [...records].sort((a, b) => {
    // Get best available timestamp for each record
    const timestampA = getBestTimestamp({
      eventTime: a.eventTime,
      gpsTime: a.gpsTime,
      time: a.time,
      timestamp: a.timestamp,
    })

    const timestampB = getBestTimestamp({
      eventTime: b.eventTime,
      gpsTime: b.gpsTime,
      time: b.time,
      timestamp: b.timestamp,
    })

    // Primary sort: by parsed timestamp
    const timeDiff = timestampA.getTime() - timestampB.getTime()

    if (timeDiff !== 0) {
      return timeDiff
    }

    // Secondary sort: by receivedAt (if available)
    const receivedAtA = a.receivedAt?.getTime() ?? 0
    const receivedAtB = b.receivedAt?.getTime() ?? 0

    return receivedAtA - receivedAtB
  })
}

/**
 * Deduplicate and sort records
 * Combines deduplication and sorting in one operation
 */
export function deduplicateAndSortRecords(records: EldRecord[]): DeduplicationResult {
  // First deduplicate
  const deduped = deduplicateRecords(records)

  // Then sort
  const sorted = sortRecordsByTimestamp(deduped.uniqueRecords)

  return {
    uniqueRecords: sorted,
    duplicatesRemoved: deduped.duplicatesRemoved,
    sorted: true,
  }
}

/**
 * Handle out-of-order records
 * Preserves original order in raw storage while sorting for display
 */
export interface OrderedRecord extends EldRecord {
  originalIndex: number
  sortedTimestamp: Date
}

export function handleOutOfOrderRecords(records: EldRecord[]): OrderedRecord[] {
  return records.map((record, index) => {
    const sortedTimestamp = getBestTimestamp({
      eventTime: record.eventTime,
      gpsTime: record.gpsTime,
      time: record.time,
      timestamp: record.timestamp,
    })

    return {
      ...record,
      originalIndex: index,
      sortedTimestamp,
    }
  })
}

/**
 * Merge two record arrays with deduplication
 * Useful when combining live and historical records
 */
export function mergeRecords(existing: EldRecord[], newRecords: EldRecord[]): DeduplicationResult {
  const combined = [...existing, ...newRecords]
  return deduplicateAndSortRecords(combined)
}

/**
 * Find duplicate records in an array
 * Returns array of duplicate groups
 */
export function findDuplicates(records: EldRecord[]): EldRecord[][] {
  const keyMap = new Map<string, EldRecord[]>()

  for (const record of records) {
    const key = generateCompositeKey(record)
    if (!keyMap.has(key)) {
      keyMap.set(key, [])
    }
    keyMap.get(key)!.push(record)
  }

  // Return only groups with more than one record
  return Array.from(keyMap.values()).filter((group) => group.length > 1)
}
