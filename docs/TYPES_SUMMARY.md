# Types Documentation Summary

This document covers all TypeScript type definitions in the application.

## Type Files Overview

1. **eld.ts** - [See TYPES_ELD.md](./TYPES_ELD.md)
2. **JMBluetooth.ts** - Bluetooth device types
3. **auth.ts** - Authentication types
4. **status.ts** - Status and HOS types
5. **fuel.ts** - Fuel tracking types
6. **inspection.ts** - Inspection types
7. **carrier.ts** - Carrier types
8. **codriver.ts** - Co-driver types
9. **assets.ts** - Asset types

## JMBluetooth.ts

**Purpose**: Bluetooth Low Energy device and event types

**Key Types**:

### BleDevice

```typescript
interface BleDevice {
  address: string          // MAC address
  name: string            // Device name
  signal?: number         // Signal strength (dBm)
  rssi?: number           // RSSI value
}
```

### ObdEldData

```typescript
interface ObdEldData {
  latitude?: number
  longitude?: number
  gpsSpeed?: number
  gpsTime?: number
  gpsRotation?: number
  eventTime?: number
  eventType?: string
  eventId?: string
  isLiveEvent?: boolean
  // OBD PID data
  [pid: string]: any
}
```

### JMBluetoothEvents

**Event Type Map**:
```typescript
{
  onDeviceFound: (device: BleDevice) => void
  onConnected: () => void
  onDisconnected: () => void
  onConnectFailure: (error: any) => void
  onObdEldDataReceived: (data: ObdEldData) => void
  onAuthenticationPassed: (data: any) => void
  // ... more events
}
```

## auth.ts

**Purpose**: Authentication and user types

**Types**:
- Login credentials
- Auth responses
- User data
- Session data

## status.ts

**Purpose**: Driver status and HOS types

**Key Types**:

### DriverStatus

```typescript
type DriverStatus = 
  | 'driving'
  | 'onDuty'
  | 'offDuty'
  | 'sleeperBerth'
  | 'personalConveyance'
  | 'yardMoves'
```

### HoursOfService

```typescript
interface HoursOfService {
  driveTimeRemaining: number    // minutes
  shiftTimeRemaining: number
  cycleTimeRemaining: number
  breakTimeRemaining: number
  lastCalculated: number        // timestamp
}
```

### StatusUpdate

```typescript
interface StatusUpdate {
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

```typescript
interface LogEntry {
  id: string
  status: DriverStatus
  startTime: number
  endTime?: number
  duration?: number
  reason: string
  location?: LocationData
  isCertified: boolean
}
```

### StatusReason

```typescript
interface StatusReason {
  id: string
  text: string
  category: DriverStatus
}
```

### LogCertification

```typescript
interface LogCertification {
  isCertified: boolean
  signature?: string
  certifiedAt?: number
  certifiedBy?: string
}
```

### SplitSleepSettings

```typescript
interface SplitSleepSettings {
  enabled: boolean
  additionalHours: number
}
```

## fuel.ts

**Purpose**: Fuel tracking types

**Types**:
- Fuel transactions
- Fuel entries
- Fuel statistics
- Fuel settings

## inspection.ts

**Purpose**: Inspection and DVIR types

**Types**:
- Inspection forms
- DVIR entries
- Defects
- Signatures
- Inspection history

## carrier.ts

**Purpose**: Carrier/company types

**Types**:
- Carrier information
- Company settings
- Fleet data
- Carrier contacts

## codriver.ts

**Purpose**: Co-driver types

**Types**:
- Co-driver information
- Co-driver relationships
- Shared logs
- Co-driver settings

## assets.ts

**Purpose**: Asset management types

**Types**:
- Vehicles
- Equipment
- Assets
- Asset tracking

## Type Patterns

### Union Types

```typescript
type Status = 'active' | 'inactive' | 'pending'
```

### Interface Extensions

```typescript
interface BaseUser {
  id: string
  email: string
}

interface Driver extends BaseUser {
  licenseNumber: string
}
```

### Optional Properties

```typescript
interface Data {
  required: string
  optional?: string
}
```

### Generic Types

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

## Type Usage

### In Components

```typescript
import { DriverStatus } from '@/types/status'

const status: DriverStatus = 'driving'
```

### In Services

```typescript
import { BleDevice } from '@/types/JMBluetooth'

function connect(device: BleDevice) {
  // ...
}
```

### In Stores

```typescript
import { HoursOfService } from '@/types/status'

interface StatusState {
  hoursOfService: HoursOfService
}
```

## Type Safety Benefits

1. **Compile-time Checking**: Catch errors early
2. **Auto-completion**: IDE suggestions
3. **Refactoring**: Safe code changes
4. **Documentation**: Types as docs

## Common Type Exports

Most type files export:
- Interfaces for data structures
- Type aliases for unions
- Enums for constants
- Utility types

## Database Types

Types align with Realm schemas:
- User types match Realm User schema
- Driver types match Realm DriverProfile schema
- Status types match Realm HOSStatus schema

## API Types

Types match API responses:
- AuthResponse types
- DriverProfile types
- HOSStatus types
- VehicleAssignment types

## Future Improvements

- Add JSDoc comments
- Add validation schemas (Zod)
- Add runtime type checking
- Export type utilities

