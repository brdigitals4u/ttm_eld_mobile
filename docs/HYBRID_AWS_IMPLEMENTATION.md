# 🚀 BETA-1: Hybrid AWS Implementation

**Implementation:** Dual Sync Architecture  
**Status:** ✅ COMPLETED  
**Date:** October 8, 2025

---

## 📋 Overview

This implements a **HYBRID** approach that combines:
1. ✅ **Existing Auth:** Zustand authStore with custom backend
2. ✅ **Dual Sync:** OBD data syncs to BOTH local API AND AWS Lambda
3. ✅ **Smart Indicator:** ELD indicator shows status of both sync operations

---

## 🏗️ Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     USER LOGIN                                │
│              (Existing Zustand authStore)                     │
│                                                               │
│   LoginScreen → authStore.login() → Custom Backend           │
│                        ↓                                      │
│                  Get Auth Token                               │
│                        ↓                                      │
│              Navigate to /device-scan                         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                  ELD DEVICE CONNECTION                        │
│                                                               │
│   DeviceScanScreen → Scan → Connect → Authenticate           │
│                        ↓                                      │
│              Navigate to /(tabs)/dashboard                    │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│               OBD DATA COLLECTION                             │
│            (ObdDataProvider - Activated)                      │
│                                                               │
│   JMBluetoothService → onObdEldDataReceived Event             │
│            ↓                                                  │
│   handleData() → Parse PIDs → Extract Values                 │
│            ↓                                                  │
│   Create TWO Payloads:                                        │
│   ┌──────────────────┬──────────────────┐                    │
│   │  Local Payload   │   AWS Payload    │                    │
│   │  (ObdDataPayload)│ (AwsObdPayload)  │                    │
│   └──────────────────┴──────────────────┘                    │
│            │                    │                             │
│            ▼                    ▼                             │
│   Local Buffer          AWS Buffer                            │
│   (dataBufferRef)       (awsBufferRef)                        │
└───────────────────────┬────────────┬─────────────────────────┘
                        │            │
                        ▼            ▼
        ┌───────────────────────────────────────┐
        │      DUAL SYNC (Every 60 seconds)     │
        │                                       │
        │  ┌──────────────┬─────────────────┐  │
        │  │  Local API   │   AWS Lambda    │  │
        │  │  Sync        │   Sync          │  │
        │  └──────────────┴─────────────────┘  │
        │         │                  │          │
        │         ▼                  ▼          │
        │  Backend /obd/data/  API Gateway     │
        │  batch endpoint      /data           │
        │         │                  │          │
        │         ▼                  ▼          │
        │  Your Database     DynamoDB Table    │
        │                    (vehicle_data)    │
        └───────────────────────────────────────┘
```

---

## 🎯 Key Features

### **1. Dual Sync System**
- ✅ Syncs to **local backend** (existing implementation)
- ✅ Syncs to **AWS Lambda** (new feature)
- ✅ Independent buffers for each destination
- ✅ Configurable via feature flags

### **2. Smart ELD Indicator**
- 🟢 **Green:** ELD connected, data flowing
- 🔴 **Red:** Disconnected OR AWS sync error
- 🔵 **Sync:** Local OR AWS sync in progress
- 💫 **Animations:** 
  - Dual rings when both syncs active
  - Pulse + rotation during sync
  - Smooth color transitions

### **3. Configurable Sync**
```typescript
// Enable/disable each sync independently
features: {
  enableAwsSync: true,    // Toggle AWS Lambda sync
  enableLocalSync: true,  // Toggle local API sync
  awsSyncInterval: 60000, // AWS sync frequency
  batchSize: 50,          // Max records per AWS request
}
```

---

## 📂 New Files Created

### **1. `/src/config/aws-config.ts`**
```typescript
// AWS API Gateway, Cognito settings, feature flags
export const awsConfig = {
  apiGateway: {
    baseUrl: 'https://oy47qb63f3.execute-api.us-east-1.amazonaws.com',
    endpoints: { saveData: '/data', getData: '/data' },
  },
  cognito: {
    userPoolId: 'us-east-1_JEeMFBWHc',
    clientId: '3r6e3uq1motr9n3u5b4uonm9th',
  },
  features: {
    enableAwsSync: true,
    enableLocalSync: true,
  },
}
```

### **2. `/src/services/AwsApiService.ts`**
```typescript
// AWS Lambda API service with retry logic
class AwsApiService {
  async saveObdData(payload: AwsObdPayload): Promise<AwsApiResponse>
  async saveObdDataBatch(payloads: AwsObdPayload[]): Promise<AwsApiResponse>
  async healthCheck(): Promise<boolean>
}

