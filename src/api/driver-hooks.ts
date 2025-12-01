/**
 * React Query Hooks for Driver API
 *
 * Provides React Query hooks for all driver API endpoints.
 * Includes proper caching, refetch intervals, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "./client"
import { QUERY_KEYS } from "./constants"
import { driverApi } from "./driver"

// ============================================================================
// HOS Hooks
// ============================================================================

/**
 * Hook: Get Current HOS Status
 * Polls every 30 seconds when enabled
 */
export const useHOSCurrentStatus = (options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery({
    queryKey: ["driver", "hos", "current-status"],
    queryFn: () => driverApi.getCurrentHOSStatus(),
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval ?? 30000, // 30 seconds
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 5000, // Consider data stale after 5 seconds
  })
}

/**
 * Hook: Get Detailed HOS Clocks
 * On-demand (no auto-refetch)
 */
export const useHOSClocks = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["driver", "hos", "clocks"],
    queryFn: () => driverApi.getHOSClocks(),
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook: Change Duty Status
 */
export const useChangeDutyStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverApi.changeDutyStatus,
    onSuccess: () => {
      // Invalidate HOS status and clocks to refetch
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "current-status"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "clocks"] })
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "logs"] })
    },
    onError: (error: ApiError) => {
      console.error("Failed to change duty status:", error)
    },
  })
}

/**
 * Hook: Get HOS Logs
 */
export const useHOSLogs = (date: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["driver", "hos", "logs", date],
    queryFn: () => driverApi.getHOSLogs(date),
    enabled: enabled && !!date,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook: Get Violations
 */
export const useViolations = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["driver", "hos", "violations"],
    queryFn: () => driverApi.getViolations(),
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook: Certify Log
 */
export const useCertifyLog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverApi.certifyLog,
    onSuccess: (data) => {
      // Invalidate logs for the certified date
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "logs", data.date] })
    },
    onError: (error: ApiError) => {
      console.error("Failed to certify log:", error)
    },
  })
}

/**
 * Hook: Annotate Log
 */
export const useAnnotateLog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverApi.annotateLog,
    onSuccess: (data) => {
      // Invalidate logs to refetch with annotation
      queryClient.invalidateQueries({ queryKey: ["driver", "hos", "logs"] })
    },
    onError: (error: ApiError) => {
      console.error("Failed to annotate log:", error)
    },
  })
}

// ============================================================================
// Location Hooks
// ============================================================================

/**
 * Hook: Submit Single Location (Fallback)
 */
export const useSubmitLocation = () => {
  return useMutation({
    mutationFn: driverApi.submitLocation,
    onError: (error: ApiError) => {
      console.error("Failed to submit location:", error)
    },
  })
}

// Note: Location batch is handled by locationQueueService, not a hook

// ============================================================================
// Device Health Hooks
// ============================================================================

/**
 * Hook: Send Device Heartbeat
 */
export const useDeviceHeartbeat = () => {
  return useMutation({
    mutationFn: driverApi.sendHeartbeat,
    onError: (error: ApiError) => {
      console.error("Failed to send heartbeat:", error)
    },
  })
}

/**
 * Hook: Report Device Malfunction
 */
export const useReportMalfunction = () => {
  return useMutation({
    mutationFn: driverApi.reportMalfunction,
    onError: (error: ApiError) => {
      console.error("Failed to report malfunction:", error)
    },
  })
}

// ============================================================================
// Profile Hooks
// ============================================================================

/**
 * Hook: Get Driver Profile
 * Fetches current driver profile from /drivers/me/
 */
export const useDriverProfile = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["driver", "profile"],
    queryFn: () => driverApi.getDriverProfile(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================================================
// Vehicle & Trip Hooks
// ============================================================================

/**
 * Hook: Get My Assigned Vehicle
 */
export const useMyVehicle = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["driver", "vehicle"],
    queryFn: () => driverApi.getMyVehicle(),
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Hook: Get Available Vehicles
 */
export const useAvailableVehicles = (
  params?: { status?: string; search?: string },
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["driver", "vehicles", params],
    queryFn: () => driverApi.getAvailableVehicles(params),
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook: Get My Trips
 */
export const useMyTrips = (
  params?: { status?: string; start_date?: string; end_date?: string },
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["driver", "trips", params],
    queryFn: () => driverApi.getMyTrips(params),
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Hook: Get Trip Details
 */
export const useTripDetails = (tripId: string | null, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["driver", "trip", tripId],
    queryFn: () => {
      if (!tripId) throw new Error("Trip ID is required")
      return driverApi.getTripDetails(tripId)
    },
    enabled: enabled && !!tripId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// ============================================================================
// Notification Hooks
// ============================================================================

/**
 * Hook: Register Push Token
 */
export const useRegisterPushToken = () => {
  return useMutation({
    mutationFn: driverApi.registerPushToken,
    onError: (error: ApiError) => {
      console.error("Failed to register push token:", error)
    },
  })
}

/**
 * Hook: Get Notifications
 * Polls every 60 seconds when enabled
 */
export const useNotifications = (options?: {
  status?: "unread" | "read" | "all"
  limit?: number
  enabled?: boolean
  refetchInterval?: number
}) => {
  return useQuery({
    queryKey: ["driver", "notifications", options?.status || "all"],
    queryFn: () =>
      driverApi.getNotifications({
        status: options?.status,
        limit: options?.limit,
      }),
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval ?? 60000, // 60 seconds
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook: Mark Notification Read
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverApi.markNotificationRead,
    onSuccess: () => {
      // Invalidate notifications to refetch
      queryClient.invalidateQueries({ queryKey: ["driver", "notifications"] })
    },
    onError: (error: ApiError) => {
      console.error("Failed to mark notification read:", error)
    },
  })
}

/**
 * Hook: Mark All Notifications Read
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: driverApi.markAllNotificationsRead,
    onSuccess: () => {
      // Invalidate notifications to refetch
      queryClient.invalidateQueries({ queryKey: ["driver", "notifications"] })
    },
    onError: (error: ApiError) => {
      console.error("Failed to mark all notifications read:", error)
    },
  })
}
