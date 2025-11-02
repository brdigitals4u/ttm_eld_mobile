# Auth API Documentation

**File:** `src/api/auth.ts`

## Overview

Authentication API module providing user registration, login, logout, token refresh, password management, and email verification functionality. Integrates with Realm database for local data persistence.

## Features

- User registration and authentication
- Token-based authentication with refresh tokens
- Password reset and recovery
- Email verification
- React Query hooks for data fetching and mutations
- Automatic Realm database synchronization

## API Functions

### `authApi.register(credentials)`

Registers a new user account.

**Parameters:**
- `credentials`: RegisterCredentials object (email, password, firstName, lastName, etc.)

**Returns:** Promise<AuthResponse>

**Side Effects:**
- Stores access and refresh tokens securely
- Stores user ID
- Creates user record in Realm database
- Creates auth session in Realm

**Example:**
```typescript
const response = await authApi.register({
  email: 'user@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe'
})
```

### `authApi.logout()`

Logs out the current user.

**Returns:** Promise<void>

**Side Effects:**
- Clears stored tokens
- Clears user ID
- Deletes auth session from Realm
- Logs warning if API call fails (still clears local data)

**Example:**
```typescript
await authApi.logout()
```

### `authApi.refreshToken()`

Refreshes the access token using the refresh token.

**Returns:** Promise<{ accessToken: string; expiresAt: Date }>

**Throws:** ApiError if no refresh token is available

**Side Effects:**
- Updates stored access token
- Updates Realm auth session

**Example:**
```typescript
const tokens = await authApi.refreshToken()
```

### `authApi.getCurrentUser()`

Fetches the current authenticated user's profile.

**Returns:** Promise<UserType>

**Side Effects:**
- Updates user data in Realm database

**Example:**
```typescript
const user = await authApi.getCurrentUser()
```

### `authApi.forgotPassword(email)`

Sends password reset email to user.

**Parameters:**
- `email`: string - User's email address

**Returns:** Promise<void>

**Example:**
```typescript
await authApi.forgotPassword('user@example.com')
```

### `authApi.resetPassword(token, newPassword)`

Resets user password using reset token.

**Parameters:**
- `token`: string - Password reset token from email
- `newPassword`: string - New password

**Returns:** Promise<void>

**Example:**
```typescript
await authApi.resetPassword('reset-token-123', 'newPassword123')
```

### `authApi.verifyEmail(token)`

Verifies user's email address.

**Parameters:**
- `token`: string - Email verification token

**Returns:** Promise<void>

**Side Effects:**
- Updates email verification status in Realm

**Example:**
```typescript
await authApi.verifyEmail('verification-token-123')
```

## React Query Hooks

### `useRegister()`

Mutation hook for user registration.

**Returns:** UseMutationResult

**Side Effects:**
- Invalidates user profile and auth queries on success

**Example:**
```typescript
const registerMutation = useRegister()
registerMutation.mutate({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
})
```

### `useLogout()`

Mutation hook for user logout.

**Returns:** UseMutationResult

**Side Effects:**
- Clears all React Query cache on success or error

**Example:**
```typescript
const logoutMutation = useLogout()
logoutMutation.mutate()
```

### `useCurrentUser()`

Query hook to fetch current user profile.

**Returns:** UseQueryResult<UserType>

**Features:**
- Stale time: 5 minutes
- Doesn't retry on 401 errors
- Retries up to 3 times on other errors

**Example:**
```typescript
const { data: user, isLoading, error } = useCurrentUser()
```

### `useForgotPassword()`

Mutation hook for password recovery.

**Returns:** UseMutationResult

**Example:**
```typescript
const forgotPasswordMutation = useForgotPassword()
forgotPasswordMutation.mutate('user@example.com')
```

### `useResetPassword()`

Mutation hook for password reset.

**Returns:** UseMutationResult

**Example:**
```typescript
const resetPasswordMutation = useResetPassword()
resetPasswordMutation.mutate({
  token: 'reset-token',
  password: 'newPassword123'
})
```

### `useVerifyEmail()`

Mutation hook for email verification.

**Returns:** UseMutationResult

**Side Effects:**
- Invalidates user profile query on success

**Example:**
```typescript
const verifyEmailMutation = useVerifyEmail()
verifyEmailMutation.mutate('verification-token')
```

## Data Flow

1. **Registration/Login**: API response → Token storage → Realm user creation → Realm session creation
2. **Token Refresh**: Refresh token → New access token → Update token storage → Update Realm session
3. **Logout**: API call (optional) → Clear tokens → Clear Realm data → Clear React Query cache

## Error Handling

- All functions throw `ApiError` on failure
- React Query hooks handle errors and log them to console
- Logout always clears local data even if API call fails
- 401 errors prevent query retries

## Dependencies

- `@tanstack/react-query`: React Query hooks
- `./client`: ApiClient and ApiError
- `./constants`: API endpoints and query keys
- `@/utils/storage`: Token and user storage utilities
- `@/database/realm`: Realm database service
- `@/database/schemas`: Type definitions

## Integration with Realm

All authentication operations automatically sync with Realm database:
- User data is stored and updated in Realm
- Auth sessions are persisted in Realm
- Data is cleared on logout

