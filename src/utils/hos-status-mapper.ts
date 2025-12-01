/**
 * HOS Status Mapper
 *
 * Maps between new driver API HOS status format and app's internal status format
 */

import { HOSCurrentStatus } from "@/api/driver"
import { DriverStatus } from "@/types/status"

/**
 * Map driver API duty status to app DriverStatus
 */
export function mapDriverStatusToAppStatus(apiStatus: string): DriverStatus {
  const statusMap: Record<string, DriverStatus> = {
    off_duty: "offDuty",
    sleeper_berth: "sleeperBerth",
    driving: "driving",
    on_duty: "onDuty",
    personal_conveyance: "personalConveyance",
    yard_move: "yardMove",
  }

  return statusMap[apiStatus.toLowerCase()] || "offDuty"
}

/**
 * Map app DriverStatus to driver API duty status
 */
export function mapAppStatusToDriverStatus(appStatus: DriverStatus): string {
  const statusMap: Record<DriverStatus, string> = {
    offDuty: "off_duty",
    sleeping: "sleeper_berth",
    sleeperBerth: "sleeper_berth",
    driving: "driving",
    onDuty: "on_duty",
    personalConveyance: "personal_conveyance",
    yardMove: "yard_move",
  }

  return statusMap[appStatus] || "off_duty"
}

/**
 * Map HOSCurrentStatus to auth store HOSStatus format
 */
export function mapHOSStatusToAuthFormat(hosStatus: HOSCurrentStatus) {
  // Ensure driver_id is always a string (HOSStatus requires string)
  const driverId =
    typeof hosStatus.driver_id === "number" ? String(hosStatus.driver_id) : hosStatus.driver_id

  return {
    driver_id: driverId,
    driver_name: driverId, // Will be updated from driverProfile if available
    current_status: hosStatus.current_status.toUpperCase(),
    driving_time_remaining: hosStatus.clocks.drive.remaining_minutes,
    on_duty_time_remaining: hosStatus.clocks.shift.remaining_minutes,
    cycle_time_remaining: hosStatus.clocks.cycle.remaining_minutes,
    time_remaining: {
      driving_time_remaining: hosStatus.clocks.drive.remaining_minutes,
      on_duty_time_remaining: hosStatus.clocks.shift.remaining_minutes,
      cycle_time_remaining: hosStatus.clocks.cycle.remaining_minutes,
    },
  }
}
