import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// Driver API Types
// ============================================================================

export interface Driver {
  id: string
  company_driver_id: string
  driver_name: string
  driver_email: string
  driver_license?: string
  license_state?: string
  current_status?: string
  current_location?: string
  employment_status?: string
  is_active?: boolean
  current_vehicle?: number
}

export interface DriversListResponse {
  drivers: Driver[]
  count: number
}

export interface CreateCoDriverEventRequest {
  driver: string // Primary driver UUID, required
  vehicle: number // Vehicle ID, required
  event_type: "co_driver_login" | "co_driver_logout" // Required
  event_time: string // ISO 8601 datetime, required
  event_location?: string
  remark?: string
  event_data: {
    // Required
    co_driver_id: string // Co-driver UUID
    co_driver_name: string // Co-driver name
  }
}

export interface ELDEventResponse {
  id: string
  driver: string
  vehicle: number
  event_type: string
  event_time: string
  event_location?: string
  remark?: string
  event_data?: Record<string, any>
  created_at: string
}

// ============================================================================
// Co-Driver API Service
// ============================================================================

export const driversApi = {
  /**
   * Get All Drivers
   * GET /api/organisation_drivers/
   * Returns list of all drivers in the organization
   */
  async getDrivers(): Promise<Driver[]> {
    const response = await apiClient.get<DriversListResponse>(API_ENDPOINTS.DRIVERS.GET_ALL)
    if (response.success && response.data) {
      // Handle both response formats
      if (Array.isArray(response.data)) {
        return response.data
      }
      if ((response.data as any).drivers) {
        return (response.data as DriversListResponse).drivers
      }
      return []
    }
    throw new ApiError({ message: "Failed to get drivers", status: 400 })
  },

  /**
   * Create Co-Driver Event (Login/Logout)
   * POST /api/hos/eld-events/
   *
   * This creates an ELD event for co-driver login or logout
   */
  async createCoDriverEvent(data: CreateCoDriverEventRequest): Promise<ELDEventResponse> {
    const response = await apiClient.post<ELDEventResponse>(
      API_ENDPOINTS.DRIVERS.CREATE_CO_DRIVER_EVENT,
      data,
    )
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: "Failed to create co-driver event", status: 400 })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get Drivers
 * Returns list of all drivers for co-driver selection
 */
export const useDrivers = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.DRIVERS,
    queryFn: driversApi.getDrivers,
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook: Create Co-Driver Event
 *
 * Call this on screen-specific basis (e.g., when user logs in/out a co-driver)
 */
export const useCreateCoDriverEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driversApi.createCoDriverEvent,
    onSuccess: () => {
      // Invalidate HOS logs to reflect co-driver events
      queryClient.invalidateQueries({ queryKey: ["hos_logs"] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_CLOCKS })
    },
    onError: (error: ApiError) => {
      console.error("Failed to create co-driver event:", error)
    },
  })
}
