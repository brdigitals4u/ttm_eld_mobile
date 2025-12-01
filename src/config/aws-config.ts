/**
 * AWS Configuration for BETA-1 Hybrid Implementation
 *
 * This config enables dual sync:
 * 1. Primary: Local backend API (current implementation)
 * 2. Secondary: AWS Lambda + DynamoDB (new feature)
 *
 * Sensitive values are loaded from secure storage (Android Keystore)
 */

import { secureConfigService } from "../services/SecureConfigService"

// Initialize secure config service early
secureConfigService.initialize().catch(console.error)

// Get AWS config from secure storage (fallback to hardcoded values which will be obfuscated)
const getAwsSecureConfig = () => {
  const secureConfig = secureConfigService.getAwsConfig()
  return {
    apiGateway: {
      baseUrl:
        secureConfig.apiGateway?.baseUrl ||
        "https://oy47qb63f3.execute-api.us-east-1.amazonaws.com",
      endpoints: {
        saveData: "/data",
        saveBatch: "/batch",
        getData: "/data",
      },
      region: "us-east-1",
      timeout: 30000,
    },
    cognito: {
      region: "us-east-1",
      userPoolId: secureConfig.cognito?.userPoolId || "us-east-1_JEeMFBWHc",
      clientId: secureConfig.cognito?.clientId || "3r6e3uq1motr9n3u5b4uonm9th",
    },
  }
}

export const awsConfig = {
  ...getAwsSecureConfig(),

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
  email: "testdriver@example.com",
  password: "FinalPass123!",
  driverId: "driver_001",
  vehicleId: "truck_001",
}

export default awsConfig