export const awsApiService = new AwsApiService()
```

**Features:**
- Retry logic (3 attempts with exponential backoff)
- JWT token from authStore
- Timeout handling (30s)
- Batch support (splits large batches)
- Health check endpoint

---

## 🔄 Modified Files

### **1. `/src/contexts/obd-data-context.tsx`**

**Changes:**
- Added AWS buffer alongside local buffer
- Added `awsSyncStatus` and `lastAwsSync` state
- Added second sync interval for AWS
- Dual payload creation (local + AWS format)
- Independent error handling for each sync

**New Context Values:**
```typescript
interface ObdDataContextType {
  obdData: OBDDataItem[]
  lastUpdate: Date | null
  isConnected: boolean
  isSyncing: boolean          // Local API sync
  awsSyncStatus: 'idle' | 'syncing' | 'success' | 'error'  // ✅ NEW
  lastAwsSync: Date | null    // ✅ NEW
}
```

### **2. `/src/components/EldIndicator.tsx`**

**Changes:**
- Reads `awsSyncStatus` from context
- Shows dual rings when both syncs active
- Error state shows if AWS fails
- Animations work for both sync types

**Visual States:**
```
Idle:        ⚫ (green dot)
Local Sync:  💫 (blue, single ring, pulsing)
AWS Sync:    💫 (blue, dual rings, pulsing)
Both Sync:   💫 (blue, dual rings, rotating)
Error:       🔴 (red dot)
```

---

## 💾 Data Payload Formats

### **Local API Payload** (ObdDataPayload)
```typescript
{
  driver_id: "driver_123",
  timestamp: "2025-10-08T17:45:00.000Z",
  vehicle_speed: 65.5,
  engine_speed: 3410,
  coolant_temp: 190,
  fuel_level: 74.8,
  latitude: 37.7749,
  longitude: -122.4194,
  raw_data: { /* full ELD data */ }
}
```

### **AWS Lambda Payload** (AwsObdPayload)
```typescript
{
  vehicleId: "1HGBH41JXMN109186",
  driverId: "driver_123",
  timestamp: 1728409500000,
  dataType: "engine_data",
  
  // GPS
  latitude: 37.7749,
  longitude: -122.4194,
  gpsSpeed: 65.5,
  gpsTime: "2025-10-08T17:45:00",
  gpsRotation: 270,
  
  // Event Info
  eventTime: "2025-10-08T17:45:00",
  eventType: 1,
  eventId: 12345,
  isLiveEvent: 1,
  
  // OBD Values
  engineSpeed: 3410,
  vehicleSpeed: 65.5,
  coolantTemp: 190,
  fuelLevel: 74.8,
  batteryVoltage: 14.4,
  odometer: 125678,
  
  // All processed data
  allData: [
    { id: "pid_F004", name: "Engine Speed", value: "3410", unit: "rpm" },
    { id: "pid_FEF1", name: "Vehicle Speed", value: "65.5", unit: "mph" },
    // ... more PIDs
  ]
}
```

---

## ⚙️ Configuration Options

### **Enable/Disable AWS Sync**

**File:** `/src/config/aws-config.ts`

```typescript
features: {
  enableAwsSync: true,     // ✅ Set to false to disable AWS sync
  enableLocalSync: true,   // ✅ Set to false to disable local sync
}
```

### **Change Sync Interval**

```typescript
features: {
  awsSyncInterval: 60000,  // 60 seconds (change as needed)
}
```

### **Change Batch Size**

```typescript
features: {
  batchSize: 50,  // Max records per AWS request
}
```

---

## 🧪 Testing Guide

### **Test 1: Verify Dual Sync Setup**

```bash
# 1. Login to app
# 2. Connect ELD device
# 3. Watch console logs

Expected logs:
✅ Local API: Setting up 1-minute sync interval
✅ AWS: Setting up 1-minute sync interval
📦 Added to buffers - Local: 1, AWS: 1 items
```

### **Test 2: Verify Local Sync**

```bash
# Wait 60 seconds after data collection starts

Expected logs:
🔄 Local API: Syncing X records...
✅ Local API: Successfully synced X records
```

### **Test 3: Verify AWS Sync**

```bash
# Wait 60 seconds after data collection starts

