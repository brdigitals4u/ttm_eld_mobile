import { useEffect, useState } from "react"
import { toast } from '@/components/Toast'
import createContextHook from "@nkzw/create-context-hook"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuthStore } from '../stores/authStore'
import { useStatusStore, useStatusActions } from '../stores/statusStore'

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
  changeDutyStatus: (clockId: string, newStatus: string) => Promise<void>
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

// Predefined status reasons - Truck Driver Specific
const STATUS_REASONS: StatusReason[] = [
  // On Duty Reasons
  { id: "1", text: "Starting shift", category: "onDuty" },
  { id: "2", text: "Pre-trip inspection", category: "onDuty" },
  { id: "3", text: "Post-trip inspection", category: "onDuty" },
  { id: "4", text: "Loading cargo", category: "onDuty" },
  { id: "5", text: "Unloading cargo", category: "onDuty" },
  { id: "6", text: "Waiting at shipper", category: "onDuty" },
  { id: "7", text: "Waiting at receiver", category: "onDuty" },
  { id: "8", text: "Waiting for dispatch", category: "onDuty" },
  { id: "9", text: "Fueling vehicle", category: "onDuty" },
  { id: "10", text: "Vehicle maintenance", category: "onDuty" },
  { id: "11", text: "Paperwork/documentation", category: "onDuty" },
  { id: "12", text: "Weighing cargo", category: "onDuty" },
  { id: "13", text: "Securing load", category: "onDuty" },
  { id: "14", text: "Checking equipment", category: "onDuty" },
  { id: "15", text: "Vehicle wash/cleaning", category: "onDuty" },
  
  // Off Duty Reasons
  { id: "16", text: "Meal break", category: "offDuty" },
  { id: "17", text: "Rest break", category: "offDuty" },
  { id: "18", text: "End of shift", category: "offDuty" },
  { id: "19", text: "Personal time", category: "offDuty" },
  { id: "20", text: "Lunch break", category: "offDuty" },
  { id: "21", text: "Dinner break", category: "offDuty" },
  { id: "22", text: "Rest area break", category: "offDuty" },
  
  // Driving Reasons
  { id: "23", text: "Starting route", category: "driving" },
  { id: "24", text: "Continuing route", category: "driving" },
  { id: "25", text: "Highway driving", category: "driving" },
  { id: "26", text: "City driving", category: "driving" },
  { id: "27", text: "Local delivery", category: "driving" },
  
  // Sleeper Berth Reasons
  { id: "28", text: "Start of sleep period", category: "sleeperBerth" },
  { id: "29", text: "End of sleep period", category: "sleeperBerth" },
  { id: "30", text: "Split sleeper berth", category: "sleeperBerth" },
  { id: "31", text: "Rest in sleeper berth", category: "sleeperBerth" },
  
  // Personal Conveyance Reasons
  { id: "32", text: "Personal errands", category: "personalConveyance" },
  { id: "33", text: "Going home", category: "personalConveyance" },
  { id: "34", text: "Personal use", category: "personalConveyance" },
  { id: "35", text: "Non-work travel", category: "personalConveyance" },
  
  // Yard Moves Reasons
  { id: "36", text: "Moving trailer in yard", category: "yardMove" },
  { id: "37", text: "Repositioning vehicle", category: "yardMove" },
  { id: "38", text: "Yard maneuvers", category: "yardMove" },
  { id: "39", text: "Switching trailers", category: "yardMove" },
  { id: "40", text: "Parking in yard", category: "yardMove" },
  
  // Other - always available
  { id: "41", text: "Other", category: "all" },
]

