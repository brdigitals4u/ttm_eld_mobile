# Mobile API Integration Checklist

**Date:** November 7, 2025  
**Status:** Ready for Implementation

## Overview

This checklist details what needs to be removed, replaced, and what new APIs need to be called for the Mobile API integration.

---

## 🔴 REMOVE / REPLACE

### 1. HOS API Endpoints (Old → New)

#### ❌ REMOVE from `src/api/hos.ts`:
- `getHOSClock()` - **REPLACE** with `driverApi.getCurrentHOSStatus()`
- `getHOSClockById()` - **REPLACE** with `driverApi.getHOSClocks()` (detailed clocks)
- `changeDutyStatus(clockId, request)` - **REPLACE** with `driverApi.changeDutyStatus(request)` (no clockId needed)
- `getHOSLogs()` - **REPLACE** with `driverApi.getHOSLogs(date)`
- `createHOSLogEntry()` - **REMOVE** (handled by backend on status change)
- `createHOSELDEvent()` - **REMOVE** (handled by backend on status change)

#### ❌ REMOVE from `src/api/hos.ts` hooks:
- `useHOSClock()` - **REPLACE** with `useHOSCurrentStatus()` from `driver-hooks.ts`
- `useHOSClockById()` - **REPLACE** with `useHOSClocks()` from `driver-hooks.ts`
- `useChangeDutyStatus()` - **REPLACE** with `useChangeDutyStatus()` from `driver-hooks.ts`
- `useHOSLogs()` - **REPLACE** with `useHOSLogs()` from `driver-hooks.ts`

#### ❌ REMOVE from `src/contexts/status-context.ts`:
- `sendHOSAPIs()` function (lines 349-485) - **REMOVE** (backend handles this)
- `changeDutyStatus()` function (lines 645-669) - **REMOVE** (use new API)
- Clock ID storage/retrieval logic - **REMOVE** (not needed with new API)

---

## ✅ NEW API CALLS TO IMPLEMENT

### 2. Dashboard Screen (`src/screens/DashboardScreen.tsx`)

#### Current Implementation:
- Uses `useHOSClock()` from `@/api/hos` (line 30, ~74-82)
- Uses `useHOSLogs()` from `@/api/hos` (line 30, ~209-220)
- Uses `useNotifications()` from `@/api/notifications` (line 31, ~72)
- Uses `useMalfunctionStatus()` from `@/api/notifications` (line 31, ~73)

#### ✅ REPLACE WITH:

**Line 30:**
```typescript
// OLD:
import { useHOSClock, useComplianceSettings, useHOSLogs, hosApi } from "@/api/hos"
import { useNotifications, useMalfunctionStatus, useMarkAsRead, Notification } from "@/api/notifications"

// NEW:
import { useHOSCurrentStatus, useHOSClocks, useHOSLogs, useViolations } from "@/api/driver-hooks"
import { useNotifications, useMarkAllNotificationsRead } from "@/api/driver-hooks"
```

**Line ~74-82 (HOS Clock fetch):**
```typescript
// OLD:
const { data: hosClock, isLoading: hosLoading, error: hosError } = useHOSClock({
  enabled: isAuthenticated && !!driverProfile?.driver_id,
  refetchInterval: 60000,
})

// NEW:
const { data: hosStatus, isLoading: hosLoading, error: hosError } = useHOSCurrentStatus({
  enabled: isAuthenticated,
  refetchInterval: 30000, // 30 seconds (per spec)
})

// For detailed clocks (when focused):
const { data: hosClocks } = useHOSClocks(enabled: isDashboardFocused)
```

**Line ~209-220 (HOS Logs):**
```typescript
// OLD:
const { data: todayHOSLogs, isLoading: isHOSLogsLoading, refetch: refetchHOSLogs } = useHOSLogs(
  {
    driver: correctDriverId,
    startDate: todayStr,
    endDate: tomorrowStr,
  },
  { enabled: isAuthenticated && !!correctDriverId && !!hosClock },
)

// NEW:
const { data: todayHOSLogs, isLoading: isHOSLogsLoading, refetch: refetchHOSLogs } = useHOSLogs(
  todayStr, // Just date string YYYY-MM-DD
  isAuthenticated && !!driverProfile?.driver_id
)
```

