import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { useAuthStore } from "@/stores/authStore"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const DriverStatusSchema = z.object({
  is_active: z.boolean().optional(),
  employment_status: z.string().optional(),
  current_status: z.string().optional(),
})

export const DriverTeamSchema = z.object({
  id: z.string(),
  organization: z.string(),
  organization_name: z.string().optional(),
  primary_driver: z.string(),
  primary_driver_id: z.string().optional(),
  primary_driver_name: z.string().optional(),
  primary_driver_email: z.string().optional(),
  primary_driver_status: DriverStatusSchema.optional(),
  codriver: z.string(),
  codriver_id: z.string().optional(),
  codriver_name: z.string().optional(),
  codriver_email: z.string().optional(),
  codriver_status: DriverStatusSchema.optional(),
  // Backend may return vehicle as number or string - normalize to string
  vehicle: z
    .union([z.string(), z.number()])
    .transform((val) => (val === null || val === undefined ? null : String(val)))
    .nullable()
    .optional(),
  vehicle_id: z.string().optional(),
  vehicle_name: z.string().optional(),
  status: z.enum(["active", "inactive", "completed"]),
  is_active: z.boolean().optional(),
  created_by: z.string().optional(),
  created_by_name: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  codriver_created: z.boolean().optional(),
  codriver_credentials_sent: z.boolean().optional(),
  codriver_found_by_license: z.boolean().optional(),
  auto_approved: z.boolean().optional(),
  requested_by: z.string().optional(),
})

// Type exports from Zod schemas
export type DriverTeam = z.infer<typeof DriverTeamSchema>
export type DriverStatus = z.infer<typeof DriverStatusSchema>

export interface UpdateTeamStatusRequest {
  status: "active" | "inactive" | "completed"
  driver_id: string // Required field - ID of driver making the change
  reason?: string
}

export interface TeamRequestData {
  // Option 1: Use existing co-driver by UUID
  codriver?: string

  // Option 2: Simplified - just name and license (RECOMMENDED)
  codriver_name?: string
  codriver_license_number?: string
  codriver_license_state?: string

  // Option 3: Full co-driver details
  codriver_data?: {
    email: string
    firstName: string
    lastName: string
    password: string
    phone?: string
    driver_license?: string
    license_state?: string
    license_expiry?: string
    company_driver_id?: string
    hire_date?: string
    notes?: string
  }
  vehicle?: string // UUID of vehicle (optional)
  notes?: string // Optional notes
}

export interface TeamRequestResponse extends DriverTeam {
  auto_approved: boolean
  requested_by: string
  codriver_created?: boolean
  codriver_credentials_sent?: boolean
}

// ============================================================================
// Driver Team API Service
// ============================================================================

