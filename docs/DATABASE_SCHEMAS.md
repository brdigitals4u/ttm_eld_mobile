# Database Schemas Documentation

**File:** `src/database/schemas.ts`

## Overview

Realm database schema definitions for local data persistence. Defines object models for users, authentication sessions, driver profiles, HOS status, vehicles, and organization settings.

## Schema Version

**Current Version**: 2

**Migration Strategy**: `deleteRealmIfMigrationNeeded: true` (development only)

**Production**: Should implement proper migrations

## Schema Definitions

### User Schema

**Purpose**: User account information

**Fields**:
- `_id`: ObjectId (primary key)
- `email`: string
- `firstName`: string
- `lastName`: string
- `avatar`: string? (optional)
- `phoneNumber`: string? (optional)
- `dateOfBirth`: Date? (optional)
- `isEmailVerified`: boolean
- `createdAt`: Date
- `updatedAt`: Date

**Usage**: Store user account data

### AuthSession Schema

**Purpose**: Authentication token storage

**Fields**:
- `_id`: ObjectId (primary key)
- `accessToken`: string
- `refreshToken`: string?
- `userId`: string
- `expiresAt`: Date?
- `createdAt`: Date

**Usage**: Store authentication tokens for API calls

### DriverProfile Schema

**Purpose**: Complete driver profile information

**Fields**:
- `_id`: ObjectId (primary key)
- `driver_id`: string
- `name`: string
- `username`: string
- `phone`: string?
- `email`: string
- `driver_license`: string?
- `license_number`: string
- `license_state`: string
- `license_expiry`: string?
- `company_driver_id`: string
- `hire_date`: string?
- `employment_status`: string
- `home_terminal_name`: string?
- `home_terminal_address`: string?
- `current_status`: string
- `current_location`: mixed?
- `current_shift`: mixed?
- `current_cycle`: mixed?
- `eld_device_id`: string?
- `eld_exempt`: boolean
- `eld_exempt_reason`: string?
- `eld_day_start_hour`: number
- `eld_pc_enabled`: boolean
- `eld_ym_enabled`: boolean
- `eld_adverse_weather_exemption_enabled`: boolean
- `eld_big_day_exemption_enabled`: boolean
- `waiting_time_duty_status_enabled`: boolean
- `violations_count`: number
- `is_active`: boolean
- `is_deactivated`: boolean
- `is_deleted`: boolean
- `created_at`: string
- `updated_at`: string
- `organization_name`: string
- `timezone`: string
- `locale`: string

**Usage**: Store complete driver profile from API

### HOSStatus Schema

**Purpose**: Hours of Service status and calculations

**Fields**:
- `_id`: ObjectId (primary key)
- `driver_id`: string
- `driver_name`: string
- `current_status`: string
- `active_clocks`: mixed[] (array)
- `active_violations`: mixed[] (array)
- `driving_time_remaining`: number (minutes)
- `on_duty_time_remaining`: number (minutes)
- `cycle_time_remaining`: number (minutes)

**Usage**: Store HOS status and time calculations

### VehicleInfo Schema

**Purpose**: Vehicle information

**Fields**:
- `_id`: ObjectId (primary key)
- `id`: string
- `vehicle_unit`: string
- `make`: string
- `model`: string
- `year`: number
- `license_plate`: string
- `vin`: string
- `status`: string
- `is_active`: boolean
- `current_location`: mixed?
- `current_odometer`: mixed?
- `assigned_at`: string

**Usage**: Store vehicle details

### VehicleAssignment Schema

**Purpose**: Driver-vehicle assignment

**Fields**:
- `_id`: ObjectId (primary key)
- `driver_id`: string
- `driver_name`: string
- `has_vehicle_assigned`: boolean
- `vehicle_info`: VehicleInfo (relationship)
- `assignment_status`: string

**Relationships**:
- `vehicle_info`: Links to VehicleInfo object

**Usage**: Store vehicle assignment for driver

### OrganizationSettings Schema

**Purpose**: Organization-level configuration

**Fields**:
- `_id`: ObjectId (primary key)
- `organization_id`: string
- `organization_name`: string
- `timezone`: string
- `locale`: string
- `hos_settings`: mixed? (object)
- `compliance_settings`: mixed? (object)

**Usage**: Store organization configuration

