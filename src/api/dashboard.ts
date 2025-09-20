import { useQuery } from '@tanstack/react-query'
import { apiClient, ApiError } from './client'
import { API_ENDPOINTS, QUERY_KEYS } from './constants'

// Dashboard data interfaces
export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  totalRevenue: number
  monthlyRevenue: number
  growthRate: number
}

export interface ActivityItem {
  id: string
  type: 'login' | 'registration' | 'profile_update' | 'password_change'
  description: string
  timestamp: Date
  userId: string
  userEmail: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  isRead: boolean
  timestamp: Date
  actionUrl?: string
}

// Dashboard API functions
export const dashboardApi = {
  // Get dashboard statistics
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>(API_ENDPOINTS.DASHBOARD.STATS)
    
    if (!response.success || !response.data) {
      throw new ApiError({
        message: response.message || 'Failed to fetch dashboard stats',
        status: 500,
      })
    }
    
    return response.data
  },

  // Get recent activity
  async getRecentActivity(): Promise<ActivityItem[]> {
    const response = await apiClient.get<ActivityItem[]>(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITY)
    
    if (!response.success || !response.data) {
      throw new ApiError({
        message: response.message || 'Failed to fetch recent activity',
        status: 500,
      })
    }
    
    return response.data
  },

  // Get notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const response = await apiClient.get<NotificationItem[]>(API_ENDPOINTS.DASHBOARD.NOTIFICATIONS)
    
    if (!response.success || !response.data) {
      throw new ApiError({
        message: response.message || 'Failed to fetch notifications',
        status: 500,
      })
    }
    
    return response.data
  },
}

// React Query hooks for dashboard
export const useDashboardStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_STATS,
    queryFn: dashboardApi.getStats,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

export const useRecentActivity = () => {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_ACTIVITY,
    queryFn: dashboardApi.getRecentActivity,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}

export const useNotifications = () => {
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: dashboardApi.getNotifications,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 1 * 60 * 1000, // Refetch every minute
  })
}