**Line ~72-73 (Notifications):**
```typescript
// OLD:
const { data: notificationsData, refetch: refetchNotifications } = useNotifications({ enabled: isAuthenticated })
const { data: malfunctionStatus } = useMalfunctionStatus({ enabled: isAuthenticated })

// NEW:
const { data: notificationsData, refetch: refetchNotifications } = useNotifications({
  status: 'unread',
  limit: 50,
  enabled: isAuthenticated,
  refetchInterval: 60000, // 60 seconds
})
```

**ADD Violations Display:**
```typescript
// NEW - Add after line 73:
const { data: violationsData } = useViolations(isAuthenticated)
```

**Line ~222-273 (HOS Sync Logic):**
```typescript
// OLD: Syncs from hosClock (old API response)
// NEW: Syncs from hosStatus (new API response)
useEffect(() => {
  if (hosStatus && isAuthenticated) {
    updateHosStatus({
      driver_id: hosStatus.driver_id,
      driver_name: hosStatus.driver_id, // or from driverProfile
      current_status: hosStatus.current_status,
      driving_time_remaining: hosStatus.clocks.drive.remaining_minutes,
      on_duty_time_remaining: hosStatus.clocks.shift.remaining_minutes,
      cycle_time_remaining: hosStatus.clocks.cycle.remaining_minutes,
      time_remaining: {
        driving_time_remaining: hosStatus.clocks.drive.remaining_minutes,
        on_duty_time_remaining: hosStatus.clocks.shift.remaining_minutes,
        cycle_time_remaining: hosStatus.clocks.cycle.remaining_minutes,
      },
    })
    
    // Map status
    const appStatus = mapDriverStatusToAppStatus(hosStatus.current_status)
    setCurrentStatus(appStatus)
    
    setHoursOfService({
      driveTimeRemaining: hosStatus.clocks.drive.remaining_minutes,
      shiftTimeRemaining: hosStatus.clocks.shift.remaining_minutes,
      cycleTimeRemaining: hosStatus.clocks.cycle.remaining_minutes,
      breakTimeRemaining: hoursOfService.breakTimeRemaining,
      lastCalculated: Date.now(),
    })
  }
}, [hosStatus, isAuthenticated])
```

---

### 3. Status Screen (`src/app/status.tsx`)

#### Current Implementation:
- Uses `useHOSClock()` from `@/api/hos` (line 32, ~116-125)
- Uses `useChangeDutyStatus()` from `@/api/hos` (line 32, ~163)
- Calls `changeDutyStatusMutation.mutateAsync()` with `clockId` (line ~269-274)

#### ✅ REPLACE WITH:

**Line 32:**
```typescript
// OLD:
import { useHOSClock, useChangeDutyStatus, hosApi } from "@/api/hos"

// NEW:
import { useHOSCurrentStatus, useChangeDutyStatus } from "@/api/driver-hooks"
import { driverApi } from "@/api/driver"
```

**Line ~116-125 (HOS Clock fetch):**
```typescript
// OLD:
const { data: hosClock, isLoading: isClockLoading } = useHOSClock({
  enabled: isAuthenticated && !!driverProfile?.driver_id,
  refetchInterval: 60000,
})

// NEW:
const { data: hosStatus, isLoading: isClockLoading } = useHOSCurrentStatus({
  enabled: isAuthenticated,
  refetchInterval: 30000, // 30 seconds
})
```

**Line ~163 (Change Duty Status mutation):**
```typescript
// OLD:
const changeDutyStatusMutation = useChangeDutyStatus()

// NEW:
const changeDutyStatusMutation = useChangeDutyStatus() // Same hook name, different implementation
```

**Line ~200-356 (handleConfirmStatusChange):**
```typescript
// OLD:
if (!hosClock?.id) {
  toast.error("No HOS clock found...")
  return
}

const result = await changeDutyStatusMutation.mutateAsync({
  clockId: hosClock.id, // ❌ REMOVE - not needed
  request: requestPayload,
  driverId: driverIdForLog, // ❌ REMOVE - not needed
  previousClock: hosClock, // ❌ REMOVE - not needed
})

// NEW:
// No clock ID validation needed
const result = await changeDutyStatusMutation.mutateAsync({
  duty_status: apiStatus,
  location: {
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    address: locationData.address || "",
  },
  odometer: odometer > 0 ? odometer : undefined,
  remark: finalReason,
})

// Response structure is different:
if (result.success) {
  // Update local state from result
  if (result.new_clocks) {
    // Update HOS times from response
  }
}
```

