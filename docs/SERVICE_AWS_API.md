# AWS API Service Documentation

**File:** `src/services/AwsApiService.ts`

## Overview

AWS Lambda API client service for hybrid dual-sync architecture. Sends OBD data to AWS API Gateway → Lambda → DynamoDB while maintaining existing local API sync. Includes retry logic, batch processing, and authentication token management.

## Key Features

- Batch data upload to AWS Lambda
- Automatic chunking for large batches
- Exponential backoff retry logic
- Cognito JWT token authentication (with fallback)
- Health check endpoint
- Configurable via aws-config
- Independent error handling (doesn't affect local sync)

## Service Architecture

**Data Flow**:
```
OBD Data → AwsApiService → API Gateway → Lambda → DynamoDB
```

**Authentication Flow**:
1. Prefers Cognito JWT token (from authStore)
2. Falls back to custom token if Cognito unavailable
3. Uses Bearer token in Authorization header

## Main Methods

### `saveObdData(payload)`

Sends single OBD data record to AWS Lambda.

**Parameters**:
- `payload`: `AwsObdPayload`

**Returns**: `Promise<AwsApiResponse>`

**Process**:
1. Checks if AWS sync is enabled
2. Calls `sendWithRetry()` with payload
3. Returns response

### `saveObdDataBatch(payloads)`

Sends batch of OBD data records with automatic chunking.

**Parameters**:
- `payloads`: `AwsObdPayload[]`

**Returns**: `Promise<AwsApiResponse>`

**Batch Processing**:
1. Checks if batch exceeds `batchSize` (default: 50)
2. If exceeds, splits into chunks
3. Sends chunks sequentially
4. Aggregates results
5. Returns success if all chunks succeed

**Chunking Logic**:
```typescript
for (let i = 0; i < payloads.length; i += batchSize) {
  const chunk = payloads.slice(i, i + batchSize)
  const result = await this.sendBatchWithRetry(chunk)
  results.push(result)
}
```

### `healthCheck()`

Checks AWS API health.

**Endpoint**: `/health`

**Returns**: `Promise<boolean>`

**Usage**: Monitor AWS API availability

## Payload Structure

### AwsObdPayload

```typescript
{
  vehicleId: string              // VIN
  driverId: string               // Driver ID
  timestamp: number              // Unix timestamp (ms)
  dataType: 'engine_data' | 'location' | 'hos_status' | 'fault_data'
  
  // GPS Data
  latitude?: number
  longitude?: number
  gpsSpeed?: number
  gpsTime?: string
  gpsRotation?: number
  
  // Event Data
  eventTime?: string
  eventType?: number
  eventId?: number
  isLiveEvent?: number
  
  // OBD Values
  engineSpeed?: number
  vehicleSpeed?: number
  coolantTemp?: number
  fuelLevel?: number
  batteryVoltage?: number
  odometer?: number
  
  // Raw data
  allData?: any[]                // Complete OBD display data
}
```

### Batch Request Format

```typescript
{
  batch: true,
  data: AwsObdPayload[]
}
```

## Response Structure

### AwsApiResponse

```typescript
{
  success: boolean
  data?: any
  error?: string
  statusCode?: number
}
```

## Authentication

### Token Retrieval

**Priority Order**:
1. Cognito JWT token (`cognitoTokens.access_token`)
2. Custom token (`token`) - Fallback

**Implementation**:
```typescript
private getAuthToken(): string | null {
  const authState = useAuthStore.getState()
  
  if (authState.cognitoTokens?.access_token) {
    return authState.cognitoTokens.access_token
  }
  
  if (authState.token) {
    return authState.token
  }
  
  return null
}
```

### Request Headers

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-Api-Version': '1.0',
  'X-Client': 'TTM-Konnect-Mobile'
}
```

## Retry Logic

### Exponential Backoff

**Configuration** (from aws-config):
- Attempts: 3
- Initial Delay: 1000ms (1 second)
- Backoff Multiplier: 2

**Retry Delays**:
- Attempt 1: Immediate
- Attempt 2: 1 second
- Attempt 3: 2 seconds
- Attempt 4: 4 seconds (if configured)

**Implementation**:
```typescript
const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoff, attempt - 1)
```

### Retry Conditions

Retries on:
- Network errors
- Timeout errors
- 5xx server errors
- 429 rate limit errors

Does NOT retry on:
- 401 authentication errors
- 400 bad request errors
- 404 not found errors

## Error Handling

### Network Errors

- Catches fetch errors
- Detects timeout (AbortError)
- Returns error response

### HTTP Errors

- Parses error response
- Extracts error message
- Returns status code

### Timeout Handling

- 30-second timeout (configurable)
- AbortController for cancellation
- Clear timeout on response

## HTTP Client

### POST Request

```typescript
private async post(endpoint: string, data: any): Promise<AwsApiResponse>
```

**Process**:
1. Gets auth token
2. Creates AbortController for timeout
3. Sends fetch request
4. Handles response
5. Returns formatted response

**Timeout**: 30 seconds (from awsConfig)

**Error Handling**:
- Timeout → AbortError
- Network error → Error message
- HTTP error → Status code + message

## Batch Processing

### Automatic Chunking

When batch exceeds `batchSize`:
1. Logs chunking decision
2. Splits into chunks
3. Sends chunks sequentially
4. Collects results
5. Returns aggregated response

**Chunk Size**: 50 records (configurable)

**Example**:
```typescript
// 120 records → 3 chunks (50, 50, 20)
const chunk1 = payloads.slice(0, 50)
const chunk2 = payloads.slice(50, 100)
const chunk3 = payloads.slice(100, 120)
```

## Configuration

### Feature Flags

Controlled by `awsConfig.features`:
- `enableAwsSync`: Enable/disable AWS sync
- `batchSize`: Max records per request (50)

**Behavior**:
- If disabled, returns early with error
- Logs disabled message
- Doesn't attempt API call

### API Configuration

From `awsConfig.apiGateway`:
- `baseUrl`: API Gateway URL
- `endpoints.saveData`: `/data`
- `timeout`: 30000ms

## Usage Examples

### Single Record

```typescript
const payload: AwsObdPayload = {
  vehicleId: 'VIN123',
  driverId: 'driver-123',
  timestamp: Date.now(),
  dataType: 'engine_data',
  vehicleSpeed: 65,
  engineSpeed: 2500,
  fuelLevel: 75
}

