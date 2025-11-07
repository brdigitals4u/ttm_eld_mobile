# Mobile API Implementation Guide

**Last Updated:** November 7, 2025

## Overview

This document describes the complete implementation of the Mobile API integration for the TTM Konnect ELD mobile app. All endpoints from the Mobile API Complete Reference have been implemented.

## Files Created/Modified

### New Files

1. **`src/api/driver.ts`** - Complete driver API module
   - HOS Management (status, clocks, logs, violations, certify, annotate)
   - Location Tracking (single update, batch upload)
   - Device Health (heartbeat, malfunction reporting)
   - Notifications (register, poll, mark read)

2. **`src/api/driver-hooks.ts`** - React Query hooks for driver APIs
   - All endpoints wrapped in React Query hooks
   - Proper caching, refetch intervals, and error handling

3. **`src/services/location-queue.ts`** - Location batching service
   - Write-ahead log with sequence numbers
   - Offline persistence via AsyncStorage
   - Automatic flushing every 30 seconds or when 10+ points buffered

4. **`src/utils/device.ts`** - Device utilities
   - Device ID generation and storage
   - App version retrieval
   - ELD device ID integration

### Modified Files

1. **`src/api/client.ts`**
   - Added Bearer token support (auto-detects JWT vs Token format)
   - Added idempotency key support
   - Added device ID and app version headers

2. **`src/api/constants.ts`**
   - Added `DRIVER` endpoint constants
   - Added driver-specific query keys

## API Endpoints Implemented

### HOS Management

| Endpoint | Method | Hook | Description |
|----------|--------|------|-------------|
| `/api/driver/hos/current-status/` | GET | `useHOSCurrentStatus` | Get current HOS status (poll every 30s) |
| `/api/driver/hos/clocks/` | GET | `useHOSClocks` | Get detailed HOS clocks (on-demand) |
| `/api/driver/hos/change-status/` | POST | `useChangeDutyStatus` | Change duty status (user action) |
| `/api/driver/hos/logs/` | GET | `useHOSLogs` | Get daily logs (on-demand) |
| `/api/driver/hos/violations/` | GET | `useViolations` | Get violations (on-demand) |
| `/api/driver/hos/certify/` | POST | `useCertifyLog` | Certify daily log (end of day) |
| `/api/driver/hos/annotate/` | POST | `useAnnotateLog` | Add annotation to log (user action) |

### Location Tracking

| Endpoint | Method | Service | Description |
|----------|--------|---------|-------------|
| `/api/driver/location/update/` | POST | `driverApi.submitLocation` | Single location update (fallback) |
| `/api/driver/location/batch/v2/` | POST | `locationQueueService` | Batch location upload (recommended) |

### Device Health

| Endpoint | Method | Hook | Description |
|----------|--------|------|-------------|
| `/api/driver/device/heartbeat/` | POST | `useDeviceHeartbeat` | Device heartbeat (every 5 min) |
| `/api/driver/device/malfunction/` | POST | `useReportMalfunction` | Report malfunction (on failure) |

### Notifications

| Endpoint | Method | Hook | Description |
|----------|--------|------|-------------|
| `/api/driver/notifications/register/` | POST | `useRegisterPushToken` | Register push token (once per install) |
| `/api/driver/notifications/` | GET | `useNotifications` | Poll notifications (every 60s) |
| `/api/driver/notifications/read/` | POST | `useMarkNotificationRead` | Mark single notification read |
| `/api/driver/notifications/read-all/` | POST | `useMarkAllNotificationsRead` | Mark all notifications read |

## Usage Examples

### HOS Status (Polling)

```typescript
import { useHOSCurrentStatus } from '@/api/driver-hooks'

function HOSDashboard() {
  const { data: hosStatus, isLoading } = useHOSCurrentStatus({
    enabled: true,
    refetchInterval: 30000, // 30 seconds
  })

  if (isLoading) return <Loading />

  return (
    <View>
      <Text>Current Status: {hosStatus?.current_status}</Text>
      <Text>Drive Time Remaining: {hosStatus?.clocks.drive.remaining_minutes} min</Text>
    </View>
  )
}
```

### Change Duty Status

```typescript
import { useChangeDutyStatus } from '@/api/driver-hooks'
import { driverApi } from '@/api/driver'

function StatusScreen() {
  const changeStatus = useChangeDutyStatus()

  const handleChangeStatus = async () => {
    try {
      await changeStatus.mutateAsync({
        duty_status: 'driving',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'San Francisco, CA',
        },
        odometer: 125000,
        remark: 'Starting route',
      })
      // Success - status updated
    } catch (error) {
      // Handle error
    }
  }
}
```

### Location Tracking (Batch)

```typescript
import { locationQueueService } from '@/services/location-queue'
import { useEffect } from 'react'

function LocationTracker() {
  useEffect(() => {
    // Initialize queue
    locationQueueService.initialize()

    // Start auto-flush (every 30 seconds)
    locationQueueService.startAutoFlush(30000)

    // Add location when GPS updates
    const locationListener = (location: Location) => {
      locationQueueService.addLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        speed_mph: location.speed * 2.23694, // m/s to mph
        heading: location.heading,
        odometer: getOdometer(),
      })
    }

    // Cleanup
    return () => {
      locationQueueService.stopAutoFlush()
    }
  }, [])
}
```

