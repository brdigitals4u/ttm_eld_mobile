import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// DVIR API Types
// ============================================================================

export interface DVIR {
  id: string
  driver: string
  driver_name?: string
  vehicle: number
  vehicle_unit?: string
  inspection_date: string // ISO 8601
  inspection_type: "pre_trip" | "post_trip" | "en_route"
  status: "pass" | "pass_with_defects" | "fail"
  odometer_reading?: number
  defects_found: boolean
  notes?: string
  signature?: string // base64-encoded image
  location?: string
  latitude?: number
  longitude?: number
  created_at?: string
}

export interface CreateDVIRRequest {
  driver: string // UUID, required
  vehicle: number // Required
  inspection_date: string // ISO 8601 datetime, required
  inspection_type: "pre_trip" | "post_trip" | "en_route" // Required
  status: "pass" | "pass_with_defects" | "fail" // Required
  odometer_reading?: number
  defects_found?: boolean
  notes?: string
  signature?: string // base64-encoded signature image
  location?: string
  latitude?: number
  longitude?: number
}

export interface DVIRDefect {
  id: string
  dvir: string // DVIR UUID
  defect_type: string // brakes/tires/lights/etc.
  severity: "critical" | "major" | "minor"
  description: string
  location?: string // front_left/etc.
  repair_required?: boolean
  repair_notes?: string
  status?: string // pending/repaired/etc.
  created_at?: string
}

export interface CreateDVIRDefectRequest {
  dvir: string // DVIR UUID, required
  defect_type: string // Required
  severity: "critical" | "major" | "minor" // Required
  description: string // Required
  location?: string
  repair_required?: boolean
  repair_notes?: string
  status?: string
}

export interface DVIRQueryParams {
  driver?: string
  vehicle?: number
  start_date?: string // ISO 8601
  end_date?: string // ISO 8601
  inspection_type?: string
  status?: string
}

// ============================================================================
// DVIR API Service
// ============================================================================

export const dvirsApi = {
  /**
   * Create DVIR Inspection
   * POST /api/compliance/dvirs/
   */
  async createDVIR(data: CreateDVIRRequest): Promise<DVIR> {
    const response = await apiClient.post<DVIR>(API_ENDPOINTS.DVIR.CREATE, data)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: "Failed to create DVIR", status: 400 })
  },

  /**
   * Get DVIRs
   * GET /api/compliance/dvirs/
   */
  async getDVIRs(params?: DVIRQueryParams): Promise<DVIR[]> {
    let endpoint = API_ENDPOINTS.DVIR.GET_ALL

    if (params) {
      const queryParams = new URLSearchParams()
      if (params.driver) queryParams.append("driver", params.driver)
      if (params.vehicle) queryParams.append("vehicle", params.vehicle.toString())
      if (params.start_date) queryParams.append("start_date", params.start_date)
      if (params.end_date) queryParams.append("end_date", params.end_date)
      if (params.inspection_type) queryParams.append("inspection_type", params.inspection_type)
      if (params.status) queryParams.append("status", params.status)

      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }

    const response = await apiClient.get<DVIR[]>(endpoint)
    if (response.success && response.data) {
      if (Array.isArray(response.data)) {
        return response.data
      }
      if ((response.data as any).results) {
        return (response.data as any).results
      }
      return []
    }
    throw new ApiError({ message: "Failed to get DVIRs", status: 400 })
  },

  /**
   * Add DVIR Defect
   * POST /api/compliance/dvir-defects/
   */
  async addDVIRDefect(data: CreateDVIRDefectRequest): Promise<DVIRDefect> {
    const response = await apiClient.post<DVIRDefect>(API_ENDPOINTS.DVIR.ADD_DEFECT, data)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: "Failed to add DVIR defect", status: 400 })
  },

  /**
   * Get DVIR Defects
   * GET /api/compliance/dvir-defects/
   */
  async getDVIRDefects(params?: { dvir?: string; status?: string }): Promise<DVIRDefect[]> {
    let endpoint = API_ENDPOINTS.DVIR.GET_DEFECTS

    if (params) {
      const queryParams = new URLSearchParams()
      if (params.dvir) queryParams.append("dvir", params.dvir)
      if (params.status) queryParams.append("status", params.status)

      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }

    const response = await apiClient.get<DVIRDefect[]>(endpoint)
    if (response.success && response.data) {
      if (Array.isArray(response.data)) {
        return response.data
      }
      if ((response.data as any).results) {
        return (response.data as any).results
      }
      return []
    }
    throw new ApiError({ message: "Failed to get DVIR defects", status: 400 })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Create DVIR
 */
export const useCreateDVIR = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dvirsApi.createDVIR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DVIRS })
    },
    onError: (error: ApiError) => {
      console.error("Failed to create DVIR:", error)
    },
  })
}

/**
 * Hook: Get DVIRs
 */
export const useDVIRs = (params?: DVIRQueryParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.DVIRS, params],
    queryFn: () => dvirsApi.getDVIRs(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook: Add DVIR Defect
 */
export const useAddDVIRDefect = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dvirsApi.addDVIRDefect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DVIR_DEFECTS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DVIRS })
    },
    onError: (error: ApiError) => {
      console.error("Failed to add DVIR defect:", error)
    },
  })
}

/**
 * Hook: Get DVIR Defects
 */
export const useDVIRDefects = (
  params?: { dvir?: string; status?: string },
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.DVIR_DEFECTS, params],
    queryFn: () => dvirsApi.getDVIRDefects(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  })
}
