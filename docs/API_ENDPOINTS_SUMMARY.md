# TTM Konnect ELD Mobile - Complete API Endpoints Summary

## API Base Configuration
- **Base URL**: `https://api.ttmkonnect.com/api`
- **Timeout**: 30 seconds
- **Retry Attempts**: 3

---

## 1. Organization Driver Authentication APIs
**File**: `src/api/organization.ts`

### Endpoints:
1. **POST** `/organisation_users/login/`
   - **Function**: `organizationApi.loginDriver()`
   - **Hook**: `useDriverLogin()`
   - **Purpose**: Driver login with email/password
   - **Returns**: Token, user profile, HOS status, vehicle assignment, organization settings
   - **Storage**: Saves token, driver data to Realm

2. **GET** `/organisation_users/profile/`
   - **Function**: `organizationApi.getDriverProfile()`
   - **Hook**: `useDriverProfile()`
   - **Purpose**: Get current driver profile
   - **Returns**: Complete driver profile data
   - **Storage**: Updates Realm data

3. **POST** `/organisation_users/logout/`
   - **Function**: `organizationApi.logoutDriver()`
   - **Hook**: `useDriverLogout()`
   - **Purpose**: Logout driver (clears local data only)
   - **Storage**: Removes all tokens and Realm data

---

## 2. Authentication APIs (Legacy/General)
**File**: `src/api/auth.ts`

### Endpoints:
1. **POST** `/auth/login`
   - **Function**: `authApi.login()`
   - **Purpose**: General user login
   - **Returns**: Tokens and user data

2. **POST** `/auth/register`
   - **Function**: `authApi.register()`
   - **Hook**: `useRegister()`
   - **Purpose**: User registration
   - **Returns**: Tokens and user data

3. **POST** `/auth/logout`
   - **Function**: `authApi.logout()`
   - **Hook**: `useLogout()`
   - **Purpose**: User logout

4. **POST** `/auth/refresh`
   - **Function**: `authApi.refreshToken()`
   - **Purpose**: Refresh access token
   - **Returns**: New access token and expiry

5. **POST** `/auth/forgot-password`
   - **Function**: `authApi.forgotPassword()`
   - **Hook**: `useForgotPassword()`
   - **Purpose**: Request password reset

6. **POST** `/auth/reset-password`
   - **Function**: `authApi.resetPassword()`
   - **Hook**: `useResetPassword()`
   - **Purpose**: Reset password with token

7. **POST** `/auth/verify-email`
   - **Function**: `authApi.verifyEmail()`
   - **Hook**: `useVerifyEmail()`
   - **Purpose**: Verify email address

---

## 3. User Management APIs
**File**: `src/api/user.ts`

### Endpoints:
1. **GET** `/user/profile`
   - **Function**: `userApi.getProfile()`
   - **Hook**: `useUserProfile()`
   - **Purpose**: Get user profile

2. **PUT** `/user/profile`
   - **Function**: `userApi.updateProfile()`
   - **Hook**: `useUpdateProfile()`
   - **Purpose**: Update user profile
   - **Body**: firstName, lastName, phoneNumber, dateOfBirth

3. **POST** `/user/change-password`
   - **Function**: `userApi.changePassword()`
   - **Hook**: `useChangePassword()`
   - **Purpose**: Change user password
   - **Body**: currentPassword, newPassword

4. **POST** `/user/avatar`
   - **Function**: `userApi.uploadAvatar()`
   - **Hook**: `useUploadAvatar()`
   - **Purpose**: Upload user avatar (FormData)

5. **POST** `/user/account`
   - **Function**: `userApi.deleteAccount()`
   - **Hook**: `useDeleteAccount()`
   - **Purpose**: Delete user account
   - **Body**: password

---

## 4. Dashboard APIs
**File**: `src/api/dashboard.ts`

### Endpoints:
1. **GET** `/dashboard/stats`
   - **Function**: `dashboardApi.getStats()`
   - **Hook**: `useDashboardStats()`
   - **Returns**: Total users, active users, revenue, growth rate
   - **Cache**: 2 minutes, refetch every 5 minutes

