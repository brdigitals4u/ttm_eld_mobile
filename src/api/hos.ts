import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LocationData } from "@/contexts/location-context"
import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS, QUERY_KEYS } from "./constants"
import { useAuthStore } from '@/stores/authStore'

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
 * Create HOS Log Entry Request
 * POST /api/hos/logs/
 * Required: driver, duty_status, start_time, remark
 */
export interface CreateHOSLogEntryRequest {
  driver: string  // ✅ REQUIRED: Driver UUID
  duty_status: string  // ✅ REQUIRED: duty status
  start_time: string  // ✅ REQUIRED: ISO 8601 DateTime
  remark: string  // ✅ REQUIRED: Notes/reason for status change
  vehicle?: number  // Optional: Vehicle ID
  end_time?: string  // Optional: ISO 8601 DateTime (null for ongoing logs)
  duration_minutes?: number  // Optional: Duration in minutes
  start_location?: string  // Optional: Location string
  end_location?: string  // Optional: End location string
  start_odometer?: number  // Optional: Starting odometer reading
  end_odometer?: number  // Optional: Ending odometer reading
  is_certified?: boolean  // Optional: Default false
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
  driver?: string     // Driver UUID - Should match the driver from hosClock
}

/**
 * HOS Logs Query Parameters (Individual entries)
 */
