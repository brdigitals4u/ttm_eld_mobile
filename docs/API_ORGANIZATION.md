# Organization API Documentation

**File:** `src/api/organization.ts`

## Overview

Organization driver authentication and profile management API. Handles driver login, profile fetching, and logout for organization-based drivers (ELD users).

## Key Features

- Driver authentication via organization credentials
- Comprehensive driver profile data
- HOS (Hours of Service) status tracking
- Vehicle assignment information
- Organization settings management
- React Query integration
- Realm database synchronization

## Data Types

### OrganizationDriverLoginCredentials

```typescript
{
  email: string
  password: string
}
```

### DriverProfile

Complete driver profile including:
- Personal info (name, email, phone, license)
- Employment details (hire date, status, terminal)
- ELD configuration (device ID, exemptions, settings)
- Compliance data (violations count)
- Organization info (name, timezone, locale)

### HOSStatus

Hours of Service status including:
- Current duty status
- Active clocks
- Active violations
- Time remaining (driving, on-duty, cycle)

### VehicleInfo

Assigned vehicle information:
- Vehicle identification (unit, make, model, year, VIN)
- Status and location
- Assignment details

### VehicleAssignment

Driver's vehicle assignment status and details.

### OrganizationSettings

Organization-level configuration:
- Timezone and locale
- HOS settings
- Compliance settings

### OrganizationDriverProfile

Complete driver profile bundle:
- User account info
- Driver profile
- HOS status
- Vehicle assignment
- Organization settings

### OrganizationDriverAuthResponse

Authentication response with token and complete profile.

## API Functions

### `organizationApi.testConnection()`

Tests connection to the API server.

**Returns:** Promise<boolean>

**Usage:**
```typescript
const isConnected = await organizationApi.testConnection()
```

### `organizationApi.loginDriver(credentials)`

Authenticates a driver with organization credentials.

**Parameters:**
- `credentials`: OrganizationDriverLoginCredentials

**Returns:** Promise<OrganizationDriverAuthResponse>

**Side Effects:**
- Stores authentication token
- Stores driver ID
- Creates driver data in Realm
- Creates user record in Realm (for compatibility)
- Creates auth session in Realm with 24-hour expiration

**Token Storage:**
- Uses Token-based authentication (not Bearer)
- No refresh token provided by organization API

**Example:**
```typescript
const response = await organizationApi.loginDriver({
  email: 'driver@company.com',
  password: 'password123'
})
```

### `organizationApi.getDriverProfile()`

Fetches the authenticated driver's complete profile.

**Returns:** Promise<OrganizationDriverProfile>

**Side Effects:**
- Updates user data in Realm database

**Example:**
```typescript
const profile = await organizationApi.getDriverProfile()
```

### `organizationApi.logoutDriver()`

Logs out the driver and clears all local data.

**Returns:** Promise<void>

**Note:** Organization API may not have logout endpoint, so this only clears local data.

**Side Effects:**
- Removes tokens from storage
- Removes user ID from storage
- Deletes auth session from Realm
- Deletes all users from Realm
- Clears driver data from Realm

**Example:**
```typescript
await organizationApi.logoutDriver()
```

## React Query Hooks

### `useDriverLogin()`

Mutation hook for driver authentication.

**Returns:** UseMutationResult

**Side Effects:**
- Invalidates user profile and auth queries on success

**Example:**
```typescript
const loginMutation = useDriverLogin()

loginMutation.mutate({
  email: 'driver@company.com',
  password: 'password123'
}, {
  onSuccess: (data) => {
    // Navigate to dashboard
  }
})
```

### `useDriverProfile()`

Query hook to fetch driver profile.

**Returns:** UseQueryResult<OrganizationDriverProfile>

**Configuration:**
- Stale time: 5 minutes
- Doesn't retry on 401 errors
- Retries up to 3 times on other errors

**Example:**
```typescript
const { data: profile, isLoading, error } = useDriverProfile()

if (profile) {
  const { driver_profile, hos_status, vehicle_assignment } = profile
}
```

### `useDriverLogout()`

Mutation hook for driver logout.

**Returns:** UseMutationResult

**Side Effects:**
- Clears all React Query cache on success or error

**Example:**
```typescript
const logoutMutation = useDriverLogout()
logoutMutation.mutate(undefined, {
  onSuccess: () => {
    // Navigate to login
  }
})
```

## Driver Profile Structure

The driver profile includes comprehensive information:

1. **Account Information**: Email, name, role, organization ID
2. **Driver Profile**: 
   - License details (number, state, expiry)
   - Employment status and dates
   - Terminal information
   - ELD device configuration
   - Exemption settings
3. **HOS Status**:
   - Current duty status
   - Time remaining in each category
   - Active violations
4. **Vehicle Assignment**:
   - Assigned vehicle details
   - Assignment status
5. **Organization Settings**:
   - Timezone and locale
   - HOS and compliance settings

## ELD Configuration

The driver profile includes extensive ELD settings:

- **ELD Device ID**: Connected device identifier
- **Exemptions**: ELD exemption status and reason
- **Day Start Hour**: When the ELD day begins
- **Personal Conveyance**: Enabled/disabled
- **Yard Moves**: Enabled/disabled
- **Adverse Weather Exemption**: Enabled/disabled
- **Big Day Exemption**: Enabled/disabled
- **Waiting Time Duty Status**: Enabled/disabled

## Data Flow

1. **Login**: Credentials → API → Token + Profile → Storage → Realm
2. **Profile Fetch**: Token → API → Profile → Realm Update
3. **Logout**: Clear Storage → Clear Realm → Clear Cache

## Error Handling

- All functions throw `ApiError` on failure
- React Query hooks handle errors and log them
- Logout always clears local data even if there are errors
- 401 errors prevent query retries

## Differences from Regular Auth

1. **Token Format**: Uses `Token` prefix instead of Bearer
2. **No Refresh Token**: Organization API doesn't provide refresh tokens
3. **Comprehensive Profile**: Includes HOS, vehicle, and organization data
4. **24-Hour Expiration**: Auth sessions expire after 24 hours
5. **Driver-Specific Data**: Includes ELD configuration and compliance data

## Dependencies

- `@tanstack/react-query`: React Query hooks
- `./client`: ApiClient and ApiError
- `./constants`: API endpoints and query keys
- `@/utils/storage`: Token and user storage utilities
- `@/database/realm`: Realm database service

