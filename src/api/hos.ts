import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LocationData } from "@/contexts/location-context"
import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"

// ============================================================================
// HOS API Types - Updated to match backend API structure
// ============================================================================

/**
 * HOS Clock - Primary clock data structure
 */
export interface HOSClock {
  id?: string
  driver: string
  driver_name: string
  current_duty_status: string  // driving, on_duty, off_duty, sleeper_berth, personal_conveyance, yard_move
  current_duty_status_start_time: string  // ISO 8601
  
  // Time remaining (in minutes)
  driving_time_remaining: number  // 660 = 11 hours
  on_duty_time_remaining: number  // 840 = 14 hours
  cycle_time_remaining: number    // 5040 = 84 hours
  
  // Time remaining (in hours - computed)
  driving_time_remaining_hours: number
  on_duty_time_remaining_hours: number
  cycle_time_remaining_hours: number
  
  // Cycle info
  cycle_start_time: string  // ISO 8601
  cycle_type: string  // "70_hour", "60_hour", etc.
  
  // Vehicle assignment
  current_vehicle?: string
  vehicle_unit?: string
  
  // Last sync timestamp
  last_updated?: string  // ISO 8601
}

/**
 * Change Duty Status Request
 */
export interface ChangeDutyStatusRequest {
  duty_status: string  // off_duty, sleeper_berth, driving, on_duty, personal_conveyance, yard_move
  location?: string
  latitude?: number
  longitude?: number
  odometer?: number
  notes?: string
}

/**
 * Change Duty Status Response
 */
export interface ChangeDutyStatusResponse {
  status: string
  clock?: HOSClock  // Optional - API may return status only
}

/**
 * Create/Update HOS Clock Request
 */
export interface CreateUpdateHOSClockRequest {
  driver: string
  current_duty_status: string
  current_duty_status_start_time: string  // ISO 8601
  driving_time_remaining: number  // minutes
  on_duty_time_remaining: number  // minutes
  cycle_time_remaining: number    // minutes
  cycle_start_time: string  // ISO 8601
  cycle_type: string  // "70_hour", "60_hour"
}

/**
 * HOS Daily Log
 */
export interface HOSDailyLog {
  id?: string
  driver: string
  driver_name?: string
  log_date: string  // YYYY-MM-DD
  total_driving_time: number  // minutes
  total_on_duty_time: number  // minutes
  total_off_duty_time: number  // minutes
  total_sleeper_berth_time?: number  // minutes
  is_certified: boolean
  certified_at?: string
  certified_by?: string
}

/**
 * HOS Compliance Settings
 */
export interface HOSComplianceSettings {
  ruleset: string  // "usa_property_70_hour", etc.
  cycle_type: string  // "70_hour_8_day", "60_hour_7_day"
  restart_hours: number  // 34 hours for restart
  enable_16_hour_exception: boolean
  break_period_required: boolean
  break_period_minutes: number  // 30 minutes
  personal_conveyance_enabled: boolean
  yard_move_enabled: boolean
  adverse_weather_exemption_enabled?: boolean
  big_day_exemption_enabled?: boolean
  waiting_time_duty_status_enabled?: boolean
}

/**
 * HOS Log Entry (existing)
 */
export interface HOSLogEntry {
  driver: string
  duty_status: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  start_location?: string
  end_location?: string
  start_odometer?: number
  end_odometer?: number
  remark?: string
}

/**
 * HOS ELD Event (existing)
 */
export interface HOSELDEvent {
  driver: string
  event_type: string
  event_code: string
  event_data: {
    new_duty_status: string
    previous_duty_status?: string
  }
  event_time: string
  location: string
}

/**
 * Daily Logs Query Parameters
 */
export interface DailyLogsQueryParams {
  startDate?: string  // YYYY-MM-DD
  endDate?: string    // YYYY-MM-DD
  driver?: string
}

// ============================================================================
// Status Remarks mapping
// ============================================================================