2. **GET** `/dashboard/activity`
   - **Function**: `dashboardApi.getRecentActivity()`
   - **Hook**: `useRecentActivity()`
   - **Returns**: Recent activity logs
   - **Cache**: 1 minute, refetch every 2 minutes

3. **GET** `/dashboard/notifications`
   - **Function**: `dashboardApi.getNotifications()`
   - **Hook**: `useNotifications()`
   - **Returns**: Notification items
   - **Cache**: 30 seconds, refetch every 1 minute

---

## 5. Hours of Service (HOS) APIs
**File**: `src/api/hos.ts`

### Endpoints:
1. **POST** `/hos/clocks/`
   - **Function**: `hosApi.createHOSClock()`
   - **Purpose**: Create or update HOS clock
   - **Body**: driver, clock_type, start_time, time_remaining, cycle_start, etc.

2. **POST** `/hos/logs/`
   - **Function**: `hosApi.createHOSLogEntry()`
   - **Purpose**: Create HOS log entry
   - **Body**: driver, duty_status, start_time, end_time, duration_minutes, location, etc.

3. **POST** `/hos/daily-logs/`
   - **Function**: `hosApi.createDailyHOSLog()`
   - **Purpose**: Create daily HOS log
   - **Body**: driver, log_date, total_driving_time, total_on_duty_time, etc.

4. **POST** `/hos/eld-events/`
   - **Function**: `hosApi.createHOSELDEvent()`
   - **Purpose**: Create ELD event
   - **Body**: driver, event_type, event_code, event_data, event_time, location

5. **PATCH** `/hos/logs/{id}/certify/`
   - **Function**: `hosApi.certifyHOSLog()`
   - **Purpose**: Certify HOS log
   - **Params**: logId

6. **POST** `/hos/clocks/{id}/change_duty_status/`
   - **Function**: `hosApi.changeDutyStatus()`
   - **Purpose**: Change duty status
   - **Params**: clockId
   - **Body**: duty_status

### Helper Functions:
- `formatLocationForAPI()`: Format location data for API
- `getStatusRemark()`: Get status description
- `formatTimestamp()`: Convert timestamp to ISO string
- `getAPIDutyStatus()`: Convert app status to API format

---

## 6. OBD Data APIs
**File**: `src/api/obd.ts`

### Endpoints:
1. **POST** `/obd/data`
   - **Function**: `sendObdData()`
   - **Purpose**: Send single OBD data record
   - **Body**: driver_id, timestamp, vehicle_speed, engine_speed, coolant_temp, fuel_level, odometer, latitude, longitude, raw_data

2. **POST** `/obd/data/batch`
   - **Function**: `sendObdDataBatch()`
   - **Purpose**: Send batch OBD data (used in `obd-data-context.tsx`)
   - **Body**: { data: ObdDataPayload[] }
   - **Context**: Auto-syncs every 60 seconds via `ObdDataProvider`

3. **GET** `/obd/data/history/{driverId}`
   - **Function**: `getObdDataHistory()`
   - **Purpose**: Get OBD data history
   - **Params**: driverId
   - **Query**: startDate, endDate

---

## 7. AWS Lambda APIs (Hybrid Implementation)
**File**: `src/services/AwsApiService.ts`

### Configuration:
- **Feature Flag**: `awsConfig.features.enableAwsSync` (on/off)
- **Interval**: `awsConfig.features.awsSyncInterval` (default: 60000ms)
- **Batch Size**: `awsConfig.features.batchSize` (default: 50)

### Endpoints:
1. **POST** `https://your-api-gateway.amazonaws.com/data`
   - **Function**: `awsApiService.saveObdDataBatch()`
   - **Purpose**: Send OBD data to DynamoDB via Lambda
   - **Auth**: Bearer token (uses authStore token)
   - **Headers**: X-Api-Version, X-Client
   - **Retry**: Configurable retry attempts
   - **Context**: Auto-syncs every 60 seconds via `ObdDataProvider`

### Data Flow:
```
ELD Device → OBD Data Context → Dual Sync:
  1. Local API: /obd/data/batch → TTM Backend
  2. AWS Lambda: /data → API Gateway → Lambda → DynamoDB
```

