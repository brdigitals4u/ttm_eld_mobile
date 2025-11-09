import { Platform } from 'react-native'
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
  vehicleId: string  // UUID, required (matches new API spec)
  fuelQuantityLiters: string  // Decimal as string, required (matches new API spec)
  transactionReference: string  // 1-32 chars, required
  transactionTime: string  // ISO 8601, required (matches new API spec)
  transactionLocation: string  // max 500 chars, required (matches new API spec)
  transactionPrice: {  // required (matches new API spec)
    amount: string
    currency: string
  }
  merchantName?: string  // Optional (matches new API spec)
  iftaFuelType?: string  // Diesel/Gasoline/etc. (matches new API spec)
  fuelGrade?: string  // Unknown/Regular/Premium (matches new API spec)
  // Legacy fields for backward compatibility
  transaction_reference?: string
  transaction_time?: string
  transaction_location?: string
  fuel_quantity_liters?: number
  transaction_price?: {
    amount: string
    currency: string
  }
  latitude?: number
  longitude?: number
  state?: string
  fuel_grade?: string
  ifta_fuel_type?: string
  merchant_name?: string
  source?: string
  driver_id?: string
  vehicle_id?: number
  discount?: {
    amount: string
    currency: string
  }
  receipt_image_url?: string
  purchase_state?: string
}

export interface ConfirmReceiptUploadResponse {
  message: string
  receiptUrl: string
}

export interface CreateFuelPurchaseResponse {
  id: string
  transaction_reference: string
  transaction_time: string
  transaction_location: string
  state: string | null
  country: string
  latitude: number | null
  longitude: number | null
  fuel_quantity_liters: string
  fuel_grade: string
  ifta_fuel_type: string
  merchant_name: string
  source: string | null
  discount: any | null
  transaction_price: {
    amount: string
    currency: string
  }
  driver_id: string | null
  vehicle_id: number | null
  driver_name: string | null
  vehicle_info: any | null
  receipt_image: string | null
  receipt_image_url: string | null
  created_at: string
  updated_at: string
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

export interface DriverFuelPurchaseListItem {
  id: string
  transaction_reference: string
  transaction_time: string
  transaction_location: string
  merchant_name?: string
  fuel_quantity_liters: string
  transaction_price_amount: string
  transaction_price_currency: string
  discount_amount?: string
  fuel_grade?: string
  ifta_fuel_type?: string
  state?: string
  vehicle_id?: string
  vehicle?: {
    id: string
    vehicle_unit: string
    make?: string
    model?: string
    year?: number
    license_plate?: string
  }
  odometer_reading?: number
  receipt_image_url?: string
  created_at: string
}

export interface DriverFuelPurchasesResponse {
  count: number
  limit: number
  offset: number
  has_more: boolean
  summary: {
    total_purchases: number
    total_liters: number
    total_amount: number
    currency: string
  }
  results: DriverFuelPurchaseListItem[]
  filters_applied: {
    driver_id: string
    start_date?: string
    end_date?: string
    vehicle_id?: string | null
  }
}

export interface DriverFuelPurchasesParams {
  start_date?: string  // YYYY-MM-DD or ISO 8601
  end_date?: string
  vehicle_id?: number
  limit?: number
  offset?: number
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
   * Upload receipt image directly to backend (multipart/form-data)
   * POST /api/fuel-purchase/confirm-receipt-upload/
   */
  async uploadReceiptImage(
    fuelPurchaseId: string,
    fileUri: string,
    filename?: string,
    contentType: string = 'image/jpeg',
    metadata?: Record<string, string | number | null | undefined>
  ): Promise<ConfirmReceiptUploadResponse> {
    console.log("📤 Uploading receipt image to backend...", {
      fuelPurchaseId,
      fileUri: fileUri ? fileUri.substring(0, 100) + '...' : undefined,
      filename,
      contentType,
      metadataKeys: metadata ? Object.keys(metadata) : []
    })

    const uriParts = fileUri.split('/')
    const defaultFilename = uriParts[uriParts.length - 1] || 'fuel_receipt.jpg'
    const finalFilename = filename || defaultFilename

    try {
      const formData = new FormData()
      formData.append('fuel_purchase_id', fuelPurchaseId)

      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        })
      }

      if (Platform.OS === 'web') {
        const response = await fetch(fileUri)
        const blob = await response.blob()
        const file = new File([blob], finalFilename, { type: contentType })
        formData.append('file', file)
      } else {
        formData.append('file', {
          uri: fileUri,
          name: finalFilename,
          type: contentType,
        } as any)
      }

      console.log("📤 Sending multipart request to confirm receipt upload...")
      const response = await apiClient.upload<ConfirmReceiptUploadResponse>(
        API_ENDPOINTS.FUEL.CONFIRM_RECEIPT_UPLOAD,
        formData
      )

      console.log("📤 Upload response:", response)

      if (response.success && response.data) {
        console.log("✅ Receipt upload completed successfully:", response.data.receiptUrl)
        return response.data
      }

