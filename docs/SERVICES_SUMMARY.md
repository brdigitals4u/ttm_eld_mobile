# Services Documentation Summary

This document covers all service layer files in the application.

## Service Files Overview

### Core Services

1. **JMBluetoothService.ts** - [See SERVICE_JM_BLUETOOTH.md](./SERVICE_JM_BLUETOOTH.md)
2. **AwsApiService.ts** - AWS Lambda API client
3. **ConnectionStateService.ts** - Connection state management
4. **handleData.ts** - OBD data transformation

### API Services (api/)

5. **apiProblem.ts** - API error handling
6. **apiProblem.test.ts** - API error tests
7. **types.ts** - API service types
8. **index.ts** - API service exports

## AwsApiService.ts

**Purpose**: AWS Lambda API client for dual sync architecture

**Key Features**:
- Batch data upload to AWS
- Retry logic with exponential backoff
- Authentication token management
- Chunked batch processing
- Health check endpoint

**Main Methods**:

### `saveObdData(payload)`
Sends single OBD data record to AWS Lambda.

### `saveObdDataBatch(payloads)`
Sends batch of OBD data records. Automatically chunks if exceeds batch size.

**Batch Processing**:
- Splits large batches into chunks
- Sends chunks sequentially
- Returns aggregated results

**Retry Logic**:
- 3 attempts maximum
- Exponential backoff: 1s, 2s, 4s
- Configurable via awsConfig

**Authentication**:
- Prefers Cognito JWT token
- Falls back to custom token
- Bearer token in Authorization header

**Request Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `X-Api-Version: 1.0`
- `X-Client: TTM-Konnect-Mobile`

**Response Handling**:
- Success: `{ success: true, data, statusCode }`
- Error: `{ success: false, error, statusCode }`

**Error Types**:
- Network errors
- Timeout errors (30 seconds)
- HTTP errors (4xx, 5xx)
- Authentication errors (401)

## ConnectionStateService.ts

**Purpose**: Manages ELD device connection state

**Features**:
- Connection state tracking
- Connection attempt management
- State synchronization

**Hook**: `useConnectionState()`

**Returns**:
- `isConnecting`: boolean
- `setConnecting`: (boolean) => void

**Usage**:
```typescript
const { isConnecting, setConnecting } = useConnectionState()
```

## handleData.ts

**Purpose**: Transforms raw ELD/OBD data to display format

**Function**: `handleData(rawData: ObdEldData): OBDDataItem[]`

**Process**:
1. Receives raw ELD data structure
2. Extracts OBD PID values
3. Formats values with units
4. Creates display items
5. Handles errors and missing data

**Output Format**:
```typescript
[
  {
    id: string,
    name: string,      // "Vehicle Speed", "Engine Speed", etc.
    value: string,     // Formatted value
    unit: string,      // "km/h", "RPM", "°C", etc.
    isError?: boolean
  }
]
```

**OBD PIDs Handled**:
- 0x0D - Vehicle Speed
- 0x05 - Coolant Temperature
- 0x0F - Intake Air Temperature
- 0x10 - Mass Air Flow
- 0x11 - Throttle Position
- 0x0E - Timing Advance
- 0x04 - Engine Load
- 0x2F - Fuel Level
- 0x44 - Air/Fuel Ratio
- 0x74 - Turbocharger RPM

**Data Transformation**:
- Raw hex values → Decimal
- Sensor values → Human-readable
- Units conversion (where needed)
- Error detection

## API Problem Service (api/)

### apiProblem.ts

**Purpose**: Standardized API error handling

**Features**:
- Error classification
- Error message formatting
- Network error detection
- Status code handling

**Classes**:
- `ApiProblem` - Base error class
- Error types: Network, Timeout, Server, Client

### apiProblem.test.ts

**Purpose**: Unit tests for API problem handling

**Coverage**:
- Error creation
- Error classification
- Message formatting

### types.ts

**Purpose**: TypeScript types for API services

**Types**:
- Request/Response types
- Error types
- Configuration types

### index.ts

**Purpose**: Service exports

**Exports**: All API service modules

## Service Patterns

### Singleton Pattern

Most services use singleton:
```typescript
class Service {
  // ...
}

export default new Service()
```

### Event-Based Communication

Services communicate via events:
- JMBluetoothService: Native events
- React events for UI updates

### Error Handling

Services implement:
- Try-catch blocks
- Error logging
- Error propagation
- Retry logic

### Logging

Services include:
- Console logging
- Error logging
- Debug information
- Performance metrics

## Service Integration

### With Contexts

Services are used by contexts:
- OBD Data Context → JMBluetoothService
- OBD Data Context → AwsApiService
- Status Context → handleData

### With Stores

Services update stores:
- Connection events → Status updates
- Data events → State updates

### With Components

Components consume services via:
- Contexts (indirect)
- Hooks (direct)
- Event listeners

## Service Dependencies

### External

- `react-native` - Native modules
- Native Android/iOS code
- Network APIs (fetch)

### Internal

- `@/config/aws-config` - Configuration
- `@/stores/authStore` - Authentication
- `@/types` - Type definitions

## Testing

Services should be tested:
- Unit tests for logic
- Integration tests for APIs
- Mock native modules
- Mock network requests

## Performance

Optimizations:
- Request batching
- Connection pooling
- Retry throttling
- Data caching

