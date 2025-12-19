import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CoDriverAssignmentSchema = z.object({
  id: z.string(),
  driver: z.string(),
  driver_id: z.string().optional(),
  driver_name: z.string().optional(),
  codriver: z.string(),
  codriver_id: z.string().optional(),
  codriver_name: z.string().optional(),
  assigned_by: z.string().nullable().optional(),
  assigned_by_name: z.string().optional(),
  assigned_at: z.string().optional(),
  start_time: z.string(),
  end_time: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "completed"]),
  vehicle: z.string().nullable().optional(),
  vehicle_name: z.string().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// Type exports from Zod schemas
export type CoDriverAssignment = z.infer<typeof CoDriverAssignmentSchema>

export interface CreateCoDriverAssignmentRequest {
  driver: string // UUID, required
  codriver: string // UUID, required
  start_time: string // ISO 8601 datetime, required
  vehicle?: string // UUID, optional
  notes?: string // Optional
  status?: "active" | "inactive" | "completed" // Optional, default: "active"
}

export interface UpdateCoDriverAssignmentRequest {
  status?: "active" | "inactive" | "completed"
  end_time?: string // ISO 8601 datetime
  notes?: string
  is_active?: boolean
}

// ============================================================================
// Co-Driver Assignment API Service
// ============================================================================

export const codriverAssignmentsApi = {
  /**
   * Get Co-Driver Assignments
   * GET /api/drivers/codriver-assignments/
   */
  async getCoDriverAssignments(params?: {
    driver?: string
    codriver?: string
    status?: string
    is_active?: boolean
  }): Promise<CoDriverAssignment[]> {
    let endpoint = API_ENDPOINTS.CODRIVER_ASSIGNMENTS.LIST

    if (params) {
      const queryParams = new URLSearchParams()
      if (params.driver) queryParams.append("driver", params.driver)
      if (params.codriver) queryParams.append("codriver", params.codriver)
      if (params.status) queryParams.append("status", params.status)
      if (params.is_active !== undefined) queryParams.append("is_active", String(params.is_active))

      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }

    const response = await apiClient.get<CoDriverAssignment[]>(endpoint)
    if (response.success && response.data) {
      let assignments: CoDriverAssignment[] = []
      if (Array.isArray(response.data)) {
        assignments = response.data
      } else if ((response.data as any).results) {
        assignments = (response.data as any).results
      }
      // Validate and parse each assignment
      return assignments.map((assignment) => CoDriverAssignmentSchema.parse(assignment))
    }
    throw new ApiError({ message: "Failed to get co-driver assignments", status: 400 })
  },

  /**
   * Get Active Co-Driver for a Driver
   * GET /api/drivers/codriver-assignments/active/{driver_id}/
   */
  async getActiveCoDriver(driverId: string): Promise<CoDriverAssignment | null> {
    const endpoint = API_ENDPOINTS.CODRIVER_ASSIGNMENTS.ACTIVE.replace("{driver_id}", driverId)
    const response = await apiClient.get<CoDriverAssignment>(endpoint)
    if (response.success && response.data) {
      return CoDriverAssignmentSchema.parse(response.data)
    }
    // 404 means no active co-driver - return null
    if (response.error?.status === 404) {
      return null
    }
    throw new ApiError({ message: "Failed to get active co-driver", status: 400 })
  },

  /**
   * Create Co-Driver Assignment
   * POST /api/drivers/codriver-assignments/
   */
  async createCoDriverAssignment(
    data: CreateCoDriverAssignmentRequest,
  ): Promise<CoDriverAssignment> {
    const response = await apiClient.post<CoDriverAssignment>(
      API_ENDPOINTS.CODRIVER_ASSIGNMENTS.CREATE,
      data,
    )
    if (response.success && response.data) {
      return CoDriverAssignmentSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to create co-driver assignment", status: 400 })
  },

  /**
   * Update Co-Driver Assignment
   * PATCH /api/drivers/codriver-assignments/{id}/
   */
  async updateCoDriverAssignment(
    assignmentId: string,
    data: UpdateCoDriverAssignmentRequest,
  ): Promise<CoDriverAssignment> {
    const endpoint = API_ENDPOINTS.CODRIVER_ASSIGNMENTS.UPDATE.replace("{id}", assignmentId)
    const response = await apiClient.patch<CoDriverAssignment>(endpoint, data)
    if (response.success && response.data) {
      return CoDriverAssignmentSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to update co-driver assignment", status: 400 })
  },

  /**
   * Remove/Deactivate Co-Driver Assignment (helper function)
   * Sets status to 'inactive' and end_time to current time
   */
  async removeCoDriverAssignment(assignmentId: string): Promise<CoDriverAssignment> {
    return this.updateCoDriverAssignment(assignmentId, {
      status: "inactive",
      is_active: false,
      end_time: new Date().toISOString(),
    })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get Co-Driver Assignments
 */
export const useCoDriverAssignments = (
  params?: {
    driver?: string
    codriver?: string
    status?: string
    is_active?: boolean
  },
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.CODRIVER_ASSIGNMENTS, params],
    queryFn: () => codriverAssignmentsApi.getCoDriverAssignments(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook: Get Active Co-Driver for a Driver
 */
export const useActiveCoDriver = (driverId: string | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: driverId ? QUERY_KEYS.ACTIVE_CODRIVER(driverId) : ["codriver-assignments", "active"],
    queryFn: () => {
      if (!driverId) throw new Error("Driver ID is required")
      return codriverAssignmentsApi.getActiveCoDriver(driverId)
    },
    enabled: (options?.enabled !== false) && !!driverId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook: Create Co-Driver Assignment
 */
export const useCreateCoDriverAssignment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: codriverAssignmentsApi.createCoDriverAssignment,
    onSuccess: (data) => {
      // Invalidate all co-driver assignment queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CODRIVER_ASSIGNMENTS })
      if (data.driver_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACTIVE_CODRIVER(data.driver_id) })
      }
    },
    onError: (error: ApiError) => {
      console.error("Failed to create co-driver assignment:", error)
    },
  })
}

/**
 * Hook: Update Co-Driver Assignment
 */
export const useUpdateCoDriverAssignment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCoDriverAssignmentRequest }) =>
      codriverAssignmentsApi.updateCoDriverAssignment(id, data),
    onSuccess: (data) => {
      // Invalidate all co-driver assignment queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CODRIVER_ASSIGNMENTS })
      if (data.driver_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACTIVE_CODRIVER(data.driver_id) })
      }
    },
    onError: (error: ApiError) => {
      console.error("Failed to update co-driver assignment:", error)
    },
  })
}

/**
 * Hook: Remove/Deactivate Co-Driver Assignment
 */
export const useRemoveCoDriverAssignment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: string) => codriverAssignmentsApi.removeCoDriverAssignment(assignmentId),
    onSuccess: (data) => {
      // Invalidate all co-driver assignment queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CODRIVER_ASSIGNMENTS })
      if (data.driver_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACTIVE_CODRIVER(data.driver_id) })
      }
    },
    onError: (error: ApiError) => {
      console.error("Failed to remove co-driver assignment:", error)
    },
  })
}

