# Complete ELD Data Flow: SDK to Server

## Overview

This document provides a comprehensive end-to-end view of how ELD (Electronic Logging Device) data flows from the physical device through the native SDK, React Native layer, and finally to the backend servers. It covers both normal OBD data and error/fault data (CAN errors and OBD-II DTCs).

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    ELD Physical Device                       │
│              (Bluetooth Low Energy - BLE)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Bluetooth Protocol
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Native Android Layer (Kotlin)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JMBluetoothLowEnergy_ktx-release.aar (Jimi SDK)    │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │  JMBluetoothModule.kt (Native Bridge)                │   │
│  │  - Parses ELD packets                               │   │
│  │  - Extracts CAN errors & OBD DTCs                   │   │
│  │  - Emits events to React Native                     │   │
│  └───────────────────┬──────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        │ React Native Bridge
                        │ (NativeEventEmitter)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│            React Native Layer (TypeScript)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JMBluetoothService.ts (Event Handler)                │   │
│  │  - Receives native events                            │   │
│  │  - Manages event subscriptions                        │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │  ObdDataProvider (Context)                           │   │
│  │  - Processes ELD data                                 │   │
│  │  - Transforms via handleData()                        │   │
│  │  - Buffers for batch sync                             │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                        │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │  API Services                                         │   │
│  │  - sendObdDataBatch() (Local API)                    │   │
│  │  - AwsApiService.saveObdDataBatch() (AWS Lambda)     │   │
│  └───────────────────┬──────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌─────────▼──────────┐
│  Local API    │            │  AWS Lambda        │
│  /obd/data/   │            │  /data (Gateway)   │
│  batch        │            │                    │
└───────────────┘            └────────────────────┘
```

## Data Flow Stages

### Stage 1: ELD Device → Native SDK

**Location**: `android/app/src/main/java/com/ttmkonnect/eld/JMBluetoothModule.kt`

**Process**:
1. ELD device sends data packets via Bluetooth Low Energy (BLE)
2. Jimi SDK (`JMBluetoothLowEnergy_ktx-release.aar`) receives raw bytes
3. SDK parses packets into structured data objects:
   - `EldData` - Normal OBD data (speed, RPM, temperature, etc.)
   - `ErrorBean` - Fault/error data (CAN errors, OBD-II DTCs)
   - `VinBean` - Vehicle identification
   - `TerminalInfo` - Device information

**Key Native Methods**:
- `onDataReceived()` - Receives raw data from SDK
- `extractDtcCodesFromRawData()` - Extracts CAN errors and OBD DTCs from raw bytes
- `createErrorBeanFromRawData()` - Creates structured error payload
- `sendEvent()` - Emits events to React Native bridge

**Event Emission**:
```kotlin
// For normal OBD data
sendEvent("onObdEldDataReceived", eldMap)

