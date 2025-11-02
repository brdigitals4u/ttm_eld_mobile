# HOS API Usage Analysis

## Problem
Daily logs (`/api/hos/daily-logs/`) are **aggregated summaries** that only exist:
- At the end of the day
- After certification
- When the backend creates them

This means queries return empty `[]` for today's logs, making the HOS chart empty.

## Solution
Use **individual HOS logs** (`/api/hos/logs/`) instead, which are:
- Created **immediately** after each status change
- Available in **real-time**
- Perfect for displaying today's activity

---

## API Usage by Screen

### 1. DashboardScreen ✅
**Purpose:** Show today's HOS activity chart and uncertified count

**Current (WRONG):**
- ❌ `useDailyLogs` - Empty because summaries don't exist yet

**Should Use:**
- ✅ `useHOSLogs` - Individual entries (available immediately)
- ✅ `useHOSClock` - Current status (already correct)
- ✅ `useComplianceSettings` - Settings (already correct)

**Data Flow:**
```
useHOSLogs (today) → Convert to chart format → HOSChart component
```

---

### 2. LogsScreen ✅
**Purpose:** View and certify historical logs

**Current (WRONG):**
- ❌ `useDailyLogs` - Empty for today, may work for past dates

**Should Use:**
- ✅ `useHOSLogs` - Individual entries (primary source for today and recent dates)
- ⚠️ `useDailyLogs` - Keep as fallback for certified summaries (past dates)

**Data Flow:**
```
useHOSLogs (selected date) → Convert to LogEntry format → Display + Chart
```

---

### 3. StatusScreen ✅
**Purpose:** Change duty status

**Current (CORRECT):**
- ✅ `useHOSClock` - Current status (correct)
- ✅ `useChangeDutyStatus` - Mutation hook (correct)

**No Changes Needed**

---

## Implementation Plan

1. **DashboardScreen:**
   - Replace `useDailyLogs` with `useHOSLogs` for today's logs
   - Create helper: `hosLogsToChartFormat()` to convert HOS log entries to chart data
   - Keep `useDailyLogs` only for uncertified count (if needed)

2. **LogsScreen:**
   - Replace `useDailyLogs` with `useHOSLogs` for primary data source
   - Create helper: `hosLogsToLogEntries()` to convert HOS log entries to LogEntry format
   - Keep `useDailyLogs` as fallback for certified summaries

3. **Helper Functions:**
   - `convertHOSLogsToChartData(logs: HOSLogEntry[]): ChartData[]`
   - `convertHOSLogsToLogEntries(logs: HOSLogEntry[]): LogEntry[]`

---

## API Endpoint Comparison

| Endpoint | Purpose | When Available | Best For |
|----------|---------|----------------|----------|
| `/api/hos/clocks/` | Current status | Real-time | Status display, sync |
| `/api/hos/logs/` | Individual entries | Immediately after change | **Today's activity, charts** |
| `/api/hos/daily-logs/` | Daily summaries | End of day / after certification | Historical certified logs |