export const STATUS_REMARKS: Record<string, string> = {
  driving: "Regular driving activity",
  on_duty: "On duty - not driving",
  off_duty: "Off duty - rest break",
  sleeper_berth: "Sleeper berth - rest period",
  personal_conveyance: "Personal conveyance - personal use",
  yard_move: "Yard move - repositioning vehicle",
}

// ============================================================================
// HOS API Service Functions
// ============================================================================

export const hosApi = {
  /**
   * Get Current HOS Clock for Driver (Primary Sync Endpoint)
   * GET /api/hos/clocks/
   * Returns paginated response with results array
   */
  async getCurrentHOSClock(): Promise<HOSClock | null> {
    const response = await apiClient.get<any>(API_ENDPOINTS.HOS.GET_CLOCKS)
    if (response.success && response.data) {
      // Handle paginated response with results array
      if (response.data.results && Array.isArray(response.data.results)) {
        // Return the first clock (most recent/active) or find by driver ID
        // For now, return the first one. If needed, we can match by driver ID later
        const clocks = response.data.results as HOSClock[]
        if (clocks.length > 0) {
          console.log('✅ HOS API: Found', clocks.length, 'clock(s), using first one:', clocks[0].id)
          return clocks[0]
        }
      }
      // Handle array response (legacy format)
      if (Array.isArray(response.data)) {
        console.log('✅ HOS API: Found array response with', response.data.length, 'clock(s)')
        return response.data[0] as HOSClock
      }
      // Handle single object response
      if (response.data.id) {
        console.log('✅ HOS API: Found single clock:', response.data.id)
        return response.data as HOSClock
      }
    }
    console.warn('⚠️ HOS API: No clock found in response')
    return null
  },

  /**
   * Get Specific HOS Clock by ID
   * GET /api/hos/clocks/{clock_id}/
   */
  async getHOSClockById(clockId: string): Promise<HOSClock> {
    const endpoint = API_ENDPOINTS.HOS.GET_CLOCK.replace("{id}", clockId)
    const response = await apiClient.get<HOSClock>(endpoint)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to fetch HOS clock', status: 404 })
  },

  /**
   * Change Duty Status
   * POST /api/hos/clocks/{clock_id}/change_duty_status/
   */
  async changeDutyStatus(
    clockId: string, 
    request: ChangeDutyStatusRequest
  ): Promise<ChangeDutyStatusResponse> {
    const endpoint = API_ENDPOINTS.HOS.CHANGE_DUTY_STATUS.replace("{id}", clockId)
    console.log('📡 HOS API: changeDutyStatus called', {
      clockId,
      endpoint,
      request: JSON.stringify(request, null, 2),
    })
    const response = await apiClient.post<ChangeDutyStatusResponse>(endpoint, request)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to change duty status', status: 400 })
  },

  /**
   * Create HOS Clock
   * POST /api/hos/clocks/
   */
  async createHOSClock(clockData: CreateUpdateHOSClockRequest): Promise<HOSClock> {
    const response = await apiClient.post<HOSClock>(API_ENDPOINTS.HOS.CREATE_CLOCK, clockData)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to create HOS clock', status: 400 })
  },

  /**
   * Update HOS Clock
   * PATCH /api/hos/clocks/{clock_id}/
   */
  async updateHOSClock(
    clockId: string, 
    clockData: Partial<CreateUpdateHOSClockRequest>
  ): Promise<HOSClock> {
    const endpoint = API_ENDPOINTS.HOS.UPDATE_CLOCK.replace("{id}", clockId)
    const response = await apiClient.patch<HOSClock>(endpoint, clockData)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to update HOS clock', status: 400 })
  },

  /**
   * Get HOS Daily Logs
   * GET /api/hos/daily-logs/
   * GET /api/hos/daily-logs/?startDate=2025-11-01&endDate=2025-11-02
   */
  async getDailyLogs(params?: DailyLogsQueryParams): Promise<HOSDailyLog[]> {
    let endpoint = API_ENDPOINTS.HOS.GET_DAILY_LOGS
    
    // Add query parameters
    if (params) {
      const queryParams = new URLSearchParams()
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.driver) queryParams.append('driver', params.driver)
      
      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }
    
    const response = await apiClient.get<HOSDailyLog[]>(endpoint)
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [response.data]
    }
    return []
  },

  /**
   * Get Compliance Settings
   * GET /api/hos/compliance-settings/
   */
  async getComplianceSettings(): Promise<HOSComplianceSettings> {
    const response = await apiClient.get<HOSComplianceSettings>(API_ENDPOINTS.HOS.GET_COMPLIANCE_SETTINGS)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to fetch compliance settings', status: 404 })
  },

  // ============================================================================
  // Legacy/Existing API Functions (maintained for compatibility)
  // ============================================================================

  /**
   * Create HOS Log Entry (legacy)
   */
  async createHOSLogEntry(logData: HOSLogEntry) {
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_LOG_ENTRY, logData)
    return response.data
  },

  /**
   * Create Daily HOS Log (legacy)
   */
  async createDailyHOSLog(dailyLogData: HOSDailyLog) {
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_DAILY_LOG, dailyLogData)
    return response.data
  },

  /**
   * Create HOS ELD Event (legacy)
   */
  async createHOSELDEvent(eventData: HOSELDEvent) {
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_ELD_EVENT, eventData)
    return response.data
  },

  /**
   * Certify HOS Log (legacy)
   */
  async certifyHOSLog(logId: string) {
    const endpoint = API_ENDPOINTS.HOS.CERTIFY_LOG.replace("{id}", logId)
    const response = await apiClient.patch(endpoint)
    return response.data
  },

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Format location for API
   */
  formatLocationForAPI(location: LocationData): string {
    if (location.address) {
      return location.address
    }
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
  },

  /**
   * Get status remark
   */
  getStatusRemark(status: string): string {
    return STATUS_REMARKS[status] || "Status change"
  },

  /**
   * Convert timestamp to ISO string
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString()
  },

  /**
   * Convert app status format to API format
   */
  getAPIDutyStatus(appStatus: string): string {
    const statusMap: Record<string, string> = {
      driving: "driving",
      onDuty: "on_duty",
      offDuty: "off_duty",
      sleeperBerth: "sleeper_berth",
      personalConveyance: "personal_conveyance",
      yardMoves: "yard_move",
    }
    return statusMap[appStatus] || appStatus
  },

  /**
   * Convert API status format to app format
   */
  getAppDutyStatus(apiStatus: string): string {
    const statusMap: Record<string, string> = {
      driving: "driving",
      on_duty: "onDuty",
      off_duty: "offDuty",
      sleeper_berth: "sleeperBerth",
      personal_conveyance: "personalConveyance",
      yard_move: "yardMoves",
    }
    return statusMap[apiStatus] || apiStatus
  },
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook: Get Current HOS Clock
 * Primary sync endpoint - used on app startup and periodic refresh
 */
