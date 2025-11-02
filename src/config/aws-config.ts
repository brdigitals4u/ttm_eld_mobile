/**
 * AWS Configuration for BETA-1 Hybrid Implementation
 * 
 * This config enables dual sync:
 * 1. Primary: Local backend API (current implementation)
 * 2. Secondary: AWS Lambda + DynamoDB (new feature)
 */

export const awsConfig = {
  // API Gateway Configuration
  apiGateway: {
    baseUrl: 'https://oy47qb63f3.execute-api.us-east-1.amazonaws.com',
    endpoints: {
      saveData: '/data',
      saveBatch: '/batch',
      getData: '/data',
    },
    region: 'us-east-1',
    timeout: 30000,
  },

  // Cognito Configuration (for JWT tokens)
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_JEeMFBWHc',
    clientId: '3r6e3uq1motr9n3u5b4uonm9th',
  },

  // Retry Configuration
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 2, // exponential backoff multiplier
  },

  // Feature Flags
  features: {
    enableAwsSync: true, // Toggle AWS sync on/off
    enableLocalSync: true, // Toggle local API sync on/off
    awsSyncInterval: 60000, // 60 seconds (same as local sync)
    batchSize: 50, // Max records per AWS request
  },
}

// Test Credentials (for development)
export const awsTestCredentials = {
  email: 'testdriver@example.com',
  password: 'FinalPass123!',
  driverId: 'driver_001',
  vehicleId: 'truck_001',
}

export default awsConfig


