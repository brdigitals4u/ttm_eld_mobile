import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// Fuel Purchase API Types
// ============================================================================

export interface FuelPurchase {
  id: string
  transaction_reference: string
  transaction_time: string  // ISO 8601
  transaction_location: string
  latitude?: string
  longitude?: string
  fuel_quantity_liters: string  // Decimal as string
  fuel_grade?: string  // Unknown/Regular/Premium
  ifta_fuel_type?: string  // Diesel/Gasoline/etc.
  merchant_name?: string
  source?: string
  transaction_price: {
    amount: string
    currency: string
  }
  discount?: {
    amount: string
    currency: string
  }
  driver_id?: string
  driver_name?: string
  vehicle_id?: number
  vehicle_info?: {
    id: string
    vehicle_unit: string
    make?: string
    model?: string
  }
  created_at: string
}

export interface CreateFuelPurchaseRequest {
  transaction_reference: string  // 1-32 chars, required
  transaction_time: string  // ISO 8601, required
  transaction_location: string  // max 500 chars, required
  fuel_quantity_liters: number  // decimal, required
  transaction_price: {  // required
    amount: string
    currency: string
  }
  // Optional fields
  latitude?: number
  longitude?: number
  fuel_grade?: string  // Unknown/Regular/Premium
  ifta_fuel_type?: string  // Diesel/Gasoline/etc.
  merchant_name?: string
  source?: string
  driver_id?: string
  vehicle_id?: number
  discount?: {
    amount: string
    currency: string
  }
  receipt_image_url?: string  // URL from upload API
  purchase_state?: string  // US State code (e.g., "CA", "TX")
}

export interface UploadFileResponse {
  document_id: number
  file_url: string
}

export interface FuelPurchaseSearchParams {
  driver_id?: string
  vehicle_id?: number
  merchant_name?: string
  fuel_type?: string
  start_date?: string  // ISO 8601
  end_date?: string  // ISO 8601
  min_amount?: number
  max_amount?: number
  page?: number
  page_size?: number
}

export interface FuelPurchaseStatistics {
  summary: {
    total_purchases: number
    total_amount: number
    total_liters: number
    average_amount_per_purchase: number
    average_liters_per_purchase: number
  }
  fuel_type_breakdown: Array<{
    fuel_type: string
    count: number
    total_liters: number
  }>
}

export interface PaginatedFuelPurchaseResponse {
  count: number
  next: string | null
  previous: string | null
  results: FuelPurchase[]
}

// ============================================================================
// Fuel Purchase API Service
// ============================================================================