**Line ~358-439 (handleGoOffDuty):**
```typescript
// OLD:
if (hosClock?.id) {
  const result = await changeDutyStatusMutation.mutateAsync({
    clockId: hosClock.id, // ❌ REMOVE
    request: requestPayload,
    driverId: driverIdForLog, // ❌ REMOVE
    previousClock: hosClock, // ❌ REMOVE
  })
}

// NEW:
// Same as handleConfirmStatusChange - no clock ID needed
const result = await changeDutyStatusMutation.mutateAsync({
  duty_status: 'off_duty',
  location: {
    latitude: locationData.latitude,
    longitude: locationData.longitude,
  },
  odometer: odometer > 0 ? odometer : undefined,
  remark: reason,
})
```

---

### 4. Profile Screen (`src/screens/ProfileScreen.tsx`)

#### Current Implementation:
- Uses `hosStatus` from `useAuth()` store (line ~701)
- Displays violations from `hosStatus.active_violations` (line ~709)

#### ✅ REPLACE WITH:

**ADD at top:**
```typescript
import { useHOSCurrentStatus, useViolations } from "@/api/driver-hooks"
```

**ADD in component:**
```typescript
const { data: hosStatus } = useHOSCurrentStatus({
  enabled: isAuthenticated,
  refetchInterval: 30000,
})

const { data: violationsData } = useViolations(isAuthenticated)
```

**UPDATE violations display:**
```typescript
// OLD:
{hosStatus?.active_violations && hosStatus.active_violations.length > 0 && (
  // Display violations
)}

// NEW:
{(violationsData?.violations && violationsData.violations.length > 0) && (
  // Display violations from violationsData.violations
)}
```

---

### 5. Context Hooks - HOS Status Context

#### ✅ CREATE NEW: `src/contexts/hos-status-context.tsx`

```typescript
import { createContext, useContext } from 'react'
import { useHOSCurrentStatus } from '@/api/driver-hooks'

interface HOSStatusContextType {
  hosStatus: HOSCurrentStatus | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const HOSStatusContext = createContext<HOSStatusContextType | undefined>(undefined)

export const HOSStatusProvider = ({ children }) => {
  const { data: hosStatus, isLoading, error, refetch } = useHOSCurrentStatus({
    enabled: true,
    refetchInterval: 30000, // 30 seconds
  })

  return (
    <HOSStatusContext.Provider value={{ hosStatus, isLoading, error, refetch }}>
      {children}
    </HOSStatusContext.Provider>
  )
}

export const useHOSStatus = () => {
  const context = useContext(HOSStatusContext)
  if (!context) {
    throw new Error('useHOSStatus must be used within HOSStatusProvider')
  }
  return context
}
```

**ADD to `src/contexts/all-contexts.tsx`:**
```typescript
import { HOSStatusProvider } from './hos-status-context'

// Wrap app with HOSStatusProvider
<HOSStatusProvider>
  {/* other providers */}
</HOSStatusProvider>
```

---

### 6. Location Tracking

#### Current Implementation:
- Location updates in `src/contexts/obd-data-context.tsx`
- Uses `/obd/data/batch` endpoint

#### ✅ REPLACE WITH:

**In `src/contexts/obd-data-context.tsx`:**

**ADD import:**
```typescript
import { locationQueueService } from '@/services/location-queue'
```

**INITIALIZE on mount (after line 54):**
```typescript
useEffect(() => {
  if (!isAuthenticated) return

  // Initialize location queue
  locationQueueService.initialize()
  locationQueueService.startAutoFlush(30000) // Every 30 seconds

  return () => {
    locationQueueService.stopAutoFlush()
  }
}, [isAuthenticated])
```

**REPLACE location submission (in handleData function):**
```typescript
// OLD: Direct API call to /obd/data/batch
// NEW: Add to location queue
if (data.latitude !== undefined && data.longitude !== undefined) {
  await locationQueueService.addLocation({
    latitude: data.latitude,
    longitude: data.longitude,
    speed_mph: data.vehicleSpeed || currentSpeed,
    heading: data.heading,
    odometer: data.odometer,
    accuracy_m: data.accuracy,
  })

  // Handle auto-duty changes from batch response
  const batchResponse = await locationQueueService.flush()
  if (batchResponse?.auto_duty_changes && batchResponse.auto_duty_changes.length > 0) {
    // Refresh HOS status if auto-duty changed
    // This will be handled by the HOS status context
  }
}
```

