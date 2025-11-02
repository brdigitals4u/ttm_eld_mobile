# JM Bluetooth Service Documentation

**File:** `src/services/JMBluetoothService.ts`

## Overview

TypeScript service wrapper for the native JM Bluetooth Low Energy module. Provides a unified interface for ELD device communication including scanning, connection, authentication, data reporting, and configuration.

## Architecture

- **Native Module**: `JMBluetoothModule` (Android Kotlin)
- **Event System**: `NativeEventEmitter` for event handling
- **Logging**: Custom `BluetoothLogger` for debugging
- **Singleton Pattern**: Single instance exported

## Key Features

- Device scanning and discovery
- Connection management with retry logic
- Authentication (password enable/validate)
- ELD and OBD data reporting
- History data queries
- Terminal info queries
- Fault code management
- Data item configuration (OBD PIDs)
- Driver authentication info storage
- OTA upgrade support
- Comprehensive logging and statistics

## Core Methods

### Initialization

#### `initializeSDK()`

Initializes the Bluetooth SDK.

**Returns**: `Promise<boolean>`

**Usage**:
```typescript
const initialized = await JMBluetoothService.initializeSDK()
```

### Permissions

#### `requestPermissions()`

Requests Bluetooth permissions from the user.

**Returns**: `Promise<{granted: boolean; message?: string}>`

**Usage**:
```typescript
const { granted, message } = await JMBluetoothService.requestPermissions()
```

### Scanning

#### `startScan()`

Starts scanning for nearby Bluetooth devices.

**Returns**: `Promise<boolean>`

**Events**: Emits `onDeviceFound` for each discovered device

#### `stopScan()`

Stops the device scan.

**Returns**: `Promise<boolean>`

**Events**: Emits `onScanStopped` and `onScanFinished`

### Connection

#### `connect(deviceAddress)`

Connects to a device by MAC address.

**Parameters**:
- `deviceAddress`: string - MAC address (e.g., "C4:A8:28:43:14:9A")

**Returns**: `Promise<boolean>`

**Events**: 
- `onConnected` - Connection successful
- `onConnectFailure` - Connection failed

**Usage**:
```typescript
await JMBluetoothService.connect('C4:A8:28:43:14:9A')
```

#### `connectWithRetry(deviceAddress)`

Attempts connection with automatic retry logic (handled by native module).

**Usage**: Same as `connect()`

#### `disconnect()`

Disconnects from the current device.

**Returns**: `Promise<boolean>`

**Events**: `onDisconnected`

### Authentication

#### `checkPasswordEnable()`

Checks if password authentication is enabled on the device.

**Returns**: `Promise<boolean>`

#### `validatePassword(password)`

Validates a password with the device.

**Parameters**:
- `password`: string

**Returns**: `Promise<boolean>`

**Events**: `onAuthenticationPassed` or `onAuthenticationFailed`

#### `enablePassword(password)`

Enables password authentication on the device.

**Returns**: `Promise<boolean>`

#### `disablePassword(password)`

Disables password authentication.

**Returns**: `Promise<boolean>`

### Data Reporting

#### `startReportEldData()`

Starts receiving ELD (Electronic Logging Device) data.

**Returns**: `Promise<boolean>`

**Events**: `onObdEldDataReceived` - Emitted for each data packet

#### `stopReportEldData()`

Stops ELD data reporting.

**Returns**: `Promise<boolean>`

#### `startReportObdData()`

Starts receiving OBD (On-Board Diagnostics) data.

**Returns**: `Promise<boolean>`

**Events**: `onObdDataReceived`

#### `stopReportObdData()`

Stops OBD data reporting.

**Returns**: `Promise<boolean>`

### History Data

#### `queryHistoryData(type, startTime, endTime)`

Queries historical data from the device.

**Parameters**:
- `type`: number - Data type identifier
- `startTime`: string - Format: "YYMMDDHHmmss"
- `endTime`: string - Format: "YYMMDDHHmmss"

**Returns**: `Promise<boolean>`

**Events**: `onHistoryDataReceived`

**Helper Methods**:
- `formatTimeForHistory(date)` - Formats Date to "YYMMDDHHmmss"
- `getCurrentTimeFormatted()` - Current time formatted
- `getLast24HoursRange()` - Returns last 24 hours range

#### `stopReportHistoryData()`

Stops history data reporting.

**Returns**: `Promise<boolean>`

### Terminal Info

#### `queryTerminalInfo()`

Queries terminal/device information.

**Returns**: `Promise<boolean>`

**Events**: `onTerminalInfoReceived`

### Fault Codes

#### `clearFaultCode()`

Clears fault codes on the device.

**Returns**: `Promise<boolean>`

### Data Configuration

#### `queryDataItemConfig()`

Queries current OBD PID configuration.

**Returns**: `Promise<boolean>`

**Events**: `onDataItemConfigReceived`

#### `setDataItemConfig(config)`

Sets OBD data item configuration.

**Parameters**:
- `config`: string - JSON configuration

**Returns**: `Promise<boolean>`

#### `setDataItemConfigBatch(pids)`

Sets multiple PIDs at once.

**Parameters**:
- `pids`: number[] - Array of PID values

**Returns**: `Promise<boolean>`

#### `configureAllPIDs()`

