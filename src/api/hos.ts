import { LocationData } from "@/contexts/location-context"

import { apiClient } from "./client"
import { API_ENDPOINTS } from "./constants"

// HOS API Types
export interface HOSClock {
  driver: string
  clock_type: string
  start_time: string
  time_remaining: string
  cycle_start: string
  current_duty_status_start_time: string
  cycle_start_time: string
}

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

export interface HOSDailyLog {
  driver: string
  log_date: string
  total_driving_time: number
  total_on_duty_time: number
  total_off_duty_time: number
  is_certified: boolean
}

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

// Status Remarks mapping
export const STATUS_REMARKS: Record<string, string> = {
  driving: "Regular driving activity",
  on_duty: "On duty - not driving",
  off_duty: "Off duty - rest break",
  sleeper_berth: "Sleeper berth - rest period",
  personal_conveyance: "Personal conveyance - personal use",
  yard_move: "Yard move - repositioning vehicle",
}

// HOS API Service
export const hosApi = {
  // Create HOS Clock
  async createHOSClock(clockData: HOSClock) {
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_CLOCK, clockData)
    return response.data
  },

  // Create HOS Log Entry
  async createHOSLogEntry(logData: HOSLogEntry) {
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_LOG_ENTRY, logData)
    return response.data
  },

  // Create Daily HOS Log
  async createDailyHOSLog(dailyLogData: HOSDailyLog) {
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_DAILY_LOG, dailyLogData)
    return response.data
  },

  // Create HOS ELD Event
  async createHOSELDEvent(eventData: HOSELDEvent) {
    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_ELD_EVENT, eventData)
    return response.data
  },

  // Certify HOS Log
  async certifyHOSLog(logId: string) {
    const response = await apiClient.patch(API_ENDPOINTS.HOS.CERTIFY_LOG.replace("{id}", logId))
    return response.data
  },

  // Change Duty Status
  async changeDutyStatus(clockId: string, newStatus: string) {
    const response = await apiClient.post(
      API_ENDPOINTS.HOS.CHANGE_DUTY_STATUS.replace("{id}", clockId),
      {
        duty_status: newStatus,
      },
    )
    return response.data
  },

  // Helper function to format location for API
  formatLocationForAPI(location: LocationData): string {
    if (location.address) {
      return location.address
    }
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
  },

  // Helper function to get status remark
  getStatusRemark(status: string): string {
    return STATUS_REMARKS[status] || "Status change"
  },

  // Helper function to convert timestamp to ISO string
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString()
  },

  // Helper function to get duty status for API (convert from app format to API format)
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
}
