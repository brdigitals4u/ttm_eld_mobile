# HOS (Hours of Service) API Documentation

**File:** `src/api/hos.ts`

## Overview

Hours of Service API module for ELD compliance. Handles HOS clocks, log entries, daily logs, ELD events, and duty status changes. Provides helper functions for data formatting and status mapping.

## Features

- HOS clock creation and management
- Log entry creation
- Daily log tracking
- ELD event recording
- Duty status changes
- Status certification
- Location formatting helpers
- Status remark mapping

## Data Types

### HOSClock

HOS clock information:

```typescript
{
  driver: string
  clock_type: string
  start_time: string
  time_remaining: string
  cycle_start: string
  current_duty_status_start_time: string
  cycle_start_time: string
}
```

### HOSLogEntry

Log entry for duty status changes:

```typescript
{
  driver: string
  duty_status: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  start_location?: string
  end_location?: string
  start_odometer?: number
  end_odometer?: number
  remark?: string
}
```

### HOSDailyLog

Daily summary log:

```typescript
{
  driver: string
  log_date: string
  total_driving_time: number
  total_on_duty_time: number
  total_off_duty_time: number
  is_certified: boolean
}
```

### HOSELDEvent

ELD compliance event:

```typescript
{
  driver: string
  event_type: string
  event_code: string
  event_data: {
    new_duty_status: string
    previous_duty_status?: string
  }
  event_time: string
  location: string
}
```

## Status Remarks

Predefined remarks for each duty status:

```typescript
STATUS_REMARKS = {
  driving: "Regular driving activity",
  on_duty: "On duty - not driving",
  off_duty: "Off duty - rest break",
  sleeper_berth: "Sleeper berth - rest period",
  personal_conveyance: "Personal conveyance - personal use",
  yard_move: "Yard move - repositioning vehicle"
}
```

## API Functions

### `hosApi.createHOSClock(clockData)`

Creates a new HOS clock entry.

**Parameters:**
- `clockData`: HOSClock object

**Returns:** Promise with API response data

**Example:**
```typescript
const clock = await hosApi.createHOSClock({
  driver: 'driver-id-123',
  clock_type: 'driving',
  start_time: new Date().toISOString(),
  time_remaining: '10:30:00',
  cycle_start: new Date().toISOString(),
  current_duty_status_start_time: new Date().toISOString(),
  cycle_start_time: new Date().toISOString()
})
```

### `hosApi.createHOSLogEntry(logData)`

Creates a new HOS log entry.

**Parameters:**
- `logData`: HOSLogEntry object

**Returns:** Promise with API response data

**Example:**
```typescript
const logEntry = await hosApi.createHOSLogEntry({
  driver: 'driver-id-123',
  duty_status: 'driving',
  start_time: new Date().toISOString(),
  start_location: '123 Main St, City, State',
  start_odometer: 50000,
  remark: 'Regular driving activity'
})
```

### `hosApi.createDailyHOSLog(dailyLogData)`

Creates a daily HOS summary log.

**Parameters:**
- `dailyLogData`: HOSDailyLog object

**Returns:** Promise with API response data

**Example:**
```typescript
const dailyLog = await hosApi.createDailyHOSLog({
  driver: 'driver-id-123',
  log_date: '2024-01-15',
  total_driving_time: 480, // minutes
  total_on_duty_time: 600,
  total_off_duty_time: 720,
  is_certified: false
})
```

### `hosApi.createHOSELDEvent(eventData)`

Creates an ELD compliance event.

**Parameters:**
- `eventData`: HOSELDEvent object

**Returns:** Promise with API response data

**Example:**
```typescript
const event = await hosApi.createHOSELDEvent({
  driver: 'driver-id-123',
  event_type: 'duty_status_change',
  event_code: 'DS_CHANGE',
  event_data: {
    new_duty_status: 'driving',
    previous_duty_status: 'off_duty'
  },
  event_time: new Date().toISOString(),
  location: '123 Main St, City, State'
})
```