const response = await awsApiService.saveObdData(payload)
if (response.success) {
  console.log('Data saved successfully')
}
```

### Batch Upload

```typescript
const payloads: AwsObdPayload[] = [...many records]

const response = await awsApiService.saveObdDataBatch(payloads)
if (response.success) {
  console.log(`Saved ${payloads.length} records`)
}
```

### Health Check

```typescript
const isHealthy = await awsApiService.healthCheck()
if (!isHealthy) {
  console.warn('AWS API is down')
}
```

## Integration

### With OBD Data Context

Called from `obd-data-context.tsx`:
```typescript
const response = await awsApiService.saveObdDataBatch(awsBufferRef.current)
```

### With Auth Store

Reads tokens from Zustand store:
```typescript
const authState = useAuthStore.getState()
const token = authState.cognitoTokens?.access_token || authState.token
```

## Error Responses

### No Token

```typescript
{
  success: false,
  error: 'Not authenticated',
  statusCode: 401
}
```

### Network Error

```typescript
{
  success: false,
  error: 'Network error message'
}
```

### HTTP Error

```typescript
{
  success: false,
  error: 'HTTP 500: Server error',
  statusCode: 500
}
```

### Timeout

```typescript
{
  success: false,
  error: 'Request timeout'
}
```

## Logging

Comprehensive logging:
- Request details
- Retry attempts
- Batch chunking
- Success/failure
- Error details

**Log Prefixes**:
- `✅` - Success
- `❌` - Error
- `🔄` - Retry
- `📦` - Batch processing
- `⚠️` - Warning
- `ℹ️` - Info

## Performance

### Optimizations

1. **Batch Processing**: Reduces API calls
2. **Chunking**: Prevents payload size issues
3. **Timeout**: Prevents hanging requests
4. **Retry Logic**: Handles transient failures

### Limitations

1. **Batch Size**: Limited to 50 records per request
2. **Timeout**: 30-second limit
3. **Retries**: Maximum 3 attempts

## Dependencies

- `@/config/aws-config` - Configuration
- `@/stores/authStore` - Authentication tokens
- Native `fetch` API

## Notes

1. **Independent Sync**: Fails independently from local sync
2. **Token Priority**: Prefers Cognito token for security
3. **Batch Size**: Configurable but defaults to 50
4. **Chunking**: Automatic when batch exceeds limit
5. **Retry**: Exponential backoff for transient failures

