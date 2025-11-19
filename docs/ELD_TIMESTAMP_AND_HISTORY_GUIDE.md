# ELD Timestamp and Historical Data Guide

## Overview

This guide explains how to:
1. Extract timestamps from ELD data
2. Query historical data from the ELD device when the app was not running

---

## 1. Getting Timestamps from ELD Data

### Available Timestamp Fields

When ELD data is received through `onObdEldDataReceived` event, you get multiple timestamp fields:

#### From `BaseObdData.EldData`:

```typescript
interface ObdEldData {
  time: string;           // ELD device time (format: "YYMMDDHHmmss")
  eventTime: string;      // Event timestamp from ELD
  gpsTime: string;        // GPS timestamp from ELD
  timestamp: string;      // Current app timestamp (milliseconds since epoch)
}
```

### Timestamp Priority (Most Reliable First)

1. **`eventTime`** - Event timestamp from ELD device (most accurate for when event occurred)
2. **`gpsTime`** - GPS timestamp (accurate if GPS is available)
3. **`time`** - ELD device time (may drift if device clock is incorrect)
4. **`timestamp`** - App timestamp (when data was received, not when event occurred)

### Usage Example

```typescript
import { JMBluetoothService } from '@/services/JMBluetoothService'

// Listen for ELD data
const listener = JMBluetoothService.addEventListener(
  'onObdEldDataReceived',
  (data: ObdEldData) => {
    // Prefer eventTime, fallback to gpsTime, then time, then timestamp
    const eventTimestamp = data.eventTime || data.gpsTime || data.time || data.timestamp
    
    // Parse timestamp
    let eventDate: Date
    if (data.eventTime) {
      // Parse ELD format: "YYMMDDHHmmss" or ISO string
      eventDate = parseEldTimestamp(data.eventTime)
    } else if (data.timestamp) {
      // Parse milliseconds timestamp
      eventDate = new Date(parseInt(data.timestamp))
    } else {
      eventDate = new Date()
    }
    
    console.log('Event occurred at:', eventDate)
  }
)
```

### Parsing ELD Timestamp Format

ELD timestamps use format: `"YYMMDDHHmmss"` (e.g., "250115143000" = Jan 15, 2025, 14:30:00)

```typescript
function parseEldTimestamp(eldTime: string): Date {
  // If it's already a standard format, parse directly
  if (eldTime.includes('-') || eldTime.includes('T')) {
    return new Date(eldTime)
  }
  
  // Parse ELD format: YYMMDDHHmmss
  if (eldTime.length === 12) {
    const year = 2000 + parseInt(eldTime.substring(0, 2))
    const month = parseInt(eldTime.substring(2, 4)) - 1 // Month is 0-indexed
    const day = parseInt(eldTime.substring(4, 6))
    const hours = parseInt(eldTime.substring(6, 8))
    const minutes = parseInt(eldTime.substring(8, 10))
    const seconds = parseInt(eldTime.substring(10, 12))
    
    return new Date(year, month, day, hours, minutes, seconds)
  }
  
  // Fallback to current time
  return new Date()
}
```

---

## 2. Querying Historical Data from ELD Device

### Scenario

**Problem:** Truck and ELD are on, but app is not running. When you open the app, you need to get data from:
- 5 minutes ago
- 4 hours ago
- Any time range in the past

**Solution:** Use `queryHistoryData()` to request historical data from the ELD device.

### How It Works

1. ELD device stores data internally when truck is running
2. App queries device for data in a time range
3. Device sends historical data through same `onObdEldDataReceived` event
4. Historical records have `isLiveEvent = 0` (live events have `isLiveEvent = 1`)

### API Methods

#### `queryHistoryData(type, startTime, endTime)`

**Parameters:**
- `type: number` - Data type (typically `1` for ELD data)
- `startTime: string` - Start time in format `"YYMMDDHHmmss"` (e.g., `"250115100000"`)
- `endTime: string` - End time in format `"YYMMDDHHmmss"` (e.g., `"250115140000"`)

**Returns:** `Promise<boolean>`

**Example:**

```typescript
import { JMBluetoothService } from '@/services/JMBluetoothService'

// Get data from last 4 hours
const now = new Date()
const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

const startTime = JMBluetoothService.formatTimeForHistory(fourHoursAgo)
const endTime = JMBluetoothService.formatTimeForHistory(now)

await JMBluetoothService.queryHistoryData(1, startTime, endTime)
```

#### Helper Methods

**`formatTimeForHistory(date: Date): string`**

Formats a Date object to ELD format `"YYMMDDHHmmss"`

```typescript
const date = new Date()
const formatted = JMBluetoothService.formatTimeForHistory(date)
// Returns: "250115143000" (for Jan 15, 2025, 14:30:00)
```

**`getLast24HoursRange(): { startTime: string, endTime: string }`**

Gets time range for last 24 hours

```typescript
const range = JMBluetoothService.getLast24HoursRange()
// Returns: { startTime: "250114143000", endTime: "250115143000" }
```

### Complete Example: Get Data from Last 4 Hours

