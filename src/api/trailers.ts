import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const TrailerSchema = z.object({
  id: z.string(),
  asset_id: z.string().min(1),
  name: z.string().min(1),
  asset_type: z.literal("trailer"),
  trailer_type: z.string().optional(),
  status: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  vin: z.string().optional(),
  license_plate: z.string().optional(),
  registration_state: z.string().optional(),
  registration_expiry: z.string().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  weight_capacity: z.number().optional(),
  volume_capacity: z.number().optional(),
  temperature_setting: z.number().optional(),
  is_tracked: z.boolean().optional(),
  created_at: z.string().optional(),
})

export const TrailerAssignmentSchema = z.object({
  id: z.string(),
  driver: z.string(),
  driver_id: z.string().optional(),
  driver_name: z.string().optional(),
  trailer: z.string(),
  trailer_id: z.string().optional(),
  trailer_name: z.string().optional(),
  trailer_asset_id: z.string().optional(),
  assigned_by: z.string().nullable().optional(),
  assigned_by_name: z.string().optional(),
  assigned_at: z.string().optional(),
  start_time: z.string(),
  end_time: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
  is_primary: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export interface CreateTrailerRequest {
  asset_id: string // Required, unique (auto-generated if not provided)
  name: string // Required
  asset_type?: "trailer" // Required, must be "trailer"
  trailer_type: string // Optional: dry_van/refrigerated/flatbed/tanker/etc.
  status?: string
  make?: string
  model?: string
  year?: number
  vin?: string
  license_plate?: string
  registration_state?: string
  registration_expiry?: string
  length?: number
  width?: number
  height?: number
  weight_capacity?: number
  volume_capacity?: number
  temperature_setting?: number
  is_tracked?: boolean
  assigned_by?: string
}

/**
 * Generate unique asset_id using date milliseconds
 */
export const generateUniqueAssetId = (): string => {
  return `TRAILER-${Date.now()}`
}

// Type exports from Zod schemas
export type Trailer = z.infer<typeof TrailerSchema>
export type TrailerAssignment = z.infer<typeof TrailerAssignmentSchema>

export interface CreateTrailerAssignmentRequest {
  driver: string // UUID, required
  trailer: string // UUID, required
  start_time: string // ISO 8601 datetime, required
  assigned_by?: string // UUID
  status?: string // default: "active"
  is_primary?: boolean
  notes?: string
}

export interface UpdateTrailerAssignmentRequest {
  status?: string // 'active' | 'inactive'
  end_time?: string // ISO 8601 datetime
  notes?: string
}

// ============================================================================
// Trailer API Service
// ============================================================================

export const trailersApi = {
  /**
   * Create Trailer
   * POST /api/assets/trailers/
   */
  async createTrailer(data: CreateTrailerRequest): Promise<Trailer> {
    const response = await apiClient.post<Trailer>(API_ENDPOINTS.TRAILERS.CREATE, data)
    if (response.success && response.data) {
      return TrailerSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to create trailer", status: 400 })
  },

  /**
   * Assign Trailer to Driver
   * POST /api/drivers/trailer-assignments/
   */
  async assignTrailer(data: CreateTrailerAssignmentRequest): Promise<TrailerAssignment> {
    const response = await apiClient.post<TrailerAssignment>(API_ENDPOINTS.TRAILERS.ASSIGN, data)
    if (response.success && response.data) {
      return TrailerAssignmentSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to assign trailer", status: 400 })
  },

  /**
   * Get Trailer Assignments
   * GET /api/drivers/trailer-assignments/
   */
  async getTrailerAssignments(params?: {
    driver?: string
    status?: string
    trailer?: string
  }): Promise<TrailerAssignment[]> {
    let endpoint = API_ENDPOINTS.TRAILERS.GET_ASSIGNMENTS

    if (params) {
      const queryParams = new URLSearchParams()
      if (params.driver) queryParams.append("driver", params.driver)
      if (params.status) queryParams.append("status", params.status)
      if (params.trailer) queryParams.append("trailer", params.trailer)

      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }

    const response = await apiClient.get<TrailerAssignment[]>(endpoint)
    if (response.success && response.data) {
      let assignments: TrailerAssignment[] = []
      if (Array.isArray(response.data)) {
        assignments = response.data
      } else if ((response.data as any).results) {
        assignments = (response.data as any).results
      }
      // Validate and parse each assignment
      return assignments.map((assignment) => TrailerAssignmentSchema.parse(assignment))
    }
    throw new ApiError({ message: "Failed to get trailer assignments", status: 400 })
  },

  /**
   * Update/End Trailer Assignment
   * PATCH /api/drivers/trailer-assignments/{id}/
   */
  async updateTrailerAssignment(
    assignmentId: string,
    data: UpdateTrailerAssignmentRequest,
  ): Promise<TrailerAssignment> {
    const endpoint = API_ENDPOINTS.TRAILERS.UPDATE_ASSIGNMENT.replace("{id}", assignmentId)
    const response = await apiClient.patch<TrailerAssignment>(endpoint, data)
    if (response.success && response.data) {
      return TrailerAssignmentSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to update trailer assignment", status: 400 })
  },

  /**
   * Remove/End Trailer Assignment (helper function)
   * Sets status to 'inactive' and end_time to current time
   */
  async removeTrailerAssignment(assignmentId: string): Promise<TrailerAssignment> {
    return this.updateTrailerAssignment(assignmentId, {
      status: "inactive",
      end_time: new Date().toISOString(),
    })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Create Trailer
 */
export const useCreateTrailer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: trailersApi.createTrailer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRAILERS })
    },
    onError: (error: ApiError) => {
      console.error("Failed to create trailer:", error)
    },
  })
}

/**
 * Hook: Assign Trailer
 */
export const useAssignTrailer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: trailersApi.assignTrailer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRAILER_ASSIGNMENTS })
    },
    onError: (error: ApiError) => {
      console.error("Failed to assign trailer:", error)
    },
  })
}

/**
 * Hook: Get Trailer Assignments
 */
export const useTrailerAssignments = (
  params?: {
    driver?: string
    status?: string
    trailer?: string
  },
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.TRAILER_ASSIGNMENTS, params],
    queryFn: () => trailersApi.getTrailerAssignments(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook: Remove/End Trailer Assignment
 */
export const useRemoveTrailer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: string) => trailersApi.removeTrailerAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRAILER_ASSIGNMENTS })
    },
    onError: (error: ApiError) => {
      console.error("Failed to remove trailer assignment:", error)
    },
  })
}
