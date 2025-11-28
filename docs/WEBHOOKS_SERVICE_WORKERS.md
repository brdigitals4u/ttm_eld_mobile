# Webhooks & Service Workers Documentation

## Overview

This document identifies all webhook triggers and service worker calls in the mobile app. Backend team should use this to configure webhook endpoints and ensure service workers are properly set up.

## Webhook Triggers

The following API endpoints should trigger webhooks when called from the mobile app:

### 1. Push Notifications

**File**: `src/services/NotificationService.ts`

**Endpoint**: `POST /api/driver/notifications/register/`

**When Called**:
- On app startup (if authenticated)
- When push token changes
- After user login

**Payload**:
```json
{
  "device_token": "fcm_token_here",
  "device_type": "android" | "ios",
  "app_version": "1.0.0"
}
```

**Backend Webhook Trigger**:
- Should trigger webhook when notification is sent to device
- Webhook should include notification payload and delivery status

---

### 2. HOS Status Changes

**File**: `src/app/status.tsx`, `src/api/driver-hooks.ts`

**Endpoint**: `POST /api/driver/hos/change-status/`

**When Called**:
- User changes duty status (driving, on_duty, off_duty, sleeper_berth)
- Auto-switch to non-driving (fuel screen)

**Payload**:
```json
{
  "duty_status": "driving" | "on_duty" | "off_duty" | "sleeper_berth",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York, NY"
  },
  "odometer": 12345,
  "remark": "Status change reason"
}
```

**Backend Webhook Trigger**:
- Should trigger webhook on every status change
- Include previous status, new status, timestamp, location
- Webhook events: `hos.status_change`

---

### 3. ELD Events

**File**: `src/api/hos.ts`, `src/app/status.tsx`, `src/app/codriver.tsx`

**Endpoint**: `POST /api/hos/eld-events/`

**When Called**:
- Co-driver login/logout (`co_driver_login`, `co_driver_logout`)
- UDT events (`udt` - when driving without pre-trip inspection)
- Malfunction events (from ELD device)
- GPS loss events (from OBD data context)

**Payload Examples**:

**Co-Driver Login**:
```json
{
  "driver": "driver_uuid",
  "event_type": "co_driver_login",
  "event_code": "CO_DRIVER_LOGIN",
  "event_time": "2025-01-15T10:30:00Z",
  "location": "New York, NY",
  "event_data": {
    "new_duty_status": "driving",
    "co_driver_id": "co_driver_uuid",
    "co_driver_name": "John Doe"
  }
}
```

**UDT Event**:
```json
{
  "driver": "driver_uuid",
  "event_type": "udt",
  "event_code": "UDT",
  "event_time": "2025-01-15T10:30:00Z",
  "location": "New York, NY",
  "event_data": {
    "new_duty_status": "driving",
    "missing_inspection": "pre-trip",
    "driver_id": "driver_uuid"
  }
}
```

**Backend Webhook Trigger**:
- Should trigger webhook for each ELD event type
- Webhook events: `eld.co_driver_login`, `eld.co_driver_logout`, `eld.udt`, `eld.malfunction`, `eld.gps_loss`

---

### 4. OBD Data Sync

**File**: `src/contexts/obd-data-context.tsx`

**Endpoint**: `POST /api/obd/data/batch`

**When Called**:
- Every 60 seconds (automatic background sync)
- When buffer reaches batch size (50 records)

**Payload**:
```json
{
  "data": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "speed_mph": 65,
      "rpm": 2000,
      "odometer": 12345,
      "latitude": 40.7128,
      "longitude": -74.0060,
      "engine_fault_codes": ["P0301"],
      "can_error_codes": ["C01FF"]
    }
  ]
}
```

**Backend Webhook Trigger**:
- Should trigger webhooks on:
  - Speed violations (exceeds limit)
  - Engine fault codes detected
  - GPS anomalies (sudden location changes)
  - CAN bus errors
- Webhook events: `obd.speed_violation`, `obd.fault_code`, `obd.gps_anomaly`, `obd.can_error`

---

### 5. Fuel Purchase

**File**: `src/app/fuel.tsx`

**Endpoint**: `POST /api/fuel-purchase/fuel-purchases/`

**When Called**:
- User submits fuel purchase form
- After receipt image upload (if provided)

**Payload**:
```json
{
  "vehicleId": "vehicle_uuid",
  "fuel_quantity_liters": 75.7,
  "transaction_reference": "RCT-1234567890",
  "transaction_time": "2025-01-15T10:30:00Z",
  "transaction_location": "Gas Station, New York, NY",
  "transaction_price": {
    "amount": "250.00",
    "currency": "usd"
  },
  "latitude": 40.7128,
  "longitude": -74.0060,
  "state": "NY",
  "ifta_fuel_type": "Diesel",
  "fuel_grade": "Regular"
}
```