Configures 10 specific PIDs for the app:

1. `0x0D` - Vehicle Speed
2. `0x05` - Engine Coolant Temperature
3. `0x0F` - Intake Air Temperature
4. `0x10` - Mass Air Flow Rate
5. `0x11` - Throttle Position
6. `0x0E` - Timing Advance
7. `0x04` - Engine Load
8. `0x2F` - Fuel Level
9. `0x44` - Air/Fuel Ratio
10. `0x74` - Turbocharger RPM

**Returns**: `Promise<boolean>`

### Driver Authentication

#### `saveDriverAuthInfo(info)`

Saves driver authentication information to device.

**Parameters**:
- `info`: string - JSON string with driver info

**Returns**: `Promise<boolean>`

#### `readDriverAuthInfo()`

Reads driver authentication information from device.

**Returns**: `Promise<boolean>`

**Events**: `onDriverAuthInfoReceived`

### OTA Upgrade

#### `startOtaUpgrade()`

Starts Over-The-Air firmware upgrade.

**Returns**: `Promise<boolean>`

**Events**: `onOtaUpgradeProgress`

### Custom Commands

#### `sendCustomCommand(command)`

Sends a custom command string to the device.

**Parameters**:
- `command`: string

**Returns**: `Promise<boolean>`

## Event System

### Event Listeners

#### `addEventListener(event, listener)`

Adds an event listener.

**Parameters**:
- `event`: keyof JMBluetoothEvents
- `listener`: Function

**Returns**: `EmitterSubscription`

**Events Available**:
- `onDeviceFound`
- `onScanStopped`
- `onScanFinished`
- `onConnected`
- `onDisconnected`
- `onConnectFailure`
- `onAuthenticationPassed`
- `onAuthenticationFailed`
- `onObdEldDataReceived`
- `onObdDataReceived`
- `onHistoryDataReceived`
- `onTerminalInfoReceived`
- `onDataItemConfigReceived`
- `onDriverAuthInfoReceived`
- `onOtaUpgradeProgress`

**Usage**:
```typescript
const subscription = JMBluetoothService.addEventListener(
  'onObdEldDataReceived',
  (data) => {
    console.log('Received data:', data)
  }
)
```

#### `removeEventListener(subscription)`

Removes a specific event listener.

#### `removeAllEventListeners()`

Removes all event listeners.

## Logging System

### BluetoothLogger

Custom logging class with:
- Timestamped log entries
- Log level (INFO, WARN, ERROR, DEBUG)
- In-memory log storage (max 1000 entries)
- Console output

### Methods

- `logger.info(message, data?)`
- `logger.warn(message, data?)`
- `logger.error(message, data?)`
- `logger.debug(message, data?)`
- `logger.getLogs()` - All logs
- `logger.getRecentLogs(count)` - Last N logs
- `logger.clearLogs()` - Clear all logs

### Service Logging Methods

- `getRecentLogs(count)` - Recent service logs
- `getAllLogs()` - All service logs
- `clearLogs()` - Clear service logs

## Connection Statistics

#### `getConnectionStats()`

Returns connection statistics:

```typescript
{
  connectionAttempts: number
  lastConnectionTime: number | null
  lastDisconnectionTime: number | null
  disconnectionReasons: string[]
  currentConnectionDuration: number | null
  lastConnectedDeviceAddress: string | null
}
```

#### `reconnectToLastDevice()`

Attempts to reconnect to the last connected device.

**Returns**: `Promise<boolean>`

**Behavior**: Waits 2 seconds before attempting connection

#### `getConnectionStatus()`

Gets native module connection status.

**Returns**: `Promise<any>`

#### `testConnection(deviceAddress)`

Tests connection parameters for debugging.

**Returns**: `Promise<any>`

## Error Handling

All methods:
- Log errors with full stack traces
- Track connection attempts and failures
- Maintain disconnection history
- Provide detailed error messages

## Usage Pattern

```typescript
// 1. Initialize
await JMBluetoothService.initializeSDK()
await JMBluetoothService.requestPermissions()

// 2. Scan
await JMBluetoothService.startScan()

// 3. Listen for devices
JMBluetoothService.addEventListener('onDeviceFound', (device) => {
  console.log('Found:', device.name, device.address)
})

// 4. Connect
await JMBluetoothService.connect(device.address)

// 5. Listen for connection
JMBluetoothService.addEventListener('onConnected', () => {
  // Start data reporting
  await JMBluetoothService.configureAllPIDs()
  await JMBluetoothService.startReportEldData()
})

// 6. Listen for data
JMBluetoothService.addEventListener('onObdEldDataReceived', (data) => {
  // Process OBD/ELD data
})
```

## Native Module Integration

The service wraps the native Android module:
- Package: `com.ttmkonnect.eld.JMBluetoothModule`
- AAR Library: `JMBluetoothLowEnergy_ktx-release.aar`
- Registered in `MainApplication.kt`

## Dependencies

- `react-native`: NativeModules, NativeEventEmitter
- `@/types/JMBluetooth`: Type definitions and events

## Notes

- All async methods return Promises
- Events are wrapped with enhanced logging
- Connection statistics tracked automatically
- Disconnection reasons logged
- Time formatting helpers for history queries
- Configured with 10 specific OBD PIDs