---

### 7. Device Heartbeat Service

#### ✅ CREATE NEW: `src/services/device-heartbeat-service.ts`

```typescript
import { useDeviceHeartbeat } from '@/api/driver-hooks'
import * as Device from 'expo-device'
import NetInfo from '@react-native-community/netinfo'
import { getEldDeviceId, getAppVersion } from '@/utils/device'

class DeviceHeartbeatService {
  private interval: NodeJS.Timeout | null = null
  private heartbeatMutation: any

  start() {
    // Send heartbeat every 5 minutes
    this.interval = setInterval(async () => {
      const netInfo = await NetInfo.fetch()
      const eldDeviceId = await getEldDeviceId()

      if (this.heartbeatMutation) {
        this.heartbeatMutation.mutate({
          device_id: eldDeviceId || 'unknown',
          timestamp: new Date().toISOString(),
          battery_percent: Device.batteryLevel ? Device.batteryLevel * 100 : undefined,
          gps_enabled: true,
          network_type: netInfo.type,
          app_version: getAppVersion(),
        })
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  setMutation(mutation: any) {
    this.heartbeatMutation = mutation
  }
}

export const deviceHeartbeatService = new DeviceHeartbeatService()
```

**ADD to `src/app/_layout.tsx` or `src/contexts/all-contexts.tsx`:**
```typescript
import { useDeviceHeartbeat } from '@/api/driver-hooks'
import { deviceHeartbeatService } from '@/services/device-heartbeat-service'
import { useEffect } from 'react'
import { useAuth } from '@/stores/authStore'

// In root component:
const { isAuthenticated } = useAuth()
const heartbeat = useDeviceHeartbeat()

useEffect(() => {
  if (isAuthenticated) {
    deviceHeartbeatService.setMutation(heartbeat)
    deviceHeartbeatService.start()
  } else {
    deviceHeartbeatService.stop()
  }

  return () => {
    deviceHeartbeatService.stop()
  }
}, [isAuthenticated, heartbeat])
```

---

### 8. Notifications Service

#### Current Implementation:
- Uses `useNotifications()` from `@/api/notifications`
- Uses `useMalfunctionStatus()` from `@/api/notifications`

#### ✅ REPLACE WITH:

**In `src/services/NotificationService.ts`:**

**ADD import:**
```typescript
import { driverApi, useNotifications } from '@/api/driver-hooks'
import { getDeviceId, getAppVersion } from '@/utils/device'
import { Platform } from 'react-native'
```

**UPDATE initialize method:**
```typescript
// After getting push token:
if (this.pushToken) {
  // Register with new API
  await driverApi.registerPushToken({
    device_token: this.pushToken,
    platform: Platform.OS as 'ios' | 'android',
    device_id: await getDeviceId(),
    app_version: getAppVersion(),
  })
}
```

**CREATE background polling service:**
```typescript
// In root component or context:
const { data: notifications } = useNotifications({
  status: 'unread',
  limit: 50,
  enabled: isAuthenticated,
  refetchInterval: 60000, // 60 seconds
})

// Display notifications when received
useEffect(() => {
  if (notifications?.results && notifications.results.length > 0) {
    // Show in-app notifications
    notifications.results.forEach(notification => {
      // Display notification
    })
  }
}, [notifications])
```

---

## 📋 SUMMARY CHECKLIST

### Files to Modify:

- [ ] `src/screens/DashboardScreen.tsx`
  - [ ] Replace `useHOSClock` → `useHOSCurrentStatus`
  - [ ] Replace `useHOSLogs` → new `useHOSLogs` from driver-hooks
  - [ ] Replace `useNotifications` → new `useNotifications` from driver-hooks
  - [ ] Add `useViolations` hook
  - [ ] Update HOS sync logic for new response structure
  - [ ] Add violations display

