import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// Vehicle API Types
// ============================================================================

export interface Vehicle {
  id: number
  vehicle_unit: string
  make: string
  model?: string
  year?: number
  vin: string
  license_plate: string
  registration_state: string
  registration_expiry?: string
  fuel_type?: string // diesel/gasoline/electric/hybrid/cng/lng
  engine_type?: string
  gross_weight?: number
  status?: string // active/inactive/maintenance/retired
  current_odometer?: number
  current_engine_hours?: number
  current_location?: string
  is_active?: boolean
  created_at?: string
}

export interface CreateVehicleRequest {
  vehicle_unit: string // Required, unique
  make: string // Required
  vin: string // Required, unique, 17 chars
  license_plate: string // Required
  registration_state: string // Required
  // Optional fields
  model?: string
  year?: number
  registration_expiry?: string
  fuel_type?: string
  engine_type?: string
  gross_weight?: number
  status?: string
  current_odometer?: number
  current_engine_hours?: number
  current_location?: string
  is_active?: boolean
}

export interface UpdateVehicleRequest {
  current_odometer?: number
  current_location?: string
  status?: string
  [key: string]: any // Allow other fields
}

// ============================================================================
// Vehicle API Service
// ============================================================================

export const vehiclesApi = {
  /**
   * Create Vehicle
   * POST /api/vehicles/vehicles/
   */
  async createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
    const response = await apiClient.post<Vehicle>(API_ENDPOINTS.VEHICLES.CREATE, data)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: "Failed to create vehicle", status: 400 })
  },

  /**
   * Get All Vehicles
   * GET /api/vehicles/vehicles/
   */
  async getVehicles(): Promise<Vehicle[]> {
    const response = await apiClient.get<Vehicle[]>(API_ENDPOINTS.VEHICLES.GET_ALL)
    if (response.success && response.data) {
      // Handle both array and paginated response
      if (Array.isArray(response.data)) {
        return response.data
      }
      if ((response.data as any).results) {
        return (response.data as any).results
      }
      return []
    }
    throw new ApiError({ message: "Failed to get vehicles", status: 400 })
  },

  /**
   * Get Single Vehicle
   * GET /api/vehicles/vehicles/{vehicle_id}/
   */
  async getVehicle(vehicleId: string | number): Promise<Vehicle> {
    const endpoint = API_ENDPOINTS.VEHICLES.GET_ONE.replace("{id}", vehicleId.toString())
    const response = await apiClient.get<Vehicle>(endpoint)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: "Failed to get vehicle", status: 400 })
  },

  /**
   * Update Vehicle
   * PATCH /api/vehicles/vehicles/{vehicle_id}/
   */
  async updateVehicle(vehicleId: string | number, data: UpdateVehicleRequest): Promise<Vehicle> {
    const endpoint = API_ENDPOINTS.VEHICLES.UPDATE.replace("{id}", vehicleId.toString())
    const response = await apiClient.patch<Vehicle>(endpoint, data)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: "Failed to update vehicle", status: 400 })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Create Vehicle
 */
export const useCreateVehicle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: vehiclesApi.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES })
    },
    onError: (error: ApiError) => {
      console.error("Failed to create vehicle:", error)
    },
  })
}

/**
 * Hook: Get Vehicles
 */
export const useVehicles = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.VEHICLES,
    queryFn: vehiclesApi.getVehicles,
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook: Get Single Vehicle
 */
export const useVehicle = (vehicleId: string | number | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.VEHICLE(vehicleId!),
    queryFn: () => vehiclesApi.getVehicle(vehicleId!),
    enabled: options?.enabled !== false && !!vehicleId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook: Update Vehicle
 */
export const useUpdateVehicle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId: string | number; data: UpdateVehicleRequest }) =>
      vehiclesApi.updateVehicle(vehicleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE(variables.vehicleId) })
    },
    onError: (error: ApiError) => {
      console.error("Failed to update vehicle:", error)
    },
  })
}
