# API Client Documentation

**File:** `src/api/client.ts`

## Overview

The API Client is the core HTTP client for making API requests to the TTM Konnect backend. It handles authentication, error management, request/response transformation, and timeout handling.

## Key Features

- **Authentication**: Automatically attaches authorization tokens to requests
- **Error Handling**: Custom ApiError class with status codes and error messages
- **Timeout Management**: 30-second timeout for requests
- **Token Management**: Automatic token retrieval from secure storage
- **Request Logging**: Console logging for debugging

## Classes

### ApiClient

Main HTTP client class that handles all API communication.

#### Constructor

Creates a new API client instance with base URL and timeout configuration from `API_CONFIG`.

#### Private Methods

- **`getHeaders()`**: Retrieves authentication token from storage and builds request headers
  - Returns: Promise with headers object containing Content-Type, Accept, and Authorization (if token exists)
  - Logs token status for debugging

- **`makeRequest<T>(endpoint, options)`**: Core HTTP request method
  - Handles URL construction, headers, timeout, and error management
  - Returns: Promise with ApiResponse<T>
  - Throws: ApiError on failure
  - Features:
    - 30-second timeout using AbortController
    - Automatic 401 handling (clears tokens)
    - Network error detection
    - Detailed error logging

#### Public Methods

- **`get<T>(endpoint)`**: GET request
- **`post<T>(endpoint, data?)`**: POST request with optional body
- **`put<T>(endpoint, data?)`**: PUT request with optional body
- **`patch<T>(endpoint, data?)`**: PATCH request with optional body
- **`delete<T>(endpoint)`**: DELETE request
- **`upload<T>(endpoint, file)`**: File upload (supports File and FormData)

### ApiError

Custom error class for API errors.

#### Properties

- `message`: Error message string
- `status`: HTTP status code
- `errors`: Optional validation errors object

#### Usage

```typescript
throw new ApiError({
  message: 'Authentication failed',
  status: 401,
  errors: { email: ['Invalid email format'] }
})
```

## ApiResponse Interface

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}
```

## Exported Instance

- **`apiClient`**: Singleton instance of ApiClient used throughout the app

## Error Handling

1. **401 Unauthorized**: Automatically clears stored tokens
2. **Network Errors**: Detects AbortError (timeout) and network failures
3. **Server Errors**: Extracts error messages from API response
4. **Validation Errors**: Returns errors object with field-level messages

## Logging

The client logs:
- Token retrieval status
- Request details (method, URL, timeout)
- Response details (status, headers)
- Error details (URL, error type, message)

## Dependencies

- `./constants`: API_CONFIG, HTTP_STATUS, ERROR_MESSAGES
- `../utils/storage`: getStoredToken, removeStoredTokens

