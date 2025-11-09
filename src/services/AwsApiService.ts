/**
 * AWS API Service for BETA-1 Hybrid Implementation
 * 
 * Sends OBD data to AWS Lambda + DynamoDB while keeping
 * the existing local API sync intact.
 */

import { awsConfig } from '@/config/aws-config'
import { useAuthStore } from '@/stores/authStore'
import { ObdCodeDetails } from '@/utils/obd-code-decoder'

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
  faultCodes?: Array<{
    ecuId: string
    ecuIdHex: string
    codes: string[]
    details?: ObdCodeDetails[]
  }>
  deviceId?: string
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
   * Sends each record individually as a direct payload (no batch wrapper)
   */
  async saveObdDataBatch(payloads: AwsObdPayload[]): Promise<AwsApiResponse> {
    if (!awsConfig.features.enableAwsSync) {
      console.log('ℹ️  AWS sync is disabled via config')
      return { success: false, error: 'AWS sync disabled' }
    }

    // Validate payloads before sending
    const validPayloads = payloads.filter((payload, index) => {
      // Validate vehicleId
      const vehicleId = payload.vehicleId
      if (!vehicleId || vehicleId === 'UNKNOWN_VEHICLE') {
        console.warn(`⚠️ AWS: Invalid payload at index ${index} - missing or invalid vehicleId: ${vehicleId}`)
        return false
      }
      if (typeof vehicleId === 'string' && vehicleId.trim() === '') {
        console.warn(`⚠️ AWS: Invalid payload at index ${index} - empty vehicleId string`)
        return false
      }
      
      // Validate timestamp
      const timestamp = payload.timestamp
      if (!timestamp || timestamp <= 0 || !Number.isFinite(timestamp)) {
        console.warn(`⚠️ AWS: Invalid payload at index ${index} - missing or invalid timestamp: ${timestamp}`)
        return false
      }
      
      // Validate driverId
      const driverId = payload.driverId
      if (!driverId) {
        console.warn(`⚠️ AWS: Invalid payload at index ${index} - missing driverId`)
        return false
      }
      if (typeof driverId === 'string' && driverId.trim() === '') {
        console.warn(`⚠️ AWS: Invalid payload at index ${index} - empty driverId string`)
        return false
      }
      
      return true
    })

    if (validPayloads.length === 0) {
      console.warn('⚠️ AWS: No valid payloads to send after validation')
      return { success: false, error: 'No valid payloads' }
    }

    if (validPayloads.length < payloads.length) {
      console.log(`⚠️ AWS: Filtered out ${payloads.length - validPayloads.length} invalid payloads, sending ${validPayloads.length} valid ones`)
    }

    // Send each record individually as a direct payload (batch: false, all data in payload)
    console.log(`📤 AWS: Sending ${validPayloads.length} records individually (no batch wrapper)`)
    
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    // Send records sequentially to avoid overwhelming the API
    for (let i = 0; i < validPayloads.length; i++) {
      const payload = validPayloads[i]
      try {
        const response = await this.sendWithRetry(payload)
        if (response.success) {
          successCount++
        } else {
          failureCount++
          errors.push(`Record ${i + 1}: ${response.error}`)
        }
        // Small delay between requests to avoid rate limiting
        if (i < validPayloads.length - 1) {
          await this.sleep(50) // 50ms delay between requests
        }
      } catch (error) {
        failureCount++
        errors.push(`Record ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (successCount > 0) {
      console.log(`✅ AWS: Successfully sent ${successCount}/${validPayloads.length} records`)
    }
    if (failureCount > 0) {
      console.warn(`⚠️ AWS: Failed to send ${failureCount}/${validPayloads.length} records`)
      console.warn('⚠️ AWS: Errors:', errors)
    }

    return {
      success: failureCount === 0,
      error: failureCount > 0 ? `${failureCount} record(s) failed to send` : undefined
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
   * Sends payload with batch: false and all fields destructured at root level
   */
  private async sendWithRetry(payload: AwsObdPayload, attempt = 1): Promise<AwsApiResponse> {
    try {
      // Validate payload has required fields
      if (!payload.vehicleId || payload.vehicleId === 'UNKNOWN_VEHICLE') {
        console.error('❌ AWS: Invalid payload - missing or invalid vehicleId:', payload.vehicleId)
        return {
          success: false,
          error: 'Missing or invalid vehicleId'
        }
      }
      if (!payload.timestamp || payload.timestamp <= 0 || !Number.isFinite(payload.timestamp)) {
        console.error('❌ AWS: Invalid payload - missing or invalid timestamp:', payload.timestamp)
        return {
          success: false,
          error: 'Missing or invalid timestamp'
        }
      }

      // AWS Lambda expects single payload with batch: false and all fields destructured
      console.log('📤 AWS: Sending single record', {
        vehicleId: payload.vehicleId,
        driverId: payload.driverId,
        timestamp: payload.timestamp,
        dataType: payload.dataType
      })

      // Send payload with batch: false and all fields at root level
      const singlePayload = {
        batch: false,
        ...payload
      }
      const response = await this.postRequest(awsConfig.apiGateway.endpoints.saveData, singlePayload)
      
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
      // Validate all payloads have required fields
      const invalidItems = payloads.filter(p => !p.vehicleId || !p.timestamp || p.timestamp <= 0)
      if (invalidItems.length > 0) {
        console.error(`❌ AWS: ${invalidItems.length} payload(s) missing required fields (vehicleId or timestamp)`)
        console.error('❌ AWS: Invalid items:', invalidItems.map((p, i) => ({
          index: i,
          vehicleId: p.vehicleId,
          timestamp: p.timestamp,
          driverId: p.driverId
        })))
        return {
          success: false,
          error: `${invalidItems.length} payload(s) missing required fields`
        }
      }

      const batchPayload = {
        batch: true,
        data: payloads
      }

      // Log payload summary for debugging
      console.log(`📤 AWS: Sending batch of ${payloads.length} records`, {
        firstItem: {
          vehicleId: payloads[0]?.vehicleId,
          driverId: payloads[0]?.driverId,
          timestamp: payloads[0]?.timestamp,
          dataType: payloads[0]?.dataType
        },
        lastItem: {
          vehicleId: payloads[payloads.length - 1]?.vehicleId,
          driverId: payloads[payloads.length - 1]?.driverId,
          timestamp: payloads[payloads.length - 1]?.timestamp
        }
      })

      const response = await this.postRequest(awsConfig.apiGateway.endpoints.saveData, batchPayload)
      
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
   * Send batch data to AWS /batch endpoint
   */
  async sendBatch(payloads: AwsObdPayload[]): Promise<AwsApiResponse> {
    if (!awsConfig.features.enableAwsSync) {
      console.log('ℹ️  AWS sync is disabled via config')
      return { success: false, error: 'AWS sync disabled' }
    }

    // Validate payloads
    const validPayloads = payloads.filter((payload) => {
      return payload.vehicleId && payload.vehicleId !== 'UNKNOWN_VEHICLE' && 
             payload.timestamp && payload.timestamp > 0 && 
             payload.driverId
    })

    if (validPayloads.length === 0) {
      return { success: false, error: 'No valid payloads' }
    }

    // Send batch format: {batch: true, data: [...]}
    const batchPayload = {
      batch: true,
      data: validPayloads
    }

    console.log(`📤 AWS: Sending batch of ${validPayloads.length} records to /batch endpoint`)
    return this.postRequest(awsConfig.apiGateway.endpoints.saveBatch, batchPayload)
  }

  /**
   * POST request to AWS API Gateway (public method)
   */
  async post(endpoint: string, data: any): Promise<AwsApiResponse> {
    return this.postRequest(endpoint, data)
  }

  /**
   * POST request to AWS API Gateway (private implementation)
   */
  private async postRequest(endpoint: string, data: any): Promise<AwsApiResponse> {
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
        let errorMessage = errorText
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // If not JSON, use text as is
        }
        
        console.error(`❌ AWS API error ${response.status}:`, errorMessage)
        console.error(`❌ AWS API response body:`, errorText)
        
        // If it's a 404 with "Missing vehicleId or timestamp", log more details
        if (response.status === 404 && errorMessage.includes('Missing vehicleId or timestamp')) {
          console.error('❌ AWS: Payload validation failed - checking payload structure...')
          console.error('❌ AWS: This might indicate the Lambda expects a different payload format')
        }
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorMessage}`,
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