**Backend Webhook Trigger**:
- Should trigger webhook on fuel purchase creation
- Include purchase details, location, amount
- Webhook event: `fuel.purchase_created`

---

### 6. DVIR/Inspection

**File**: `src/app/dvir.tsx`

**Endpoint**: `POST /api/driver/dvir/` (verify endpoint exists)

**When Called**:
- User completes and submits DVIR inspection
- Pre-trip or post-trip inspection completion

**Payload**:
```json
{
  "driver": "driver_uuid",
  "vehicle": 123,
  "inspection_date": "2025-01-15T10:30:00Z",
  "inspection_type": "pre_trip" | "post_trip",
  "status": "pass" | "fail" | "pass_with_defects",
  "odometer_reading": 12345,
  "defects_found": true,
  "notes": "Inspection notes",
  "location": "New York, NY",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Backend Webhook Trigger**:
- Should trigger webhook on inspection completion
- Include inspection type, status, defects
- Webhook event: `dvir.inspection_completed`

---

## Service Workers

### Background Services

**File**: `src/components/BackgroundServices.tsx`

**Services Running**:
1. **OBD Data Sync** - Every 60 seconds
2. **Location Tracking** - Continuous (when app is active)
3. **HOS Status Polling** - Every 30 seconds (when status screen visible)
4. **Push Notification Registration** - On app startup

### Expo Background Tasks

**File**: `src/contexts/obd-data-context.tsx`

**Background Sync**:
- OBD data is buffered and synced every 60 seconds
- Uses React Native background tasks (via Expo)
- Continues even when app is in background

### Scheduled Tasks

Currently, no scheduled tasks are configured. All background work is event-driven or polling-based.

---

## Webhook Configuration

### Recommended Webhook Events

1. **hos.status_change** - HOS duty status changes
2. **eld.co_driver_login** - Co-driver activated
3. **eld.co_driver_logout** - Co-driver deactivated
4. **eld.udt** - UDT event (driving without pre-trip)
5. **eld.malfunction** - ELD malfunction detected
6. **eld.gps_loss** - GPS signal lost
7. **obd.speed_violation** - Speed limit exceeded
8. **obd.fault_code** - Engine fault code detected
9. **obd.gps_anomaly** - GPS location anomaly
10. **obd.can_error** - CAN bus error
11. **fuel.purchase_created** - Fuel purchase recorded
12. **dvir.inspection_completed** - DVIR inspection completed
13. **notification.sent** - Push notification sent (optional)

### Webhook Payload Structure

All webhooks should include:
```json
{
  "event": "event_name",
  "timestamp": "2025-01-15T10:30:00Z",
  "driver_id": "driver_uuid",
  "vehicle_id": 123,
  "data": {
    // Event-specific data
  }
}
```

---

## API Endpoints Summary

| Endpoint | Method | Webhook Event | Frequency |
|----------|--------|---------------|-----------|
| `/api/driver/notifications/register/` | POST | `notification.registered` | On startup/login |
| `/api/driver/hos/change-status/` | POST | `hos.status_change` | On status change |
| `/api/hos/eld-events/` | POST | `eld.*` | On ELD events |
| `/api/obd/data/batch` | POST | `obd.*` | Every 60s |
| `/api/fuel-purchase/fuel-purchases/` | POST | `fuel.purchase_created` | On purchase |
| `/api/driver/dvir/` | POST | `dvir.inspection_completed` | On inspection |

---

## Implementation Notes

1. **Webhooks are optional** - App will function without them
2. **Webhooks should be idempotent** - Handle duplicate events gracefully
3. **Webhooks should retry** - Implement retry logic for failed webhook calls
4. **Webhooks should be secure** - Use authentication tokens or signatures
5. **Service workers run in background** - Ensure they don't drain battery

---

## Testing

To test webhooks:
1. Monitor backend logs for webhook calls
2. Use webhook testing tools (e.g., webhook.site)
3. Verify webhook payloads match expected format
4. Test webhook retry logic on failures

---

## Backend Team Action Items

1. ✅ Configure webhook endpoints for each event type
2. ✅ Set up webhook authentication/security
3. ✅ Implement webhook retry logic
4. ✅ Monitor webhook delivery success/failure
5. ✅ Document webhook payload formats
6. ✅ Set up webhook testing environment