export const [StatusProvider, useStatus] = createContextHook(() => {
  // Keep local state for any component-specific state that doesn't need global sync
  const [localState, setLocalState] = useState({
    isInitialized: false,
  })
  
  // Use Zustand store with a single subscription to avoid multiple re-renders
  const storeState = useStatusStore()
  // Remove auth dependency for now to avoid circular import issues
  // TODO: Find a better way to handle auth integration

  // Initialize status data on mount
  useEffect(() => {
    const initializeStatusData = async () => {
      if (localState.isInitialized) return
      
      try {
        console.log('🔄 StatusContext: Initializing status data...')
        
        // Load additional data that might not be in Zustand store
        const logEntriesJson = await AsyncStorage.getItem("logEntries")

        // Update Zustand store with any additional data
        if (logEntriesJson) {
          storeState.setLogEntries(JSON.parse(logEntriesJson))
        }

        setLocalState({ isInitialized: true })
        console.log('✅ StatusContext: Status data initialized successfully')
      } catch (error) {
        console.error("❌ StatusContext: Failed to initialize status data:", error)
        storeState.setError("Failed to initialize status data")
      }
    }

    initializeStatusData()
  }, [localState.isInitialized])

  // Update HOS calculations periodically
  useEffect(() => {
    const updateHoursOfService = () => {
      const now = Date.now()
      const elapsedMinutes = Math.round((now - storeState.hoursOfService.lastCalculated) / (1000 * 60))

      // Only update if time has passed
      if (elapsedMinutes < 1) return

      const updatedHos = { ...storeState.hoursOfService, lastCalculated: now }

        // Update based on current status
        if (storeState.currentStatus === "driving") {
          updatedHos.driveTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.driveTimeRemaining - elapsedMinutes),
          )
          updatedHos.shiftTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.shiftTimeRemaining - elapsedMinutes),
          )
          updatedHos.cycleTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.cycleTimeRemaining - elapsedMinutes),
          )
          // Reset break timer when driving
          updatedHos.breakTimeRemaining = 8 * 60
        } else if (storeState.currentStatus === "onDuty" || storeState.currentStatus === "yardMove") {
          // On duty not driving still counts against shift and cycle
          updatedHos.shiftTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.shiftTimeRemaining - elapsedMinutes),
          )
          updatedHos.cycleTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.cycleTimeRemaining - elapsedMinutes),
          )
          // Break timer counts down when not driving
          updatedHos.breakTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.breakTimeRemaining - elapsedMinutes),
          )
        } else if (storeState.currentStatus === "sleeperBerth") {
          // Sleeper berth counts as rest, so it recharges drive time
          const rechargeRate = storeState.splitSleepSettings.enabled ? 0.75 : 0.5
          updatedHos.driveTimeRemaining = Math.min(
            11 * 60,
            Math.round(updatedHos.driveTimeRemaining + elapsedMinutes * rechargeRate),
          )
          // Break timer counts down faster when in sleeper berth
          updatedHos.breakTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.breakTimeRemaining - elapsedMinutes * 2),
          )
        } else if (
          storeState.currentStatus === "offDuty" ||
          storeState.currentStatus === "personalConveyance"
        ) {
          // Off duty and personal conveyance count as rest
          updatedHos.breakTimeRemaining = Math.max(
            0,
            Math.round(updatedHos.breakTimeRemaining - elapsedMinutes),
          )
        }

      // Update Zustand store
      storeState.updateHoursOfService(updatedHos)

      // Update HOS status in auth store with real-time calculations
      setTimeout(() => {
        updateHosStatusFromLogs()
      }, 100) // Small delay to ensure state is updated
    }

    // Update every minute
    const interval = setInterval(updateHoursOfService, 60 * 1000)

    // Initial update
    updateHoursOfService()

    return () => clearInterval(interval)
  }, [storeState.currentStatus])

  // Create daily HOS log at midnight
  useEffect(() => {
    const createDailyLogAtMidnight = async () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime()
      
      const timeoutId = setTimeout(async () => {
        try {
          await createDailyHOSLog()
          console.log('📅 Daily HOS log created at midnight')
          
          // Set up next day's timer
          createDailyLogAtMidnight()
        } catch (error) {
          console.error('Failed to create daily HOS log at midnight:', error)
        }
      }, timeUntilMidnight)
      
      return () => clearTimeout(timeoutId)
    }
    
    createDailyLogAtMidnight()
  }, [])

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

      storeState.setCurrentLocation(location)
    } catch (error) {
      console.error("Failed to get location:", error)
    }
  }

  const updateStatus = async (status: DriverStatus, reason: string) => {
    // Status updates are now always allowed regardless of certification status

    try {
      storeState.setUpdating(true)
      storeState.clearError()

      // Get current location (temporarily disabled)
      // await getCurrentLocation()

      // Create status update
      const statusUpdate: StatusUpdate = {
        status,
        timestamp: Date.now(),
        reason,
        location: storeState.currentLocation || {
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

      // Update Zustand store
      storeState.setCurrentStatus(status)
      storeState.addStatusUpdate(statusUpdate)
      storeState.setLogEntries([...storeState.logEntries, logEntry])

      // Note: HOS APIs are now handled by the backend automatically when using the new driver API
      // Status changes should use the new driver API endpoints directly (see StatusScreen)

      // Warning for critical status changes
      if (status === "driving" && storeState.hoursOfService.driveTimeRemaining < 60) {
        toast.warning(
          `You have less than ${storeState.formatDuration(storeState.hoursOfService.driveTimeRemaining)} of driving time remaining.`
        )
      }
    } catch (error) {
      console.error("Failed to update status:", error)
      storeState.setUpdating(false)
      storeState.setError("Failed to update status")
    }
  }

  // Note: HOS APIs are now handled automatically by the backend when using the new driver API
  // The sendHOSAPIs function has been removed - status changes should use driverApi.changeDutyStatus()
  // directly from the StatusScreen component

  const createDailyHOSLog = async () => {
    try {
      // Get driver ID from auth store
      const authState = useAuthStore.getState()
      const driverId = authState.driverProfile?.driver_id || authState.user?.id || "driver_uuid"
      
      // Calculate today's totals from status history
      const today = new Date()
      const startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)
      
      // Filter logs for today
      const todaysLogs = storeState.statusHistory.filter((log: StatusUpdate) => {
        const logDate = new Date(log.timestamp)
        return logDate >= startOfDay && logDate <= endOfDay
      })
      
      // Calculate total times for each duty status
      let totalDrivingTime = 0
      let totalOnDutyTime = 0
      let totalOffDutyTime = 0
      
      // Sort logs by timestamp and calculate durations
      const sortedLogs = todaysLogs.sort((a: StatusUpdate, b: StatusUpdate) => a.timestamp - b.timestamp)
      
      for (let i = 0; i < sortedLogs.length - 1; i++) {
        const currentLog = sortedLogs[i]
        const nextLog = sortedLogs[i + 1]
        const duration = Math.round((nextLog.timestamp - currentLog.timestamp) / (1000 * 60)) // minutes, rounded to integer
        
        switch (currentLog.status) {
          case 'driving':
            totalDrivingTime += duration
            totalOnDutyTime += duration
            break
          case 'onDuty':
          case 'yardMove':
            totalOnDutyTime += duration
            break
          case 'offDuty':
          case 'sleeping':
          case 'sleeperBerth':
          case 'personalConveyance':
            totalOffDutyTime += duration
            break
        }
      }
      
      // Create daily HOS log with integer values
      const dailyHOSLog = {
        driver: driverId,
        log_date: today.toISOString().split('T')[0], // YYYY-MM-DD format
        total_driving_time: Math.round(totalDrivingTime),
        total_on_duty_time: Math.round(totalOnDutyTime),
        total_off_duty_time: Math.round(totalOffDutyTime),
        is_certified: false,
      }
      
      console.log('📤 HOS API: Creating daily HOS log:', JSON.stringify(dailyHOSLog, null, 2))
      await hosApi.createDailyHOSLog(dailyHOSLog)
      console.log('✅ HOS API: Daily HOS log created successfully')
      
      // Note: Clock ID management removed - new driver API handles this automatically
      
      // Update HOS status after creating daily log
      updateHosStatusFromLogs()
      
    } catch (error: any) {
      console.error('Failed to create daily HOS log:', error)
      // Don't throw error to avoid breaking certification flow
      console.warn('Daily HOS log creation failed, but certification will continue')
    }
  }

  const certifyLogs = async (signature: string) => {
    try {
      // Create daily HOS log before certifying
      await createDailyHOSLog()

      const certification: LogCertification = {
        isCertified: false,
        certifiedAt: Date.now(),
        certifiedBy: "Driver", // TODO: Get driver name from context
        certificationSignature: signature,
      }

      await AsyncStorage.setItem("logCertification", JSON.stringify(certification))

      storeState.setCertification(certification)

      toast.success("Your logs have been successfully certified. No further changes can be made until uncertified.")
    } catch (error) {
      console.error("Failed to certify logs:", error)
      toast.error("Failed to certify logs")
    }
  }

  const getStatusReasons = (status?: DriverStatus) => {
    if (!status) return STATUS_REASONS
    return STATUS_REASONS.filter((r) => r.category === status || r.category === "all")
  }

  const updateLogEntry = async (id: string, updates: Partial<LogEntry>) => {
    try {
      const updatedLogEntries = storeState.logEntries.map((entry: any) =>
        entry.id === id ? { ...entry, ...updates } : entry,
      )

      await AsyncStorage.setItem("logEntries", JSON.stringify(updatedLogEntries))

      storeState.setLogEntries(updatedLogEntries)
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

      storeState.setSplitSleepSettings(splitSleepSettings)
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

      storeState.setCertification(certification)
      storeState.setLogEntries(storeState.logEntries.map((entry) => ({
        ...entry,
        isCertified: false,
        isEditable: true,
      })))

      toast.success("Your logs have been uncertified. You can now make changes.")
    } catch (error) {
      console.error("Failed to uncertify logs:", error)
      toast.error("Failed to uncertify logs")
    }
  }

  // Note: Clock ID management functions removed - new driver API handles this automatically
  // changeDutyStatus, getExistingClockId, storeClockId, clearClockId are no longer needed

  const updateHosStatusFromLogs = () => {
    try {
      const authState = useAuthStore.getState()
      if (!authState.hosStatus) return

      // Calculate current HOS times based on status history
      const now = Date.now()
      const today = new Date()
      const startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)
      
      // Filter logs for today
      const todaysLogs = storeState.statusHistory.filter((log: StatusUpdate) => {
        const logDate = new Date(log.timestamp)
        const logTimestamp = logDate.getTime()
        return logTimestamp >= startOfDay.getTime() && logTimestamp <= now
      })
      
      // Calculate total times for each duty status
      let totalDrivingTime = 0
      let totalOnDutyTime = 0
      let totalOffDutyTime = 0
      
      // Sort logs by timestamp and calculate durations
      const sortedLogs = todaysLogs.sort((a: StatusUpdate, b: StatusUpdate) => a.timestamp - b.timestamp)
      
      for (let i = 0; i < sortedLogs.length - 1; i++) {
        const currentLog = sortedLogs[i]
        const nextLog = sortedLogs[i + 1]
        const duration = Math.round((nextLog.timestamp - currentLog.timestamp) / (1000 * 60)) // minutes, rounded to integer
        
        switch (currentLog.status) {
          case 'driving':
            totalDrivingTime += duration
            totalOnDutyTime += duration
            break
          case 'onDuty':
          case 'yardMove':
            totalOnDutyTime += duration
            break
          case 'offDuty':
          case 'sleeping':
          case 'sleeperBerth':
          case 'personalConveyance':
            totalOffDutyTime += duration
            break
        }
      }
      
      // Calculate remaining times (in minutes) - round to integers
      const maxDrivingTime = 11 * 60 // 11 hours
      const maxOnDutyTime = 14 * 60 // 14 hours  
      const maxCycleTime = 70 * 60 // 70 hours
      
      const drivingTimeRemaining = Math.max(0, Math.ceil(maxDrivingTime - totalDrivingTime))
      const onDutyTimeRemaining = Math.max(0, Math.ceil(maxOnDutyTime - totalOnDutyTime))
      const cycleTimeRemaining = Math.max(0, Math.ceil(maxCycleTime - (totalOnDutyTime + totalOffDutyTime)))
      
      // Update auth store with calculated times
      useAuthStore.getState().updateHosStatus({
        current_status: storeState.currentStatus.toUpperCase(),
        driving_time_remaining: drivingTimeRemaining,
        on_duty_time_remaining: onDutyTimeRemaining,
        cycle_time_remaining: cycleTimeRemaining,
        time_remaining: {
          driving_time_remaining: drivingTimeRemaining,
          on_duty_time_remaining: onDutyTimeRemaining,
          cycle_time_remaining: cycleTimeRemaining,
        }
      })
      
      console.log('🔄 HOS Status updated:', {
        current_status: storeState.currentStatus,
        driving_time_remaining: drivingTimeRemaining,
        on_duty_time_remaining: onDutyTimeRemaining,
        cycle_time_remaining: cycleTimeRemaining
      })
      
    } catch (error) {
      console.error('Failed to update HOS status from logs:', error)
    }
  }

  const formatDuration = (minutes: number) => {
    const roundedMinutes = Math.round(minutes)
    const hours = Math.floor(roundedMinutes / 60)
    const mins = Math.floor(roundedMinutes % 60)
    return `${hours}h ${mins}m`
  }

  return {
    ...storeState,
    updateStatus,
    getCurrentLocation,
    // changeDutyStatus removed - use driverApi.changeDutyStatus() directly
  }
})
