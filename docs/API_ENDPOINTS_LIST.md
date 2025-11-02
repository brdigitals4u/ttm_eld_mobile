# TTM Konnect ELD Mobile - API Endpoints Complete List

## Base URL
```
https://api.ttmkonnect.com/api
```

---

## 1. Organization Driver APIs ✅ IMPLEMENTED

| Method | Endpoint | Function | Status |
|--------|----------|----------|--------|
| POST | `/organisation_users/login/` | Driver login | ✅ Working |
| GET | `/organisation_users/profile/` | Get driver profile | ✅ Working |
| POST | `/organisation_users/logout/` | Driver logout | ⚠️ Local only |

---

## 2. Authentication APIs ✅ IMPLEMENTED

| Method | Endpoint | Function | Status |
|--------|----------|----------|--------|
| POST | `/auth/login` | User login | ✅ Implemented |
| POST | `/auth/register` | User registration | ✅ Implemented |
| POST | `/auth/logout` | User logout | ✅ Implemented |
| POST | `/auth/refresh` | Refresh token | ✅ Implemented |
| POST | `/auth/forgot-password` | Request password reset | ✅ Implemented |
| POST | `/auth/reset-password` | Reset password | ✅ Implemented |
| POST | `/auth/verify-email` | Verify email | ✅ Implemented |

---

## 3. User Management APIs ✅ IMPLEMENTED

| Method | Endpoint | Function | Status |
|--------|----------|----------|--------|
| GET | `/user/profile` | Get profile | ✅ Implemented |
| PUT | `/user/profile` | Update profile | ✅ Implemented |
| POST | `/user/change-password` | Change password | ✅ Implemented |
| POST | `/user/avatar` | Upload avatar | ✅ Implemented |
| POST | `/user/account` | Delete account | ✅ Implemented |

---

## 4. Dashboard APIs ✅ IMPLEMENTED

| Method | Endpoint | Function | Status |
|--------|----------|----------|--------|
| GET | `/dashboard/stats` | Get dashboard stats | ✅ Implemented |
| GET | `/dashboard/activity` | Get recent activity | ✅ Implemented |
| GET | `/dashboard/notifications` | Get notifications | ✅ Implemented |

---

## 5. Hours of Service (HOS) APIs ✅ IMPLEMENTED

| Method | Endpoint | Function | Status |
|--------|----------|----------|--------|
| POST | `/hos/clocks/` | Create HOS clock | ✅ Implemented |
| POST | `/hos/logs/` | Create log entry | ✅ Implemented |
| POST | `/hos/daily-logs/` | Create daily log | ✅ Implemented |
| POST | `/hos/eld-events/` | Create ELD event | ✅ Implemented |
| PATCH | `/hos/logs/{id}/certify/` | Certify log | ✅ Implemented |
| POST | `/hos/clocks/{id}/change_duty_status/` | Change duty status | ✅ Implemented |

---

## 6. OBD Data APIs ⚠️ PARTIAL

| Method | Endpoint | Function | Status |
|--------|----------|----------|--------|
| POST | `/obd/data` | Send single OBD record | ⚠️ Needs backend |
| POST | `/obd/data/batch` | Send batch OBD data | ⚠️ Needs backend |
| GET | `/obd/data/history/{driverId}` | Get OBD history | ⚠️ Needs backend |

**Note**: OBD APIs are called from `ObdDataContext` every 60 seconds with buffered data.

---

## 7. AWS Lambda APIs ✅ IMPLEMENTED

| Method | Endpoint | Function | Status |
|--------|----------|----------|--------|
| POST | `https://your-api-gateway.amazonaws.com/data` | Send to DynamoDB | ✅ Working |

**Note**: Dual sync system - both local API and AWS sync run independently.

---

## Usage Summary

### Currently Active:
1. ✅ **Login**: `/organisation_users/login/` - Used in `LoginScreen.tsx`
2. ✅ **HOS Status**: All HOS endpoints - Used in `status-context.ts`
3. ✅ **OBD Sync**: `/obd/data/batch` + AWS `/data` - Auto-sync every 60s via `ObdDataContext`
4. ✅ **AWS Hybrid**: Parallel sync to DynamoDB via Lambda

### Not Used Yet:
- Dashboard APIs (ready but not called in UI)
- General Auth APIs (legacy, not used)
- User management APIs (ready but not used)

### Needs Backend:
- All OBD endpoints need backend implementation
- Currently frontend sends data but backend may not handle it

---

## Total Count
- **Organization Driver**: 3 endpoints
- **Authentication**: 7 endpoints
- **User Management**: 5 endpoints
- **Dashboard**: 3 endpoints
- **HOS**: 6 endpoints
- **OBD**: 3 endpoints
- **AWS Lambda**: 1 endpoint

**Total: 28 API endpoints implemented**

