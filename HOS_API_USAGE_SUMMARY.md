# HOS API Usage Summary

## ✅ APIs Currently Being Called

### 1. **GET /api/hos/clocks/** - Get Current HOS Clock
- **Hook**: `useHOSClock`
- **Location**: 
  - `DashboardScreen.tsx` (lines 74-82)
  - `StatusScreen.tsx` (status.tsx, lines 119-123)
- **Usage**:
  - Dashboard: Syncs every 60 seconds to get latest HOS clock data
  - Status Screen: Fetches clock data for status changes
- **Status**: ✅ ACTIVE

### 2. **POST /api/hos/clocks/{clock_id}/change_duty_status/** - Change Duty Status
- **Hook**: `useChangeDutyStatus`
- **Location**: `StatusScreen.tsx` (status.tsx, lines 161-430)
- **Usage**: Called when driver changes HOS status (driving, on duty, off duty, etc.)
- **Payload**: `{ duty_status, location, latitude, longitude, odometer, notes }`
- **Status**: ✅ ACTIVE

### 3. **GET /api/hos/compliance-settings/** - Get Compliance Settings
- **Hook**: `useComplianceSettings`
- **Location**: `DashboardScreen.tsx` (lines 84-90)
- **Usage**: Fetches HOS compliance rules (cycle type, restart hours, etc.)
- **Status**: ✅ ACTIVE

### 4. **GET /api/hos/daily-logs/** - Get Daily Logs
- **Hook**: `useDailyLogs`
- **Location**: 
  - `DashboardScreen.tsx` (lines 92-105) - For today's date
  - `LogsScreen.tsx` (lines 42-54) - For selected date
- **Usage**: 
  - Dashboard: Fetches today's logs for chart display and uncertified count
  - LogsScreen: Fetches logs for selected date when date changes
- **Query Params**: `startDate`, `endDate`, `driver`
- **Status**: ✅ ACTIVE

### 5. **PATCH /api/hos/logs/{id}/certify/** - Certify HOS Log
- **Hook**: `useCertifyHOSLog`
- **Location**: `LogsScreen.tsx` (lines 56, 181-195)
- **Usage**: Called when driver certifies individual log entries
- **Status**: ✅ ACTIVE

---

## ❌ APIs NOT Currently Being Called

### 1. **GET /api/hos/clocks/{clock_id}/** - Get Specific Clock by ID
- **Hook**: `useHOSClockById` (defined but not used)
- **Location**: `src/api/hos.ts` (lines 443-461)
- **Status**: ❌ NOT CALLED

### 2. **POST /api/hos/clocks/** - Create HOS Clock
- **Hook**: `useCreateHOSClock` (defined but not used)
- **Location**: `src/api/hos.ts` (lines 500-519)
- **Status**: ❌ NOT CALLED

### 3. **PATCH /api/hos/clocks/{clock_id}/** - Update HOS Clock
- **Hook**: `useUpdateHOSClock` (defined but not used)
- **Location**: `src/api/hos.ts` (lines 524-544)
- **Status**: ❌ NOT CALLED

### 4. **POST /api/hos/logs/** - Create HOS Log Entry
- **Hook**: None (legacy API function exists)
- **Location**: `src/api/hos.ts` (lines 310-313)
- **Status**: ❌ NOT CALLED (Legacy)

### 5. **POST /api/hos/daily-logs/** - Create Daily HOS Log
- **Hook**: None (legacy API function exists)
- **Location**: `src/api/hos.ts` (lines 318-321)
- **Status**: ❌ NOT CALLED (Legacy)

### 6. **POST /api/hos/eld-events/** - Create HOS ELD Event
- **Hook**: None (legacy API function exists)
- **Location**: `src/api/hos.ts` (lines 326-329)
- **Status**: ❌ NOT CALLED (Legacy)

---

## 📊 Summary by Screen

### Dashboard Screen
✅ **APIs Called:**
1. GET /api/hos/clocks/ - Every 60 seconds
2. GET /api/hos/compliance-settings/ - On mount
3. GET /api/hos/daily-logs/ - For today's date (for chart and uncertified count)

### Status Screen
✅ **APIs Called:**
1. GET /api/hos/clocks/ - On mount and refetch
2. POST /api/hos/clocks/{clock_id}/change_duty_status/ - When status changes

### Logs Screen
✅ **APIs Called:**
1. GET /api/hos/daily-logs/ - On mount and when date changes
2. PATCH /api/hos/logs/{id}/certify/ - When certifying individual logs

---

## 📝 Implementation Notes

1. **Daily Logs API Response Format**: 
   - The implementation expects the API to return log entries with `start_time`, `end_time`, and `duty_status`
   - If API returns a different format, the conversion logic in `DashboardScreen.tsx` (lines 310-351) and `LogsScreen.tsx` (lines 198-260) may need adjustment

2. **Chart Data Conversion**:
   - Dashboard converts daily logs to format: `{ start: string, end: string, status: string, note?: string }`
   - This format is used by `VictoryHOS` chart component

3. **Uncertified Count**:
   - Dashboard calculates uncertified logs from daily logs API response
   - Falls back to local `logEntries` if API data unavailable

4. **Compact UI Mode**:
   - LogsScreen hides HOS chart when all logs for the date are certified
   - LogEntry component shows certified badge + edit icon when certified
   - HOS chart is removed for better UX when logs are finalized

