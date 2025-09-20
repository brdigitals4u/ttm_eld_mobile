import { API_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from './constants'
import { getStoredToken, removeStoredTokens } from '../utils/storage'

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string[]>
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
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await getStoredToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  // Make HTTP request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`
      const headers = await this.getHeaders()

      const config: RequestInit = {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      }

      // Add timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      config.signal = controller.signal

      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          await removeStoredTokens()
          throw new ApiError({
            message: ERROR_MESSAGES.UNAUTHORIZED,
            status: response.status,
          })
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

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
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
  async upload<T>(endpoint: string, file: File | FormData): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`
      const headers: Record<string, string> = {}
      
      // Don't set Content-Type for FormData, let browser set it with boundary
      if (!(file instanceof FormData)) {
        headers['Content-Type'] = file.type || 'application/octet-stream'
      }

      const token = await getStoredToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: file,
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

// Export ApiError class
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
