# API Constants Documentation

**File:** `src/api/constants.ts`

## Overview

Centralized configuration and constants for API communication, including endpoints, status codes, error messages, and app configuration.

## Configuration Objects

### API_CONFIG

Core API configuration settings.

```typescript
{
  BASE_URL: 'https://api.ttmkonnect.com/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3
}
```

### API_ENDPOINTS

All API endpoint paths organized by feature.

#### Authentication Endpoints
- `AUTH.LOGIN`: `/auth/login`
- `AUTH.REGISTER`: `/auth/register`
- `AUTH.LOGOUT`: `/auth/logout`
- `AUTH.REFRESH_TOKEN`: `/auth/refresh`
- `AUTH.FORGOT_PASSWORD`: `/auth/forgot-password`
- `AUTH.RESET_PASSWORD`: `/auth/reset-password`
- `AUTH.VERIFY_EMAIL`: `/auth/verify-email`

#### Organization Driver Endpoints
- `ORGANIZATION.DRIVER_LOGIN`: `/organisation_users/login/`
- `ORGANIZATION.DRIVER_PROFILE`: `/organisation_users/profile/`
- `ORGANIZATION.DRIVER_LOGOUT`: `/organisation_users/logout/`

#### User Management Endpoints
- `USER.PROFILE`: `/user/profile`
- `USER.UPDATE_PROFILE`: `/user/profile`
- `USER.CHANGE_PASSWORD`: `/user/change-password`
- `USER.UPLOAD_AVATAR`: `/user/avatar`
- `USER.DELETE_ACCOUNT`: `/user/account`

#### Dashboard Endpoints
- `DASHBOARD.STATS`: `/dashboard/stats`
- `DASHBOARD.RECENT_ACTIVITY`: `/dashboard/activity`
- `DASHBOARD.NOTIFICATIONS`: `/dashboard/notifications`

#### HOS (Hours of Service) Endpoints
- `HOS.CREATE_CLOCK`: `/hos/clocks/`
- `HOS.CREATE_LOG_ENTRY`: `/hos/logs/`
- `HOS.CREATE_DAILY_LOG`: `/hos/daily-logs/`
- `HOS.CREATE_ELD_EVENT`: `/hos/eld-events/`
- `HOS.CERTIFY_LOG`: `/hos/logs/{id}/certify/`
- `HOS.CHANGE_DUTY_STATUS`: `/hos/clocks/{id}/change_duty_status/`

### HTTP_STATUS

Standard HTTP status codes.

```typescript
{
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
}
```

### ERROR_MESSAGES

User-friendly error messages.

- `NETWORK_ERROR`: Network connection error message
- `TIMEOUT_ERROR`: Request timeout message
- `UNAUTHORIZED`: Unauthorized access message
- `FORBIDDEN`: Access denied message
- `NOT_FOUND`: Resource not found message
- `SERVER_ERROR`: Internal server error message
- `VALIDATION_ERROR`: Input validation error message
- `INVALID_CREDENTIALS`: Invalid login credentials message
- `EMAIL_ALREADY_EXISTS`: Email conflict message
- `ACCOUNT_NOT_VERIFIED`: Email verification required message

### SUCCESS_MESSAGES

Success notification messages.

- `LOGIN_SUCCESS`: Welcome back message
- `REGISTER_SUCCESS`: Account creation success
- `LOGOUT_SUCCESS`: Logout confirmation
- `PROFILE_UPDATED`: Profile update confirmation
- `PASSWORD_CHANGED`: Password change confirmation
- `EMAIL_VERIFIED`: Email verification confirmation

### QUERY_KEYS

TanStack Query cache keys for data fetching.

```typescript
{
  AUTH: ['auth'],
  USER_PROFILE: ['user', 'profile'],
  DASHBOARD_STATS: ['dashboard', 'stats'],
  DASHBOARD_ACTIVITY: ['dashboard', 'activity'],
  NOTIFICATIONS: ['notifications']
}
```

### STORAGE_KEYS

Keys for AsyncStorage/SecureStore.

- `ACCESS_TOKEN`: Access token storage key
- `REFRESH_TOKEN`: Refresh token storage key
- `USER_ID`: User ID storage key
- `REMEMBER_ME`: Remember me preference
- `THEME_MODE`: Theme preference (light/dark)
- `LANGUAGE`: Language preference
- `HAS_SEEN_WELCOME`: Welcome screen completion flag

### APP_CONFIG

Application-level configuration.

```typescript
{
  APP_NAME: 'TTMKonnect',
  VERSION: '1.0.0',
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  PAGINATION_LIMIT: 20
}
```

## Usage

Import specific constants as needed:

```typescript
import { API_CONFIG, API_ENDPOINTS, HTTP_STATUS } from './constants'
```

## Benefits

1. **Centralization**: Single source of truth for all API paths
2. **Type Safety**: Constants prevent typos in endpoint strings
3. **Maintainability**: Easy to update endpoints in one place
4. **Consistency**: Ensures consistent error messages across the app
5. **Configuration**: Easy to switch between environments

