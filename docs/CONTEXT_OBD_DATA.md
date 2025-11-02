# OBD Data Context Documentation

**File:** `src/contexts/obd-data-context.tsx`

## Overview

React Context provider that manages OBD/ELD data from connected Bluetooth devices. Handles data collection, buffering, and dual synchronization to both local API and AWS Lambda endpoints.

## Key Features

- **Real-time OBD Data Collection**: Listens to ELD device events
- **Dual Sync Architecture**: 
  - Local API sync (every 60 seconds)
  - AWS Lambda sync (every 60 seconds)
- **Data Buffering**: In-memory buffers for batch uploads
- **Connection Status Tracking**: Monitors ELD device connection state
- **Sync Status Indicators**: Tracks sync progress for both endpoints

## Context Type

```typescript
interface ObdDataContextType {
  obdData: OBDDataItem[]           // Current OBD data display items
  lastUpdate: Date | null          // Last data update timestamp
  isConnected: boolean             // ELD device connection status
  isSyncing: boolean               // Local API sync status
  awsSyncStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastAwsSync: Date | null
}
```

## Data Flow

1. **ELD Device** → Sends OBD data via Bluetooth
2. **JMBluetoothService** → Receives `onObdEldDataReceived` event
3. **handleData()** → Transforms raw data to display format
4. **Data Buffers** → Adds to both local and AWS buffers
5. **Sync Intervals** → Sends batches every 60 seconds

## OBD Data Processing

### Data Transformation

Raw ELD data (`ObdEldData`) is processed through `handleData()` service to create display items:

```typescript
interface OBDDataItem {
  id: string
  name: string        // e.g., "Vehicle Speed", "Engine Speed"
  value: string       // Formatted value
  unit: string        // e.g., "km/h", "RPM", "°C"
  isError?: boolean
}
```

### Data Extraction

Specific values are extracted for API payloads:
- Vehicle Speed
- Engine Speed (RPM)
- Coolant Temperature
- Fuel Level
- Battery Voltage
- Odometer

## Dual Sync System

### Local API Sync

**Endpoint**: `/obd/data/batch`  
**Interval**: 60 seconds (60000ms)  
**Buffer**: `dataBufferRef`  
**Payload**: `ObdDataPayload[]`

**Configuration**:
- Controlled by `awsConfig.features.enableLocalSync`
- Syncs every 60 seconds
- Clears buffer on success
- Limits buffer to 1000 records (removes oldest on overflow)

### AWS Lambda Sync

**Endpoint**: `/data` (API Gateway)  
**Interval**: 60 seconds (configurable)  
**Buffer**: `awsBufferRef`  
**Payload**: `AwsObdPayload[]`

**Configuration**:
- Controlled by `awsConfig.features.enableAwsSync`
- Configurable interval via `awsConfig.features.awsSyncInterval`
- Syncs to DynamoDB via Lambda
- Status tracking (idle/syncing/success/error)

## Payload Structure

### Local API Payload

```typescript
{
  driver_id: string
  timestamp: string (ISO 8601)
  vehicle_speed?: number
  engine_speed?: number
  coolant_temp?: number
  fuel_level?: number
  odometer?: number
  latitude?: number
  longitude?: number
  raw_data: ObdEldData
}
```

### AWS Lambda Payload

```typescript
{
  vehicleId: string          // VIN
  driverId: string
  timestamp: number          // Unix timestamp (ms)
  dataType: 'engine_data'
  latitude?: number
  longitude?: number
  gpsSpeed?: number
  gpsTime?: number
  gpsRotation?: number
  eventTime?: number
  eventType?: string
  eventId?: string
  isLiveEvent?: boolean
  vehicleSpeed?: number
  engineSpeed?: number
  coolantTemp?: number
  fuelLevel?: number
  batteryVoltage?: number
  odometer?: number
  allData: OBDDataItem[]     // Complete display data
}
```

## Event Listeners

### onObdEldDataReceived

Fired when ELD device sends OBD data:

1. Transforms data via `handleData()`
2. Updates `obdData` state
3. Sets `lastUpdate` timestamp
4. Sets `isConnected` to true
5. Creates payloads for both sync systems
6. Adds to buffers

### onDisconnected

Fired when ELD device disconnects:
- Sets `isConnected` to false

### onConnected

Fired when ELD device connects:
- Sets `isConnected` to true

## Sync Intervals

### Local API Sync Interval

```typescript
useEffect(() => {
  if (!isAuthenticated || !driverProfile?.driver_id) return
  if (!awsConfig.features.enableLocalSync) return

  syncIntervalRef.current = setInterval(async () => {
    if (dataBufferRef.current.length === 0) return
    
    setIsSyncing(true)
    await sendObdDataBatch(dataBufferRef.current)
    dataBufferRef.current = []
    setIsSyncing(false)
  }, 60000)  // 1 minute

  return () => clearInterval(syncIntervalRef.current)
}, [isAuthenticated, driverProfile?.driver_id])
```

### AWS Sync Interval

Similar structure but:
- Uses `awsBufferRef`
- Calls `awsApiService.saveObdDataBatch()`
- Updates `awsSyncStatus` state
- Configurable interval from config

## Buffer Management

### Buffer Size Limits

- **Max Size**: 1000 records
- **Overflow Action**: Removes oldest 500 records (keeps newest 500)

### Buffer Clearing

- Cleared on successful sync
- Retained on error (for retry)

## Error Handling

### Local API Errors

- Logs error to console
- Keeps data in buffer for retry
- Limits buffer size to prevent memory issues
- Sets `isSyncing` to false

### AWS Errors

- Sets `awsSyncStatus` to 'error'
- Keeps data in buffer for retry
- Resets status to 'idle' after 3 seconds
- Limits buffer size

## Authentication Requirements

Context only activates when:
- `isAuthenticated` is true
- `driverProfile?.driver_id` exists

This prevents unnecessary processing for unauthenticated users.

## Hook Usage

```typescript
const { 
  obdData,           // Current OBD data items
  lastUpdate,        // Last update timestamp
  isConnected,       // Connection status
  isSyncing,         // Local sync status
  awsSyncStatus,     // AWS sync status
  lastAwsSync        // Last AWS sync timestamp
} = useObdData()
```

## Integration Points

- **JMBluetoothService**: Event source for OBD data
- **handleData Service**: Data transformation
- **OBD API**: Local backend sync
- **AWS API Service**: AWS Lambda sync
- **Auth Store**: Authentication and driver data
- **EldIndicator Component**: Visual status display

## Performance Considerations

1. **Buffering**: Reduces API calls by batching data
2. **Interval-based Sync**: Prevents excessive network usage
3. **Buffer Limits**: Prevents memory leaks
4. **Conditional Activation**: Only runs when authenticated

## Logging

Comprehensive logging throughout:
- Data reception events
- Buffer operations
- Sync operations
- Error conditions
- Connection state changes

## Configuration

Controlled via `aws-config.ts`:
- `enableLocalSync`: Toggle local API sync
- `enableAwsSync`: Toggle AWS sync
- `awsSyncInterval`: AWS sync interval (default: 60000ms)
- `batchSize`: Max records per request (default: 50)

