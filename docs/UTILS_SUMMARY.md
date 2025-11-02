# Utils Documentation Summary

This document covers all utility functions and helpers in the application.

## Utility Files Overview

### Storage Utilities

1. **storage.ts** - Main storage utilities
2. **storage/index.ts** - Storage module exports
3. **storage/storage.test.ts** - Storage tests
4. **eldStorage.ts** - ELD device storage
5. **AsyncStorageWrapper.ts** - AsyncStorage wrapper

### Date Utilities

6. **formatDate.ts** - Date formatting functions

### React Utilities

7. **useHeader.tsx** - Header hook
8. **useIsMounted.ts** - Mount state hook
9. **useSafeAreaInsetsStyle.ts** - Safe area styles

### Gesture Utilities

10. **gestureHandler.ts** - Web gesture handler
11. **gestureHandler.native.ts** - Native gesture handler

### Other Utilities

12. **delay.ts** - Delay/await utility
13. **crashReporting.ts** - Error reporting
14. **openLinkInBrowser.ts** - Link opening
15. **hasValidStringProp.ts** - String validation

## Storage Utilities

### storage.ts

**Purpose**: Centralized storage management

**Exports**:
- `tokenStorage` - Token storage (SecureStore)
- `userStorage` - User data storage
- `settingsStorage` - Settings storage

**Token Storage**:
```typescript
tokenStorage.setAccessToken(token)
tokenStorage.getAccessToken()
tokenStorage.setRefreshToken(token)
tokenStorage.getRefreshToken()
tokenStorage.removeTokens()
```

**User Storage**:
```typescript
userStorage.setUserId(id)
userStorage.getUserId()
userStorage.removeUserId()
```

**Settings Storage**:
```typescript
settingsStorage.setHasSeenWelcome(boolean)
settingsStorage.getHasSeenWelcome()
```

### eldStorage.ts

**Purpose**: ELD device information storage

**Functions**:

#### `saveEldDevice(deviceInfo)`
Saves connected ELD device information.

**Parameters**:
- `deviceInfo`: `EldDeviceInfo`

**Storage Key**: `@ttm_eld_device`

#### `getEldDevice()`
Retrieves saved ELD device information.

**Returns**: `EldDeviceInfo | null`

#### `clearEldDevice()`
Clears saved ELD device information.

**Interface**:
```typescript
interface EldDeviceInfo {
  address: string      // MAC address
  name: string | null  // Device name
  connectedAt: string  // ISO timestamp
}
```

## Date Utilities

### formatDate.ts

**Purpose**: Date formatting and manipulation

**Functions**:
- Date to string formatting
- Relative time (e.g., "2 hours ago")
- Custom format strings
- Timezone handling

## React Hooks

### useHeader.tsx

**Purpose**: Header configuration hook

**Returns**: Header props for navigation

**Usage**: Configures screen headers

### useIsMounted.ts

**Purpose**: Component mount state tracking

**Returns**: `isMounted` boolean ref

**Usage**: Prevent state updates after unmount

**Example**:
```typescript
const isMounted = useIsMounted()

useEffect(() => {
  fetchData().then(data => {
    if (isMounted.current) {
      setData(data)
    }
  })
}, [])
```

### useSafeAreaInsetsStyle.ts

**Purpose**: Safe area insets for styling

**Returns**: Style object with padding

**Usage**: Handle notches and safe areas

## Gesture Handlers

### gestureHandler.ts / gestureHandler.native.ts

**Purpose**: Platform-specific gesture handling

**Features**:
- Web: Mouse/touch events
- Native: React Native Gesture Handler

**Usage**: Unified gesture API

## Utility Functions

### delay.ts

**Purpose**: Promise-based delay

**Function**: `delay(ms: number): Promise<void>`

**Usage**:
```typescript
await delay(1000) // Wait 1 second
```

### crashReporting.ts

**Purpose**: Error reporting and crash logging

**Features**:
- Error capture
- Stack trace logging
- Crash reporting service integration
- User feedback collection

### openLinkInBrowser.ts

**Purpose**: Opens URLs in external browser

**Function**: `openLinkInBrowser(url: string)`

**Usage**: Privacy policy links, documentation

### hasValidStringProp.ts

**Purpose**: String property validation

**Function**: Validates string properties in objects

**Usage**: Form validation, data validation

## Utility Patterns

### Storage Pattern

```typescript
// Secure storage for sensitive data
await SecureStore.setItemAsync(key, value)
await SecureStore.getItemAsync(key)

// AsyncStorage for non-sensitive data
await AsyncStorage.setItem(key, value)
await AsyncStorage.getItem(key)
```

### Error Handling Pattern

```typescript
try {
  // Operation
} catch (error) {
  console.error('Error:', error)
  crashReporting.reportError(error)
  throw error
}
```

### Async Pattern

```typescript
const result = await delay(500)
// Continue after delay
```

## Usage Examples

### Storage

```typescript
import { tokenStorage, userStorage } from '@/utils/storage'

// Save token
await tokenStorage.setAccessToken('token-123')

// Get user ID
const userId = await userStorage.getUserId()
```

### ELD Storage

```typescript
import { saveEldDevice, getEldDevice } from '@/utils/eldStorage'

// Save device
await saveEldDevice({
  address: 'C4:A8:28:43:14:9A',
  name: 'ELD Device',
  connectedAt: new Date().toISOString()
})

// Retrieve device
const device = await getEldDevice()
```

### Delay

```typescript
import { delay } from '@/utils/delay'

// Wait before retry
await delay(1000)
await retryOperation()
```

## Testing

Utilities include:
- Unit tests for storage
- Date formatting tests
- Validation tests

## Performance

Optimizations:
- Async operations
- Efficient storage operations
- Memoized calculations
- Lazy loading

## Dependencies

- `@react-native-async-storage/async-storage`
- `expo-secure-store`
- `expo-linking`
- React Native APIs