---

## API Usage by Context

### 1. ObdDataContext (`src/contexts/obd-data-context.tsx`)
- **Dual Sync System**:
  - Local API: `sendObdDataBatch()` every 60s
  - AWS Lambda: `awsApiService.saveObdDataBatch()` every 60s
- **Buffers**: 
  - `dataBufferRef` for local API
  - `awsBufferRef` for AWS Lambda
- **Status Tracking**: `isSyncing`, `awsSyncStatus`

### 2. StatusContext (`src/contexts/status-context.ts`)
- **HOS APIs**: Calls multiple HOS endpoints on status change:
  - `hosApi.createHOSClock()`
  - `hosApi.createHOSLogEntry()`
  - `hosApi.createHOSELDEvent()`
  - `hosApi.certifyHOSLog()`
  - `hosApi.changeDutyStatus()`

### 3. AuthContext (`src/contexts/AuthContext.tsx`)
- **Local Only**: Uses Realm and token storage, no API calls

### 4. Login Screen (`src/screens/LoginScreen.tsx`)
- **Primary**: `useDriverLogin()` → `POST /organisation_users/login/`

---

## React Query Hooks Summary

### Organization Driver:
- `useDriverLogin()`: Login mutation
- `useDriverProfile()`: Get driver profile query
- `useDriverLogout()`: Logout mutation

### General Auth:
- `useRegister()`: Registration mutation
- `useLogout()`: Logout mutation
- `useCurrentUser()`: Current user query
- `useForgotPassword()`: Forgot password mutation
- `useResetPassword()`: Reset password mutation
- `useVerifyEmail()`: Email verification mutation

### User Management:
- `useUserProfile()`: Profile query
- `useUpdateProfile()`: Profile update mutation
- `useChangePassword()`: Password change mutation
- `useUploadAvatar()`: Avatar upload mutation
- `useDeleteAccount()`: Account deletion mutation

### Dashboard:
- `useDashboardStats()`: Stats query (2min cache, 5min refetch)
- `useRecentActivity()`: Activity query (1min cache, 2min refetch)
- `useNotifications()`: Notifications query (30s cache, 1min refetch)

---

## Authentication

### Header Format:
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Token <access_token>' // For TTM API
}
```

### AWS Lambda Header Format:
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <token>',
  'X-Api-Version': '1.0',
  'X-Client': 'TTM-Konnect-Mobile'
}
```

### Token Storage:
- **TTM API**: `Token <token>` format stored via `tokenStorage.setAccessToken()`
- **AWS Lambda**: `Bearer <token>` format (uses same authStore token)
- **Storage**: Expo SecureStore
- **Realm**: Auth session stored in Realm database

---

## Error Handling

### API Errors:
- **401 Unauthorized**: Auto-removes tokens
- **408 Timeout**: Returns timeout error
- **Network Errors**: Returns network error
- **Retry Logic**: 3 attempts with exponential backoff

### AWS Sync Errors:
- **Retry Logic**: Configurable via `awsConfig.retry`
- **Buffer Management**: Max 1000 records, removes oldest on overflow
- **Status Tracking**: 'idle', 'syncing', 'success', 'error'

---

## Not Implemented Yet (Backend)

1. **POST** `/obd/data/batch` - Currently mocked, needs backend implementation
2. **GET** `/obd/data/history/{driverId}` - Needs backend implementation
3. **POST** `/organisation_users/logout/` - Currently local-only cleanup

---

## API Client Configuration

### File: `src/api/client.ts`
- Base URL from `API_CONFIG.BASE_URL`
- Timeout: 30 seconds
- Automatic retry logic
- AbortController for timeout
- Token injection via `getStoredToken()`
- Comprehensive error logging

### File: `src/api/constants.ts`
- All endpoint definitions
- HTTP status codes
- Error messages
- Success messages
- Query keys
- Storage keys

---

## Future Additions
- Assignments APIs
- DVIR APIs
- Inspection APIs
- Fuel APIs
- Documents APIs
- Reports APIs

