# Status Store Documentation

**File:** `src/stores/statusStore.ts`

## Overview

Zustand-based store for managing driver status, Hours of Service (HOS), log entries, and certification. Handles duty status changes, HOS calculations, log certification, and split sleep settings.

## Key Features

- Current driver status management
- Status history tracking
- Hours of Service calculations
- Log entry management
- Log certification
- Split sleep settings
- Location tracking for status changes
- AsyncStorage persistence
- Predefined status reasons

## State Structure

### StatusState Interface

```typescript
{
  currentStatus: DriverStatus
  statusHistory: StatusUpdate[]
  hoursOfService: HoursOfService
  certification: LogCertification
  isUpdating: boolean
  error: string | null
  logEntries: LogEntry[]
  splitSleepSettings: SplitSleepSettings
  currentLocation?: {
    latitude: number
    longitude: number
    address?: string
  }
}
```

## Data Types

### DriverStatus

Current duty status type:
- `"driving"`
- `"onDuty"`
- `"offDuty"`
- `"sleeperBerth"`
- `"personalConveyance"`
- `"yardMoves"`

### HoursOfService

HOS time calculations:

```typescript
{
  driveTimeRemaining: number  // minutes
  shiftTimeRemaining: number  // minutes
  cycleTimeRemaining: number  // minutes
  breakTimeRemaining: number  // minutes
  lastCalculated: number      // timestamp
}
```

**Initial Values:**
- Drive time: 11 hours (660 minutes)
- Shift time: 14 hours (840 minutes)
- Cycle time: 60 hours (3600 minutes)
- Break time: 8 hours (480 minutes)

### LogCertification

Log certification status:

```typescript
{
  isCertified: boolean
  signature?: string
  certifiedAt?: number  // timestamp
}
```

### SplitSleepSettings

Split sleeper berth configuration:

```typescript
{
  enabled: boolean
  additionalHours: number  // Default: 2
}
```

### StatusUpdate

Status change record:

```typescript
{
  status: DriverStatus
  timestamp: number
  reason: string
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
}
```

### LogEntry

Log entry with status information (from types/status.ts).

### StatusReason

Predefined reason for status change:

```typescript
{
  id: string
  text: string
  category: DriverStatus
}
```

## Predefined Status Reasons

The store includes 20 predefined status reasons organized by category:

### Driving
- "Driving"

### On Duty
- "Starting shift"
- "Pre-trip inspection"
- "Post-trip inspection"
- "Loading"
- "Unloading"
- "Waiting at shipper/receiver"
- "Fueling"
- "Maintenance"
- "On duty not driving"

### Off Duty
- "Meal break"
- "Rest break"
- "End of shift"
- "Off duty"

### Sleeper Berth
- "Start of sleep period"
- "End of sleep period"
- "Sleeper berth"

### Personal Conveyance
- "Personal conveyance"

### Yard Moves
- "Yard moves"

## Actions

### Status Management

#### `setCurrentStatus(status)`

Sets the current driver status without creating a history entry.

**Example:**
```typescript
const { setCurrentStatus } = useStatusStore()
setCurrentStatus('driving')
```

#### `updateStatus(status, reason)`

Updates status and creates a history entry with location.

**Parameters:**
- `status`: DriverStatus - New status
- `reason`: string - Reason for status change

**Process:**
1. Creates StatusUpdate with timestamp and location
2. Adds to status history
3. Updates current status
4. Saves to AsyncStorage
5. Sets updating state during operation

**Example:**
```typescript
const { updateStatus } = useStatusStore()
await updateStatus('driving', 'Starting route')
```

#### `addStatusUpdate(update)`

Manually adds a status update to history. Prevents duplicates within 1 second.

**Example:**
```typescript
const { addStatusUpdate } = useStatusStore()
addStatusUpdate({
  status: 'offDuty',
  timestamp: Date.now(),
  reason: 'Meal break',
  location: { latitude: 40.7128, longitude: -74.0060 }
})
```

#### `setStatusHistory(history)`

Replaces entire status history.

#### `clearStatusHistory()`

Clears all status history.

### HOS Management

#### `setHoursOfService(hos)`

Sets complete HOS object.

**Example:**
```typescript
const { setHoursOfService } = useStatusStore()
setHoursOfService({
  driveTimeRemaining: 600,
  shiftTimeRemaining: 800,
  cycleTimeRemaining: 3500,
  breakTimeRemaining: 400,
  lastCalculated: Date.now()
})
```

#### `updateHoursOfService(updates)`

Partially updates HOS values.

**Example:**
```typescript
const { updateHoursOfService } = useStatusStore()
updateHoursOfService({ driveTimeRemaining: 500 })
```

### Certification

#### `setCertification(cert)`

Sets certification status.

#### `certifyLogs(signature)`

Certifies logs with driver signature.

**Parameters:**
- `signature`: string - Driver signature/confirmation