### Device Heartbeat

```typescript
import { useDeviceHeartbeat } from '@/api/driver-hooks'
import { useEffect } from 'react'
import * as Device from 'expo-device'
import NetInfo from '@react-native-community/netinfo'
import { getEldDeviceId } from '@/utils/device'

function HeartbeatService() {
  const heartbeat = useDeviceHeartbeat()

  useEffect(() => {
    const interval = setInterval(async () => {
      const netInfo = await NetInfo.fetch()
      const eldDeviceId = await getEldDeviceId()

      heartbeat.mutate({
        device_id: eldDeviceId || 'unknown',
        timestamp: new Date().toISOString(),
        battery_percent: Device.batteryLevel ? Device.batteryLevel * 100 : undefined,
        gps_enabled: true,
        network_type: netInfo.type,
        app_version: getAppVersion(),
      })
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(interval)
  }, [])
}
```

### Notifications

```typescript
import { useNotifications, useMarkNotificationRead } from '@/api/driver-hooks'
import { NotificationService } from '@/services/NotificationService'
import { useEffect } from 'react'

function NotificationsScreen() {
  const { data: notifications } = useNotifications({
    status: 'unread',
    limit: 50,
    enabled: true,
    refetchInterval: 60000, // 60 seconds
  })

  const markRead = useMarkNotificationRead()

  // Register push token on mount
  useEffect(() => {
    NotificationService.initialize().then(token => {
      if (token) {
        driverApi.registerPushToken({
          device_token: token,
          platform: Platform.OS as 'ios' | 'android',
          device_id: await getDeviceId(),
          app_version: getAppVersion(),
        })
      }
    })
  }, [])

  return (
    <FlatList
      data={notifications?.results || []}
      renderItem={({ item }) => (
        <NotificationItem
          notification={item}
          onPress={() => markRead.mutate(item.id)}
        />
      )}
    />
  )
}
```

## Location Queue Service Details

### Features

- **Sequence Numbers**: Auto-incrementing sequence numbers for each location
- **Offline Persistence**: Queue stored in AsyncStorage for offline resilience
- **Automatic Flushing**: Flushes every 30 seconds or when 10+ points buffered
- **Server Response Handling**: Removes processed entries based on `applied_up_to_seq`
- **Retry Logic**: Failed uploads remain in queue for retry

### Sequence Number Management

```typescript
// Client maintains:
- lastSeq: Last sequence number assigned
- lastAppliedSeq: Last sequence number confirmed by server

// On flush:
1. Send locations with seq numbers
2. Server returns applied_up_to_seq
3. Remove all locations with seq <= applied_up_to_seq
4. Update lastAppliedSeq
```

### Idempotency

All POST requests include an `Idempotency-Key` header:
- Format: `driver-{deviceId}-{action}-{timestamp}-{uuid}`
- Prevents duplicate processing on retries
- Automatically generated by API client

## Authentication

The API client automatically:
- Detects JWT tokens (starts with `eyJ`) and uses `Bearer` format
- Falls back to `Token` format for legacy tokens
- Adds device ID and app version headers
- Handles token refresh on 401 errors

## Error Handling

All hooks include:
- Automatic retry (up to 3 attempts)
- No retry on 401 (authentication errors)
- Proper error logging
- Query invalidation on mutations

## Best Practices

1. **HOS Status**: Poll every 30 seconds only when HOS screen is visible
2. **Location Tracking**: Use batch endpoint with location queue service
3. **Heartbeat**: Send every 5 minutes while driver session is active
4. **Notifications**: Register push token once per install, poll as fallback
5. **Offline Support**: Location queue persists offline and flushes when online

## Migration from Old APIs

### HOS APIs

**Old:**
```typescript
import { hosApi } from '@/api/hos'
await hosApi.changeDutyStatus(clockId, request)
```

**New:**
```typescript
import { driverApi } from '@/api/driver'
await driverApi.changeDutyStatus(request)
```

### Location APIs

**Old:**
```typescript
// Direct API call
await apiClient.post('/obd/data/batch', data)
```

**New:**
```typescript
// Use location queue service
import { locationQueueService } from '@/services/location-queue'
await locationQueueService.addLocation(location)
```

## Testing

All endpoints can be tested using the hooks:

```typescript
// Test HOS status
const { data, error } = useHOSCurrentStatus({ enabled: true })

// Test location batch
await locationQueueService.addLocation({
  latitude: 37.7749,
  longitude: -122.4194,
  speed_mph: 55.5,
})
await locationQueueService.flush()
```

## Next Steps

1. Integrate location queue service into OBD data context
2. Add device heartbeat service to app lifecycle
3. Integrate notification registration on app launch
4. Update existing HOS screens to use new hooks
5. Add auto-duty change handling from location batch responses

