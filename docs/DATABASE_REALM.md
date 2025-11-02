# Realm Database Documentation

**File:** `src/database/realm.ts`

## Overview

Realm database service providing local data persistence for users, authentication sessions, driver profiles, HOS status, vehicle information, and organization settings. Uses Realm's object database for fast, offline-capable data storage.

## Schema Configuration

### Schema Version

```typescript
schemaVersion: 2
deleteRealmIfMigrationNeeded: true  // Development only
```

**Schemas Included**:
1. `User` - User account information
2. `AuthSession` - Authentication tokens and session data
3. `DriverProfile` - Driver profile details
4. `HOSStatus` - Hours of Service status
5. `VehicleInfo` - Vehicle information
6. `VehicleAssignment` - Vehicle assignment data
7. `OrganizationSettings` - Organization configuration
8. `DriverData` - Complete driver data bundle

## Service Methods

### User Operations

#### `createUser(userData)`

Creates a new user record.

**Parameters**: `Partial<User>`

**Returns**: Realm object

#### `getUser(id)`

Retrieves user by ID.

**Returns**: User object or null

#### `getAllUsers()`

Gets all users.

**Returns**: Realm Results<User>

#### `updateUser(id, userData)`

Updates user information.

**Parameters**:
- `id`: string
- `userData`: Partial<User>

#### `deleteUser(id)`

Deletes a user.

### Auth Session Operations

#### `createAuthSession(sessionData)`

Creates authentication session with tokens.

**Auto-generates**: `_id` using BSON.ObjectId

#### `getAuthSession()`

Gets the current auth session (first one).

**Returns**: AuthSession or null

#### `updateAuthSession(sessionData)`

Updates existing session or creates new one if none exists.

#### `deleteAuthSession()`

Deletes all auth sessions (logout).

### Driver Data Operations

#### `createDriverProfile(profileData)`

Creates driver profile record.

**Auto-generates**: `_id`

#### `createHOSStatus(hosData)`

Creates HOS status record.

#### `createVehicleInfo(vehicleData)`

Creates vehicle information record.

#### `createVehicleAssignment(assignmentData)`

Creates vehicle assignment with embedded vehicle info.

**Process**:
1. Creates VehicleInfo first
2. Creates VehicleAssignment
3. Links vehicle_info relationship

#### `createOrganizationSettings(settingsData)`

Creates organization settings record.

### Complete Driver Data

#### `createDriverData(apiResponse)`

Stores complete API response from driver login.

**Process**:
1. Creates DriverProfile from `apiResponse.user.driver_profile`
2. Creates HOSStatus from `apiResponse.user.hos_status`
3. Creates VehicleInfo from `apiResponse.user.vehicle_assignment.vehicle_info`
4. Creates VehicleAssignment
5. Creates OrganizationSettings
6. Creates DriverData bundle with relationships
7. Links all related objects

**Usage**:
```typescript
await RealmService.createDriverData(loginResponse)
```

#### `getDriverData()`

Gets complete driver data bundle.

**Returns**: DriverData object with all relationships

#### `getDriverProfile()`

Gets driver profile from DriverData.

#### `getHOSStatus()`

Gets HOS status from DriverData.

#### `getVehicleAssignment()`

Gets vehicle assignment from DriverData.

#### `getOrganizationSettings()`

Gets organization settings from DriverData.

### Update Operations

#### `updateHOSStatus(hosData)`

Updates HOS status and sets `updated_at` timestamp.

### Cleanup Operations

#### `clearAllData()`

Deletes all data from Realm (nuclear option).

#### `deleteAllUsers()`

Deletes all user records.

#### `clearDriverData()`

Deletes all driver-related data:
- DriverData
- DriverProfile
- HOSStatus
- VehicleInfo
- VehicleAssignment
- OrganizationSettings

## Data Relationships

### DriverData Structure

```
DriverData
├── driver_profile: DriverProfile
├── hos_status: HOSStatus
├── vehicle_assignment: VehicleAssignment
│   └── vehicle_info: VehicleInfo
└── organization_settings: OrganizationSettings
```

Relationships are set after object creation using Realm's linking.

## Usage Examples

### Storing Login Response

```typescript
const loginResponse = await organizationApi.loginDriver(credentials)
await RealmService.createDriverData(loginResponse)
```

### Retrieving Driver Profile

```typescript
const profile = RealmService.getDriverProfile()
console.log(profile.name, profile.license_number)
```

### Updating HOS Status

```typescript
RealmService.updateHOSStatus({
  current_status: 'driving',
  driving_time_remaining: 600
})
```

### Logout Cleanup

```typescript
await RealmService.deleteAuthSession()
await RealmService.clearDriverData()
await RealmService.deleteAllUsers()
```

## Transaction Management

All write operations use Realm's `write()` transaction:
- Atomic operations
- Rollback on error
- Automatic transaction management

## Error Handling

Realm operations:
- Throw errors on invalid data
- Validate schema constraints
- Handle relationship linking errors

## Performance

- **Fast Queries**: Indexed primary keys
- **Lazy Loading**: Relationships loaded on access
- **In-Memory**: Fast read/write operations
- **Background Writes**: Non-blocking

## Migration Strategy

Current configuration:
- `deleteRealmIfMigrationNeeded: true` (development only)

**Production**: Should implement proper migrations

## Realm Instance

Exported singleton instance:
```typescript
export const realm = new Realm(realmConfig)
```

## Cleanup

#### `closeRealm()`

Closes Realm instance (call on app unmount).

**Usage**:
```typescript
import { closeRealm } from '@/database/realm'

// On app unmount
closeRealm()
```

## Integration Points

- **Auth Store**: Stores/retrieves auth sessions
- **Organization API**: Stores login responses
- **User API**: Updates user data
- **Status Store**: Can sync HOS status
- **Contexts**: Retrieve driver data

## Notes

- All IDs are BSON.ObjectId
- Relationships are set after object creation
- DriverData is the main entry point for driver information
- Clear operations are used during logout
- Schema version should be incremented for migrations

