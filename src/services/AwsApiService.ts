/**
 * AWS API Service for BETA-1 Hybrid Implementation
 * 
 * Sends OBD data to AWS Lambda + DynamoDB while keeping
 * the existing local API sync intact.
 */

import { awsConfig } from '@/config/aws-config'
import { useAuth } from '@/stores/authStore'

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

    // Split into chunks if needed
    const batchSize = awsConfig.features.batchSize
    if (payloads.length > batchSize) {
      console.log(`📦 Splitting ${payloads.length} records into batches of ${batchSize}`)
      const results = []
      
      for (let i = 0; i < payloads.length; i += batchSize) {
        const chunk = payloads.slice(i, i + batchSize)
        const result = await this.sendBatchWithRetry(chunk)
        results.push(result)
      }
      
      const allSucceeded = results.every(r => r.success)
      return {
        success: allSucceeded,
        data: results,
        error: allSucceeded ? undefined : 'Some batches failed'
      }
    }

    return this.sendBatchWithRetry(payloads)
  }

  /**
   * Get authentication token from current user
   * Note: In hybrid mode, we use the existing auth token from Zustand
   */
  private getAuthToken(): string | null {
    try {
      // Get token from Zustand authStore
      const authState = useAuth.getState()
      return authState.token
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
}

export const awsApiService = new AwsApiService()
export default awsApiService


