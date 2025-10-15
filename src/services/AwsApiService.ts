/**
 * AWS API Service for BETA-1 Hybrid Implementation
 * 
 * Sends OBD data to AWS Lambda + DynamoDB while keeping
 * the existing local API sync intact.
 */

import { awsConfig } from '@/config/aws-config'
import { useAuthStore } from '@/stores/authStore'

export interface AwsObdPayload {
  vehicleId: string
  driverId: string
  timestamp: number
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
  allData?: any[]
}

export interface AwsApiResponse {
  success: boolean
  data?: any
  error?: string
  statusCode?: number
}

class AwsApiService {
  private baseUrl = awsConfig.apiGateway.baseUrl
  private timeout = awsConfig.apiGateway.timeout
  private retryConfig = awsConfig.retry

  /**
   * Send OBD data to AWS Lambda
   */
  async saveObdData(payload: AwsObdPayload): Promise<AwsApiResponse> {
    if (!awsConfig.features.enableAwsSync) {
      console.log('ℹ️  AWS sync is disabled via config')
      return { success: false, error: 'AWS sync disabled' }
    }

    return this.sendWithRetry(payload)
  }

  /**
   * Send batch OBD data to AWS Lambda
   */
  async saveObdDataBatch(payloads: AwsObdPayload[]): Promise<AwsApiResponse> {
    if (!awsConfig.features.enableAwsSync) {
      console.log('ℹ️  AWS sync is disabled via config')
      return { success: false, error: 'AWS sync disabled' }
    }

    console.log(`📦 Sending ${payloads.length} records to AWS Lambda individually`)

    // Send each record individually to avoid batch processing issues
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const payload of payloads) {
      try {
        const result = await this.sendWithRetry(payload)
        results.push(result)
        
        if (result.success) {
          successCount++
        } else {
          errorCount++
          console.error(`❌ Failed to send individual record:`, result.error)
        }
      } catch (error) {
        errorCount++
        console.error(`❌ Error sending individual record:`, error)
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const allSucceeded = errorCount === 0
    console.log(`📊 AWS Batch Results: ${successCount} successful, ${errorCount} failed`)

    return {
      success: allSucceeded,
      data: results,
      error: allSucceeded ? undefined : `${errorCount} records failed to sync`
    }
  }

  /**
   * Get authentication token from current user
   * Note: Uses Cognito JWT token for AWS Lambda authentication
   */
  private getAuthToken(): string | null {
    try {
      // Get Cognito JWT token from Zustand authStore
      const authState = useAuthStore.getState()
      
      // Prefer Cognito access_token for AWS (most secure)
      if (authState.cognitoTokens?.access_token) {
        console.log('🔑 Using Cognito JWT token for AWS')
        return authState.cognitoTokens.access_token
      }
      
      // Fallback to custom token if Cognito not available
      if (authState.token) {
        console.log('🔑 Using custom token for AWS (fallback)')
        return authState.token
      }
      
      console.warn('⚠️  No auth token available')
      return null
    } catch (error) {
      console.error('❌ Failed to get auth token:', error)
      return null
    }
  }

  /**
   * Send single payload with retry logic
   */
  private async sendWithRetry(payload: AwsObdPayload, attempt = 1): Promise<AwsApiResponse> {
    try {
      // Validate required fields
      if (!payload.vehicleId || !payload.timestamp) {
        const error = `Missing required fields: vehicleId=${!!payload.vehicleId}, timestamp=${!!payload.timestamp}`
        console.error(`❌ AWS payload validation failed: ${error}`)
        return {
          success: false,
          error: error
        }
      }

      const response = await this.post(awsConfig.apiGateway.endpoints.saveData, payload)
      
      if (response.success) {
        console.log(`✅ AWS sync successful (attempt ${attempt})`)
        return response
      }

      // Retry on failure
      if (attempt < this.retryConfig.attempts) {
        const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoff, attempt - 1)
        console.log(`🔄 Retrying AWS sync in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.attempts})`)
        await this.sleep(delay)
        return this.sendWithRetry(payload, attempt + 1)
      }

      return response
    } catch (error) {
      if (attempt < this.retryConfig.attempts) {
        const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoff, attempt - 1)
        console.log(`🔄 Retrying AWS sync after error in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.attempts})`)
        await this.sleep(delay)
        return this.sendWithRetry(payload, attempt + 1)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send batch with retry logic
   */
  private async sendBatchWithRetry(payloads: AwsObdPayload[], attempt = 1): Promise<AwsApiResponse> {
    try {
      const response = await this.post(awsConfig.apiGateway.endpoints.saveData, {
        batch: true,
        data: payloads
      })
      
      if (response.success) {
        console.log(`✅ AWS batch sync successful: ${payloads.length} records (attempt ${attempt})`)
        return response
      }

      // Retry on failure
      if (attempt < this.retryConfig.attempts) {
        const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoff, attempt - 1)
        console.log(`🔄 Retrying AWS batch sync in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.attempts})`)
        await this.sleep(delay)
        return this.sendBatchWithRetry(payloads, attempt + 1)
      }

      return response
    } catch (error) {
      if (attempt < this.retryConfig.attempts) {
        const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoff, attempt - 1)
        console.log(`🔄 Retrying AWS batch sync after error in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.attempts})`)
        await this.sleep(delay)
        return this.sendBatchWithRetry(payloads, attempt + 1)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * POST request to AWS API Gateway
   */
  private async post(endpoint: string, data: any): Promise<AwsApiResponse> {
    try {
      // Get auth token
      const token = this.getAuthToken()
      
      if (!token) {
        console.warn('⚠️  No auth token available for AWS sync')
        return {
          success: false,
          error: 'Not authenticated',
          statusCode: 401
        }
      }

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Api-Version': '1.0',
          'X-Client': 'TTM-Konnect-Mobile',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ AWS API error ${response.status}:`, errorText)
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          statusCode: response.status
        }
      }

      const result = await response.json()
      return {
        success: true,
        data: result,
        statusCode: response.status
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ AWS API timeout')
          return {
            success: false,
            error: 'Request timeout'
          }
        }
        
        console.error('❌ AWS API error:', error.message)
        return {
          success: false,
          error: error.message
        }
      }
      
      return {
        success: false,
        error: 'Unknown error'
      }
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Health check for AWS API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Test AWS API with sample data
   */
  async testAwsApi(): Promise<AwsApiResponse> {
    const testPayload: AwsObdPayload = {
      vehicleId: 'TEST_VEHICLE_001',
      driverId: 'TEST_DRIVER_001',
      timestamp: Date.now(),
      dataType: 'engine_data',
      latitude: 34.381824,
      longitude: -117.388832,
      gpsSpeed: 0,
      gpsTime: new Date().toISOString(),
      gpsRotation: 0,
      eventTime: new Date().toISOString(),
      eventType: 0,
      eventId: 999,
      isLiveEvent: 1,
      engineSpeed: 1200,
      vehicleSpeed: 0,
      coolantTemp: 85,
      fuelLevel: 75,
      batteryVoltage: 14.2,
      odometer: 123456,
      allData: [
        {
          id: 'test_pid',
          name: 'Test Engine Speed',
          value: '1200',
          unit: 'rpm'
        }
      ]
    }

    console.log('🧪 Testing AWS API with sample payload:', testPayload)
    return this.saveObdData(testPayload)
  }
}

export const awsApiService = new AwsApiService()
export default awsApiService


