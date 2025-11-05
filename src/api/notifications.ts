import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from './client'
import { API_ENDPOINTS, QUERY_KEYS } from './constants'

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 
  | 'pending_edit' 
  | 'certification_reminder' 
  | 'malfunction_alert' 
  | 'violation_warning'
  | 'profile_change_approved'
  | 'profile_change_rejected'
  | 'general'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  action?: string
  timestamp: string
  is_read: boolean
  data?: Record<string, any>
}

export interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
}

// ============================================================================
// Malfunction Types
// ============================================================================

export type MalfunctionType = 
  | 'power_compliance'    // M1
  | 'engine_sync'         // M2
  | 'missing_data'        // M3
  | 'data_transfer'       // M4
  | 'unidentified_driver' // M5
  | 'other'               // M6

export interface Malfunction {
  id: string
  type: MalfunctionType
  diagnostic_code: string
  status: 'active' | 'resolved' | 'pending'
  description: string
  symptoms?: string
  reported_at: string
  resolution_deadline: string
  location?: {
    latitude: number
    longitude: number
  }
}

export interface ReportMalfunctionRequest {
  malfunction_type: MalfunctionType
  diagnostic_code: string
  description: string
  symptoms?: string
  location?: {
    latitude: number
    longitude: number
  }
}

export interface ReportMalfunctionResponse {
  success: boolean
  message: string
  malfunction: Malfunction
  important_info: {
    manual_logging_required: boolean
    resolution_deadline_days: number
    message: string
  }
}

export interface MalfunctionStatusResponse {
  active_malfunctions: Malfunction[]
  resolved_malfunctions: Malfunction[]
  manual_logging_required: boolean
}

export interface RegisterPushTokenRequest {
  push_token: string
  device_type: 'ios' | 'android'
  device_id?: string
}

export interface RegisterPushTokenResponse {
  success: boolean
  message: string
}

// ============================================================================
// Notifications API Service
// ============================================================================

export const notificationsApi = {
  /**
   * Get Driver Notifications
   * GET /driver/notifications/
   */
  async getNotifications(): Promise<NotificationsResponse> {
    const response = await apiClient.get<NotificationsResponse>('/driver/notifications/')
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to get notifications', status: 400 })
  },

  /**
   * Mark Notification as Read
   * POST /driver/notifications/{id}/mark-read/
   */
  async markAsRead(notificationId: string): Promise<{
    success: boolean
    message: string
    notification: {
      id: string
      read: boolean
      read_at: string
    }
  }> {
    const response = await apiClient.post<{
      success: boolean
      message: string
      notification: {
        id: string
        read: boolean
        read_at: string
      }
    }>(
      `/driver/notifications/${notificationId}/mark-read/`,
      {}
    )
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to mark notification as read', status: 400 })
  },

  /**
   * Mark All Notifications as Read
   * POST /driver/notifications/mark-all-read/
   */
  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      '/driver/notifications/mark-all-read/',
      {}
    )
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to mark all notifications as read', status: 400 })
  },

  /**
   * Report Malfunction
   * POST /driver/report-malfunction/
   */
  async reportMalfunction(data: ReportMalfunctionRequest): Promise<ReportMalfunctionResponse> {
    const response = await apiClient.post<ReportMalfunctionResponse>(
      '/driver/report-malfunction/',
      data
    )
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to report malfunction', status: 400 })
  },

  /**
   * Get Malfunction Status
   * GET /driver/malfunction-status/
   */
  async getMalfunctionStatus(): Promise<MalfunctionStatusResponse> {
    const response = await apiClient.get<MalfunctionStatusResponse>(
      '/driver/malfunction-status/'
    )
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to get malfunction status', status: 400 })
  },

  /**
   * Register Push Notification Token
   * POST /driver/register-push-token/
   */
  async registerPushToken(data: RegisterPushTokenRequest): Promise<RegisterPushTokenResponse> {
    const response = await apiClient.post<RegisterPushTokenResponse>(
      '/driver/register-push-token/',
      data
    )
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to register push token', status: 400 })
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get Notifications
 * Auto-refreshes every 30 seconds to check for new notifications
 */
export const useNotifications = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: notificationsApi.getNotifications,
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchIntervalInBackground: true, // Keep polling in background
  })
}

/**
 * Hook: Mark Notification as Read
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS })

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<NotificationsResponse>(QUERY_KEYS.NOTIFICATIONS)

      // Optimistically update the notification to read
      if (previousNotifications) {
        queryClient.setQueryData<NotificationsResponse>(QUERY_KEYS.NOTIFICATIONS, {
          ...previousNotifications,
          notifications: previousNotifications.notifications.map((notif) =>
            notif.id === notificationId
              ? { ...notif, is_read: true }
              : notif
          ),
          unread_count: Math.max(0, (previousNotifications.unread_count || 0) - 1),
        })
      }

      // Return context for rollback
      return { previousNotifications }
    },
    onSuccess: (data, notificationId) => {
      // Update with actual response data
      queryClient.setQueryData<NotificationsResponse>(QUERY_KEYS.NOTIFICATIONS, (old) => {
        if (!old) return old

        return {
          ...old,
          notifications: old.notifications.map((notif) =>
            notif.id === notificationId
              ? { ...notif, is_read: true }
              : notif
          ),
          unread_count: Math.max(0, (old.unread_count || 0) - 1),
        }
      })
    },
    onError: (error, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(QUERY_KEYS.NOTIFICATIONS, context.previousNotifications)
      }
      console.error('Failed to mark notification as read:', error)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS })
    },
  })
}

/**
 * Hook: Mark All Notifications as Read
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS })
    },
    onError: (error: ApiError) => {
      console.error('Failed to mark all notifications as read:', error)
    },
  })
}

/**
 * Hook: Report Malfunction
 */
export const useReportMalfunction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notificationsApi.reportMalfunction,
    onSuccess: () => {
      // Invalidate both notifications and malfunction status
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS })
      queryClient.invalidateQueries({ queryKey: ['malfunction_status'] })
    },
    onError: (error: ApiError) => {
      console.error('Failed to report malfunction:', error)
    },
  })
}

/**
 * Hook: Get Malfunction Status
 */
export const useMalfunctionStatus = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['malfunction_status'],
    queryFn: notificationsApi.getMalfunctionStatus,
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Poll every minute
  })
}
