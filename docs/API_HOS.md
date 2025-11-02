# HOS (Hours of Service) API Documentation

**File:** `src/api/hos.ts`

## Overview

Hours of Service API module for ELD compliance with React Query hooks for real-time synchronization. Handles HOS clocks, duty status changes, daily logs, compliance settings, and provides automatic periodic sync (every 30-60 seconds).

## Key Features

- ✅ **Real-time HOS Clock Sync** - Primary sync endpoint with automatic refresh
- ✅ **Periodic Updates** - Automatic sync every 60 seconds (configurable)
- ✅ **Duty Status Changes** - Update duty status with location and odometer
- ✅ **Daily Logs Retrieval** - Historical HOS data with date range filtering
- ✅ **Compliance Settings** - Organization HOS rules and configuration
- ✅ **React Query Integration** - Automatic caching, refetching, and error handling
- ✅ **Optimistic Updates** - Immediate UI updates with background sync

## Primary Sync Endpoint

### GET /api/hos/clocks/

**Primary endpoint** for syncing current HOS clock data. Returns the driver's current HOS clock with all time remaining calculations.

**Response Structure**:
```typescript
{
  id: "uuid",
  driver: "driver_uuid",
  driver_name: "John Doe",
  current_duty_status: "driving",
  current_duty_status_start_time: "2025-11-02T10:30:00Z",
  
  // Time remaining (in minutes)
  driving_time_remaining: 660,  // 11 hours
  on_duty_time_remaining: 840,  // 14 hours
  cycle_time_remaining: 5040,   // 84 hours
  
  // Time remaining (in hours - computed)
  driving_time_remaining_hours: 11.0,
  on_duty_time_remaining_hours: 14.0,
  cycle_time_remaining_hours: 84.0,
  
  // Cycle info
  cycle_start_time: "2025-10-27T00:00:00Z",
  cycle_type: "70_hour",
  
  // Vehicle assignment
  current_vehicle: "vehicle_uuid",
  vehicle_unit: "Truck-101",
  
  // Last sync timestamp
  last_updated: "2025-11-02T13:00:00Z"
}
```

## Data Types

### HOSClock

Complete HOS clock structure:

```typescript
interface HOSClock {
  id?: string
  driver: string
  driver_name: string
  current_duty_status: string  // driving, on_duty, off_duty, sleeper_berth, etc.
  current_duty_status_start_time: string  // ISO 8601
  
  // Time remaining (in minutes)
  driving_time_remaining: number  // 660 = 11 hours
  on_duty_time_remaining: number  // 840 = 14 hours
  cycle_time_remaining: number    // 5040 = 84 hours
  
  // Time remaining (in hours - computed)
  driving_time_remaining_hours: number
  on_duty_time_remaining_hours: number
  cycle_time_remaining_hours: number
  
  // Cycle info
  cycle_start_time: string  // ISO 8601
  cycle_type: string  // "70_hour", "60_hour"
  
  // Vehicle assignment
  current_vehicle?: string
  vehicle_unit?: string
  
  // Last sync timestamp
  last_updated?: string  // ISO 8601
}
```

### ChangeDutyStatusRequest

Request payload for changing duty status:

```typescript
interface ChangeDutyStatusRequest {
  duty_status: string  // off_duty, sleeper_berth, driving, on_duty, personal_conveyance, yard_move
  location?: string
  latitude?: number
  longitude?: number
  odometer?: number
  notes?: string
}
```

### ChangeDutyStatusResponse

Response from duty status change:

```typescript
interface ChangeDutyStatusResponse {
  status: string
  clock: HOSClock  // Updated clock data
}
```

### HOSComplianceSettings

Organization HOS rules and settings:

```typescript
interface HOSComplianceSettings {
  ruleset: string  // "usa_property_70_hour"
  cycle_type: string  // "70_hour_8_day", "60_hour_7_day"
  restart_hours: number  // 34 hours for restart
  enable_16_hour_exception: boolean
  break_period_required: boolean
  break_period_minutes: number  // 30 minutes
  personal_conveyance_enabled: boolean
  yard_move_enabled: boolean
  adverse_weather_exemption_enabled?: boolean
  big_day_exemption_enabled?: boolean
  waiting_time_duty_status_enabled?: boolean
}
```