// For error/fault data
sendEvent("onObdErrorDataReceived", errorMap)
```

### Stage 2: Native SDK → React Native Bridge

**Location**: `src/services/JMBluetoothService.ts`

**Process**:
1. `NativeEventEmitter` receives events from native module
2. `JMBluetoothService` wraps events with logging and device ID tracking
3. Events are forwarded to registered listeners

**Key Events**:
- `onObdEldDataReceived` - Normal OBD data (engine speed, vehicle speed, etc.)
- `onObdErrorDataReceived` - Error/fault data (CAN errors, DTCs)
- `onConnected` - Device connection established
- `onDisconnected` - Device disconnected
- `onAuthenticationPassed` - Device authentication successful

**Event Structure** (`onObdEldDataReceived`):
```typescript
interface ObdEldData {
  eventType?: number
  eventId?: number
  isLiveEvent?: number
  latitude?: number
  longitude?: number
  gpsSpeed?: number
  gpsTime?: string
  gpsRotation?: number
  dataFlowList?: Array<{
    dataId: number
    data: string
    pid: string  // Hex PID (e.g., "010D" for vehicle speed)
    value: number
  }>
  deviceId?: string
  device_id?: string
}
```

**Event Structure** (`onObdErrorDataReceived`):
```typescript
interface ObdErrorData {
  ack: number
  ackDescription: string
  timestamp: string
  canErrorCodes?: Array<{
    code: string        // e.g., "C01FF"
    type: "can_error"
    description: string
  }>
  obdDtcCodes?: Array<{
    code: string        // e.g., "P0195"
    type: "obd_dtc"
    description: string
  }>
  ecuList?: Array<{
    ecuId: string
    ecuIdHex: string
    codes: string[]
  }>
}
```

### Stage 3: React Native → Data Processing

**Location**: `src/contexts/obd-data-context.tsx`

**Process**:

#### 3.1 Normal OBD Data Processing

1. **Event Reception**:
   ```typescript
   const obdEldDataListener = JMBluetoothService.addEventListener(
     'onObdEldDataReceived',
     (data: ObdEldData) => {
       // Process data
     }
   )
   ```

2. **Data Transformation**:
   - `handleData()` service transforms raw ELD data into display format
   - Extracts specific values: vehicle speed, engine speed, coolant temp, fuel level, etc.
   - Creates `OBDDataItem[]` array for UI display

3. **Payload Creation**:
   - Creates `ObdDataPayload` for Local API
   - Creates `AwsObdPayload` for AWS Lambda
   - Includes GPS coordinates, timestamps, device ID

4. **Buffer Management**:
   - Adds payloads to `dataBufferRef` (Local API)
   - Adds payloads to `awsBufferRef` (AWS Lambda)
   - Buffer size limit: 1000 records (evicts oldest on overflow)

#### 3.2 Error/Fault Data Processing

1. **Event Reception**:
   ```typescript
   const obdErrorDataListener = JMBluetoothService.addEventListener(
     'onObdErrorDataReceived',
     (errorData: ObdErrorData) => {
       // Process errors
     }
   )
   ```

2. **Error Extraction**:
   - Extracts `canErrorCodes` array (CAN bus errors)
   - Extracts `obdDtcCodes` array (OBD-II diagnostic codes)
   - Falls back to legacy `ecuList` if new structure not available

3. **Code Processing**:
   - Each CAN error → Creates `ObdCodeDetails` with system="CAN Bus"
   - Each OBD DTC → Decodes via `decodeObdCode()` to get full details
   - Creates separate `MalfunctionRecord` for each code

4. **Payload Creation**:
   - Uses `handleDtcData()` to create structured payload
   - Includes GPS coordinates when available
   - Sets `data_type: "fault_data"`

5. **Buffer Management**:
   - Adds to `dataBufferRef` for Local API sync
   - Adds to `awsBufferRef` for AWS Lambda sync (if enabled)

### Stage 4: Batch Synchronization

**Location**: `src/contexts/obd-data-context.tsx` (sync intervals)

**Process**:

#### 4.1 Local API Sync

**Configuration**:
- **Interval**: Adaptive (20s-300s based on activity state)
  - Driving: 20 seconds
  - Idling: 90 seconds
  - Inactive: 180 seconds
  - Disconnected: 300 seconds
- **Batch Size**: Adaptive (3-10 records based on activity)
- **Endpoint**: `POST /obd/data/batch`
- **Buffer**: `dataBufferRef`

**Sync Flow**:
```typescript
useEffect(() => {
  const runLocalSync = async () => {
    if (dataBufferRef.current.length === 0) return
    
    const payload = dataBufferRef.current.slice(0, localBatchSize)
    setIsSyncing(true)
    
    try {
      await sendObdDataBatch(payload)
      dataBufferRef.current = dataBufferRef.current.slice(payload.length)
    } catch (error) {
      // Keep data in buffer for retry
      if (dataBufferRef.current.length > 1000) {
        // Evict oldest records
        dataBufferRef.current = dataBufferRef.current.slice(-500)
      }
    } finally {
      setIsSyncing(false)
    }
  }
  
  syncIntervalRef.current = setInterval(runLocalSync, localSyncIntervalMs)
}, [localSyncIntervalMs, localBatchSize])
```

#### 4.2 AWS Lambda Sync

**Configuration**:
- **Interval**: Same adaptive intervals as Local API
- **Batch Size**: Same adaptive sizes
- **Endpoint**: `POST /data` (API Gateway)
- **Buffer**: `awsBufferRef`

**Sync Flow**:
```typescript
useEffect(() => {
  const runAwsSync = async () => {
    if (awsBufferRef.current.length === 0) return
    
    const payload = awsBufferRef.current.slice(0, awsBatchSize)
    
    try {
      await awsApiService.saveObdDataBatch(payload)
      awsBufferRef.current = awsBufferRef.current.slice(payload.length)
      setAwsSyncStatus('success')
    } catch (error) {
      setAwsSyncStatus('error')
      // Keep data in buffer for retry
      if (awsBufferRef.current.length > 1000) {
        awsBufferRef.current = awsBufferRef.current.slice(-500)
      }
    }
  }
  
  awsSyncIntervalRef.current = setInterval(runAwsSync, awsSyncIntervalMs)
}, [awsSyncIntervalMs, awsBatchSize])
```

### Stage 5: API Services

**Location**: `src/api/obd.ts`, `src/services/AwsApiService.ts`

#### 5.1 Local API Service

**Function**: `sendObdDataBatch(dataList: ObdDataPayload[])`

**Process**:
1. Validates payload array (non-empty)
2. Extracts vehicle ID from first payload
3. Converts `ObdDataPayload[]` to `AwsObdPayload[]` format
4. Sends to AWS `/batch` endpoint (hybrid implementation)
5. Returns success/error response

**Request**:
```typescript
POST /obd/data/batch
Content-Type: application/json