**Process:**
1. Updates certification with signature and timestamp
2. Saves to AsyncStorage
3. Sets updating state during operation

**Example:**
```typescript
const { certifyLogs } = useStatusStore()
await certifyLogs('John Doe')
```

#### `uncertifyLogs()`

Removes certification (resets to uncertified).

### Log Entries

#### `setLogEntries(entries)`

Sets complete log entries array.

#### `updateLogEntry(id, updates)`

Updates a specific log entry.

**Example:**
```typescript
const { updateLogEntry } = useStatusStore()
await updateLogEntry('entry-123', {
  remark: 'Updated remark',
  end_time: Date.now()
})
```

### Split Sleep

#### `setSplitSleepSettings(settings)`

Sets split sleep configuration.

#### `toggleSplitSleep(enabled, additionalHours)`

Toggles split sleep and saves to AsyncStorage.

**Example:**
```typescript
const { toggleSplitSleep } = useStatusStore()
await toggleSplitSleep(true, 2)  // Enable with 2 additional hours
```

### Location

#### `setCurrentLocation(location)`

Sets current location for status updates.

**Example:**
```typescript
const { setCurrentLocation } = useStatusStore()
setCurrentLocation({
  latitude: 40.7128,
  longitude: -74.0060,
  address: '123 Main St, New York, NY'
})
```

### Utility Functions

#### `getStatusReasons(status?)`

Returns status reasons filtered by category. If no status provided, returns all reasons.

**Example:**
```typescript
const { getStatusReasons } = useStatusStore()
const drivingReasons = getStatusReasons('driving')
const allReasons = getStatusReasons()
```

#### `formatDuration(minutes)`

Formats minutes to human-readable duration string.

**Returns:** `"Xh Ym"` format

**Example:**
```typescript
const { formatDuration } = useStatusStore()
formatDuration(125)  // "2h 5m"
```

#### `canUpdateStatus()`

Checks if status can be updated (not currently updating and no error).

**Returns:** boolean

#### `reset()`

Resets store to initial state.

## Persistence

### Storage Configuration

- **Storage Backend**: AsyncStorage (via Zustand persist)
- **Storage Key**: `status-storage`

### Persisted Fields

- `currentStatus`
- `statusHistory`
- `hoursOfService`
- `certification`
- `splitSleepSettings`
- `currentLocation`

### Additional AsyncStorage Keys

- `statusHistory`: Status history JSON
- `currentStatus`: Current status string
- `certification`: Certification JSON
- `splitSleepSettings`: Split sleep settings JSON

## Selector Hooks

Optimized hooks that only re-render when specific values change:

- `useCurrentStatus()` - Current driver status
- `useStatusHistory()` - Status history array
- `useHoursOfService()` - HOS calculations
- `useCertification()` - Certification status
- `useIsUpdating()` - Updating state
- `useStatusError()` - Error message
- `useLogEntries()` - Log entries array
- `useSplitSleepSettings()` - Split sleep configuration
- `useCurrentLocation()` - Current location

**Example:**
```typescript
const currentStatus = useCurrentStatus()  // Only re-renders when status changes
const hos = useHoursOfService()  // Only re-renders when HOS changes
```

## Action Selector Hook

`useStatusActions()` returns all action functions in a single object for convenience:

```typescript
const {
  setCurrentStatus,
  updateStatus,
  setHoursOfService,
  // ... all other actions
} = useStatusActions()
```

## Usage Examples

### Change Status

```typescript
const { updateStatus, setCurrentLocation } = useStatusStore()

// Set location first
setCurrentLocation({
  latitude: 40.7128,
  longitude: -74.0060,
  address: 'Current location'
})

// Update status with reason
await updateStatus('driving', 'Starting route')
```

### Display HOS

```typescript
const { formatDuration } = useStatusStore()
const driveTime = useHoursOfService().driveTimeRemaining

<Text>
  Drive Time Remaining: {formatDuration(driveTime)}
</Text>
```

### Certify Logs

```typescript
const { certifyLogs } = useStatusStore()

const handleCertify = async () => {
  await certifyLogs('John Doe - Driver Signature')
  // Logs are now certified
}
```

### Filter Status Reasons

```typescript
const { getStatusReasons } = useStatusStore()
const currentStatus = useCurrentStatus()
const reasons = getStatusReasons(currentStatus)

<Picker>
  {reasons.map(reason => (
    <Picker.Item key={reason.id} label={reason.text} value={reason.text} />
  ))}
</Picker>
```

## Dependencies

- `zustand`: State management
- `@react-native-async-storage/async-storage`: Persistence
- `@/types/status`: Type definitions

## Notes

- Status history prevents duplicate entries within 1 second
- All operations are logged for debugging
- Location is automatically included in status updates
- HOS calculations should be updated based on actual driving time
- Certification includes signature and timestamp
- Split sleep settings persist separately