### DriverData Schema

**Purpose**: Complete driver data bundle with relationships

**Fields**:
- `_id`: ObjectId (primary key)
- `token`: string
- `user_id`: string
- `email`: string
- `firstName`: string
- `lastName`: string
- `role`: string
- `organizationId`: string
- `onboardingCompleted`: boolean
- `onboardingStep`: number
- `created_at`: Date
- `updated_at`: Date

**Relationships**:
- `driver_profile`: DriverProfile
- `hos_status`: HOSStatus
- `vehicle_assignment`: VehicleAssignment
- `organization_settings`: OrganizationSettings

**Usage**: Main entry point for driver data with all relationships

## Schema Relationships

### One-to-One

- DriverData → DriverProfile
- DriverData → HOSStatus
- DriverData → VehicleAssignment
- DriverData → OrganizationSettings
- VehicleAssignment → VehicleInfo

### One-to-Many

- User → AuthSessions (potential)

## Data Types

### Realm Types

- `ObjectId` - Unique identifier
- `string` - Text data
- `number` - Numeric data
- `boolean` - Boolean values
- `Date` - Date/time
- `mixed` - Flexible JSON-like data
- `mixed[]` - Array of mixed data

## Schema Properties

### Required Fields

Most schemas have required primary fields:
- `_id`: Always required (ObjectId)
- Core identification fields

### Optional Fields

Many fields are optional (marked with `?`):
- Phone numbers
- Dates
- Location data
- Settings

### Default Values

Some fields have defaults:
- `is_active`: Typically true
- `eld_exempt`: Typically false
- `violations_count`: 0

## Schema Indexes

### Primary Keys

All schemas use `_id` as primary key:
- Auto-generated ObjectId
- Unique identifier
- Fast lookups

### Query Indexes

Realm automatically indexes:
- Primary keys
- Frequently queried fields

## Migration Strategy

### Development

```typescript
deleteRealmIfMigrationNeeded: true
```

**Warning**: Deletes all data on schema change!

### Production

Should implement:
- Schema versioning
- Migration functions
- Data transformation
- Rollback capability

## Usage Examples

### Creating Records

```typescript
await RealmService.createDriverProfile({
  driver_id: 'driver-123',
  name: 'John Doe',
  email: 'john@example.com',
  // ... other fields
})
```

### Querying Records

```typescript
const profile = RealmService.getDriverProfile()
const hosStatus = RealmService.getHOSStatus()
```

### Updating Records

```typescript
RealmService.updateHOSStatus({
  current_status: 'driving',
  driving_time_remaining: 600
})
```

## Data Synchronization

### From API

Data flows from API → Realm:
1. Login response → DriverData
2. Profile updates → DriverProfile
3. HOS updates → HOSStatus

### To UI

Data flows from Realm → UI:
1. Components read from Realm
2. Real-time updates via Realm listeners
3. Cached for offline access

## Relationships

### Linking Objects

```typescript
// Create related objects
const vehicleInfo = realm.create('VehicleInfo', {...})
const assignment = realm.create('VehicleAssignment', {...})

// Link relationship
assignment.vehicle_info = vehicleInfo
```

### Accessing Relationships

```typescript
const driverData = RealmService.getDriverData()
const vehicle = driverData.vehicle_assignment.vehicle_info
const profile = driverData.driver_profile
```

## Data Cleanup

### On Logout

```typescript
await RealmService.deleteAuthSession()
await RealmService.clearDriverData()
await RealmService.deleteAllUsers()
```

### Partial Cleanup

```typescript
// Clear specific data
await RealmService.deleteUser(userId)
await RealmService.clearDriverData()
```

## Performance

### Indexing

- Primary keys automatically indexed
- Fast lookups by ID
- Efficient queries

### Relationships

- Lazy loading
- Cached relationships
- Efficient navigation

## Schema Evolution

### Adding Fields

1. Increment schema version
2. Add field to schema
3. Handle migration (or delete in dev)

### Removing Fields

1. Increment schema version
2. Remove from schema
3. Migrate data (if needed)

### Changing Types

1. Increment schema version
2. Update schema
3. Transform data in migration

## Notes

- All schemas use ObjectId for _id
- Relationships use Realm's linking
- Mixed types for flexible data
- Schema version tracks changes
- Production needs proper migrations