{
  "data": [
    {
      "driver_id": "driver-uuid",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "data_type": "engine_data" | "fault_data",
      "vehicle_speed": 65,
      "engine_speed": 2500,
      "coolant_temp": 85,
      "fuel_level": 75,
      "odometer": 50000,
      "latitude": 40.7128,
      "longitude": -74.0060,
      "device_id": "device-identifier",
      "raw_data": { /* Full ELD data structure */ },
      "fault_codes": [ /* Only for fault_data */ ]
    }
  ]
}
```

#### 5.2 AWS Lambda Service

**Function**: `AwsApiService.saveObdDataBatch(payloads: AwsObdPayload[])`

**Process**:
1. Validates each payload (vehicleId, timestamp)
2. Sends each payload individually with `batch: false`
3. Retries on failure (exponential backoff)
4. Returns success/error for each payload

**Request**:
```typescript
POST /data (API Gateway)
Content-Type: application/json
Authorization: Bearer <token>

{
  "batch": false,
  "vehicleId": "VIN-OR-VEHICLE-UNIT",
  "driverId": "driver-uuid",
  "timestamp": 1705312200000,
  "dataType": "engine_data" | "fault_data",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "vehicleSpeed": 65,
  "engineSpeed": 2500,
  "coolantTemp": 85,
  "fuelLevel": 75,
  "odometer": 50000,
  "deviceId": "device-identifier",
  "allData": [ /* Display data items */ ],
  "faultCodes": [ /* Only for fault_data */ ]
}
```

## Complete Data Flow Diagram

### Normal OBD Data Flow

```
ELD Device (BLE)
    │
    │ Raw bytes
    ▼
Native SDK (Jimi SDK)
    │
    │ Parsed EldData
    ▼
JMBluetoothModule.kt
    │
    │ sendEvent("onObdEldDataReceived", eldMap)
    ▼
React Native Bridge
    │
    │ NativeEventEmitter
    ▼
JMBluetoothService.ts
    │
    │ Event forwarded to listeners
    ▼
ObdDataProvider (Context)
    │
    │ handleData() transformation
    ▼
Payload Creation
    │
    ├─► ObdDataPayload (Local API)
    └─► AwsObdPayload (AWS Lambda)
    │
    │ Added to buffers
    ▼
Buffer Management
    │
    ├─► dataBufferRef (Local API)
    └─► awsBufferRef (AWS Lambda)
    │
    │ Every 20-300s (adaptive)
    ▼
Batch Sync
    │
    ├─► POST /obd/data/batch (Local API)
    └─► POST /data (AWS Lambda)
    │
    ▼
Backend Servers
```

### Error/Fault Data Flow

```
ELD Device (BLE)
    │
    │ Raw bytes with error codes
    ▼
Native SDK (Jimi SDK)
    │
    │ Parsed ErrorBean
    ▼