- [ ] `src/app/status.tsx`
  - [ ] Replace `useHOSClock` → `useHOSCurrentStatus`
  - [ ] Replace `useChangeDutyStatus` → new `useChangeDutyStatus` from driver-hooks
  - [ ] Remove clock ID validation
  - [ ] Update `handleConfirmStatusChange` to use new API format
  - [ ] Update `handleGoOffDuty` to use new API format

- [ ] `src/screens/ProfileScreen.tsx`
  - [ ] Add `useHOSCurrentStatus` hook
  - [ ] Add `useViolations` hook
  - [ ] Update violations display

- [ ] `src/contexts/status-context.ts`
  - [ ] Remove `sendHOSAPIs()` function
  - [ ] Remove `changeDutyStatus()` function
  - [ ] Remove clock ID storage logic

- [ ] `src/contexts/obd-data-context.tsx`
  - [ ] Add location queue service initialization
  - [ ] Replace location API calls with queue service
  - [ ] Handle auto-duty changes from batch response

- [ ] `src/services/NotificationService.ts`
  - [ ] Update push token registration to use new API
  - [ ] Add background notification polling

### Files to Create:

- [ ] `src/contexts/hos-status-context.tsx` - HOS status context provider
- [ ] `src/services/device-heartbeat-service.ts` - Device heartbeat background service

### Files to Update (Root Level):

- [ ] `src/app/_layout.tsx` or `src/contexts/all-contexts.tsx`
  - [ ] Add `HOSStatusProvider`
  - [ ] Add device heartbeat service initialization
  - [ ] Add notification polling service

### API Endpoints to Remove:

- [ ] `GET /api/hos/clocks/` - Replace with `/api/driver/hos/current-status/`
- [ ] `POST /api/hos/clocks/{id}/change_duty_status/` - Replace with `/api/driver/hos/change-status/`
- [ ] `GET /api/hos/logs/` - Replace with `/api/driver/hos/logs/`
- [ ] `POST /api/hos/logs/` - Remove (handled by backend)
- [ ] `POST /api/hos/eld-events/` - Remove (handled by backend)

### API Endpoints to Add:

- [x] `GET /api/driver/hos/current-status/` - ✅ Implemented
- [x] `GET /api/driver/hos/clocks/` - ✅ Implemented
- [x] `POST /api/driver/hos/change-status/` - ✅ Implemented
- [x] `GET /api/driver/hos/logs/` - ✅ Implemented
- [x] `GET /api/driver/hos/violations/` - ✅ Implemented
- [x] `POST /api/driver/hos/certify/` - ✅ Implemented
- [x] `POST /api/driver/hos/annotate/` - ✅ Implemented
- [x] `POST /api/driver/location/batch/v2/` - ✅ Implemented
- [x] `POST /api/driver/device/heartbeat/` - ✅ Implemented
- [x] `GET /api/driver/notifications/` - ✅ Implemented
- [x] `POST /api/driver/notifications/register/` - ✅ Implemented

---

## 🎯 Implementation Order

1. **Create HOS Status Context** - Provides HOS status to all screens
2. **Update Dashboard Screen** - Replace old hooks with new ones
3. **Update Status Screen** - Replace duty status change logic
4. **Update Profile Screen** - Add violations display
5. **Update Location Tracking** - Integrate location queue service
6. **Add Device Heartbeat** - Background service
7. **Update Notifications** - New API integration
8. **Remove Old Code** - Clean up unused functions

---

## ⚠️ Breaking Changes

1. **HOS Clock API Response Structure Changed**
   - Old: `hosClock.driver`, `hosClock.current_duty_status`
   - New: `hosStatus.driver_id`, `hosStatus.current_status`, `hosStatus.clocks`

2. **Change Duty Status No Longer Requires Clock ID**
   - Old: `changeDutyStatus(clockId, request)`
   - New: `changeDutyStatus(request)` - backend determines clock

3. **HOS Logs API Changed**
   - Old: `getHOSLogs({ driver, startDate, endDate })`
   - New: `getHOSLogs(date)` - single date string

4. **Location Tracking Changed**
   - Old: Direct API calls to `/obd/data/batch`
   - New: Queue service with sequence numbers and batch upload

---

## 📝 Notes

- All new APIs use Bearer token authentication (auto-detected)
- Idempotency keys are automatically generated
- Location queue persists offline and flushes when online
- Device heartbeat runs in background every 5 minutes
- Notifications poll every 60 seconds when authenticated