### HOSDailyLog

Daily log summary:

```typescript
interface HOSDailyLog {
  id?: string
  driver: string
  driver_name?: string
  log_date: string  // YYYY-MM-DD
  total_driving_time: number  // minutes
  total_on_duty_time: number  // minutes
  total_off_duty_time: number  // minutes
  total_sleeper_berth_time?: number  // minutes
  is_certified: boolean
  certified_at?: string
  certified_by?: string
}
```

### DailyLogsQueryParams

Query parameters for daily logs:

```typescript
interface DailyLogsQueryParams {
  startDate?: string  // YYYY-MM-DD
  endDate?: string    // YYYY-MM-DD
  driver?: string
}
```

## React Query Hooks

### `useHOSClock(options?)`

**Primary hook** for getting current HOS clock. Used for periodic sync.

**Features**:
- Automatic periodic refetch (default: 60 seconds)
- Configurable refetch interval
- Background refetch support
- Smart retry logic (no retry on 404)

**Parameters**:
```typescript
{
  enabled?: boolean  // Default: true
  refetchInterval?: number  // Default: 60000ms (60 seconds)
  refetchIntervalInBackground?: boolean  // Default: false
}
```

**Returns**: `UseQueryResult<HOSClock, ApiError>`

**Usage**:
```typescript
// Basic usage with default 60-second sync
const { data: clock, isLoading, error } = useHOSClock()

// Custom interval (30 seconds)
const { data: clock } = useHOSClock({
  refetchInterval: 30000
})

// Disable when not needed
const { data: clock } = useHOSClock({
  enabled: isAuthenticated && isConnected
})
```

**Auto-refetch**: Automatically refetches every 60 seconds to keep clock data current.

### `useHOSClockById(clockId, options?)`

Get specific HOS clock by ID.

**Parameters**:
- `clockId`: string | null | undefined
- `options.enabled?: boolean`

**Usage**:
```typescript
const { data: clock } = useHOSClockById(clockId)
```

### `useChangeDutyStatus()`

Mutation hook for changing duty status.

**Features**:
- Optimistic cache updates
- Automatic cache invalidation
- Error handling

**Returns**: `UseMutationResult<ChangeDutyStatusResponse, ApiError>`

**Usage**:
```typescript
const changeStatus = useChangeDutyStatus()

const handleStatusChange = async () => {
  try {
    const result = await changeStatus.mutateAsync({
      clockId: clock.id!,
      request: {
        duty_status: 'driving',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        location: currentLocation.address,
        odometer: currentOdometer
      }
    })
    console.log('Status changed:', result.clock.current_duty_status)
  } catch (error) {
    console.error('Failed to change status:', error)
  }
}
```

### `useCreateHOSClock()`

Mutation hook for creating a new HOS clock.

**Usage**:
```typescript
const createClock = useCreateHOSClock()

await createClock.mutateAsync({
  driver: driverId,
  current_duty_status: 'off_duty',
  current_duty_status_start_time: new Date().toISOString(),
  driving_time_remaining: 660,
  on_duty_time_remaining: 840,
  cycle_time_remaining: 5040,
  cycle_start_time: cycleStart,
  cycle_type: '70_hour'
})
```

### `useUpdateHOSClock()`

Mutation hook for updating an existing HOS clock.

**Usage**:
```typescript
const updateClock = useUpdateHOSClock()

await updateClock.mutateAsync({
  clockId: clock.id!,
  clockData: {
    driving_time_remaining: 600,
    on_duty_time_remaining: 800
  }
})
```

### `useDailyLogs(params?, options?)`

Query hook for retrieving daily logs.

**Parameters**:
- `params?: DailyLogsQueryParams` - Query filters
- `options.enabled?: boolean`

**Usage**:
```typescript
// Get all daily logs
const { data: logs } = useDailyLogs()

// Get logs for date range
const { data: logs } = useDailyLogs({
  startDate: '2025-11-01',
  endDate: '2025-11-02'
})

// Get logs for specific driver
const { data: logs } = useDailyLogs({
  driver: driverId
})
```

