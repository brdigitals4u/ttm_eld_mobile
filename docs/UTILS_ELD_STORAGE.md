# ELD Storage Utility Documentation

**File:** `src/utils/eldStorage.ts`

## Overview

Utility functions for storing and retrieving ELD device information in AsyncStorage. Persists device connection details between app sessions.

## Purpose

Stores ELD device information locally so the app can:
- Remember the last connected device
- Display device info on profile
- Show connection history
- Reconnect to last device (future feature)

## Storage Key

```typescript
const ELD_DEVICE_KEY = '@ttm_eld_device'
```

Uses AsyncStorage for persistence (non-sensitive data).

## Data Structure

### EldDeviceInfo Interface

```typescript
interface EldDeviceInfo {
  address: string      // MAC address (e.g., "C4:A8:28:43:14:9A")
  name: string | null  // Device name (may be null)
  connectedAt: string  // ISO 8601 timestamp
}
```

## Functions

### `saveEldDevice(deviceInfo)`

Saves ELD device information to AsyncStorage.

**Parameters**:
- `deviceInfo`: `EldDeviceInfo`

**Returns**: `Promise<void>`

**Usage**:
```typescript
await saveEldDevice({
  address: 'C4:A8:28:43:14:9A',
  name: 'ELD Device',
  connectedAt: new Date().toISOString()
})
```

**Storage Format**:
```json
{
  "address": "C4:A8:28:43:14:9A",
  "name": "ELD Device",
  "connectedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Handling**:
- Logs errors to console
- Doesn't throw (graceful failure)

### `getEldDevice()`

Retrieves saved ELD device information.

**Returns**: `Promise<EldDeviceInfo | null>`

**Returns null if**:
- No device saved
- Storage error
- Invalid data

**Usage**:
```typescript
const device = await getEldDevice()
if (device) {
  console.log('Last device:', device.name, device.address)
}
```

**Error Handling**:
- Returns null on error
- Logs errors to console
- Handles JSON parsing errors

### `clearEldDevice()`

Clears saved ELD device information.

**Returns**: `Promise<void>`

**Usage**:
```typescript
await clearEldDevice()
```

**When to Clear**:
- User logout
- Device unpaired
- Manual disconnect

**Error Handling**:
- Logs errors to console
- Doesn't throw

## Integration Points

### DeviceScanScreen

**Saves device on authentication**:
```typescript
JMBluetoothService.addEventListener('onAuthenticationPassed', async () => {
  await saveEldDevice({
    address: device.address,
    name: device.name,
    connectedAt: new Date().toISOString()
  })
})
```

### ProfileScreen

**Displays saved device**:
```typescript
const [eldDeviceInfo, setEldDeviceInfo] = useState<EldDeviceInfo | null>(null)

useEffect(() => {
  const loadDevice = async () => {
    const device = await getEldDevice()
    setEldDeviceInfo(device)
  }
  loadDevice()
}, [])
```

**Shows in ELD Configuration section**:
- Device MAC address
- Device name
- Connection status

## Usage Patterns

### Save on Connection

```typescript
const handleConnection = async (device: BleDevice) => {
  await JMBluetoothService.connect(device.address)
  
  // Save after successful connection
  await saveEldDevice({
    address: device.address || '',
    name: device.name,
    connectedAt: new Date().toISOString()
  })
}
```

### Load on App Start

```typescript
useEffect(() => {
  const loadLastDevice = async () => {
    const device = await getEldDevice()
    if (device) {
      // Optionally auto-reconnect
      // Or show in UI
    }
  }
  loadLastDevice()
}, [])
```

### Clear on Logout

```typescript
const handleLogout = async () => {
  await clearEldDevice()
  await authStore.logout()
}
```

## Storage Location

**Platform**: AsyncStorage (React Native)

**Location**:
- iOS: UserDefaults
- Android: SharedPreferences

**Persistence**: Persists across app restarts

## Data Validation

### Address Validation

Address should be:
- MAC address format
- Not empty string

### Timestamp Validation

Timestamp should be:
- ISO 8601 format
- Valid date string

### Name Validation

Name can be:
- Device name string
- null (if unavailable)

## Error Scenarios

### Storage Unavailable

- Returns null gracefully
- Logs warning
- App continues without device info

### Invalid Data

- Handles JSON parse errors
- Returns null
- Logs error

### Storage Full

- AsyncStorage handles automatically
- May fail silently
- Check storage periodically

## Future Enhancements

### Multiple Devices

Could extend to store multiple devices:
```typescript
interface EldDeviceList {
  devices: EldDeviceInfo[]
  lastConnected: string  // Address
}
```

### Device History

Store connection history:
```typescript
interface EldDeviceHistory {
  connections: Array<{
    address: string
    connectedAt: string
    disconnectedAt?: string
  }>
}
```

### Auto-Reconnect

Use saved device for auto-reconnect:
```typescript
const device = await getEldDevice()
if (device) {
  await JMBluetoothService.connect(device.address)
}
```

## Security Considerations

1. **Non-Sensitive**: Device info is not sensitive
2. **AsyncStorage**: Appropriate for non-sensitive data
3. **No Encryption**: Not needed for device info
4. **Public Data**: MAC addresses are public

## Dependencies

- `@react-native-async-storage/async-storage`

## Related Files

- `DeviceScanScreen.tsx` - Saves device on connection
- `ProfileScreen.tsx` - Displays saved device
- `types/eld.ts` - Type definitions

## Notes

- Simple utility for device persistence
- Not critical functionality (app works without it)
- Used for UX improvements
- Could be extended for device history