export interface HOSLogsQueryParams {
  driver?: string     // Driver UUID - Will be sent as driver_id to API
  driver_id?: string  // Driver UUID - Should match the driver from hosClock
  startDate?: string  // YYYY-MM-DD format (sent as start_date to API)
  endDate?: string    // YYYY-MM-DD format (sent as end_date to API)
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
   * 
   * @param driverId Optional driver ID to filter clocks. If provided, will find the clock matching this driver.
   */
  async getCurrentHOSClock(driverId?: string): Promise<HOSClock | null> {
    const response = await apiClient.get<any>(API_ENDPOINTS.HOS.GET_CLOCKS)
    if (response.success && response.data) {
      // Handle paginated response with results array
      if (response.data.results && Array.isArray(response.data.results)) {
        const clocks = response.data.results as HOSClock[]
        
        // If driverId provided, find the clock matching this driver
        if (driverId && clocks.length > 0) {
          const matchingClock = clocks.find(clock => clock.driver === driverId)
          if (matchingClock) {
            console.log('✅ HOS API: Found matching clock for driver', driverId, ':', matchingClock.id)
            console.log('📋 Clock details:', {
              clockId: matchingClock.id,
              driverId: matchingClock.driver,
              driverName: matchingClock.driver_name,
              status: matchingClock.current_duty_status,
            })
            return matchingClock
          } else {
            console.warn('⚠️ HOS API: No clock found for driver', driverId, '- available drivers:', clocks.map(c => c.driver))
            // Fallback to first clock if no match found
            if (clocks.length > 0) {
              console.log('⚠️ HOS API: Using first clock as fallback:', clocks[0].id)
              return clocks[0]
            }
          }
        }
        
        // No driverId provided or no match found - return first clock
        if (clocks.length > 0) {
          console.log('✅ HOS API: Found', clocks.length, 'clock(s), using first one:', clocks[0].id)
          if (driverId) {
            console.warn('⚠️ HOS API: No matching clock found for driver', driverId, '- using first available clock')
          }
          return clocks[0]
        }
      }
      // Handle array response (legacy format)
      if (Array.isArray(response.data)) {
        const clocks = response.data as HOSClock[]
        if (driverId && clocks.length > 0) {
          const matchingClock = clocks.find(clock => clock.driver === driverId)
          if (matchingClock) {
            console.log('✅ HOS API: Found matching clock for driver', driverId, ':', matchingClock.id)
            return matchingClock
          }
        }
        console.log('✅ HOS API: Found array response with', clocks.length, 'clock(s)')
        return clocks.length > 0 ? clocks[0] : null
      }
      // Handle single object response
      if (response.data.id) {
        const clock = response.data as HOSClock
        if (driverId && clock.driver !== driverId) {
          console.warn('⚠️ HOS API: Single clock driver', clock.driver, 'does not match requested driver', driverId)
        }
        console.log('✅ HOS API: Found single clock:', clock.id)
        return clock
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
   * Also creates a log entry via POST /api/hos/logs/
   */
  async changeDutyStatus(
    clockId: string, 
    request: ChangeDutyStatusRequest,
    options?: {
      driverId?: string  // Driver UUID for log entry
      vehicleId?: number  // Vehicle ID for log entry
      previousClock?: HOSClock  // Previous clock state to get start_time for log
    }
  ): Promise<ChangeDutyStatusResponse> {
    const endpoint = API_ENDPOINTS.HOS.CHANGE_DUTY_STATUS.replace("{id}", clockId)
    console.log('📡 HOS API: changeDutyStatus called', {
      clockId,
      endpoint,
      request: JSON.stringify(request, null, 2),
    })
    
    try {
      const response = await apiClient.post<ChangeDutyStatusResponse>(endpoint, request)
      
      console.log('🔍 HOS API: Response check:', {
        success: response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataValue: response.data,
        fullResponse: JSON.stringify(response, null, 2),
      })
      
      // Always try to create log entry after successful status change, regardless of response structure
      if (response.success) {
        // After successfully changing duty status, create a log entry
        // Get driverId from global auth store (most reliable source)
        const authState = useAuthStore.getState()
        const driverId = authState.driverProfile?.driver_id
        
        console.log('📋 HOS API: Checking if should create log entry:', {
          authStoreHasDriverProfile: !!authState.driverProfile,
          driverIdFromAuthStore: authState.driverProfile?.driver_id,
          driverProfileName: authState.driverProfile?.name,
          driverProfileEmail: authState.driverProfile?.email,
          driverIdFromOptions: options?.driverId,
          driverIdFromPreviousClock: options?.previousClock?.driver,
          driverIdFromResponse: response.data?.clock?.driver,
          finalDriverId: driverId,
          willCreateLog: !!driverId,
        })
        
        // If no driverId found, log detailed auth state for debugging
        if (!driverId) {
          console.error('❌ HOS API: No driverId found from auth store!', {
            authState: {
              isAuthenticated: authState.isAuthenticated,
              hasDriverProfile: !!authState.driverProfile,
              driverProfileKeys: authState.driverProfile ? Object.keys(authState.driverProfile) : [],
              driverProfile: authState.driverProfile,
            },
            options: options,
            responseClock: response.data?.clock,
          })
        }
        
        if (driverId) {
          try {
            const startTime = new Date().toISOString()
            
            const logEntryRequest: CreateHOSLogEntryRequest = {
              driver: driverId,
              duty_status: request.duty_status,
              start_time: startTime,
              remark: request.notes || "Status change",
              // Optional fields
              vehicle: options?.vehicleId,
              start_location: request.location || undefined,
              start_odometer: request.odometer || undefined,
              is_certified: false,
            }
            
            // Include lat/lng in location if available
            if (request.latitude !== undefined && request.longitude !== undefined) {
              if (!logEntryRequest.start_location) {
                logEntryRequest.start_location = `${request.latitude.toFixed(6)}, ${request.longitude.toFixed(6)}`
              }
            }
            
            console.log('📝 HOS API: Creating log entry with:', JSON.stringify(logEntryRequest, null, 2))
            await this.createHOSLogEntry(logEntryRequest)
            console.log('✅ HOS API: Log entry created successfully')
          } catch (error) {
            // Log error but don't fail the status change
            console.error('❌ HOS API: Failed to create log entry (non-fatal):', error)
          }
        } else {
          console.warn('⚠️ HOS API: Skipping log entry creation - no driverId available', {
            options: options,
            responseData: response.data,
          })
        }
        
        return response.data || { status: 'duty status changed' }
      } else {
        console.error('❌ HOS API: changeDutyStatus failed - response.success is false')
        throw new ApiError({ message: 'Failed to change duty status', status: 400 })
      }
    } catch (error) {
      console.error('❌ HOS API: changeDutyStatus error:', error)
      throw error
    }
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
   * Get HOS Daily Logs (Aggregated summaries)
   * GET /api/hos/daily-logs/
   * GET /api/hos/daily-logs/?startDate=2025-11-01&endDate=2025-11-02
   * 
   * Note: Daily logs are aggregated summaries created at end of day or when certified.
   * For individual log entries (available immediately after status change), use getHOSLogs().
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
    
    const response = await apiClient.get<any>(endpoint)
    if (!response.success || !response.data) {
      return []
    }

    const { data } = response

    // Handle paginated responses: { count, next, previous, results: [...] }
    if (Array.isArray(data?.results)) {
      return data.results as HOSDailyLog[]
    }

    // Handle standard array response
    if (Array.isArray(data)) {
      return data as HOSDailyLog[]
    }

    // Handle single object response
    if (data?.id) {
      return [data as HOSDailyLog]
    }

    return []
  },

  /**
   * Get HOS Logs (Individual entries - available immediately after status change)
   * GET /api/hos/logs/
   * GET /api/hos/logs/?driver_id=DRIVER_ID&start_date=2025-11-02&end_date=2025-11-02
   * 
   * Returns individual log entries for each duty status change.
   * These are available immediately after status changes, unlike daily logs which are aggregated.
   */
  async getHOSLogs(params?: HOSLogsQueryParams): Promise<HOSLogEntry[]> {
    let endpoint = API_ENDPOINTS.HOS.GET_HOS_LOGS
    
    // Add query parameters
    if (params) {
      const queryParams = new URLSearchParams()
      
      // Use driver_id (preferred) or fallback to driver for backwards compatibility
      const driverId = params.driver_id || params.driver
      if (driverId) {
        queryParams.append('driver_id', driverId)
      }
      
      // Use start_date and end_date in YYYY-MM-DD format
      if (params.startDate) {
        queryParams.append('start_date', params.startDate)
      }
      if (params.endDate) {
        queryParams.append('end_date', params.endDate)
      }
      
      const queryString = queryParams.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }
    
    const response = await apiClient.get<any>(endpoint)
    if (response.success && response.data) {
      // Handle paginated response with results array
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log('✅ HOS API: Found paginated response with', response.data.results.length, 'log entries')
        return response.data.results as HOSLogEntry[]
      }
      // Handle array response (legacy format)
      if (Array.isArray(response.data)) {
        console.log('✅ HOS API: Found array response with', response.data.length, 'log entries')
        return response.data as HOSLogEntry[]
      }
      // Handle single object response
      if (response.data.id) {
        console.log('✅ HOS API: Found single log entry')
        return [response.data as HOSLogEntry]
      }
      console.warn('⚠️ HOS API: Unexpected response format:', response.data)
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
   * Create HOS Log Entry
   * POST /api/hos/logs/
   * Required fields: driver, duty_status, start_time, remark
   */
  async createHOSLogEntry(logData: CreateHOSLogEntryRequest) {
    console.log('📡 HOS API: createHOSLogEntry called', {
      endpoint: API_ENDPOINTS.HOS.CREATE_LOG_ENTRY,
      logData: JSON.stringify(logData, null, 2),
    })
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_LOG_ENTRY, logData)
    if (response.success && response.data) {
      return response.data
    }
    throw new ApiError({ message: 'Failed to create HOS log entry', status: 400 })
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
   * Certify HOS Daily Log
   * PATCH /api/hos/daily-logs/{id}/
   * Per spec: PATCH /api/hos/daily-logs/{id}/ to certify the log
   */
  async certifyHOSLog(dailyLogId: string) {
    const endpoint = API_ENDPOINTS.HOS.CERTIFY_LOG.replace("{id}", dailyLogId)
    // PATCH with is_certified: true in body (or just PATCH to certify)
    const response = await apiClient.patch(endpoint, { is_certified: true })
    return response.data
  },

  /**
   * Certify All Uncertified Logs
   * POST /api/hos/daily-logs/certify-all-uncertified/
   */
  async certifyAllUncertifiedLogs() {
    const endpoint = API_ENDPOINTS.HOS.CERTIFY_ALL_UNCERTIFIED
    const response = await apiClient.post(endpoint, {})
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
 * 
 * @param driverId Optional driver ID to filter clocks. If provided, will find the clock matching this driver.
 */
export const useHOSClock = (options?: {
  enabled?: boolean
  refetchInterval?: number  // Default: 60 seconds (60000ms)
  refetchIntervalInBackground?: boolean
  driverId?: string  // Optional: Driver ID to match clock (should match driverProfile.driver_id)
}) => {
  return useQuery<HOSClock | null>({
    queryKey: [...QUERY_KEYS.HOS_CLOCKS, options?.driverId],
    queryFn: async () => {
      try {
        const clock = await hosApi.getCurrentHOSClock(options?.driverId)
        if (clock && options?.driverId && clock.driver !== options.driverId) {
          console.warn('⚠️ useHOSClock: Clock driver', clock.driver, 'does not match requested driver', options.driverId)
        }
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
    mutationFn: ({ 
      clockId, 
      request, 
      driverId, 
      vehicleId, 
      previousClock 
    }: { 
      clockId: string
      request: ChangeDutyStatusRequest
      driverId?: string
      vehicleId?: number
      previousClock?: HOSClock
    }) => {
      console.log('🔄 useChangeDutyStatus: mutationFn called with:', {
        clockId,
        driverId,
        vehicleId,
        hasPreviousClock: !!previousClock,
        duty_status: request.duty_status,
      })
      return hosApi.changeDutyStatus(clockId, request, { driverId, vehicleId, previousClock })
    },
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
      
      // Only invalidate if clock data was not in response
      // This prevents unnecessary refetch when we already have the updated clock data
      if (!data.clock) {
        console.log('⚠️ useChangeDutyStatus: No clock in response, invalidating to refetch')
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_CLOCKS })
      }
      
      // Always invalidate daily logs and HOS logs to refresh log entries after status change
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_DAILY_LOGS })
      queryClient.invalidateQueries({ queryKey: ['hos_logs'] })
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
 * Hook: Get HOS Daily Logs (Aggregated summaries)
 * 
 * Note: Daily logs are aggregated summaries created at end of day or when certified.
 * For individual log entries (available immediately), use useHOSLogs() instead.
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
 * Hook: Get HOS Logs (Individual entries - available immediately)
 * 
 * Returns individual log entries for each duty status change.
 * These are available immediately after status changes, unlike daily logs.
 */
export const useHOSLogs = (params?: HOSLogsQueryParams, options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: ['hos_logs', params],
    queryFn: () => hosApi.getHOSLogs(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,  // 30 seconds - logs update frequently
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
      // Invalidate daily logs and HOS logs to reflect certification
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_DAILY_LOGS })
      queryClient.invalidateQueries({ queryKey: ['hos_logs'] })
    },
    onError: (error: ApiError) => {
      console.error('Failed to certify HOS log:', error)
    },
  })
}

/**
 * Hook: Certify All Uncertified Logs
 */
export const useCertifyAllUncertifiedLogs = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: hosApi.certifyAllUncertifiedLogs,
    onSuccess: () => {
      // Invalidate daily logs and HOS logs to reflect certification
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOS_DAILY_LOGS })
      queryClient.invalidateQueries({ queryKey: ['hos_logs'] })
    },
    onError: (error: ApiError) => {
      console.error('Failed to certify all uncertified logs:', error)
    },
  })
}
