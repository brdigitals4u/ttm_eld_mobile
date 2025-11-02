# ELD Types Documentation

**File:** `src/types/eld.ts`

## Overview

TypeScript type definitions for ELD (Electronic Logging Device) device management, state, and events. Provides type safety for device scanning, connection, and event handling.

## Type Definitions

### EldDevice

Represents a discovered or connected ELD device.

```typescript
interface EldDevice {
  id: string              // Unique device identifier
  name: string            // Device name (e.g., "ELD-Device-001")
  address: string         // MAC address (e.g., "C4:A8:28:43:14:9A")
  isConnected: boolean    // Connection status
  signal?: number         // Bluetooth signal strength (dBm)
}
```

**Usage**:
```typescript
const device: EldDevice = {
  id: 'device-123',
  name: 'ELD Device',
  address: 'C4:A8:28:43:14:9A',
  isConnected: false,
  signal: -75
}
```

### EldState

Complete state of ELD device management.

```typescript
interface EldState {
  devices: EldDevice[]              // List of discovered devices
  connectedDevice: EldDevice | null // Currently connected device
  isScanning: boolean               // Scan in progress
  error: string | null              // Error message if any
}
```

**Usage**:
```typescript
const state: EldState = {
  devices: [device1, device2],
  connectedDevice: device1,
  isScanning: false,
  error: null
}
```

### EldEvent

Generic event structure for ELD device events.

```typescript
interface EldEvent {
  type: string        // Event type identifier
  timestamp: number   // Unix timestamp (milliseconds)
  data: any          // Event-specific data
}
```

**Usage**:
```typescript
const event: EldEvent = {
  type: 'deviceFound',
  timestamp: Date.now(),
  data: { device }
}
```

## Common Event Types

### Device Discovery Events

- `deviceFound` - New device discovered during scan
- `scanStarted` - Scan operation started
- `scanStopped` - Scan operation stopped
- `scanFinished` - Scan completed

### Connection Events

- `deviceConnected` - Device connection successful
- `deviceDisconnected` - Device disconnected
- `connectionFailed` - Connection attempt failed
- `connectionTimeout` - Connection timed out

### Authentication Events

- `authenticationStarted` - Auth process begun
- `authenticationPassed` - Auth successful
- `authenticationFailed` - Auth failed

### Data Events

- `dataReceived` - OBD/ELD data packet received
- `dataError` - Data transmission error
- `dataTimeout` - Data reception timeout

## Integration

### With DeviceScanScreen

```typescript
import { EldDevice } from '@/types/eld'

const [devices, setDevices] = useState<EldDevice[]>([])
```

### With Contexts

```typescript
import { EldState } from '@/types/eld'

const [eldState, setEldState] = useState<EldState>({
  devices: [],
  connectedDevice: null,
  isScanning: false,
  error: null
})
```

### With Services

```typescript
import { EldEvent } from '@/types/eld'

const handleEvent = (event: EldEvent) => {
  console.log(event.type, event.timestamp, event.data)
}
```

## Related Types

### JMBluetooth Types

More detailed types in `src/types/JMBluetooth.ts`:
- `BleDevice` - Bluetooth Low Energy device
- `ObdEldData` - OBD/ELD data structure
- `JMBluetoothEvents` - Event type map

### Realm Types

Device storage in Realm:
- `EldDeviceInfo` - Stored device information (see `utils/eldStorage.ts`)

## Type Safety Benefits

1. **Auto-completion**: IDE suggests available properties
2. **Compile-time Checking**: Catches type errors early
3. **Documentation**: Types serve as inline documentation
4. **Refactoring**: Safe renaming and restructuring

## Usage Examples

### Device List

```typescript
const devices: EldDevice[] = [
  {
    id: '1',
    name: 'ELD-Device-001',
    address: 'C4:A8:28:43:14:9A',
    isConnected: true,
    signal: -65
  }
]
```

### State Management

```typescript
const [state, setState] = useState<EldState>({
  devices: [],
  connectedDevice: null,
  isScanning: false,
  error: null
})

// Update on device found
setState(prev => ({
  ...prev,
  devices: [...prev.devices, newDevice]
}))
```

### Event Handling

```typescript
const handleEvent = (event: EldEvent) => {
  switch (event.type) {
    case 'deviceFound':
      // Handle device discovery
      break
    case 'deviceConnected':
      // Handle connection
      break
  }
}
```

## Notes

- Types are minimal and focused on ELD-specific concepts
- More detailed Bluetooth types exist in `JMBluetooth.ts`
- Used primarily for UI state management
- Can be extended for additional device properties