      throw new ApiError({
        message: response.message || 'Failed to upload receipt',
        status: 400,
      })
    } catch (error: any) {
      console.error("❌ Error uploading receipt:", error)
      throw error
    }
  },

  /**
   * Create Fuel Purchase
   * POST /api/fuel-purchase/fuel-purchases/
   */
  async createFuelPurchase(data: CreateFuelPurchaseRequest): Promise<CreateFuelPurchaseResponse> {
    // Backend expects snake_case field names based on error messages
    const payload: any = {
      vehicleId: data.vehicleId,
      // Required fields in snake_case (backend expects these)
      fuel_quantity_liters: data.fuelQuantityLiters || String(data.fuel_quantity_liters || ''),
      transaction_reference: data.transactionReference || data.transaction_reference || '',
      transaction_time: data.transactionTime || data.transaction_time || '',
      transaction_location: data.transactionLocation || data.transaction_location || '',
      transaction_price: data.transactionPrice || data.transaction_price || {
        amount: '0.00',
        currency: 'usd',
      },
    }
    
    // Add optional fields if provided (in snake_case)
    if (data.merchantName || data.merchant_name) {
      payload.merchant_name = data.merchantName || data.merchant_name
    }
    if (data.iftaFuelType || data.ifta_fuel_type) {
      payload.ifta_fuel_type = data.iftaFuelType || data.ifta_fuel_type
    }
    if (data.fuelGrade || data.fuel_grade) {
      payload.fuel_grade = data.fuelGrade || data.fuel_grade
    }
    
    // Location data
    if (data.latitude !== undefined && data.latitude !== null) {
      payload.latitude = data.latitude
    }
    if (data.longitude !== undefined && data.longitude !== null) {
      payload.longitude = data.longitude
    }
    if (data.state) {
      payload.state = data.state
    }
    
    // Driver and vehicle info
    if (data.driver_id) {
      payload.driver_id = data.driver_id
    }
    if (data.vehicle_id !== undefined && data.vehicle_id !== null) {
      payload.vehicle_id = data.vehicle_id
    }
    
    // Purchase state
    if (data.purchase_state) {
      payload.purchase_state = data.purchase_state
    }
    
    // Source
    if (data.source) {
      payload.source = data.source
    }
    
    // Receipt image URL (will be added after S3 upload)
    if (data.receipt_image_url) {
      payload.receipt_image_url = data.receipt_image_url
    }
    
    const response = await apiClient.post<CreateFuelPurchaseResponse>(API_ENDPOINTS.FUEL.CREATE_PURCHASE, payload)
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
   * Get Driver Fuel Purchases (List)
   * GET /api/driver/fuel-purchases/
   */
  async getDriverFuelPurchases(params?: DriverFuelPurchasesParams): Promise<DriverFuelPurchasesResponse> {
    let endpoint = API_ENDPOINTS.FUEL.GET_DRIVER_PURCHASES
    
    if (params) {
      const queryParams = new URLSearchParams()
      if (params.start_date) queryParams.append('start_date', params.start_date)
      if (params.end_date) queryParams.append('end_date', params.end_date)
      if (params.vehicle_id) queryParams.append('vehicle_id', params.vehicle_id.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.offset) queryParams.append('offset', params.offset.toString())
      
      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }
    
    console.log('📤 Fetching driver fuel purchases from:', endpoint)
    const response = await apiClient.get<DriverFuelPurchasesResponse>(endpoint)
    console.log('📥 Driver fuel purchases response:', {
      success: response.success,
      hasData: !!response.data,
      resultsCount: response.data?.results?.length || 0,
      hasSummary: !!response.data?.summary,
      count: response.data?.count,
    })
    
    if (response.success && response.data) {
      // Handle case where API might return array directly
      if (Array.isArray(response.data)) {
        console.log('⚠️ API returned array directly, converting to expected format')
        return {
          count: response.data.length,
          limit: params?.limit || 50,
          offset: params?.offset || 0,
          has_more: false,
          summary: {
            total_purchases: response.data.length,
            total_liters: response.data.reduce((sum, item) => sum + parseFloat(item.fuel_quantity_liters || '0'), 0),
            total_amount: response.data.reduce((sum, item) => sum + parseFloat(item.transaction_price_amount || '0'), 0),
            currency: response.data[0]?.transaction_price_currency || 'usd',
          },
          results: response.data,
          filters_applied: {
            driver_id: '',
            start_date: params?.start_date,
            end_date: params?.end_date,
            vehicle_id: params?.vehicle_id?.toString() || null,
          },
        }
      }
      return response.data
    }
    throw new ApiError({ message: 'Failed to get driver fuel purchases', status: 400 })
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
 * Hook: Get Driver Fuel Purchases
 */
export const useDriverFuelPurchases = (params?: DriverFuelPurchasesParams, options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.FUEL_PURCHASES, 'driver', params],
    queryFn: () => fuelPurchaseApi.getDriverFuelPurchases(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,  // 30 seconds
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