Expected logs:
🔄 AWS: Syncing X records to Lambda...
✅ AWS: Successfully synced X records

# Check AWS CloudWatch Logs
# Check DynamoDB table "vehicle_data"
```

### **Test 4: ELD Indicator States**

| Scenario | Expected Indicator |
|----------|-------------------|
| Not connected | 🔴 Red dot |
| Connected, idle | 🟢 Green dot |
| Local sync only | 🔵 Blue, single ring, pulsing |
| AWS sync only | 🔵 Blue, dual rings, pulsing |
| Both syncing | 🔵 Blue, dual rings, rotating |
| AWS sync error | 🔴 Red dot |

### **Test 5: Dev Mode Skip**

```bash
# Set NODE_ENV=development
# Login
# See "Skip (Dev Mode)" button on device scan screen
# Click skip
# Should go directly to dashboard
# ELD indicator should be RED (no connection)
```

---

## 🔍 Debug & Monitor

### **Enable AWS Sync Debug**

The system logs everything. Monitor console for:

**Data Reception:**
```
📊 OBD Data Context: Received ELD data
📦 Added to buffers - Local: X, AWS: Y items
```

**Local Sync:**
```
🔄 Local API: Syncing X records...
✅ Local API: Successfully synced X records
```

**AWS Sync:**
```
🔄 AWS: Syncing X records to Lambda...
✅ AWS: Successfully synced X records
```

**Errors:**
```
❌ Local API: Failed to sync data: [error]
❌ AWS: Sync failed: [error]
⚠️  AWS: Buffer overflow, removing oldest records
```

### **Check AWS Status**

```typescript
import { awsApiService } from '@/services/AwsApiService'

// Check if AWS is reachable
const isHealthy = await awsApiService.healthCheck()
console.log('AWS Health:', isHealthy)
```

### **View Context State**

```typescript
import { useObdData } from '@/contexts'

const MyComponent = () => {
  const { 
    isConnected,      // ELD Bluetooth connection
    isSyncing,        // Local API sync status
    awsSyncStatus,    // AWS sync status
    lastAwsSync,      // Last successful AWS sync
    obdData,          // Current OBD data
  } = useObdData()
  
  console.log('AWS Status:', awsSyncStatus)
  console.log('Last AWS Sync:', lastAwsSync)
}
```

---

## 🎛️ Feature Flags

### **Disable AWS Sync (Testing)**

**File:** `/src/config/aws-config.ts`

```typescript
features: {
  enableAwsSync: false,  // ← Disable AWS sync
  enableLocalSync: true, // Keep local sync
}
```

**Result:**
- Local sync continues normally
- AWS sync completely disabled
- No AWS API calls made
- ELD indicator only shows local sync status

### **Disable Local Sync (AWS Only)**

```typescript
features: {
  enableAwsSync: true,   // Keep AWS sync
  enableLocalSync: false, // ← Disable local sync
}
```

**Result:**
- Only AWS sync active
- No calls to `/obd/data/batch`
- ELD indicator shows AWS sync status only

### **Disable Both (Testing Without Network)**

```typescript
features: {
  enableAwsSync: false,
  enableLocalSync: false,
}
```

**Result:**
- No network calls
- Data still collected and displayed
- Buffers still fill up
- ELD indicator shows connection status only

---

## 📊 Performance Metrics

### **Memory Usage**

| Buffer | Max Size | Overflow Handling |
|--------|----------|-------------------|
| Local Buffer | 1000 records | Keep last 500 |
| AWS Buffer | 1000 records | Keep last 500 |
| **Total** | **2000 records** | Auto-cleanup |

### **Network Usage**

| Operation | Frequency | Payload Size (est.) |
|-----------|-----------|---------------------|
| Local Sync | 60s | ~10KB per record |
| AWS Sync | 60s | ~15KB per record |
| **Total** | **Every 60s** | **~25KB per record** |

**Example:**
- 1 record/minute = 1440 records/day
- Local: ~14.4 MB/day
- AWS: ~21.6 MB/day
- **Total: ~36 MB/day**

---

## 🚨 Error Handling

### **Local Sync Fails**

```
Behavior:
- AWS sync continues normally
- Local data kept in buffer for retry
- ELD indicator shows green (AWS working)
- Next local sync attempt in 60s
```

### **AWS Sync Fails**

```
Behavior:
- Local sync continues normally
- AWS data kept in buffer for retry
- ELD indicator shows RED
- Status auto-resets to idle after 3s
- Next AWS sync attempt in 60s
```

### **Both Fail**

```
Behavior:
- Both buffers keep data
- Retries on next interval
- ELD indicator shows RED
- Buffer overflow protection kicks in at 1000 records
```

### **Auth Token Missing**

```
Behavior:
- AWS sync returns error "Not authenticated"
- Local sync may also fail (depends on your backend)
- User needs to re-login
```

---

## 🎨 ELD Indicator Visual Guide

### **Colors**

```typescript
const COLORS = {
  green: '#10B981',    // Connected & working
  red: '#EF4444',      // Disconnected or error
  sync: '#5750F1',     // Syncing (indigo)
}
```

### **States Priority** (Highest to Lowest)

1. 🔴 **Red** - AWS error (overrides everything)
2. 🔴 **Red** - Not connected
3. 🔴 **Red** - No data received
4. 🔵 **Sync** - Local OR AWS syncing
5. 🟢 **Green** - All good

### **Ring Animations**

```
Single Ring:     Local sync only
  💫○