export const useHOSClock = (options?: {
  enabled?: boolean
  refetchInterval?: number  // Default: 60 seconds (60000ms)
  refetchIntervalInBackground?: boolean
}) => {
  return useQuery<HOSClock | null>({
    queryKey: QUERY_KEYS.HOS_CLOCKS,
    queryFn: async () => {
      try {
        const clock = await hosApi.getCurrentHOSClock()
        return clock
      } catch (error) {
        console.error('❌ useHOSClock: Error fetching clock:', error)
        // Return null instead of throwing so the query doesn't fail
        return null
      }
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval ?? 60000,  // Default: 60 seconds
    refetchIntervalInBackground: options?.refetchIntervalInBackground ?? false,
    staleTime: 30000,  // 30 seconds - data is fresh for 30s
    retry: (failureCount, error) => {
      // Don't retry on 404 (no clock exists yet)
      if (error instanceof ApiError && error.status === 404) {
        return false
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook: Get Specific HOS Clock by ID
 */
export const useHOSClockById = (clockId: string | null | undefined, options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.HOS_CLOCK(clockId || ''),
    queryFn: () => {
      if (!clockId) throw new Error('Clock ID is required')
      return hosApi.getHOSClockById(clockId)
    },
    enabled: options?.enabled !== false && !!clockId,
    staleTime: 30000,  // 30 seconds
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) {
        return false
      }
      return failureCount < 3
    },
  })
}

/**
 * Hook: Change Duty Status
 */
export const useChangeDutyStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clockId, request }: { clockId: string; request: ChangeDutyStatusRequest }) =>
      hosApi.changeDutyStatus(clockId, request),
    onSuccess: (data) => {
      console.log('✅ useChangeDutyStatus: API response received', data)
      
      // If clock data is included in response, update cache
      if (data.clock) {
        console.log('✅ useChangeDutyStatus: Updating cache with clock data', data.clock.id)
        queryClient.setQueryData(QUERY_KEYS.HOS_CLOCKS, data.clock)
        if (data.clock.id) {
          queryClient.setQueryData(QUERY_KEYS.HOS_CLOCK(data.clock.id), data.clock)
        }
      } else {
        console.log('⚠️ useChangeDutyStatus: No clock data in response, invalidating to refetch')
      }
      
      // Always invalidate and refetch to ensure we have latest data
      // This handles cases where API returns status only without clock data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_CLOCKS })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_DAILY_LOGS })
    },
    onError: (error: ApiError) => {
      console.error('❌ useChangeDutyStatus: Failed to change duty status:', error)
    },
  })
}

