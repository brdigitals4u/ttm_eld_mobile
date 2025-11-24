# Co-Driver Functionality Flow

## Overview

This document describes the complete co-driver functionality flow, including when backend APIs are called, how co-driver events are tracked, and motion restrictions similar to Samsara.

## Architecture

### Frontend (Mobile App)

**File**: `src/app/codriver.tsx`
- UI for managing co-drivers
- Displays list of available co-drivers
- Allows activating/deactivating co-drivers

**File**: `src/contexts/codriver-context.ts`
- Manages co-driver state (local storage)
- Tracks active co-driver
- Provides `setActiveCoDriver()` function

**File**: `src/hooks/useTeamDriverMotionRestrictions.ts`
- Enforces motion restrictions
- Tracks vehicle motion state
- Determines if co-driver logged in before motion started

### Backend Integration

**API Endpoint**: `POST /api/hos/eld-events/`

**Event Types**:
- `co_driver_login` - When co-driver is activated
- `co_driver_logout` - When co-driver is deactivated

## Flow Diagram

```
User Action: Activate Co-Driver
    ↓
Frontend: setActiveCoDriver(id)
    ↓
Frontend: Create ELD Event (co_driver_login)
    ↓
Backend: POST /api/hos/eld-events/
    ↓
Backend: Process event, update co-driver tracking
    ↓
Backend: Send webhook notification (if configured)
```

## When Backend is Called

### 1. Co-Driver Login (Activation)

**Trigger**: User taps "Set Active" on a co-driver in the list

**Frontend Code**: `src/app/codriver.tsx` (lines 69-132)

**API Call**:
```typescript
POST /api/hos/eld-events/
{
  driver: driverProfile.driver_id,
  vehicle: vehicleId,
  event_type: 'co_driver_login',
  event_time: new Date().toISOString(),
  event_location: locationData.address,
  remark: `Co-driver ${coDriver.name} logged in`,
  event_data: {
    co_driver_id: id,
    co_driver_name: coDriver.name,
  }
}
```

**Backend Requirements**:
- Process `co_driver_login` event
- Track active co-driver per vehicle
- Validate co-driver assignment
- Send webhook notification (optional)

### 2. Co-Driver Logout (Deactivation)

**Trigger**: User taps "Set Active" on an already active co-driver

**Frontend Code**: `src/app/codriver.tsx` (lines 94-109)

**API Call**:
```typescript
POST /api/hos/eld-events/
{
  driver: driverProfile.driver_id,
  vehicle: vehicleId,
  event_type: 'co_driver_logout',
  event_time: new Date().toISOString(),
  event_location: locationData.address,
  remark: `Co-driver ${coDriver.name} logged out`,
  event_data: {
    co_driver_id: id,
    co_driver_name: coDriver.name,
  }
}
```

**Backend Requirements**:
- Process `co_driver_logout` event
- Update active co-driver tracking (set to null)
- Send webhook notification (optional)

## Motion Restrictions (Samsara-like)

### Implementation

**File**: `src/hooks/useTeamDriverMotionRestrictions.ts`

### Rules

1. **Vehicle Not in Motion**:
   - All operations allowed
   - Can make entries, switch roles, edit records

2. **Vehicle in Motion - No Co-Driver**:
   - Standard motion restrictions apply
   - Cannot make entries
   - Cannot switch roles
   - Cannot edit records
   - Reason: "Vehicle is in motion. Entries are blocked for safety."

3. **Vehicle in Motion - Co-Driver Active (Logged in BEFORE motion)**:
   - Can make entries on own records
   - Cannot switch driving roles
   - Can edit own records
   - Reason: "Vehicle is in motion. You can edit your own records but cannot switch roles."

4. **Vehicle in Motion - Co-Driver Active (Logged in AFTER motion)**:
   - Standard motion restrictions apply
   - Cannot make entries
   - Cannot switch roles
   - Cannot edit records
   - Reason: "Vehicle is in motion. Co-driver must log in before vehicle starts moving to make entries."

### Motion Detection

- Speed threshold: 5 MPH
- Monitored via: `useObdData().currentSpeedMph`
- Updates every 1 second (configurable)

## Active Co-Driver Tracking

### Frontend Storage

- **Local Storage**: `AsyncStorage.getItem('activeCoDriver')`
- **State**: `CoDriverContext.activeCoDriver`
- **Persistence**: Survives app restarts

### Backend Tracking

- Backend should maintain active co-driver per vehicle
- Updated via ELD events (`co_driver_login`/`co_driver_logout`)
- Used for compliance reporting and validation

## Backend Requirements

### 1. Event Processing

Backend must process ELD events with:
- `event_type: 'co_driver_login'` or `'co_driver_logout'`
- Extract `co_driver_id` and `co_driver_name` from `event_data`
- Update active co-driver tracking per vehicle

### 2. Validation

- Validate co-driver is assigned to the vehicle
- Validate co-driver is authorized for the driver
- Reject invalid co-driver assignments

### 3. Webhooks (Optional)

Backend should trigger webhooks on:
- Co-driver login
- Co-driver logout
- Co-driver assignment changes

**Webhook Payload Example**:
```json
{
  "event": "co_driver_login",
  "vehicle_id": 123,
  "driver_id": "uuid",
  "co_driver_id": "uuid",
  "co_driver_name": "John Doe",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## API Integration Points

### Current Implementation

**File**: `src/api/drivers.ts`
- `createCoDriverEvent()` function
- Calls `POST /api/hos/eld-events/`
- Handles both login and logout events

**File**: `src/app/codriver.tsx`
- Uses `createCoDriverEventMutation` from React Query
- Sends events immediately on status change
- Updates local state after successful API call

## Error Handling

- If API call fails, show error toast
- Local state is updated optimistically
- Retry logic can be added if needed

## Testing Checklist

- [ ] Co-driver login creates ELD event
- [ ] Co-driver logout creates ELD event
- [ ] Backend receives and processes events
- [ ] Motion restrictions work correctly
- [ ] Co-driver logged in before motion can make entries
- [ ] Co-driver logged in after motion cannot make entries
- [ ] Webhooks are triggered (if configured)

## Notes

- Co-driver functionality is similar to Samsara's team driver feature
- Motion restrictions ensure compliance and safety
- Backend must maintain active co-driver state for reporting
- Events are sent immediately (not batched) for real-time tracking

