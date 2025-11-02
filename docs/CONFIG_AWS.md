# AWS Configuration Documentation

**File:** `src/config/aws-config.ts`

## Overview

Configuration file for AWS hybrid implementation enabling dual sync architecture. Defines API Gateway endpoints, Cognito settings, retry policies, and feature flags for AWS Lambda + DynamoDB integration.

## Architecture

**Hybrid Sync System**:
1. **Primary**: Local backend API (existing implementation)
2. **Secondary**: AWS Lambda + DynamoDB (new feature)

Both sync independently with separate buffers and error handling.

## Configuration Structure

### API Gateway

```typescript
apiGateway: {
  baseUrl: 'https://oy47qb63f3.execute-api.us-east-1.amazonaws.com',
  endpoints: {
    saveData: '/data',
    getData: '/data',
  },
  region: 'us-east-1',
  timeout: 30000,  // 30 seconds
}
```

**Endpoints**:
- `saveData`: POST endpoint for batch data upload
- `getData`: GET endpoint for data retrieval

### Cognito

```typescript
cognito: {
  region: 'us-east-1',
  userPoolId: 'us-east-1_JEeMFBWHc',
  clientId: '3r6e3uq1motr9n3u5b4uonm9th',
}
```

**Note**: Currently uses organization API token (not Cognito JWT) for hybrid approach.

### Retry Configuration

```typescript
retry: {
  attempts: 3,
  delay: 1000,        // Initial delay: 1 second
  backoff: 2,         // Exponential backoff multiplier
}
```

**Retry Strategy**:
- 3 attempts maximum
- Exponential backoff: 1s, 2s, 4s

### Feature Flags

```typescript
features: {
  enableAwsSync: true,        // Toggle AWS sync on/off
  enableLocalSync: true,      // Toggle local API sync on/off
  awsSyncInterval: 60000,     // AWS sync interval (60 seconds)
  batchSize: 50,              // Max records per AWS request
}
```

**Usage**:
- Enable/disable each sync independently
- Configure sync intervals separately
- Control batch sizes

## Test Credentials

```typescript
awsTestCredentials: {
  email: 'testdriver@example.com',
  password: 'FinalPass123!',
  driverId: 'driver_001',
  vehicleId: 'truck_001',
}
```

Development/testing credentials (not used in production).

## Integration Points

### OBD Data Context

Uses this config to:
- Enable/disable AWS sync
- Configure sync interval
- Determine batch size

### AWS API Service

Uses this config to:
- Set API Gateway base URL
- Configure retry behavior
- Determine endpoints

## Configuration Usage

### Enabling/Disabling Sync

```typescript
import { awsConfig } from '@/config/aws-config'

// Check if AWS sync is enabled
if (awsConfig.features.enableAwsSync) {
  // Perform AWS sync
}

// Check if local sync is enabled
if (awsConfig.features.enableLocalSync) {
  // Perform local sync
}
```

### Accessing Endpoints

```typescript
const saveEndpoint = `${awsConfig.apiGateway.baseUrl}${awsConfig.apiGateway.endpoints.saveData}`
// https://oy47qb63f3.execute-api.us-east-1.amazonaws.com/data
```

### Retry Configuration

```typescript
const maxAttempts = awsConfig.retry.attempts
const initialDelay = awsConfig.retry.delay
const backoff = awsConfig.retry.backoff
```

## Environment-Specific Configuration

This is a base configuration. For environment-specific values:
- Use `config.dev.ts` for development
- Use `config.prod.ts` for production
- Override values as needed

## Important Notes

1. **Dual Sync**: Both sync systems operate independently
2. **Token Management**: Uses organization API token (not Cognito JWT currently)
3. **Feature Flags**: Easy to toggle features without code changes
4. **Batch Size**: Limited to 50 records per request
5. **Sync Interval**: Both syncs default to 60 seconds

## AWS Resources

- **API Gateway**: Regional endpoint in us-east-1
- **Lambda**: Handles data processing and DynamoDB writes
- **DynamoDB**: Stores vehicle_data records
- **Cognito**: User pool configured (currently not actively used)

## Security Considerations

- API Gateway requires authentication
- Endpoints should use HTTPS only
- Credentials should not be hardcoded in production
- Consider using environment variables for sensitive data

