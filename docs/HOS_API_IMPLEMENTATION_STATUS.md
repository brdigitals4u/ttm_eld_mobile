# HOS API Implementation Status

## Overview
This document tracks which HOS APIs are being called and where in the mobile app, per the specification.

## ✅ Implemented APIs

### 1. App Launch - Get HOS Clock
**Endpoint:** `GET /api/hos/clocks/`

**Location:**
- `src/screens/DashboardScreen.tsx` (lines 74-82)
- Uses `useHOSClock` hook with `refetchInterval: 60000` (60 seconds)

**Purpose:** Gets full HOS clock data on app startup

**Status:** ✅ IMPLEMENTED

---

### 2. Periodic Sync - Get HOS Clock
**Endpoint:** `GET /api/hos/clocks/`

**Location:**
- `src/screens/DashboardScreen.tsx` (lines 74-82)
- `refetchInterval: 60000` (60 seconds)
- Background refetch disabled

**Purpose:** Syncs time remaining every 60 seconds

**Status:** ✅ IMPLEMENTED

---

### 3. Change Duty Status - Driving
**Endpoint:** `POST /api/hos/clocks/{id}/change_duty_status/`

**Location:**
- `src/app/status.tsx` (lines 258-351)
- Triggered when driver taps "Driving" button

**Payload:**
```json
{
  "duty_status": "driving",
  "location": "string",
  "latitude": number,
  "longitude": number,
  "odometer": number,
  "notes": "string"
}
```

**Status:** ✅ IMPLEMENTED

---

### 4. Change Duty Status - On Duty
**Endpoint:** `POST /api/hos/clocks/{id}/change_duty_status/`

**Location:**
- `src/app/status.tsx` (lines 258-351)
- Triggered when driver taps "On Duty (Not Driving)" button

**Payload:**
```json
{
  "duty_status": "on_duty",
  "location": "string",
  "latitude": number,
  "longitude": number,
  "odometer": number,
  "notes": "string"
}
```

**Status:** ✅ IMPLEMENTED

---

### 5. Change Duty Status - Off Duty
**Endpoint:** `POST /api/hos/clocks/{id}/change_duty_status/`

**Location:**
- `src/app/status.tsx` (lines 354-439)
- Triggered when driver taps "Off Duty" button

**Payload:**
```json
{
  "duty_status": "off_duty",
  "location": "",
  "notes": "string",
  "odometer": number (optional)
}
```

**Status:** ✅ IMPLEMENTED

---

### 6. Change Duty Status - Sleeper Berth
**Endpoint:** `POST /api/hos/clocks/{id}/change_duty_status/`

**Location:**
- `src/app/status.tsx` (lines 258-351)
- Triggered when driver taps "Sleeper Berth" button

**Payload:**
```json
{
  "duty_status": "sleeper_berth",
  "location": "string",
  "latitude": number,
  "longitude": number,
  "odometer": number,
  "notes": "string"
}
```

**Status:** ✅ IMPLEMENTED

---

### 7. Get Daily Logs (Today/Date Specific)
**Endpoint:** `GET /api/hos/daily-logs/?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Location:**
- `src/screens/DashboardScreen.tsx` (lines 92-105) - Today's logs
- `src/screens/LogsScreen.tsx` (lines 73-84) - Date-specific logs

**Purpose:**
- Dashboard: Get today's logs for HOS chart and uncertified count
- Logs Screen: Get logs for selected date

**Status:** ✅ IMPLEMENTED

---

### 8. Certify Daily Log
**Endpoint:** `PATCH /api/hos/daily-logs/{id}/`

**Location:**
- `src/screens/LogsScreen.tsx` (lines 180-205)
- `src/api/hos.ts` (lines 336-341)

**Purpose:** Certify a daily log entry

**Payload:**
```json
{
  "is_certified": true
}
```

**Status:** ✅ IMPLEMENTED (Updated to match spec)

---

### 9. Get Compliance Settings
**Endpoint:** `GET /api/hos/compliance-settings/`

**Location:**
- `src/screens/DashboardScreen.tsx` (lines 84-90)

**Purpose:** Get organization's HOS compliance rules

**Status:** ✅ IMPLEMENTED

---

## API Call Flow Summary

### On App Launch
1. ✅ `GET /api/hos/clocks/` → DashboardScreen (`useHOSClock`)
2. ✅ `GET /api/hos/compliance-settings/` → DashboardScreen (`useComplianceSettings`)
3. ✅ `GET /api/hos/daily-logs/?startDate=today&endDate=today` → DashboardScreen (`useDailyLogs`)

### Every 60 Seconds (Background Sync)
1. ✅ `GET /api/hos/clocks/` → DashboardScreen (automatic refetch)

### Driver Actions
1. ✅ `POST /api/hos/clocks/{id}/change_duty_status/` → StatusScreen (any status button)
2. ✅ `GET /api/hos/daily-logs/?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` → LogsScreen (date change)
3. ✅ `PATCH /api/hos/daily-logs/{id}/` → LogsScreen (certify button)

---

## Implementation Details

### React Query Hooks Used
- `useHOSClock` - Get current HOS clock (with 60s auto-refresh)
- `useComplianceSettings` - Get compliance rules
- `useDailyLogs` - Get daily logs for date range
- `useChangeDutyStatus` - Change driver duty status
- `useCertifyHOSLog` - Certify daily log

### Key Files
- `src/api/hos.ts` - HOS API service and React Query hooks
- `src/api/constants.ts` - API endpoint constants
- `src/screens/DashboardScreen.tsx` - Dashboard with HOS clock sync
- `src/app/status.tsx` - Status change screen
- `src/screens/LogsScreen.tsx` - Daily logs view and certification

### Data Flow
1. **Login** → Gets initial HOS status from login response
2. **Dashboard** → Syncs HOS clock every 60s, displays time remaining
3. **Status Change** → POST to change_duty_status, updates local state
4. **Logs Screen** → Fetches daily logs for selected date, allows certification

---

## Notes

- All APIs use the existing `apiClient` with authentication headers
- Location data priority: ELD GPS → Expo Location → 0,0 fallback
- Odometer data comes from OBD context
- Certification uses daily log ID (not entry ID) per spec
- HOS chart only shows when logs are not all certified
- Compact log view shows: Status, Time, Certified badge (or Edit icon)

