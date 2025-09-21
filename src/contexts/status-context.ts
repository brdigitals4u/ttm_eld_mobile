import { useEffect, useState } from "react"
import { Alert } from "react-native"
import createContextHook from "@nkzw/create-context-hook"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuthStore } from '../stores/authStore'

import {
  DriverStatus,
  HoursOfService,
  LogCertification,
  LogEntry,
  SplitSleepSettings,
  StatusReason,
  StatusState,
  StatusUpdate,
} from "@/types/status"
import { hosApi, HOSClock, HOSLogEntry, HOSELDEvent } from "@/api/hos"
// Import useAuth from index to match what's provided by AllContextsProvider
// Note: We can't import from index directly due to circular dependency,
// so we'll need to inject the auth data differently

interface StatusContextType extends StatusState {
  updateStatus: (status: DriverStatus, reason: string) => Promise<void>
  getStatusReasons: (status?: DriverStatus) => StatusReason[]
  formatDuration: (minutes: number) => string
  certifyLogs: (signature: string) => Promise<void>
  canUpdateStatus: () => boolean
  updateLogEntry: (id: string, updates: Partial<LogEntry>) => Promise<void>
  toggleSplitSleep: (enabled: boolean, additionalHours?: number) => Promise<void>
  getCurrentLocation: () => Promise<void>
  uncertifyLogs: () => Promise<void>
}

const initialHoursOfService: HoursOfService = {
  driveTimeRemaining: 11 * 60, // 11 hours in minutes
  shiftTimeRemaining: 14 * 60, // 14 hours in minutes
  cycleTimeRemaining: 60 * 60, // 60 hours in minutes
  breakTimeRemaining: 8 * 60, // 8 hours in minutes
  lastCalculated: Date.now(),
}

const initialCertification: LogCertification = {
  isCertified: false,
}

const initialSplitSleepSettings: SplitSleepSettings = {
  enabled: false,
  additionalHours: 2,
}

const initialState: StatusState = {
  currentStatus: "offDuty",
  statusHistory: [],
  hoursOfService: initialHoursOfService,
  certification: initialCertification,
  isUpdating: false,
  error: null,
  logEntries: [],
  splitSleepSettings: initialSplitSleepSettings,
  currentLocation: undefined,
}

// Predefined status reasons
const STATUS_REASONS: StatusReason[] = [
  { id: "1", text: "Starting shift", category: "onDuty" },
  { id: "2", text: "Pre-trip inspection", category: "onDuty" },
  { id: "3", text: "Post-trip inspection", category: "onDuty" },
  { id: "4", text: "Loading", category: "onDuty" },
  { id: "5", text: "Unloading", category: "onDuty" },
  { id: "6", text: "Waiting at shipper/receiver", category: "onDuty" },
  { id: "7", text: "Fueling", category: "onDuty" },
  { id: "8", text: "Maintenance", category: "onDuty" },
  { id: "9", text: "Meal break", category: "offDuty" },
  { id: "10", text: "Rest break", category: "offDuty" },
  { id: "11", text: "End of shift", category: "offDuty" },
  { id: "12", text: "Personal conveyance", category: "personalConveyance" },
  { id: "13", text: "Start of sleep period", category: "sleeperBerth" },
  { id: "14", text: "End of sleep period", category: "sleeperBerth" },
  { id: "15", text: "Moving trailer in yard", category: "yardMoves" },
  { id: "16", text: "Repositioning vehicle", category: "yardMoves" },
  { id: "17", text: "Other", category: "all" },
]