Dual Rings:      AWS sync or both
  💫◎○

Rotating:        Active sync
  ⟳💫◎○
```

---

## 🔐 Security

### **Token Management**

- **Source:** Zustand authStore (existing implementation)
- **Storage:** AsyncStorage (persisted)
- **Usage:** Added to AWS requests as `Authorization: Bearer <token>`
- **Expiration:** Handled by your existing auth system

### **AWS Authentication**

```typescript
// AwsApiService automatically adds token to requests
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,  // ← From authStore
  'X-Api-Version': '1.0',
  'X-Client': 'TTM-Konnect-Mobile',
}
```

**Note:** Uses your existing auth token, NOT AWS Cognito JWT. This is the hybrid approach - your auth system, AWS storage.

---

## 🧩 Integration Points

### **Where ObdDataProvider is Used**

```
App Root (_layout.tsx)
  └── AllContextsProvider
      └── ObdDataProvider ← Wraps entire app
          └── All Screens
```

**Activation:**
```typescript
// Automatically activates when user logs in
useEffect(() => {
  if (!isAuthenticated) {
    return  // Dormant - does nothing
  }
  
  // Active - starts listening and syncing
  setupListeners()
  setupSyncIntervals()
}, [isAuthenticated])
```

### **Where ELD Indicator is Used**

```
Dashboard Screen (top right header)
┌────────────────────────────────────┐
│ TTM Konnect              🟢        │
│                           ↑         │
│                      EldIndicator   │
└────────────────────────────────────┘
```

---

## 📱 User Experience

### **Scenario 1: Normal Operation**

```
1. User logs in → authStore active
2. Scans and connects ELD
3. Goes to dashboard
4. ELD indicator: 🟢 Green (connected)
5. Data collected in background
6. After 60s:
   - ELD indicator: 🔵 Sync (dual rings)
   - Both syncs execute
   - ELD indicator: 🟢 Green (success)
```

### **Scenario 2: AWS Down, Local Working**

```
1-5. Same as above
6. After 60s:
   - Local sync: ✅ Success
   - AWS sync: ❌ Fails (network/auth error)
   - ELD indicator: 🔴 Red (AWS error)
7. After 3s:
   - ELD indicator: 🟢 Green (auto-reset)
8. Next sync (60s later):
   - Retries AWS with buffered data
```

### **Scenario 3: Development Mode**

```
1. User logs in
2. Sees "Skip (Dev Mode)" button
3. Clicks skip
4. Goes to dashboard
5. ELD indicator: 🔴 Red (no ELD connection)
6. Can test UI without hardware
```

---

## 🔧 Troubleshooting

### **AWS Sync Not Working**

**Check 1: Feature Flag**
```typescript
// src/config/aws-config.ts
features: {
  enableAwsSync: true,  // ← Should be true
}
```

**Check 2: Auth Token**
```typescript
import { useAuth } from '@/stores/authStore'
const { token } = useAuth()
console.log('Auth Token:', token ? 'Present' : 'Missing')
```

**Check 3: Console Logs**
```
Expected:
⏰ OBD Data Context: Setting up 1-minute AWS sync interval