/**
 * Hook: Create HOS Clock
 */
export const useCreateHOSClock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: hosApi.createHOSClock,
    onSuccess: (data) => {
      // Add new clock to cache
      queryClient.setQueryData(QUERY_KEYS.HOS_CLOCKS, data)
      if (data.id) {
        queryClient.setQueryData(QUERY_KEYS.HOS_CLOCK(data.id), data)
      }
      
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_CLOCKS })
    },
    onError: (error: ApiError) => {
      console.error('Failed to create HOS clock:', error)
    },
  })
}

/**
 * Hook: Update HOS Clock
 */
export const useUpdateHOSClock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clockId, clockData }: { clockId: string; clockData: Partial<CreateUpdateHOSClockRequest> }) =>
      hosApi.updateHOSClock(clockId, clockData),
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(QUERY_KEYS.HOS_CLOCKS, data)
      if (data.id) {
        queryClient.setQueryData(QUERY_KEYS.HOS_CLOCK(data.id), data)
      }
      
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_CLOCKS })
    },
    onError: (error: ApiError) => {
      console.error('Failed to update HOS clock:', error)
    },
  })
}

/**
 * Hook: Get HOS Daily Logs
 */
export const useDailyLogs = (params?: DailyLogsQueryParams, options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.HOS_DAILY_LOGS, params],
    queryFn: () => hosApi.getDailyLogs(params),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,  // 5 minutes - daily logs don't change frequently
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) {
        return false
      }
      return failureCount < 2
    },
  })
}

/**
 * Hook: Get Compliance Settings
 */
export const useComplianceSettings = (options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.HOS_COMPLIANCE_SETTINGS,
    queryFn: hosApi.getComplianceSettings,
    enabled: options?.enabled !== false,
    staleTime: 30 * 60 * 1000,  // 30 minutes - settings rarely change
    cacheTime: 60 * 60 * 1000,  // Keep in cache for 1 hour
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) {
        return false
      }
      return failureCount < 2
    },
  })
}

/**
 * Hook: Certify HOS Log (legacy)
 */
export const useCertifyHOSLog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: hosApi.certifyHOSLog,
    onSuccess: () => {
      // Invalidate daily logs to reflect certification
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_DAILY_LOGS })
    },
    onError: (error: ApiError) => {
      console.error('Failed to certify HOS log:', error)
    },
  })
}