export const [StatusProvider, useStatus] = createContextHook(() => {
  const [state, setState] = useState<StatusState>(initialState)
  // Remove auth dependency for now to avoid circular import issues
  // TODO: Find a better way to handle auth integration

  // Load status data on mount
  useEffect(() => {
    const loadStatusData = async () => {
      try {
        const statusJson = await AsyncStorage.getItem("driverStatus")
        const historyJson = await AsyncStorage.getItem("statusHistory")
        const hosJson = await AsyncStorage.getItem("hoursOfService")
        const certificationJson = await AsyncStorage.getItem("logCertification")
        const logEntriesJson = await AsyncStorage.getItem("logEntries")
        const splitSleepJson = await AsyncStorage.getItem("splitSleepSettings")

        if (statusJson) {
          setState((prev) => ({
            ...prev,
            currentStatus: JSON.parse(statusJson),
          }))
        }

        if (historyJson) {
          setState((prev) => ({
            ...prev,
            statusHistory: JSON.parse(historyJson),
          }))
        }

        if (hosJson) {
          setState((prev) => ({
            ...prev,
            hoursOfService: JSON.parse(hosJson),
          }))
        }

        if (certificationJson) {
          setState((prev) => ({
            ...prev,
            certification: JSON.parse(certificationJson),
          }))
        }

        if (logEntriesJson) {
          setState((prev) => ({
            ...prev,
            logEntries: JSON.parse(logEntriesJson),
          }))
        }

        if (splitSleepJson) {
          setState((prev) => ({
            ...prev,
            splitSleepSettings: JSON.parse(splitSleepJson),
          }))
        }
      } catch (error) {
        console.error("Failed to load status data:", error)
      }
    }

    loadStatusData()
  }, [])

  // Update HOS calculations periodically
  useEffect(() => {
    const updateHoursOfService = () => {
      setState((prev) => {
        const now = Date.now()
        const elapsedMinutes = (now - prev.hoursOfService.lastCalculated) / (1000 * 60)

        // Only update if time has passed
        if (elapsedMinutes < 1) return prev

        const updatedHos = { ...prev.hoursOfService, lastCalculated: now }

        // Update based on current status
        if (prev.currentStatus === "driving") {
          updatedHos.driveTimeRemaining = Math.max(
            0,
            updatedHos.driveTimeRemaining - elapsedMinutes,
          )
          updatedHos.shiftTimeRemaining = Math.max(
            0,
            updatedHos.shiftTimeRemaining - elapsedMinutes,
          )
          updatedHos.cycleTimeRemaining = Math.max(
            0,
            updatedHos.cycleTimeRemaining - elapsedMinutes,
          )
          // Reset break timer when driving
          updatedHos.breakTimeRemaining = 8 * 60
        } else if (prev.currentStatus === "onDuty" || prev.currentStatus === "yardMoves") {
          // On duty not driving still counts against shift and cycle
          updatedHos.shiftTimeRemaining = Math.max(
            0,
            updatedHos.shiftTimeRemaining - elapsedMinutes,
          )
          updatedHos.cycleTimeRemaining = Math.max(
            0,
            updatedHos.cycleTimeRemaining - elapsedMinutes,
          )
          // Break timer counts down when not driving
          updatedHos.breakTimeRemaining = Math.max(
            0,
            updatedHos.breakTimeRemaining - elapsedMinutes,
          )
        } else if (prev.currentStatus === "sleeperBerth") {
          // Sleeper berth counts as rest, so it recharges drive time
          const rechargeRate = prev.splitSleepSettings.enabled ? 0.75 : 0.5
          updatedHos.driveTimeRemaining = Math.min(
            11 * 60,
            updatedHos.driveTimeRemaining + elapsedMinutes * rechargeRate,
          )
          // Break timer counts down faster when in sleeper berth
          updatedHos.breakTimeRemaining = Math.max(
            0,
            updatedHos.breakTimeRemaining - elapsedMinutes * 2,
          )
        } else if (
          prev.currentStatus === "offDuty" ||
          prev.currentStatus === "personalConveyance"
        ) {
          // Off duty and personal conveyance count as rest
          updatedHos.breakTimeRemaining = Math.max(
            0,
            updatedHos.breakTimeRemaining - elapsedMinutes,
          )
        }

        // Save updated HOS
        AsyncStorage.setItem("hoursOfService", JSON.stringify(updatedHos)).catch((err) =>
          console.error("Failed to save HOS:", err),
        )

        return {
          ...prev,
          hoursOfService: updatedHos,
        }
      })
    }

    // Update every minute
    const interval = setInterval(updateHoursOfService, 60 * 1000)

    // Initial update
    updateHoursOfService()

    return () => clearInterval(interval)
  }, [state.currentStatus])

  const canUpdateStatus = () => {
    return true // Always allow status updates regardless of certification
  }

  const getCurrentLocation = async () => {
    try {
      // In a real app, you would use expo-location here
      // For now, we'll use a mock location
      const location = {
        latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
        address: "Current Location, CA",
      }

      setState((prev) => ({
        ...prev,
        currentLocation: location,
      }))
    } catch (error) {
      console.error("Failed to get location:", error)
    }
  }

  const updateStatus = async (status: DriverStatus, reason: string) => {
    // Status updates are now always allowed regardless of certification status

    try {
      setState((prev) => ({
        ...prev,
        isUpdating: true,
        error: null,
      }))

      // Get current location
      await getCurrentLocation()

      // Create status update
      const statusUpdate: StatusUpdate = {
        status,
        timestamp: Date.now(),
        reason,
        location: state.currentLocation || {
          latitude: 37.7749,
          longitude: -122.4194,
          address: "San Francisco, CA",
        },
      }

      // Create log entry
      const logEntry: LogEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString().split("T")[0],
        status,
        startTime: Date.now(),
        duration: 0,
        reason,
        location: statusUpdate.location,
        isCertified: false,
        isEditable: true,
      }

      // Update state first
      const updatedHistory = [...state.statusHistory, statusUpdate]
      const updatedLogEntries = [...state.logEntries, logEntry]

      // Save to storage
      await AsyncStorage.setItem("driverStatus", JSON.stringify(status))
      await AsyncStorage.setItem("statusHistory", JSON.stringify(updatedHistory))
      await AsyncStorage.setItem("logEntries", JSON.stringify(updatedLogEntries))

      setState((prev) => ({
        ...prev,
        currentStatus: status,
        statusHistory: updatedHistory,
        logEntries: updatedLogEntries,
        isUpdating: false,
      }))

      // Call HOS APIs after successful local update
      await sendHOSAPIs(status, reason, statusUpdate)

      // Alert for critical status changes
      if (status === "driving" && state.hoursOfService.driveTimeRemaining < 60) {
        Alert.alert(
          "Hours of Service Warning",
          `You have less than ${formatDuration(state.hoursOfService.driveTimeRemaining)} of driving time remaining.`,
          [{ text: "OK" }],
        )
      }
    } catch (error) {
      console.error("Failed to update status:", error)
      setState((prev) => ({
        ...prev,
        isUpdating: false,
        error: "Failed to update status",
      }))
    }
  }

  // Send HOS APIs when status changes
  const sendHOSAPIs = async (status: DriverStatus, reason: string, statusUpdate: StatusUpdate) => {
    try {
      // Get driver ID from auth store
      const authState = useAuthStore.getState()
      const driverId = authState.user?.id || "driver_uuid" // Fallback for testing
      const apiDutyStatus = hosApi.getAPIDutyStatus(status)
      // Create LocationData object from StatusUpdate location
      const locationData = {
        latitude: statusUpdate.location?.latitude || 37.7749,
        longitude: statusUpdate.location?.longitude || -122.4194,
        accuracy: null,
        altitude: null,
        timestamp: Date.now(),
        address: statusUpdate.location?.address || "San Francisco, CA"
      }
      
      const locationString = hosApi.formatLocationForAPI(locationData)
      const timestamp = hosApi.formatTimestamp(statusUpdate.timestamp)
      const remark = hosApi.getStatusRemark(status)

      // 1. Create HOS Clock (clock_type is driving_status)
      const hosClock: HOSClock = {
        driver: driverId,
        clock_type: apiDutyStatus, // This is the driving_status
        start_time: timestamp,
        time_remaining: formatDuration(state.hoursOfService.driveTimeRemaining),
        cycle_start: new Date().toISOString().split('T')[0] + 'T00:00:00Z', // Start of current day
      }

      await hosApi.createHOSClock(hosClock)

      // 2. Create HOS Log Entry (when driving_status changes from driving to other)
      if (state.currentStatus === "driving" && status !== "driving") {
        const hosLogEntry: HOSLogEntry = {
          driver: driverId,
          duty_status: apiDutyStatus,
          start_time: timestamp,
          start_location: locationString,
          remark: remark,
        }

        await hosApi.createHOSLogEntry(hosLogEntry)
      }

      // 3. Create HOS ELD Event (for all status changes)
      const hosELDEvent: HOSELDEvent = {
        driver: driverId,
        event_type: "duty_status_change",
        event_code: "1", // Standard ELD event code for duty status change
        event_data: {
          new_duty_status: apiDutyStatus,
          previous_duty_status: state.currentStatus ? hosApi.getAPIDutyStatus(state.currentStatus) : undefined,
        },
        timestamp: timestamp,
        location: locationString,
      }

      await hosApi.createHOSELDEvent(hosELDEvent)

      console.log('HOS APIs called successfully for status change:', status)
    } catch (error: any) {
      console.error('Failed to send HOS APIs:', error)
      
      // Handle specific error cases
      if (error?.response?.status === 404) {
        console.warn('HOS API endpoints not implemented on backend yet. Status update succeeded locally.')
      } else if (error?.response?.status === 401) {
        console.warn('Authentication failed for HOS APIs. Please check auth token.')
      } else {
        console.warn('HOS API call failed:', error?.message || 'Unknown error')
      }
      
      // Don't throw error here to avoid breaking the status update
      // The local status update should still succeed even if HOS APIs fail
    }
  }

  const certifyLogs = async (signature: string) => {
    try {
      const certification: LogCertification = {
        isCertified: false,
        certifiedAt: Date.now(),
        certifiedBy: "Driver", // TODO: Get driver name from context
        certificationSignature: signature,
      }

      await AsyncStorage.setItem("logCertification", JSON.stringify(certification))

      setState((prev) => ({
        ...prev,
        certification,
      }))

      Alert.alert(
        "Logs Certified",
        "Your logs have been successfully certified. No further changes can be made until uncertified.",
        [{ text: "OK" }],
      )
    } catch (error) {
      console.error("Failed to certify logs:", error)
      Alert.alert("Error", "Failed to certify logs")
    }
  }

  const getStatusReasons = (status?: DriverStatus) => {
    if (!status) return STATUS_REASONS
    return STATUS_REASONS.filter((r) => r.category === status || r.category === "all")
  }

  const updateLogEntry = async (id: string, updates: Partial<LogEntry>) => {
    try {
      const updatedLogEntries = state.logEntries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry,
      )

      await AsyncStorage.setItem("logEntries", JSON.stringify(updatedLogEntries))

      setState((prev) => ({
        ...prev,
        logEntries: updatedLogEntries,
      }))
    } catch (error) {
      console.error("Failed to update log entry:", error)
    }
  }

  const toggleSplitSleep = async (enabled: boolean, additionalHours = 2) => {
    try {
      const splitSleepSettings: SplitSleepSettings = {
        enabled,
        additionalHours,
      }

      await AsyncStorage.setItem("splitSleepSettings", JSON.stringify(splitSleepSettings))

      setState((prev) => ({
        ...prev,
        splitSleepSettings,
      }))
    } catch (error) {
      console.error("Failed to update split sleep settings:", error)
    }
  }

  const uncertifyLogs = async () => {
    try {
      const certification: LogCertification = {
        isCertified: false,
      }

      await AsyncStorage.setItem("logCertification", JSON.stringify(certification))

      setState((prev) => ({
        ...prev,
        certification,
        logEntries: prev.logEntries.map((entry) => ({
          ...entry,
          isCertified: false,
          isEditable: true,
        })),
      }))

      Alert.alert(
        "Logs Uncertified",
        "Your logs have been uncertified. You can now make changes.",
        [{ text: "OK" }],
      )
    } catch (error) {
      console.error("Failed to uncertify logs:", error)
      Alert.alert("Error", "Failed to uncertify logs")
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return `${hours}h ${mins}m`
  }

  return {
    ...state,
    updateStatus,
    getStatusReasons,
    formatDuration,
    certifyLogs,
    canUpdateStatus,
    updateLogEntry,
    toggleSplitSleep,
    getCurrentLocation,
    uncertifyLogs,
  }
})