JMBluetoothModule.kt
    │
    │ extractDtcCodesFromRawData()
    │ createErrorBeanFromRawData()
    │ sendEvent("onObdErrorDataReceived", errorMap)
    ▼
React Native Bridge
    │
    │ NativeEventEmitter
    ▼
JMBluetoothService.ts
    │
    │ Event forwarded to listeners
    ▼
ObdDataProvider (Context)
    │
    │ Extract canErrorCodes & obdDtcCodes
    │ Process each code
    │ decodeObdCode() for OBD DTCs
    │ Create ObdCodeDetails for CAN errors
    │ handleDtcData() payload creation
    ▼
Payload Creation
    │
    ├─► ObdDataPayload (data_type: "fault_data")
    └─► AwsObdPayload (dataType: "fault_data")
    │
    │ Added to buffers
    ▼
Buffer Management
    │
    ├─► dataBufferRef (Local API)
    └─► awsBufferRef (AWS Lambda)
    │
    │ Every 20-300s (adaptive)
    ▼
Batch Sync
    │
    ├─► POST /obd/data/batch (Local API)
    └─► POST /data (AWS Lambda)
    │
    ▼
Backend Servers
```

## Key Components

### 1. Native Module (`JMBluetoothModule.kt`)

**Responsibilities**:
- Receives raw data from Jimi SDK
- Parses ELD packets
- Extracts CAN errors and OBD DTCs from raw bytes
- Creates structured event payloads
- Emits events to React Native bridge

**Key Methods**:
- `onDataReceived()` - Entry point for SDK data
- `extractDtcCodesFromRawData()` - Extracts error codes
- `createErrorBeanFromRawData()` - Creates error payload
- `sendEvent()` - Bridge communication

### 2. React Native Service (`JMBluetoothService.ts`)

**Responsibilities**:
- Wraps native module with TypeScript interface
- Manages event subscriptions
- Tracks device ID across events
- Provides logging and statistics

**Key Methods**:
- `addEventListener()` - Subscribe to events
- `removeEventListener()` - Unsubscribe
- `getConnectionStats()` - Connection metrics

### 3. Data Context (`obd-data-context.tsx`)

**Responsibilities**:
- Processes ELD data events
- Transforms data via `handleData()`
- Manages dual sync buffers
- Handles batch synchronization
- Tracks connection status

**Key State**:
- `obdData` - Current display data
- `isConnected` - Connection status
- `isSyncing` - Local API sync status
- `awsSyncStatus` - AWS sync status

**Key Refs**:
- `dataBufferRef` - Local API buffer
- `awsBufferRef` - AWS Lambda buffer

### 4. Data Transformation (`handleData.ts`)

**Responsibilities**:
- Transforms raw `ObdEldData` to `OBDDataItem[]`
- Maps OBD PIDs to human-readable names
- Formats values with units
- Extracts specific metrics (speed, RPM, temp, etc.)

### 5. API Services

**Local API** (`src/api/obd.ts`):
- `sendObdData()` - Single record
- `sendObdDataBatch()` - Batch upload
- `getObdDataHistory()` - History retrieval

**AWS API** (`src/services/AwsApiService.ts`):
- `saveObdDataBatch()` - Batch upload to Lambda
- Retry logic with exponential backoff
- Token management

## Payload Structures

### Normal OBD Data Payload

**Local API** (`ObdDataPayload`):
```typescript
{
  driver_id: string
  timestamp: string (ISO 8601)
  data_type?: "engine_data"
  vehicle_speed?: number
  engine_speed?: number
  coolant_temp?: number
  fuel_level?: number
  odometer?: number
  latitude?: number
  longitude?: number
  device_id?: string
  raw_data: ObdEldData  // Full ELD data structure
}
```

**AWS Lambda** (`AwsObdPayload`):
```typescript
{
  batch: false
  vehicleId: string
  driverId: string
  timestamp: number (Unix ms)
  dataType: "engine_data"
  latitude?: number
  longitude?: number
  gpsSpeed?: number
  gpsTime?: string
  vehicleSpeed?: number
  engineSpeed?: number
  coolantTemp?: number
  fuelLevel?: number
  odometer?: number
  deviceId?: string
  allData: OBDDataItem[]  // Display data items
}
```

### Error/Fault Data Payload

**Local API** (`ObdDataPayload` with `data_type: "fault_data"`):
```typescript
{
  driver_id: string
  timestamp: string (ISO 8601)
  data_type: "fault_data"
  latitude?: number
  longitude?: number
  device_id?: string
  raw_data: {
    dataType: "fault_data"
    faultCodes: Array<{
      ecuId: string
      ecuIdHex: string
      codes: string[]
      details: ObdCodeDetails[]
    }>
  }
  fault_codes: Array<{
    ecu_id: string
    ecu_id_hex: string
    codes: string[]
    details: ObdCodeDetails[]
  }>
}
```

**AWS Lambda** (`AwsObdPayload` with `dataType: "fault_data"`):
```typescript
{
  batch: false
  vehicleId: string
  driverId: string
  timestamp: number (Unix ms)
  dataType: "fault_data"
  latitude?: number
  longitude?: number
  deviceId?: string
  faultCodes: Array<{
    ecuId: string
    ecuIdHex: string
    codes: string[]
    details: ObdCodeDetails[]
  }>
  allData: Array<{
    ecuId: string
    ecuIdHex: string
    codes: string[]
    details: ObdCodeDetails[]
  }>
}
```

## Buffer Management

### Buffer Limits

- **Max Size**: 1000 records per buffer
- **Overflow Action**: Removes oldest 500 records (keeps newest 500)
- **Eviction Trigger**: Checked during sync, not on add (current implementation)

### Buffer Lifecycle

1. **Add**: Payloads added to buffer on event reception
2. **Sync**: Batches sent every adaptive interval (20-300s)
3. **Success**: Buffer cleared for sent records
4. **Error**: Records retained for retry
5. **Overflow**: Oldest records evicted if buffer > 1000

## Error Handling

### Network Errors

- **Local API**: Logs error, retains buffer, retries on next interval
- **AWS Lambda**: Sets status to 'error', retains buffer, retries with backoff

### Buffer Overflow

- Evicts oldest 500 records when buffer exceeds 1000
- Logs warning when overflow occurs

### Missing Data

- Validates required fields (driver_id, vehicleId, timestamp)
- Skips invalid payloads with warning logs

## Performance Considerations

### Adaptive Batching

- **Driving**: 20s interval, 5 records/batch (high frequency)
- **Idling**: 90s interval, 3 records/batch (medium frequency)
- **Inactive**: 180s interval, 10 records/batch (low frequency)
- **Disconnected**: 300s interval, 10 records/batch (offline)

### Battery Optimization

- Sync intervals doubled in low power mode
- Sync intervals doubled when battery < 20%

### Memory Management

- Buffer size limits prevent OOM crashes
- Oldest records evicted on overflow
- Refs used instead of state for buffers (prevents re-renders)

## Configuration

**File**: `src/config/aws-config.ts`

```typescript
{
  features: {
    enableLocalSync: true
    enableAwsSync: true
    awsSyncInterval: 60000  // ms
    batchSize: 50
  }
}
```

## Logging

Comprehensive logging at each stage:
- Native: Android Logcat (TAG: "JMBluetoothModule")
- React Native: Console logs with emoji prefixes
- Service: BluetoothLogger with in-memory storage

## Related Documentation

- `docs/CONTEXT_OBD_DATA.md` - OBD Data Context details
- `docs/API_OBD.md` - OBD API endpoints
- `docs/CAN_DATA_PAYLOAD.md` - CAN error payload structure
- `docs/SERVICE_JM_BLUETOOTH.md` - Bluetooth service API
- `docs/HYBRID_AWS_IMPLEMENTATION.md` - Dual sync architecture

## Summary

The ELD data flow is a multi-stage pipeline:

1. **Physical Device** → Sends BLE packets
2. **Native SDK** → Parses packets, extracts data
3. **Native Module** → Creates events, emits to bridge
4. **React Native Service** → Receives events, forwards to listeners
5. **Data Context** → Processes data, creates payloads, buffers
6. **API Services** → Batches and sends to backend
7. **Backend Servers** → Stores and processes data

The system uses dual synchronization (Local API + AWS Lambda) with adaptive batching based on vehicle activity state, ensuring efficient data transmission while maintaining battery life and network efficiency.
