export const fuelPurchaseApi = {
  /**
   * Upload Receipt Image
   * POST /api/generate-upload-url/upload/
   */
  async uploadReceiptImage(
    fileUri: string,
    filename?: string,
    title?: string
  ): Promise<UploadFileResponse> {
    // Create FormData for file upload
    const formData = new FormData()
    
    // Extract filename from URI or use provided filename
    const uriParts = fileUri.split('/')
    const defaultFilename = uriParts[uriParts.length - 1] || 'fuel_receipt.jpg'
    const finalFilename = filename || defaultFilename
    
    // Get file extension
    const fileExtension = finalFilename.split('.').pop() || 'jpg'
    const mimeType = `image/${fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'jpeg' : fileExtension}`
    
    // Create file object for FormData
    // @ts-ignore - FormData in React Native accepts objects with uri, type, name
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: finalFilename,
    } as any)
    
    if (filename) {
      formData.append('filename', filename)
    }
    
    if (title) {
      formData.append('title', title || 'Fuel Receipt')
    } else {
      formData.append('title', 'Fuel Receipt')
    }
    
    const response = await apiClient.upload<UploadFileResponse>(
      API_ENDPOINTS.UPLOAD.GENERATE_UPLOAD_URL,
      formData
    )
    
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to upload receipt image', status: 400 })
  },

  /**
   * Create Fuel Purchase
   * POST /api/fuel-purchase/fuel-purchases/
   */
  async createFuelPurchase(data: CreateFuelPurchaseRequest): Promise<FuelPurchase> {
    const response = await apiClient.post<FuelPurchase>(API_ENDPOINTS.FUEL.CREATE_PURCHASE, data)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to create fuel purchase', status: 400 })
  },

  /**
   * Get Fuel Purchases
   * GET /api/fuel-purchase/fuel-purchases/
   */
  async getFuelPurchases(params?: { page?: number; page_size?: number }): Promise<PaginatedFuelPurchaseResponse> {
    let endpoint = API_ENDPOINTS.FUEL.GET_PURCHASES
    
    if (params) {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.page_size) queryParams.append('page_size', params.page_size.toString())
      
      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }
    
    const response = await apiClient.get<PaginatedFuelPurchaseResponse>(endpoint)
    if (response.success && response.data) {
      // Handle paginated response
      if (Array.isArray(response.data)) {
        return {
          count: response.data.length,
          next: null,
          previous: null,
          results: response.data,
        }
      }
      return response.data
    }
    throw new ApiError({ message: 'Failed to get fuel purchases', status: 400 })
  },

  /**
   * Search Fuel Purchases
   * GET /api/fuel-purchase/fuel-purchases/search/
   */
  async searchFuelPurchases(params?: FuelPurchaseSearchParams): Promise<PaginatedFuelPurchaseResponse> {
    let endpoint = API_ENDPOINTS.FUEL.SEARCH_PURCHASES
    
    if (params) {
      const queryParams = new URLSearchParams()
      if (params.driver_id) queryParams.append('driver_id', params.driver_id)
      if (params.vehicle_id) queryParams.append('vehicle_id', params.vehicle_id.toString())
      if (params.merchant_name) queryParams.append('merchant_name', params.merchant_name)
      if (params.fuel_type) queryParams.append('fuel_type', params.fuel_type)
      if (params.start_date) queryParams.append('start_date', params.start_date)
      if (params.end_date) queryParams.append('end_date', params.end_date)
      if (params.min_amount) queryParams.append('min_amount', params.min_amount.toString())
      if (params.max_amount) queryParams.append('max_amount', params.max_amount.toString())
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.page_size) queryParams.append('page_size', params.page_size.toString())
      
      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }
    
    const response = await apiClient.get<PaginatedFuelPurchaseResponse>(endpoint)
    if (response.success && response.data) {
      if (Array.isArray(response.data)) {
        return {
          count: response.data.length,
          next: null,
          previous: null,
          results: response.data,
        }
      }
      return response.data
    }
    throw new ApiError({ message: 'Failed to search fuel purchases', status: 400 })
  },

  /**
   * Get Fuel Statistics
   * GET /api/fuel-purchase/fuel-purchases/statistics/
   */
  async getFuelStatistics(params?: { start_date?: string; end_date?: string }): Promise<FuelPurchaseStatistics> {
    let endpoint = API_ENDPOINTS.FUEL.STATISTICS
    
    if (params) {
      const queryParams = new URLSearchParams()
      if (params.start_date) queryParams.append('start_date', params.start_date)
      if (params.end_date) queryParams.append('end_date', params.end_date)
      
      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }
    
    const response = await apiClient.get<FuelPurchaseStatistics>(endpoint)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to get fuel statistics', status: 400 })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Create Fuel Purchase
 */
export const useCreateFuelPurchase = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fuelPurchaseApi.createFuelPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FUEL_PURCHASES })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FUEL_STATISTICS })
    },
    onError: (error: ApiError) => {
      console.error('Failed to create fuel purchase:', error)
    },
  })
}

/**
 * Hook: Get Fuel Purchases
 */
export const useFuelPurchases = (params?: { page?: number; page_size?: number }, options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.FUEL_PURCHASES, params],
    queryFn: () => fuelPurchaseApi.getFuelPurchases(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,  // 30 seconds
  })
}

/**
 * Hook: Search Fuel Purchases
 */
export const useSearchFuelPurchases = (params?: FuelPurchaseSearchParams, options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.FUEL_PURCHASES, 'search', params],
    queryFn: () => fuelPurchaseApi.searchFuelPurchases(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook: Get Fuel Statistics
 */
export const useFuelStatistics = (params?: { start_date?: string; end_date?: string }, options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.FUEL_STATISTICS, params],
    queryFn: () => fuelPurchaseApi.getFuelStatistics(params),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,  // 5 minutes
  })
}
