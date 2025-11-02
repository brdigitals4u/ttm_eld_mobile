# Auth Store Documentation

**File:** `src/stores/authStore.ts`

## Overview

Zustand-based authentication store that manages user authentication state, driver profiles, HOS status, vehicle assignments, and organization settings. Persists data to AsyncStorage and integrates with SecureStore for token management.

## Key Features

- User authentication state management
- Driver profile storage
- HOS (Hours of Service) status tracking
- Vehicle assignment management
- Organization settings
- Token management (regular + Cognito tokens for AWS)
- AsyncStorage persistence
- SecureStore token storage
- ELD device disconnect on logout

## State Structure

### AuthState Interface

```typescript
{
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null
  cognitoTokens: CognitoTokens | null  // For AWS sync
  
  // User data
  user: User | null
  driverProfile: DriverProfile | null
  hosStatus: HOSStatus | null
  vehicleAssignment: VehicleAssignment | null
  vehicleInfo: VehicleInfo | null  // For compatibility
  organizationSettings: OrganizationSettings | null
}
```

## Data Types

### User

```typescript
{
  id: string
  email: string
  firstName: string
  lastName: string
  name?: string  // Computed property
  role: string
  organizationId: string
  organizationName?: string
  licenseNumber?: string
  phoneNumber?: string
  isEmailVerified: boolean
  onboardingCompleted: boolean
  onboardingStep: string | number
}
```

### CognitoTokens

AWS Cognito authentication tokens for hybrid sync:

```typescript
{
  access_token: string
  id_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}
```

### DriverProfile

Complete driver profile including:
- Personal information
- License details
- Employment status
- ELD configuration
- Exemption settings
- Compliance data

### HOSStatus

Hours of Service status:
- Current duty status
- Active clocks
- Active violations
- Time remaining (driving, on-duty, cycle)

### VehicleInfo

Vehicle information:
- Vehicle identification (unit, make, model, VIN)
- Status and location
- Assignment details

### VehicleAssignment

Driver's vehicle assignment status.

### OrganizationSettings

Organization-level settings:
- Timezone and locale
- HOS settings
- Compliance settings

## Actions

### `login(loginData)`

Handles user login and stores all authentication data.

**Parameters:**
- `loginData`: Complete API response or basic user data

**Process:**
1. Extracts token from login data
2. Extracts Cognito tokens (if present, for AWS sync)
3. Builds User object from API response
4. Extracts driver profile, HOS status, vehicle assignment, organization settings
5. Stores token in SecureStore
6. Updates Zustand state
7. Persists to AsyncStorage

**Example:**
```typescript
const { login } = useAuthStore()

await login({
  token: 'auth-token-123',
  cognito_tokens: { /* AWS tokens */ },
  user: {
    id: 'user-123',
    email: 'driver@company.com',
    firstName: 'John',
    lastName: 'Doe',
    driver_profile: { /* ... */ },
    hos_status: { /* ... */ },
    vehicle_assignment: { /* ... */ },
    organization_settings: { /* ... */ }
  }
})
```

### `logout()`

Logs out the user and clears all data.

**Process:**
1. Disconnects ELD device (JMBluetoothService)
2. Clears tokens from SecureStore
3. Resets all state to initial values
4. Persists empty state to AsyncStorage

**Example:**
```typescript
const { logout } = useAuthStore()
await logout()
```

### `setLoading(loading)`

Sets loading state.

**Example:**
```typescript
const { setLoading } = useAuthStore()
setLoading(true)
```

### `setError(error)`

Sets error message.

**Example:**
```typescript
const { setError } = useAuthStore()
setError('Login failed')
```

### `clearError()`

Clears error message.

### `setDriverProfile(profile)`

Updates driver profile.

### `setHosStatus(status)`

Updates HOS status.

### `updateHosStatus(updates)`

Partially updates HOS status.

**Example:**
```typescript
const { updateHosStatus } = useAuthStore()
updateHosStatus({ current_status: 'driving' })
```

### `setVehicleAssignment(assignment)`

Updates vehicle assignment.

### `setVehicleInfo(info)`

Updates vehicle info (compatibility method).

### `setOrganizationSettings(settings)`

Updates organization settings.

### `refreshDriverData()`

No-op function for compatibility (Zustand handles persistence automatically).

## Persistence

### Storage Configuration

- **Storage Backend**: AsyncStorage (via Zustand persist middleware)
- **Storage Key**: `auth-storage`
- **Secure Storage**: Tokens stored separately in SecureStore

### Persisted Fields

- `isAuthenticated`
- `token`
- `cognitoTokens`
- `user`
- `driverProfile`
- `hosStatus`
- `vehicleAssignment`
- `vehicleInfo`
- `organizationSettings`

### Rehydration

On app restart, Zustand automatically rehydrates state from AsyncStorage and syncs token to SecureStore for API client usage.

## Hooks

### `useAuthStore()`

Direct Zustand store hook. Returns entire store.

### `useAuth()`

Convenience hook with detailed logging. Logs state on first render.

**Example:**
```typescript
const {
  isAuthenticated,
  user,
  driverProfile,
  logout
} = useAuth()
```

## Integration with Other Systems

### ELD Device

- Automatically disconnects ELD device on logout
- Uses JMBluetoothService for device management

### Token Storage

- Uses `tokenStorage` utility for SecureStore
- Stores both regular token and Cognito tokens
- Syncs token between Zustand state and SecureStore

### API Client

- API client reads token from SecureStore
- Token is synced on rehydration

## Logging

Comprehensive logging throughout:
- Login/logout events
- State changes
- Token operations
- Data extraction from API responses
- Rehydration process

## Error Handling

- Try-catch blocks around async operations
- Error state management
- Continues logout even if ELD disconnect fails
- Logs errors to console

## Usage Examples

### Check Authentication

```typescript
const { isAuthenticated } = useAuth()
if (isAuthenticated) {
  // Show authenticated UI
}
```

### Access User Data

```typescript
const { user, driverProfile, hosStatus } = useAuth()

const driverName = driverProfile?.name || `${user?.firstName} ${user?.lastName}`
const currentStatus = hosStatus?.current_status
```

### Update HOS Status

```typescript
const { updateHosStatus } = useAuth()
updateHosStatus({
  current_status: 'driving',
  driving_time_remaining: 600
})
```

### Check Vehicle Assignment

```typescript
const { vehicleAssignment } = useAuth()

if (vehicleAssignment?.has_vehicle_assigned) {
  const vehicle = vehicleAssignment.vehicle_info
  console.log(`Assigned to: ${vehicle.vehicle_unit}`)
}
```

## Dependencies

- `zustand`: State management
- `@react-native-async-storage/async-storage`: Persistence
- `@/utils/storage`: Token storage utilities
- `@/services/JMBluetoothService`: ELD device management

## Notes

- State persists across app restarts
- Token is stored securely in SecureStore
- Supports both regular authentication and AWS Cognito tokens
- Comprehensive logging for debugging
- ELD device is automatically disconnected on logout

