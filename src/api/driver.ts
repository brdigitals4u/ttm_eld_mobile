/**
 * Driver API Module - Complete Mobile API Integration
 *
 * Implements all driver-specific endpoints per the Mobile API Complete Reference:
 * - HOS Management (status, logs, violations, certify, annotate)
 * - Location Tracking (single update, batch upload)
 * - Device Health (heartbeat, malfunction reporting)
 * - Notifications (register, poll, mark read)
 *
 * All endpoints use Bearer token authentication and support idempotency keys.
 */

import * as Crypto from "expo-crypto"

import { useDriverTeamStore } from "@/stores/driverTeamStore"
import { getDeviceId, getAppVersion, getEldDeviceId } from "@/utils/device"

import { apiClient, ApiError } from "./client"
import { API_ENDPOINTS } from "./constants"

/**
 * Generate a UUID v4 using expo-crypto
 */
async function generateUUID(): Promise<string> {
  return await Crypto.randomUUID()
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface HOSCurrentStatus {
  driver_id: number | string
  current_status: string
  start_time: string
  elapsed_minutes: number
  clocks: {
    drive: {
      limit_minutes: number
      used_minutes: number
      remaining_minutes: number
      deadline: string
    }
    shift: {
      limit_minutes: number
      elapsed_minutes: number
      remaining_minutes: number
      deadline: string
    }
    cycle: {
      type: string
      limit_minutes: number
      used_minutes: number
      remaining_minutes: number
    }
    break: {
      required: boolean
      trigger_after_minutes: number
      driving_since_break: number
    }
  }
  violations: any[]
  can_drive: boolean
  cannot_drive_reasons: string[]
  location: {
    latitude: number | null
    longitude: number | null
  }
  timestamp: string
}

export interface HOSClocks {
  driving_11hr: {
    limit_minutes: number
    used_minutes: number
    remaining_minutes: number
    deadline: string
    violation: boolean
    can_drive: boolean
    reset_time: string
    regulation: string
  }
  shift_14hr: {
    limit_minutes: number
    elapsed_minutes: number
    remaining_minutes: number
    shift_start: string
    deadline: string
    violation: boolean
    can_drive: boolean
    regulation: string
  }
  off_duty_10hr: {
    required_minutes: number
    last_break: string
    time_since_break_minutes: number
    needs_break: boolean
    current_off_duty_minutes: number
    in_qualifying_break: boolean
    regulation: string
  }
  break_30min: {
    required_minutes: number
    trigger_after_minutes: number
    driving_since_break: number
    break_required: boolean
    time_until_required: number
    last_break: string
    violation: boolean
    regulation: string
  }
  cycle_60_70hr: {
    cycle_type: string
    limit_minutes: number
    days: number
    used_minutes: number
    remaining_minutes: number
    window_start: string
    violation: boolean
    can_drive: boolean
    cycle_resets_at: string | null
    regulation: string
  }
  split_sleeper: {
    enabled: boolean
    valid_splits: any[]
    regulation: string
    note: string
  }
  violations: any[]
  timestamp: string
}

export interface ChangeDutyStatusRequest {
  duty_status:
    | "off_duty"
    | "sleeper_berth"
    | "driving"
    | "on_duty"
    | "personal_conveyance"
    | "yard_move"
  location: {
    latitude: number
    longitude: number
    address?: string
  }
  driver_id?: string // Optional - will be auto-included from effective driver ID
  odometer?: number
  engine_hours?: number
  remark?: string
}

export interface ChangeDutyStatusResponse {
  success: boolean
  log_id?: string
  duty_status: string
  timestamp: string
  warnings?: string[]
  violations_detected?: number
  new_clocks?: {
    drive?: { remaining: string }
    shift?: { remaining: string }
  }
}

export interface HOSLog {
  id: string
  duty_status: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  location: string
  odometer?: number
  remark?: string
  is_automatic: boolean
  edited: boolean
}

export interface HOSLogsResponse {
  date: string
  logs: HOSLog[]
  summary: {
    off_duty: number
    on_duty: number
    driving: number
    sleeper_berth: number
    total: number
  }
  is_certified: boolean
  certified_at?: string | null
}

export interface Violation {
  id: string
  type: string
  description: string
  start_time: string
  end_time: string
  resolved: boolean
}

export interface ViolationsResponse {
  violations: Violation[]
  total: number
}

// Vehicle & Trip Types
export interface Location {
  address: string
  latitude: number
  longitude: number
  city?: string
  state?: string
  zip?: string
}

export interface VehicleInfo {
  id: string
  vehicle_unit: string
  make: string
  model: string
  year: number
  license_plate: string
  vin: string
  status: string
  is_active: boolean
  is_assigned?: boolean
}

export interface AssignmentInfo {
  assigned_at: string
  assigned_by?: string
  is_auto_assigned?: boolean
  status: string
}

export interface VehicleResponse {
  vehicle: VehicleInfo | null
  assignment?: AssignmentInfo
  message?: string
}

export interface TripsResponse {
  trips: Trip[]
  count: number
}

export interface Trip {
  id: string
  shipping_id: string
  status: string
  start_location: Location
  end_location: Location
  trip_start_time: string
  trip_end_time: string | null
  vehicle?: {
    id: string
    vehicle_unit: string
    make?: string
    model?: string
    year?: number
  }
  driver?: {
    id: string
    name: string
    company_driver_id?: string
  }
  created_at?: string
  updated_at?: string
}

export interface TripDetailsResponse {
  trip: Trip
}

export interface CertifyLogRequest {
  date: string // YYYY-MM-DD
  signature: string // base64-encoded signature image
}

export interface CertifyLogResponse {
  success: boolean
  date: string
  certified_at: string
  message: string
}

export interface AnnotateLogRequest {
  log_id: string
  annotation: string
}

export interface AnnotateLogResponse {
  success: boolean
  log_id: string
  annotation: string
  timestamp: string
}

export interface LocationUpdate {
  latitude: number
  longitude: number
  speed_mph?: number
  heading?: number
  altitude?: number
  timestamp?: string
}

export interface LocationUpdateResponse {
  auto_duty_status?: {
    auto_changed: boolean
    old_status: string
    new_status: string
    reason: string
  }
}

export interface LocationBatchItem {
  seq: number
  device_time: string // ISO 8601
  latitude: number
  longitude: number
  speed_mph?: number
  heading?: number
  odometer?: number
  accuracy_m?: number
}

export interface LocationBatchRequest {
  device_id: string
  locations: LocationBatchItem[]
}

export interface LocationBatchResponse {
  success: boolean
  applied_up_to_seq: number
  processed_count: number
  skipped_duplicate_count: number
  skipped_old_seq_count: number
  auto_duty_changes?: Array<{
    seq: number
    auto_changed: boolean
    old_status: string
    new_status: string
    reason: string
  }>
}

export interface DeviceHeartbeatRequest {
  device_id: string
  timestamp: string // ISO 8601
  battery_percent?: number
  gps_enabled?: boolean
  network_type?: string
  app_version?: string
}

export interface DeviceHeartbeatResponse {
  status: string
  server_timestamp: string
  clock_drift_seconds: number
  clock_drift_violation: boolean
  config?: any // driver_config payload
}

export interface DeviceMalfunctionRequest {
  device_id: string
  malfunction_code: "M1" | "M2" | "M3" | "M4" | "M5" | "M6"
  description: string
  symptoms?: string[]
  timestamp: string
}

export interface DeviceMalfunctionResponse {
  success: boolean
  malfunction_id: string
  ticket_id?: string
  message: string
}

export interface NotificationRegisterRequest {
  device_token: string
  platform: "ios" | "android"
  device_id: string
  app_version?: string
}

export interface NotificationRegisterResponse {
  success: boolean
  platform: string
  registered_at: string
}

export interface Notification {
  id: string
  notification_type: string
  title: string
  message: string
  priority: "low" | "medium" | "high"
  is_read: boolean
  created_at: string
  data?: any
}

export interface NotificationsResponse {
  count: number
  limit: number
  results: Notification[]
}

export interface MarkNotificationReadRequest {
  notification_id: string
}

export interface MarkNotificationReadResponse {
  success: boolean
  notification_id: string
}

export interface MarkAllReadResponse {
  success: boolean
  updated: number
}

// ============================================================================
// Driver API Service
// ============================================================================

export const driverApi = {
  // ============================================================================
  // HOS Management
  // ============================================================================

  /**
   * Get Current HOS Status
   * GET /api/driver/hos/current-status/?driver_id={effective_driver_id}
   * Poll every 30 seconds when HOS screen is visible
   * Uses effective driver ID (co-driver if active, otherwise driver)
   */
  async getCurrentHOSStatus(): Promise<HOSCurrentStatus> {
    const effectiveDriverId = useDriverTeamStore.getState().getEffectiveDriverId()
    const endpoint = effectiveDriverId
      ? `${API_ENDPOINTS.DRIVER.HOS_CURRENT_STATUS}?driver_id=${effectiveDriverId}`
      : API_ENDPOINTS.DRIVER.HOS_CURRENT_STATUS
    const response = await apiClient.get<HOSCurrentStatus>(endpoint)
    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to fetch HOS status", status: 500 })
    }
    return response.data
  },

  /**
   * Get Detailed HOS Clocks
   * GET /api/driver/hos/clocks/?driver_id={effective_driver_id}
   * On-demand when viewing detailed clocks screen
   * Uses effective driver ID (co-driver if active, otherwise driver)
   */
  async getHOSClocks(): Promise<HOSClocks> {
    const effectiveDriverId = useDriverTeamStore.getState().getEffectiveDriverId()
    const endpoint = effectiveDriverId
      ? `${API_ENDPOINTS.DRIVER.HOS_CLOCKS}?driver_id=${effectiveDriverId}`
      : API_ENDPOINTS.DRIVER.HOS_CLOCKS
    const response = await apiClient.get<HOSClocks>(endpoint)
    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to fetch HOS clocks", status: 500 })
    }
    return response.data
  },

  /**
   * Change Duty Status
   * POST /api/driver/hos/change-status/
   * User-initiated action (button tap)
   * Uses effective driver ID (co-driver if active team, otherwise primary driver)
   */
  async changeDutyStatus(request: ChangeDutyStatusRequest): Promise<ChangeDutyStatusResponse> {
    // Get effective driver ID (co-driver if active team, otherwise primary driver)
    const effectiveDriverId = useDriverTeamStore.getState().getEffectiveDriverId()

    if (!effectiveDriverId) {
      throw new ApiError({
        message: "Driver ID is required to change duty status",
        status: 400,
      })
    }

    // Include driver_id in request if not already provided
    const requestWithDriverId: ChangeDutyStatusRequest = {
      ...request,
      driver_id: request.driver_id || effectiveDriverId,
    }

    // Generate idempotency key
    const idempotencyKey = `driver-hos-change-${Date.now()}-${await generateUUID()}`
    const deviceId = await getDeviceId()
    const appVersion = getAppVersion()

    const response = await apiClient.post<ChangeDutyStatusResponse>(
      API_ENDPOINTS.DRIVER.HOS_CHANGE_STATUS,
      requestWithDriverId,
      { idempotencyKey, deviceId, appVersion },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to change duty status", status: 500 })
    }

    return response.data
  },

  /**
   * Get HOS Logs (History)
   * GET /api/driver/hos/logs/?date=YYYY-MM-DD&driver_id={effective_driver_id}
   * On-demand when viewing daily log screen
   * Uses effective driver ID (co-driver if active, otherwise driver)
   */
  async getHOSLogs(date: string): Promise<HOSLogsResponse> {
    const effectiveDriverId = useDriverTeamStore.getState().getEffectiveDriverId()
    const queryParams = new URLSearchParams({ date })
    if (effectiveDriverId) {
      queryParams.append("driver_id", effectiveDriverId)
    }
    const endpoint = `${API_ENDPOINTS.DRIVER.HOS_LOGS}?${queryParams.toString()}`
    const response = await apiClient.get<HOSLogsResponse>(endpoint)

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to fetch HOS logs", status: 500 })
    }

    return response.data
  },

  /**
   * Get Violations
   * GET /api/driver/hos/violations/?driver_id={effective_driver_id}
   * On app foreground or when viewing violations screen
   * Uses effective driver ID (co-driver if active, otherwise driver)
   */
  async getViolations(): Promise<ViolationsResponse> {
    const effectiveDriverId = useDriverTeamStore.getState().getEffectiveDriverId()
    const endpoint = effectiveDriverId
      ? `${API_ENDPOINTS.DRIVER.HOS_VIOLATIONS}?driver_id=${effectiveDriverId}`
      : API_ENDPOINTS.DRIVER.HOS_VIOLATIONS
    const response = await apiClient.get<ViolationsResponse>(endpoint)

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to fetch violations", status: 500 })
    }

    return response.data
  },

  /**
   * Certify Daily Log
   * POST /api/driver/hos/certify/
   * End of day action
   */
  async certifyLog(request: CertifyLogRequest): Promise<CertifyLogResponse> {
    const idempotencyKey = `driver-certify-${request.date}-${await generateUUID()}`
    const deviceId = await getDeviceId()
    const appVersion = getAppVersion()

    const response = await apiClient.post<CertifyLogResponse>(
      API_ENDPOINTS.DRIVER.HOS_CERTIFY,
      request,
      { idempotencyKey, deviceId, appVersion },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to certify log", status: 500 })
    }

    return response.data
  },

  /**
   * Add Annotation to Log
   * POST /api/driver/hos/annotate/
   * User action when adding note to log entry
   */
  async annotateLog(request: AnnotateLogRequest): Promise<AnnotateLogResponse> {
    const idempotencyKey = `driver-annotate-${request.log_id}-${await generateUUID()}`
    const deviceId = await getDeviceId()
    const appVersion = getAppVersion()

    const response = await apiClient.post<AnnotateLogResponse>(
      API_ENDPOINTS.DRIVER.HOS_ANNOTATE,
      request,
      { idempotencyKey, deviceId, appVersion },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to annotate log", status: 500 })
    }

    return response.data
  },

  // ============================================================================
  // Location Tracking
  // ============================================================================

  /**
   * Submit Single Location Update (Fallback)
   * POST /api/driver/location/update/
   * Use when batching is unavailable
   */
  async submitLocation(location: LocationUpdate): Promise<LocationUpdateResponse> {
    const response = await apiClient.post<LocationUpdateResponse>(
      API_ENDPOINTS.DRIVER.LOCATION_UPDATE,
      {
        latitude: location.latitude,
        longitude: location.longitude,
        speed_mph: location.speed_mph,
        timestamp: location.timestamp || new Date().toISOString(),
      },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to submit location", status: 500 })
    }

    return response.data
  },

  /**
   * Submit Batch Location Updates (Recommended)
   * POST /api/driver/location/batch/v2/
   * Every 30 seconds or when 10+ points buffered
   */
  async submitLocationBatch(
    locations: LocationBatchItem[],
    deviceId?: string,
  ): Promise<LocationBatchResponse> {
    if (locations.length === 0) {
      throw new ApiError({ message: "No locations to submit", status: 400 })
    }

    // Use ELD device ID if available, otherwise use app device ID
    const eldDeviceId = await getEldDeviceId()
    const finalDeviceId = deviceId || eldDeviceId || (await getDeviceId())

    // Generate idempotency key
    const idempotencyKey = `driver-${finalDeviceId}-locbatch-${new Date().toISOString()}-${await generateUUID()}`
    const appVersion = getAppVersion()

    const request: LocationBatchRequest = {
      device_id: finalDeviceId,
      locations,
    }

    const response = await apiClient.post<LocationBatchResponse>(
      API_ENDPOINTS.DRIVER.LOCATION_BATCH,
      request,
      { idempotencyKey, deviceId: finalDeviceId, appVersion },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to submit location batch", status: 500 })
    }

    return response.data
  },

  // ============================================================================
  // Device Health
  // ============================================================================

  /**
   * Device Heartbeat
   * POST /api/driver/device/heartbeat/
   * Every 5 minutes while driver session is active
   */
  async sendHeartbeat(request: DeviceHeartbeatRequest): Promise<DeviceHeartbeatResponse> {
    const deviceId = await getDeviceId()
    const appVersion = getAppVersion()

    const fullRequest: DeviceHeartbeatRequest = {
      ...request,
      device_id: request.device_id || deviceId,
      app_version: request.app_version || appVersion,
      timestamp: request.timestamp || new Date().toISOString(),
    }

    const response = await apiClient.post<DeviceHeartbeatResponse>(
      API_ENDPOINTS.DRIVER.DEVICE_HEARTBEAT,
      fullRequest,
      { deviceId, appVersion },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to send heartbeat", status: 500 })
    }

    return response.data
  },

  /**
   * Report Device Malfunction
   * POST /api/driver/device/malfunction/
   * When hardware detects failure or driver reports issue
   */
  async reportMalfunction(request: DeviceMalfunctionRequest): Promise<DeviceMalfunctionResponse> {
    const deviceId = await getDeviceId()
    const appVersion = getAppVersion()

    const fullRequest: DeviceMalfunctionRequest = {
      ...request,
      device_id: request.device_id || deviceId,
      timestamp: request.timestamp || new Date().toISOString(),
    }

    const response = await apiClient.post<DeviceMalfunctionResponse>(
      API_ENDPOINTS.DRIVER.DEVICE_MALFUNCTION,
      fullRequest,
      { deviceId, appVersion },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to report malfunction", status: 500 })
    }

    return response.data
  },

  // ============================================================================
  // Notifications
  // ============================================================================

  /**
   * Register Push Token
   * POST /api/driver/notifications/register/
   * Once per install
   */
  async registerPushToken(
    request: NotificationRegisterRequest,
  ): Promise<NotificationRegisterResponse> {
    const deviceId = await getDeviceId()
    const appVersion = getAppVersion()

    const fullRequest: NotificationRegisterRequest = {
      ...request,
      device_id: request.device_id || deviceId,
      app_version: request.app_version || appVersion,
    }

    const response = await apiClient.post<NotificationRegisterResponse>(
      API_ENDPOINTS.DRIVER.NOTIFICATIONS_REGISTER,
      fullRequest,
      { deviceId, appVersion },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to register push token", status: 500 })
    }

    return response.data
  },

  /**
   * Poll Notifications (Fallback)
   * GET /api/driver/notifications/?status=unread&limit=50
   * Every 60 seconds when notifications screen visible or on foreground
   */
  async getNotifications(params?: {
    status?: "unread" | "read" | "all"
    limit?: number
  }): Promise<NotificationsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append("status", params.status)
    if (params?.limit) queryParams.append("limit", params.limit.toString())

    const endpoint = `${API_ENDPOINTS.DRIVER.NOTIFICATIONS}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    const response = await apiClient.get<NotificationsResponse>(endpoint)

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to fetch notifications", status: 500 })
    }

    return response.data
  },

  /**
   * Mark Notification Read
   * POST /api/driver/notifications/read/
   */
  async markNotificationRead(notificationId: string): Promise<MarkNotificationReadResponse> {
    const response = await apiClient.post<MarkNotificationReadResponse>(
      API_ENDPOINTS.DRIVER.NOTIFICATIONS_READ,
      { notification_id: notificationId },
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to mark notification read", status: 500 })
    }

    return response.data
  },

  /**
   * Mark All Notifications Read
   * POST /api/driver/notifications/read-all/
   */
  async markAllNotificationsRead(): Promise<MarkAllReadResponse> {
    const response = await apiClient.post<MarkAllReadResponse>(
      API_ENDPOINTS.DRIVER.NOTIFICATIONS_READ_ALL,
      {},
    )

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to mark all notifications read", status: 500 })
    }

    return response.data
  },

  /**
   * Get current driver profile
   * GET /drivers/me/
   */
  async getDriverProfile(): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.DRIVER.PROFILE)
      if (!response.success || !response.data) {
        throw new ApiError({ message: "Failed to get driver profile", status: 500 })
      }
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError({ message: "Failed to get driver profile", status: 500 })
    }
  },

  /**
   * Get My Assigned Vehicle
   * GET /api/driver/vehicle/
   */
  async getMyVehicle(): Promise<VehicleResponse> {
    const response = await apiClient.get<VehicleResponse>(API_ENDPOINTS.DRIVER.VEHICLE)
    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to get vehicle assignment", status: 500 })
    }
    return response.data
  },

  /**
   * List Available Vehicles
   * GET /api/driver/vehicles/
   */
  async getAvailableVehicles(params?: {
    status?: string
    search?: string
  }): Promise<{ vehicles: VehicleInfo[]; count: number }> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append("status", params.status)
    if (params?.search) queryParams.append("search", params.search)

    const endpoint = `${API_ENDPOINTS.DRIVER.VEHICLES}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    const response = await apiClient.get<{ vehicles: VehicleInfo[]; count: number }>(endpoint)

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to get available vehicles", status: 500 })
    }
    return response.data
  },

  /**
   * Get My Trips
   * GET /api/driver/trips/
   */
  async getMyTrips(params?: {
    status?: string
    start_date?: string
    end_date?: string
  }): Promise<TripsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append("status", params.status)
    if (params?.start_date) queryParams.append("start_date", params.start_date)
    if (params?.end_date) queryParams.append("end_date", params.end_date)

    const endpoint = `${API_ENDPOINTS.DRIVER.TRIPS}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    const response = await apiClient.get<TripsResponse>(endpoint)

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to get trips", status: 500 })
    }
    return response.data
  },

  /**
   * Get Trip Details
   * GET /api/driver/trips/{trip_id}/
   */
  async getTripDetails(tripId: string): Promise<TripDetailsResponse> {
    const endpoint = API_ENDPOINTS.DRIVER.TRIP_DETAILS.replace("{id}", tripId)
    const response = await apiClient.get<TripDetailsResponse>(endpoint)

    if (!response.success || !response.data) {
      throw new ApiError({ message: "Failed to get trip details", status: 500 })
    }
    return response.data
  },
}