### `hosApi.certifyHOSLog(logId)`

Certifies a HOS log entry.

**Parameters:**
- `logId`: string - Log entry ID

**Returns:** Promise with API response data

**Example:**
```typescript
await hosApi.certifyHOSLog('log-id-123')
```

### `hosApi.changeDutyStatus(clockId, newStatus)`

Changes the duty status for a HOS clock.

**Parameters:**
- `clockId`: string - Clock entry ID
- `newStatus`: string - New duty status

**Returns:** Promise with API response data

**Example:**
```typescript
await hosApi.changeDutyStatus('clock-id-123', 'off_duty')
```

## Helper Functions

### `hosApi.formatLocationForAPI(location)`

Formats location data for API submission.

**Parameters:**
- `location`: LocationData object with latitude, longitude, and optional address

**Returns:** string - Formatted location string

**Logic:**
- If address exists, returns address
- Otherwise, returns "latitude, longitude" format

**Example:**
```typescript
const locationStr = hosApi.formatLocationForAPI({
  latitude: 40.7128,
  longitude: -74.0060,
  address: 'New York, NY'
})
// Returns: "New York, NY"

const locationStr2 = hosApi.formatLocationForAPI({
  latitude: 40.7128,
  longitude: -74.0060
})
// Returns: "40.712800, -74.006000"
```

### `hosApi.getStatusRemark(status)`

Gets the predefined remark for a duty status.

**Parameters:**
- `status`: string - Duty status

**Returns:** string - Status remark or default "Status change"

**Example:**
```typescript
const remark = hosApi.getStatusRemark('driving')
// Returns: "Regular driving activity"
```

### `hosApi.formatTimestamp(timestamp)`

Converts timestamp to ISO string.

**Parameters:**
- `timestamp`: number - Unix timestamp in milliseconds

**Returns:** string - ISO 8601 formatted date string

**Example:**
```typescript
const isoString = hosApi.formatTimestamp(Date.now())
// Returns: "2024-01-15T10:30:00.000Z"
```

### `hosApi.getAPIDutyStatus(appStatus)`

Converts app duty status format to API format.

**Parameters:**
- `appStatus`: string - App format status (camelCase)

**Returns:** string - API format status (snake_case)

**Status Mapping:**
- `driving` → `driving`
- `onDuty` → `on_duty`
- `offDuty` → `off_duty`
- `sleeperBerth` → `sleeper_berth`
- `personalConveyance` → `personal_conveyance`
- `yardMoves` → `yard_move`

**Example:**
```typescript
const apiStatus = hosApi.getAPIDutyStatus('onDuty')
// Returns: "on_duty"
```

## Duty Statuses

Supported duty statuses:
- `driving`: Actively driving
- `on_duty`: On duty but not driving
- `off_duty`: Off duty (rest break)
- `sleeper_berth`: Sleeper berth rest period
- `personal_conveyance`: Personal use of vehicle
- `yard_move`: Yard repositioning

## ELD Compliance

This API module supports ELD (Electronic Logging Device) compliance by:
1. Tracking all duty status changes
2. Recording location for status changes
3. Maintaining accurate timestamps
4. Creating audit trail events
5. Supporting log certification

## Integration with Location Context

The `formatLocationForAPI` function integrates with the location context (`LocationData` type) to provide proper location formatting for HOS records.

## Dependencies

- `./client`: ApiClient
- `./constants`: API endpoints
- `@/contexts/location-context`: LocationData type

## Usage Tips

1. **Always include location**: Use `formatLocationForAPI` to ensure proper location formatting
2. **Use status remarks**: Prefer `getStatusRemark` over hardcoded strings
3. **Convert timestamps**: Use `formatTimestamp` for consistent ISO date formatting
4. **Status format conversion**: Use `getAPIDutyStatus` when converting from app state
5. **Certify logs**: Certify daily logs before the end of day cutoff