**Cache**: 5 minutes stale time (logs don't change frequently)

### `useComplianceSettings(options?)`

Query hook for getting HOS compliance settings.

**Usage**:
```typescript
const { data: settings } = useComplianceSettings()

// Check if personal conveyance is enabled
if (settings?.personal_conveyance_enabled) {
  // Show PC option
}
```

**Cache**: 30 minutes stale time (settings rarely change)

### `useCertifyHOSLog()`

Mutation hook for certifying HOS logs (legacy).

**Usage**:
```typescript
const certifyLog = useCertifyHOSLog()

await certifyLog.mutateAsync(logId)
```

## API Service Functions

### `hosApi.getCurrentHOSClock()`

**GET** `/api/hos/clocks/`

Fetches current HOS clock for authenticated driver.

**Returns**: `Promise<HOSClock>`

**Handles**: Array or single object response (returns first clock if array)

### `hosApi.getHOSClockById(clockId)`

**GET** `/api/hos/clocks/{clock_id}/`

Fetches specific clock by ID.

**Parameters**:
- `clockId`: string

**Returns**: `Promise<HOSClock>`

### `hosApi.changeDutyStatus(clockId, request)`

**POST** `/api/hos/clocks/{clock_id}/change_duty_status/`

Changes duty status with location and optional data.

**Parameters**:
- `clockId`: string
- `request`: ChangeDutyStatusRequest

**Returns**: `Promise<ChangeDutyStatusResponse>`

**Example**:
```typescript
const response = await hosApi.changeDutyStatus(clockId, {
  duty_status: 'driving',
  location: '123 Main St',
  latitude: 37.7749,
  longitude: -122.4194,
  odometer: 123456,
  notes: 'Starting shift'
})
```

### `hosApi.createHOSClock(clockData)`

**POST** `/api/hos/clocks/`

Creates a new HOS clock.

**Parameters**: `CreateUpdateHOSClockRequest`

**Returns**: `Promise<HOSClock>`

### `hosApi.updateHOSClock(clockId, clockData)`

**PATCH** `/api/hos/clocks/{clock_id}/`

Updates an existing HOS clock.

**Parameters**:
- `clockId`: string
- `clockData`: `Partial<CreateUpdateHOSClockRequest>`

**Returns**: `Promise<HOSClock>`

### `hosApi.getDailyLogs(params?)`

**GET** `/api/hos/daily-logs/`
**GET** `/api/hos/daily-logs/?startDate=2025-11-01&endDate=2025-11-02`

Retrieves daily logs with optional filtering.

**Parameters**: `DailyLogsQueryParams`

**Returns**: `Promise<HOSDailyLog[]>`

### `hosApi.getComplianceSettings()`

**GET** `/api/hos/compliance-settings/`

Gets organization HOS compliance settings.

**Returns**: `Promise<HOSComplianceSettings>`

## Helper Functions

### `hosApi.formatLocationForAPI(location)`

Formats location data for API submission.

**Returns**: Formatted location string (address or lat,lng)

### `hosApi.getStatusRemark(status)`

Gets predefined remark for duty status.

### `hosApi.formatTimestamp(timestamp)`

Converts timestamp to ISO 8601 string.

### `hosApi.getAPIDutyStatus(appStatus)`

Converts app status format (camelCase) to API format (snake_case).

**Mapping**:
- `driving` → `driving`
- `onDuty` → `on_duty`
- `offDuty` → `off_duty`
- `sleeperBerth` → `sleeper_berth`
- `personalConveyance` → `personal_conveyance`
- `yardMoves` → `yard_move`

### `hosApi.getAppDutyStatus(apiStatus)`

Converts API status format (snake_case) to app format (camelCase).

**Reverse mapping** of `getAPIDutyStatus`.

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

## Mobile App Integration Flow

### Initial Sync (App Launch)

```typescript
// 1. Login and get driver details (includes HOS data)
const loginResponse = await organizationApi.loginDriver({ email, password })
// loginResponse.user.hos_status contains current clock data

// 2. Get full HOS clock data (using hook)
const { data: clock } = useHOSClock()

// 3. Get compliance settings
const { data: settings } = useComplianceSettings()
```

### Periodic Sync (Every 30-60 seconds)

```typescript
// Automatic via useHOSClock hook
const { data: clock } = useHOSClock({
  refetchInterval: 60000,  // 60 seconds
  refetchIntervalInBackground: false
})

// Clock data automatically updates every 60 seconds
// Use clock data in UI
```

### Status Change (Driver Action)

```typescript
const changeStatus = useChangeDutyStatus()
const { currentLocation } = useLocation()

const handleStatusChange = async (newStatus: string) => {
  const result = await changeStatus.mutateAsync({
    clockId: clock.id!,
    request: {
      duty_status: hosApi.getAPIDutyStatus(newStatus),
      location: currentLocation?.address,
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
      odometer: currentOdometer
    }
  })
  
  // Result contains updated clock
  updateLocalState(result.clock)
}
```

## Query Keys

React Query cache keys:

```typescript
QUERY_KEYS.HOS_CLOCKS = ['hos', 'clocks']
QUERY_KEYS.HOS_CLOCK(clockId) = ['hos', 'clock', clockId]
QUERY_KEYS.HOS_DAILY_LOGS = ['hos', 'daily-logs']
QUERY_KEYS.HOS_COMPLIANCE_SETTINGS = ['hos', 'compliance-settings']
```

## Caching Strategy

### HOS Clock
- **Stale Time**: 30 seconds
- **Refetch Interval**: 60 seconds (configurable)
- **Background Refetch**: Disabled by default

### Daily Logs
- **Stale Time**: 5 minutes
- **Refetch**: Manual or on mutation

### Compliance Settings
- **Stale Time**: 30 minutes
- **Cache Time**: 1 hour
- **Refetch**: Manual or on app restart

## Error Handling

### Retry Logic

- **HOS Clock**: Retries up to 3 times (skips retry on 404)
- **Daily Logs**: Retries up to 2 times
- **Compliance Settings**: Retries up to 2 times
- **Mutations**: No automatic retry (user must retry manually)

### Error Types

- **404**: Clock doesn't exist (create new clock)
- **401**: Unauthorized (logout user)
- **400**: Bad request (validation error)
- **500**: Server error (retry with backoff)

## Integration Points

### With Auth Store

HOS clock data from login response:
```typescript
// Login response includes hos_status
const { user } = loginResponse
const initialClock = user.hos_status
```

### With Status Store

Sync HOS clock updates to status store:
```typescript
const { data: clock } = useHOSClock()

useEffect(() => {
  if (clock) {
    statusStore.setHoursOfService({
      driveTimeRemaining: clock.driving_time_remaining,
      shiftTimeRemaining: clock.on_duty_time_remaining,
      cycleTimeRemaining: clock.cycle_time_remaining,
      lastCalculated: Date.now()
    })
    statusStore.updateStatus(clock.current_duty_status)
  }
}, [clock])
```

### With Location Context

Include location in status changes:
```typescript
const { currentLocation } = useLocation()

await changeStatus.mutateAsync({
  clockId: clock.id!,
  request: {
    duty_status: 'driving',
    latitude: currentLocation?.latitude,
    longitude: currentLocation?.longitude,
    location: currentLocation?.address
  }
})
```

## Best Practices

1. **Use Primary Hook**: Use `useHOSClock()` for main sync (automatic updates)
2. **Handle Loading States**: Check `isLoading` before using clock data
3. **Error Boundaries**: Wrap HOS components in error boundaries
4. **Location Always**: Include location in status changes
5. **Cache Updates**: Let React Query handle cache updates automatically
6. **Periodic Sync**: Keep refetch interval at 60 seconds for real-time feel
7. **Background Sync**: Disable background refetch to save battery (optional)

## Performance

- **Automatic Batching**: React Query batches requests
- **Smart Caching**: Prevents unnecessary network calls
- **Optimistic Updates**: Immediate UI updates
- **Background Sync**: Optional background refetch

## Dependencies

- `@tanstack/react-query` - React Query hooks
- `./client` - API client
- `./constants` - API endpoints and query keys
- `@/contexts/location-context` - Location data

## Notes

1. **Primary Endpoint**: `GET /api/hos/clocks/` is the main sync endpoint
2. **Auto-refresh**: Clock data refreshes automatically every 60 seconds
3. **Last Updated**: Use `last_updated` timestamp to detect sync changes
4. **Time Units**: Minutes and hours both provided (use as needed)
5. **Cycle Types**: Supports 70-hour and 60-hour cycles
