import { API_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from './constants'
import { getStoredToken, removeStoredTokens } from '../utils/storage'
import { tokenRefreshService } from '../services/token-refresh-service'

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

// ApiError class - defined at top for proper usage
export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor({ message, status, errors }: { message: string; status: number; errors?: Record<string, string[]> }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

// API Client class
class ApiClient {
  private baseURL: string
  private timeout: number

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL
    this.timeout = API_CONFIG.TIMEOUT
  }

  // Get headers with authentication
  private async getHeaders(options?: { idempotencyKey?: string; deviceId?: string; appVersion?: string }): Promise<Record<string, string>> {
    // Check and refresh token if needed before making request
    await tokenRefreshService.checkAndRefreshToken()
    
    const token = await getStoredToken()
    
    console.log('🔑 API Client: Retrieved token:', token ? 'Token exists' : 'No token found')
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (token) {
      // Support both Token and Bearer formats (Bearer is standard for JWT)
      // Check if token looks like JWT (starts with eyJ) or use Bearer for new APIs
      if (token.startsWith('eyJ')) {
        headers['Authorization'] = `Bearer ${token}`
      } else {
        headers['Authorization'] = `Token ${token}`
      }
      console.log('✅ API Client: Authorization header added')
    } else {
      console.log('❌ API Client: No token available, request will be unauthenticated')
    }

    // Add idempotency key if provided
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey
    }

    // Add device ID if provided
    if (options?.deviceId) {
      headers['X-Device-ID'] = options.deviceId
    }

    // Add app version if provided
    if (options?.appVersion) {
      headers['X-App-Version'] = options.appVersion
    }

    return headers
  }

  // Make HTTP request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & { idempotencyKey?: string; deviceId?: string; appVersion?: string } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`
      const { idempotencyKey, deviceId, appVersion, ...requestOptions } = options
      const headers = await this.getHeaders({ idempotencyKey, deviceId, appVersion })

      console.log('🌐 API Request:', {
        method: requestOptions.method || 'GET',
        url,
        timeout: `${this.timeout}ms`,
        body: requestOptions.body ? (typeof requestOptions.body === 'string' ? requestOptions.body : JSON.stringify(requestOptions.body)) : undefined,
      })

      const config: RequestInit = {
        ...requestOptions,
        headers: {
          ...headers,
          ...requestOptions.headers,
        },
      }

      // Add timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      config.signal = controller.signal

      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      console.log('✅ API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle 401 Unauthorized - try to refresh token and retry
        if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          // Skip refresh for refresh endpoint itself to avoid infinite loop
          if (!endpoint.includes('/refresh/')) {
            console.log('🔄 API Client: 401 error, attempting token refresh...')
            const refreshed = await tokenRefreshService.refreshToken()
            
            if (refreshed) {
              console.log('✅ API Client: Token refreshed, retrying request...')
              // Retry the request with new token
              const retryHeaders = await this.getHeaders()
              const retryConfig: RequestInit = {
                ...options,
                headers: {
                  ...retryHeaders,
                  ...options.headers,
                },
              }
              
              const retryController = new AbortController()
              const retryTimeoutId = setTimeout(() => retryController.abort(), this.timeout)
              retryConfig.signal = retryController.signal
              
              const retryResponse = await fetch(url, retryConfig)
              clearTimeout(retryTimeoutId)
              
              const retryData = await retryResponse.json()
              
              if (!retryResponse.ok) {
                // Still failed after refresh, logout
                await removeStoredTokens()
                throw new ApiError({
                  message: ERROR_MESSAGES.UNAUTHORIZED,
                  status: retryResponse.status,
                })
              }
              
              return {
                success: true,
                data: retryData,
                message: retryData.message,
              }
            } else {
              // Refresh failed, logout
              await removeStoredTokens()
              throw new ApiError({
                message: ERROR_MESSAGES.UNAUTHORIZED,
                status: response.status,
              })
            }
          } else {
            // Refresh endpoint itself returned 401, logout
            await removeStoredTokens()
            throw new ApiError({
              message: ERROR_MESSAGES.UNAUTHORIZED,
              status: response.status,
            })
          }
        }

        throw new ApiError({
          message: data.message || ERROR_MESSAGES.SERVER_ERROR,
          status: response.status,
          errors: data.errors,
        })
      }

      return {
        success: true,
        data: data,
        message: data.message,
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error
      }

      // Handle network errors
      if (error.name === 'AbortError') {
        throw new ApiError({
          message: ERROR_MESSAGES.TIMEOUT_ERROR,
          status: 408,
        })
      }

      // Log detailed error for debugging
      console.error('API Request failed:', {
        url: `${this.baseURL}${endpoint}`,
        error: error.message || error,
        errorType: error.constructor.name,
      })

      throw new ApiError({
        message: ERROR_MESSAGES.NETWORK_ERROR,
        status: 0,
      })
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: { idempotencyKey?: string; deviceId?: string; appVersion?: string }): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' })
  }

  // Upload file
  async upload<T>(
    endpoint: string,
    payload: File | FormData | Blob,
    options?: {
      contentType?: string
      headers?: Record<string, string>
    },
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`
      const headers: Record<string, string> = { ...(options?.headers ?? {}) }
      const isFormData =
        (typeof FormData !== "undefined" && payload instanceof FormData) ||
        (payload &&
          typeof payload === "object" &&
          typeof (payload as any).append === "function" &&
          !(payload as any).uri)
      
      // Don't set Content-Type for FormData, let runtime include the boundary
      if (!isFormData) {
        const inferredType =
          typeof payload === "object" && payload !== null && "type" in payload
            ? ((payload as any).type as string | undefined)
            : undefined
        const finalType = options?.contentType && options.contentType.length > 0 ? options.contentType : inferredType
        headers["Content-Type"] = finalType && finalType.length > 0 ? finalType : "application/octet-stream"
      }

      const token = await getStoredToken()
      if (token) {
        headers["Authorization"] = token.startsWith("eyJ") ? `Bearer ${token}` : `Token ${token}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload as any,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new ApiError({
          message: data.message || ERROR_MESSAGES.SERVER_ERROR,
          status: response.status,
        })
      }

      return {
        success: true,
        data: data,
        message: data.message,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError({
        message: ERROR_MESSAGES.NETWORK_ERROR,
        status: 0,
      })
    }
  }
}

// Create and export API client instance
export const apiClient = new ApiClient()