```typescript
import { JMBluetoothService } from '@/services/JMBluetoothService'
import { useObdData } from '@/contexts/obd-data-context'

function MyComponent() {
  const { fetchEldHistory, eldHistoryRecords, isFetchingHistory } = useObdData()
  
  const loadLast4Hours = async () => {
    try {
      const now = new Date()
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
      
      // Use context method (handles formatting automatically)
      await fetchEldHistory({
        type: 1, // ELD data type
        start: fourHoursAgo,
        end: now
      })
      
      console.log('History records:', eldHistoryRecords)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }
  
  return (
    <Button onPress={loadLast4Hours} disabled={isFetchingHistory}>
      {isFetchingHistory ? 'Loading...' : 'Load Last 4 Hours'}
    </Button>
  )
}
```

### Using Context Hook (Recommended)

The `obd-data-context.tsx` provides a convenient hook:

```typescript
import { useObdData } from '@/contexts/obd-data-context'

const { 
  fetchEldHistory,      // Function to fetch history
  eldHistoryRecords,   // Array of historical records
  isFetchingHistory,   // Loading state
  historyFetchProgress // Progress info
} = useObdData()

// Fetch last 5 minutes
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
const now = new Date()

await fetchEldHistory({
  type: 1,
  start: fiveMinutesAgo,
  end: now
})
```

### Historical Data Structure

Historical records come through `onObdEldDataReceived` with `isLiveEvent = 0`:

```typescript
interface EldHistoryRecord {
  id: string
  deviceId: string | null
  receivedAt: Date              // When app received the data
  eventTime?: string            // When event occurred (ELD timestamp)
  eventType?: number
  eventId?: number
  latitude?: number
  longitude?: number
  gpsSpeed?: number
  raw: any                      // Raw ELD data
  displayData: OBDDataItem[]   // Parsed OBD data
}
```

### Listening for Historical Data

Historical data comes through the same event as live data, but with `isLiveEvent = 0`:

```typescript
const listener = JMBluetoothService.addEventListener(
  'onObdEldDataReceived',
  (data: ObdEldData) => {
    if (data.isLiveEvent === 0) {
      // This is historical data
      console.log('Historical record:', data.eventTime)
    } else {
      // This is live data
      console.log('Live data received')
    }
  }
)
```

### Time Range Examples

```typescript
// Last 5 minutes
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
const now = new Date()

// Last 1 hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

// Last 4 hours
const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)

// Last 24 hours
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

// Specific time range (e.g., 2 PM to 4 PM today)
const today = new Date()
const start = new Date(today)
start.setHours(14, 0, 0, 0) // 2 PM
const end = new Date(today)
end.setHours(16, 0, 0, 0) // 4 PM
```

### Progress Tracking

Monitor progress while fetching history:

```typescript
const { historyFetchProgress } = useObdData()

// historyFetchProgress structure:
// {
//   progress: number,  // Current record count
//   count: number      // Total records expected
// }

if (historyFetchProgress) {
  console.log(`Progress: ${historyFetchProgress.progress} / ${historyFetchProgress.count}`)
}
```

### Stop History Query

If you need to stop an ongoing history query:

```typescript
await JMBluetoothService.stopReportHistoryData()
```

---

## Best Practices

### 1. Always Check Connection

```typescript
const { isConnected } = useObdData()

if (!isConnected) {
  throw new Error('ELD device must be connected to query history')
}
```

### 2. Use Appropriate Time Ranges

- **Small ranges** (5-30 minutes): Fast, less data
- **Medium ranges** (1-4 hours): Moderate speed
- **Large ranges** (24+ hours): Slower, more data

### 3. Handle Large Datasets

For large time ranges, consider:
- Fetching in chunks (e.g., 1-hour intervals)
- Showing progress to user
- Storing data locally as it arrives

### 4. Parse Timestamps Correctly

Always prefer `eventTime` or `gpsTime` over `timestamp` for accurate event timing:

```typescript
const eventDate = data.eventTime 
  ? parseEldTimestamp(data.eventTime)
  : data.gpsTime 
    ? parseEldTimestamp(data.gpsTime)
    : new Date(parseInt(data.timestamp))
```

### 5. Distinguish Live vs Historical

```typescript
if (data.isLiveEvent === 0) {
  // Historical data - store in history records
} else {
  // Live data - update current state
}
```

---

## Troubleshooting

### No Historical Data Returned

1. **Check time range**: Ensure start < end
2. **Check connection**: Device must be connected
3. **Check device storage**: ELD may not store data if device was off
4. **Check format**: Time must be in `"YYMMDDHHmmss"` format

### Timestamp Parsing Errors

1. **Check format**: ELD uses `"YYMMDDHHmmss"`, not ISO format
2. **Handle nulls**: Some fields may be empty
3. **Use fallbacks**: Always have a fallback timestamp

### History Query Hangs

1. **Check progress**: Monitor `historyFetchProgress`
2. **Set timeout**: Consider adding timeout for long queries
3. **Stop query**: Use `stopReportHistoryData()` if needed

---

## Summary

### Getting Timestamps

- Use `eventTime` or `gpsTime` for accurate event timing
- Parse ELD format: `"YYMMDDHHmmss"`
- Fallback to `timestamp` if ELD timestamps unavailable

### Getting Historical Data

1. Connect to ELD device
2. Calculate time range (start and end dates)
3. Format times using `formatTimeForHistory()`
4. Call `queryHistoryData(type, startTime, endTime)`
5. Listen for data in `onObdEldDataReceived` with `isLiveEvent = 0`
6. Store/process historical records as they arrive

The ELD device stores data internally, so you can retrieve data from any time range (up to device storage limits) even if the app was not running.