Missing? Check:
- User is authenticated
- awsConfig.features.enableAwsSync is true
```

**Check 4: Network**
```typescript
import { awsApiService } from '@/services/AwsApiService'
const healthy = await awsApiService.healthCheck()
// Should return true if AWS is reachable
```

### **ELD Indicator Always Red**

**Possible Causes:**
```
1. awsSyncStatus === 'error'
   → Check AWS logs for sync errors
   
2. !isConnected
   → ELD device not connected
   
3. obdData.length === 0
   → Not receiving data from ELD
```

**Debug:**
```typescript
const { isConnected, awsSyncStatus, obdData } = useObdData()
console.log('Debug:', { isConnected, awsSyncStatus, dataCount: obdData.length })
```

### **Dual Rings Not Showing**

**Cause:** Both syncs might not be active at same time

**Expected Behavior:**
- Rings appear when `isSyncing` OR `awsSyncStatus === 'syncing'`
- Each sync lasts ~1-3 seconds
- May not overlap if syncs finish quickly

---

## 📈 Monitoring

### **Console Log Patterns**

**Every Data Packet:**
```
📦 OBD Data Context: Added to buffers - Local: 5, AWS: 5 items
```

**Every 60 Seconds (Local):**
```
🔄 Local API: Syncing 60 records...
✅ Local API: Successfully synced 60 records
```

**Every 60 Seconds (AWS):**
```
🔄 AWS: Syncing 60 records to Lambda...
✅ AWS: Successfully synced 60 records
```

**On Error:**
```
❌ AWS: Sync failed: Network request failed
⚠️  AWS: Buffer overflow, removing oldest records
```

### **AWS CloudWatch**

1. Go to AWS Console → CloudWatch → Logs
2. Find log group: `/aws/lambda/SaveEldData`
3. Look for recent invocations
4. Verify payload structure matches expected format

### **DynamoDB Verification**

1. Go to AWS Console → DynamoDB → Tables
2. Select table: `vehicle_data`
3. Click "Explore table items"
4. Verify records are being inserted
5. Check timestamp, vehicleId, driverId fields

---

## 🎓 Advanced Usage

### **Custom Sync Logic**

You can modify sync behavior in `obd-data-context.tsx`:

```typescript
// Change sync interval
const SYNC_INTERVAL = 30000 // 30 seconds instead of 60

// Change buffer limits
const MAX_BUFFER_SIZE = 500 // Instead of 1000

// Add conditional sync (e.g., only when WiFi)
if (networkType === 'wifi') {
  syncToAws()
}
```

### **Add More Data to AWS Payload**

```typescript
// In obd-data-context.tsx, add more fields:
displayData.forEach((item) => {
  // Existing extractions...
  
  // Add new ones:
  if (item.name.includes('Turbocharger')) {
    awsPayload.turboRpm = parseFloat(item.value) || 0
  }
  if (item.name.includes('Air Flow')) {
    awsPayload.airFlow = parseFloat(item.value) || 0
  }
})
```

---

## 📝 Summary

### **What Changed**

✅ Added AWS config with API Gateway settings  
✅ Created AwsApiService for Lambda integration  
✅ Updated ObdDataContext for dual sync (local + AWS)  
✅ Enhanced EldIndicator to show both sync states  
✅ All changes backward compatible  
✅ Feature flags for easy enable/disable  
✅ Independent error handling per sync  
✅ Comprehensive logging  

### **What Stayed the Same**

✅ Zustand authStore (no changes)  
✅ Login flow (no changes)  
✅ ELD connection flow (no changes)  
✅ DeviceScanScreen (only added skip button)  
✅ Dashboard layout (only added indicator)  
✅ All existing API calls  

### **Benefits**

1. **Redundancy:** Data backed up to two locations
2. **Flexibility:** Can disable either sync independently
3. **Observability:** Clear indicator shows sync status
4. **Resilience:** One failing doesn't affect the other
5. **Easy Testing:** Dev skip button for UI testing

---

## 🎉 Ready to Deploy

**Status:** ✅ All features implemented  
**Build:** ✅ Compiles successfully  
**Linter:** ✅ No errors  
**APK:** ✅ Ready at `android/app/build/outputs/apk/debug/app-debug.apk`

**Next Steps:**
1. Test on physical device with ELD hardware
2. Verify AWS Lambda receives data
3. Check DynamoDB for stored records
4. Monitor indicator behavior during sync
5. Test dev mode skip button

---

**Memory Token:** BETA-1  
**Implementation:** Hybrid AWS + Local Sync  
**Version:** 1.0