export const driverTeamsApi = {
  /**
   * Get Driver Teams
   * GET /api/drivers/teams/
   * Response format: Paginated { count: number, next: null, previous: null, results: DriverTeam[] }
   */
  async getDriverTeams(params?: {
    status?: string
    primary_driver?: string
    codriver?: string
    is_active?: boolean
  }): Promise<DriverTeam[]> {
    let endpoint = API_ENDPOINTS.DRIVER_TEAMS.LIST

    if (params) {
      const queryParams = new URLSearchParams()
      if (params.status) queryParams.append("status", params.status)
      if (params.primary_driver) queryParams.append("primary_driver", params.primary_driver)
      if (params.codriver) queryParams.append("codriver", params.codriver)
      if (params.is_active !== undefined) queryParams.append("is_active", String(params.is_active))

      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }

    // Paginated response format: { count: number, next: null, previous: null, results: DriverTeam[] }
    const response = await apiClient.get<{
      count: number
      next: string | null
      previous: string | null
      results: DriverTeam[]
    }>(endpoint)
    if (response.success && response.data) {
      // Validate and parse each team from results array
      return response.data.results.map((team) => DriverTeamSchema.parse(team))
    }
    throw new ApiError({ message: "Failed to get driver teams", status: 400 })
  },

  /**
   * Get Team Details
   * GET /api/drivers/teams/{id}/
   */
  async getTeamDetails(teamId: string): Promise<DriverTeam> {
    const endpoint = API_ENDPOINTS.DRIVER_TEAMS.DETAILS.replace("{id}", teamId)
    const response = await apiClient.get<DriverTeam>(endpoint)
    if (response.success && response.data) {
      return DriverTeamSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to get team details", status: 400 })
  },

  /**
   * Update Team Status
   * PATCH /api/drivers/teams/{id}/status/
   */
  async updateTeamStatus(
    teamId: string,
    data: UpdateTeamStatusRequest,
  ): Promise<DriverTeam> {
    const endpoint = API_ENDPOINTS.DRIVER_TEAMS.STATUS.replace("{id}", teamId)
    const response = await apiClient.patch<DriverTeam>(endpoint, data)
    if (response.success && response.data) {
      return DriverTeamSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to update team status", status: 400 })
  },

  /**
   * Request Team (Auto-Approved)
   * POST /api/drivers/teams/request-team/
   * Team is created immediately - no admin approval needed
   */
  async requestTeam(data: TeamRequestData): Promise<TeamRequestResponse> {
    const endpoint = API_ENDPOINTS.DRIVER_TEAMS.REQUEST
    const response = await apiClient.post<TeamRequestResponse>(endpoint, data)
    if (response.success && response.data) {
      return DriverTeamSchema.parse(response.data)
    }
    throw new ApiError({ message: "Failed to request team", status: 400 })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get Driver Teams
 */
export const useDriverTeams = (
  params?: {
    status?: string
    primary_driver?: string
    codriver?: string
    is_active?: boolean
  },
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.DRIVER_TEAMS, params],
    queryFn: () => driverTeamsApi.getDriverTeams(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook: Get Team Details
 */
export const useTeamDetails = (teamId: string | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: teamId ? QUERY_KEYS.DRIVER_TEAM(teamId) : ["driver-teams", "details"],
    queryFn: () => {
      if (!teamId) throw new Error("Team ID is required")
      return driverTeamsApi.getTeamDetails(teamId)
    },
    enabled: (options?.enabled !== false) && !!teamId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook: Update Team Status
 */
export const useUpdateTeamStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamStatusRequest }) => {
      // Ensure driver_id is included - get from authStore if not provided
      const { driverProfile } = useAuthStore.getState()
      if (!data.driver_id && driverProfile?.driver_id) {
        data.driver_id = driverProfile.driver_id
      }
      if (!data.driver_id) {
        throw new Error("Driver ID is required to update team status")
      }
      return driverTeamsApi.updateTeamStatus(id, data)
    },
    onSuccess: (data) => {
      // Invalidate all team queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVER_TEAMS })
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVER_TEAM(data.id) })
      }
      if (data.primary_driver_id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ACTIVE_TEAM(data.primary_driver_id),
        })
      }

      // CRITICAL: Invalidate HOS queries when team is activated/deactivated
      // This ensures HOS clock switches between driver and co-driver data
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "current-status"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "clocks"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "logs"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "violations"] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_CLOCKS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_DAILY_LOGS })
      queryClient.invalidateQueries({ queryKey: ["hos_logs"] })
    },
    onError: (error: ApiError) => {
      console.error("Failed to update team status:", error)
    },
  })
}

/**
 * Hook: Request Team (Auto-Approved)
 */
export const useRequestTeam = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverTeamsApi.requestTeam,
    onSuccess: (data) => {
      // Invalidate teams to refetch - team is created immediately
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVER_TEAMS })
      if (data.primary_driver_id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ACTIVE_TEAM(data.primary_driver_id),
        })
      }

      // CRITICAL: Invalidate HOS queries so they refetch with new effective driver ID
      // This ensures HOS clock updates when team is created/activated
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "current-status"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "clocks"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "logs"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "violations"] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_CLOCKS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_DAILY_LOGS })
      queryClient.invalidateQueries({ queryKey: ["hos_logs"] })
    },
    onError: (error: ApiError) => {
      console.error("Failed to request team:", error)
    },
  })
}

