import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BatteryState, useBatteryLevel, useBatteryState, useLowPowerMode } from 'expo-battery'
import JMBluetoothService from '@/services/JMBluetoothService'
import { ObdEldData, HistoryProgress } from '@/types/JMBluetooth'
import { handleData } from '@/services/handleData'
import { useAuth } from '@/stores/authStore'
import { useStatusStore } from '@/stores/statusStore'
import { mapDriverStatusToAppStatus } from '@/utils/hos-status-mapper'
import { sendObdDataBatch, ObdDataPayload } from '@/api/obd'
import { awsApiService, AwsObdPayload } from '@/services/AwsApiService'
import { awsConfig } from '@/config/aws-config'
import { locationQueueService } from '@/services/location-queue'
import { setBatteryGetter } from '@/services/device-heartbeat-service'
import { decodeObdCode, ObdCodeDetails } from '@/utils/obd-code-decoder'

const SPEED_THRESHOLD_DRIVING = 5 // mph

type ActivityState = 'driving' | 'idling' | 'inactive' | 'disconnected'

const SYNC_STRATEGY: Record<
  ActivityState,
  { localIntervalMs: number; localBatchSize: number; awsIntervalMs: number; awsBatchSize: number }
> = {
  driving: {
    localIntervalMs: 20000,
    localBatchSize: 5,
    awsIntervalMs: 20000,
    awsBatchSize: 5,
  },
  idling: {
    localIntervalMs: 90000,
    localBatchSize: 3,
    awsIntervalMs: 90000,
    awsBatchSize: 3,
  },
  inactive: {
    localIntervalMs: 180000,
    localBatchSize: 10,
    awsIntervalMs: 180000,
    awsBatchSize: 10,
  },
  disconnected: {
    localIntervalMs: 300000,
    localBatchSize: 10,
    awsIntervalMs: 300000,
    awsBatchSize: 10,
  },
}

interface MalfunctionRecord {
  id: string
  timestamp: Date
  ecuId: string
  ecuIdHex: string
  codes: ObdCodeDetails[]
}

interface EldHistoryRecord {
  id: string
  deviceId: string | null
  receivedAt: Date
  eventTime?: string
  eventType?: number
  eventId?: number
  latitude?: number
  longitude?: number
  gpsSpeed?: number
  raw: any
  displayData: OBDDataItem[]
}

interface EldHistoryRequest {
  type: number
  start: Date
  end: Date
}
interface OBDDataItem {
  id: string
  name: string
  value: string
  unit: string
  isError?: boolean
}

export interface AutoDutyChange {
  seq: number
  old_status: string
  new_status: string
  reason: string
  timestamp: string
}

interface ObdDataContextType {
  obdData: OBDDataItem[]
  lastUpdate: Date | null
  isConnected: boolean
  isSyncing: boolean
  awsSyncStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastAwsSync: Date | null
  recentAutoDutyChanges: AutoDutyChange[]
  batteryLevel: number | null
  batteryLevelPercent: number | null
  batteryState: BatteryState | null
  isLowPowerMode: boolean
  isSyncThrottled: boolean
  eldBatteryVoltage: number | null
  currentSpeedMph: number
  activityState: ActivityState
  recentMalfunctions: MalfunctionRecord[]
  eldDeviceId: string | null
  eldHistoryRecords: EldHistoryRecord[]
  isFetchingHistory: boolean
  historyFetchProgress: HistoryProgress | null
  fetchEldHistory: (request: EldHistoryRequest) => Promise<void>
}

const ObdDataContext = createContext<ObdDataContextType | undefined>(undefined)

export const ObdDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, driverProfile, vehicleAssignment } = useAuth()
  const { setEldLocation, setCurrentStatus } = useStatusStore()
  const queryClient = useQueryClient()
  const [obdData, setObdData] = useState<OBDDataItem[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [awsSyncStatus, setAwsSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [lastAwsSync, setLastAwsSync] = useState<Date | null>(null)
  const [recentAutoDutyChanges, setRecentAutoDutyChanges] = useState<AutoDutyChange[]>([])
  const [eldBatteryVoltage, setEldBatteryVoltage] = useState<number | null>(null)
  const [currentSpeedMph, setCurrentSpeedMph] = useState<number>(0)
  const [activityState, setActivityState] = useState<ActivityState>('inactive')
  const [recentMalfunctions, setRecentMalfunctions] = useState<MalfunctionRecord[]>([])
  const [eldDeviceId, setEldDeviceId] = useState<string | null>(null)
  
  const [eldHistoryRecords, setEldHistoryRecords] = useState<EldHistoryRecord[]>([])
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [historyFetchProgress, setHistoryFetchProgress] = useState<HistoryProgress | null>(null)

  const rawBatteryLevel = useBatteryLevel()
  const batteryState = useBatteryState()
  const isLowPowerMode = useLowPowerMode()

  const batteryLevel =
    typeof rawBatteryLevel === 'number' && rawBatteryLevel >= 0 && rawBatteryLevel <= 1
      ? rawBatteryLevel
      : null
  const batteryLevelPercent = batteryLevel !== null ? Math.round(batteryLevel * 100) : null
  const isBatteryLow = batteryLevel !== null && batteryLevel <= 0.2
  const isSyncThrottled = isLowPowerMode || isBatteryLow
  const batteryStateValue = batteryState ?? BatteryState.UNKNOWN
  const activeSyncStrategy = SYNC_STRATEGY[activityState] ?? SYNC_STRATEGY.inactive
  const baseLocalIntervalMs = activeSyncStrategy.localIntervalMs
  const baseAwsIntervalMs = activeSyncStrategy.awsIntervalMs
  const localBatchSize = activeSyncStrategy.localBatchSize
  const awsBatchSize = activeSyncStrategy.awsBatchSize
  const localSyncIntervalMs = isSyncThrottled ? baseLocalIntervalMs * 2 : baseLocalIntervalMs
  const awsSyncIntervalMs = isSyncThrottled ? baseAwsIntervalMs * 2 : baseAwsIntervalMs
  
  // Store data buffers for batch API sync
  const dataBufferRef = useRef<ObdDataPayload[]>([]) // Local API buffer
  const awsBufferRef = useRef<AwsObdPayload[]>([]) // AWS buffer
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const awsSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const localSyncInFlightRef = useRef(false)
  const awsSyncInFlightRef = useRef(false)
  const eldReportingStartedRef = useRef<boolean>(false) // Track if ELD reporting has been started
  const historyRecordsRef = useRef<EldHistoryRecord[]>([])
  const isFetchingHistoryRef = useRef(false)
  
  const resolveDeviceId = (source: any): string | null => {
    if (!source || typeof source !== 'object') {
      return null
    }

    const candidates = [
      source.deviceId,
      source.device_id,
      source.DeviceId,
      source.macAddress,
      source.mac,
      source.address,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim()
      }
    }

    return null
  }

  const resetHistoryState = useCallback(() => {
    historyRecordsRef.current = []
    setEldHistoryRecords([])
    setHistoryFetchProgress(null)
  }, [])

  const completeHistoryFetch = useCallback(() => {
    if (!isFetchingHistoryRef.current) {
      return
    }
    isFetchingHistoryRef.current = false
    setIsFetchingHistory(false)
    setHistoryFetchProgress((prev: any) => {
      const count = historyRecordsRef.current.length
      if (prev) {
        return {
          progress: count,
          count,
        }
      }
      return count > 0
        ? {
            progress: count,
            count,
          }
        : null
    })
    JMBluetoothService.stopReportHistoryData().catch((error) => {
      console.log('⚠️ OBD Data Context: Failed to stop history reporting', error?.message ?? error)
    })
  }, [])

  const fetchEldHistory = useCallback(
    async ({ type, start, end }: EldHistoryRequest) => {
      if (!isConnected) {
        throw new Error('ELD device is not connected')
      }

      if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
        throw new Error('Invalid start time provided')
      }

      if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
        throw new Error('Invalid end time provided')
      }

      if (start >= end) {
        throw new Error('Start time must be earlier than end time')
      }

      if (isFetchingHistoryRef.current) {
        console.warn('⚠️ OBD Data Context: History fetch already in progress, skipping new request')
        return
      }

      const startTime = JMBluetoothService.formatTimeForHistory(start)
      const endTime = JMBluetoothService.formatTimeForHistory(end)

      resetHistoryState()
      setIsFetchingHistory(true)
      isFetchingHistoryRef.current = true

      try {
        await JMBluetoothService.queryHistoryData(type, startTime, endTime)
      } catch (error) {
        console.error('❌ OBD Data Context: Failed to query history data', error)
        isFetchingHistoryRef.current = false
        setIsFetchingHistory(false)
        setHistoryFetchProgress(null)
        throw error
      }
    },
    [isConnected],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      setEldDeviceId(null)
      return
    }

    JMBluetoothService.getCurrentDeviceId()
      .then((deviceId) => {
        if (deviceId && deviceId.trim().length > 0) {
          setEldDeviceId(deviceId.trim())
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.log('ℹ️ OBD Data Context: No current device ID available', message)
      })
  }, [isAuthenticated])

  // Set up battery getter for heartbeat service
  useEffect(() => {
    setBatteryGetter(() => {
      if (batteryLevelPercent !== null) {
        return batteryLevelPercent
      }
      return undefined
    })
  }, [batteryLevelPercent])

  useEffect(() => {
    if (isSyncThrottled) {
      console.warn('⚠️ OBD Data Context: Sync throttled due to battery state', {
        batteryLevelPercent,
        isLowPowerMode,
        eldBatteryVoltage,
      })
    } else {
      console.log('✅ OBD Data Context: Sync running at full frequency', {
        batteryLevelPercent,
        isLowPowerMode,
        eldBatteryVoltage,
      })
    }
  }, [isSyncThrottled, batteryLevelPercent, isLowPowerMode, eldBatteryVoltage])

    // Listen for OBD data updates
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('📡 OBD Data Context: User not authenticated, skipping setup')
      setActivityState('inactive')
      setCurrentSpeedMph(0)
      resetHistoryState()
      return
    }

    console.log('📡 OBD Data Context: Setting up listeners for authenticated user')

    // Listen for OBD ELD data
    const obdEldDataListener = JMBluetoothService.addEventListener(
      'onObdEldDataReceived',
      (data: ObdEldData) => {
        console.log('📊 OBD Data Context: Received ELD data event')
        console.log('📊 OBD Data Context: Data keys:', Object.keys(data))
        console.log('📊 OBD Data Context: Has dataFlowList?', !!data.dataFlowList, 'Length:', data.dataFlowList?.length || 0)
        console.log('📊 OBD Data Context: driverProfile exists?', !!driverProfile, 'driver_id:', driverProfile?.driver_id)
        console.log('📊 OBD Data Context: vehicleAssignment exists?', !!vehicleAssignment)
        const incomingDeviceId = resolveDeviceId(data)
        const deviceIdentifier = incomingDeviceId ?? eldDeviceId ?? null

        if (deviceIdentifier) {
          setEldDeviceId(deviceIdentifier)
        }

        const payloadWithDeviceId = {
          ...data,
          deviceId: deviceIdentifier ?? undefined,
          device_id: deviceIdentifier ?? undefined,
        }

        const displayData = handleData(payloadWithDeviceId)
        console.log('📊 OBD Data Context: Processed display data', {
          displayDataLength: displayData.length,
          displayDataItems: displayData.map(item => ({ name: item.name, value: item.value })),
        })

        const isLiveEventFlag =
          typeof (payloadWithDeviceId as any).isLiveEvent === 'number'
            ? (payloadWithDeviceId as any).isLiveEvent
            : undefined

        const isHistoryEvent =
          isFetchingHistoryRef.current || isLiveEventFlag === 0

        if (isHistoryEvent) {
          const historyRecord: EldHistoryRecord = {
            id: `${payloadWithDeviceId.eventTime ?? payloadWithDeviceId.timestamp ?? Date.now()}-${payloadWithDeviceId.eventId ?? historyRecordsRef.current.length}`,
            deviceId: deviceIdentifier ?? null,
            receivedAt: new Date(),
            eventTime: payloadWithDeviceId.eventTime,
            eventType: payloadWithDeviceId.eventType,
            eventId: payloadWithDeviceId.eventId,
            latitude: payloadWithDeviceId.latitude,
            longitude: payloadWithDeviceId.longitude,
            gpsSpeed: payloadWithDeviceId.gpsSpeed,
            raw: payloadWithDeviceId,
            displayData,
          }
          historyRecordsRef.current = [...historyRecordsRef.current, historyRecord]
          setEldHistoryRecords([...historyRecordsRef.current])
          setHistoryFetchProgress({
            progress: historyRecordsRef.current.length,
            count: historyRecordsRef.current.length,
          })
          return
        }

        const speedItem = displayData.find(item =>
          item.name.includes('Vehicle Speed') || item.name.includes('Wheel-Based Vehicle Speed'),
        )
        let speedMph = speedItem ? parseFloat(speedItem.value) || 0 : 0
        if (speedItem?.unit && speedItem.unit.toLowerCase().includes('km')) {
          speedMph = parseFloat((speedMph * 0.621371).toFixed(2))
        }

        setObdData(displayData)
        setCurrentSpeedMph(speedMph)
        setActivityState(speedMph >= SPEED_THRESHOLD_DRIVING ? 'driving' : 'idling')

        // Capture ELD (vehicle) battery voltage if available
        const vehicleVoltageItem = displayData.find((item) => item.name.toLowerCase().includes('voltage'))
        if (vehicleVoltageItem) {
          const parsedVoltage = parseFloat(vehicleVoltageItem.value)
          if (!Number.isNaN(parsedVoltage)) {
            setEldBatteryVoltage(parsedVoltage)
          }
        }

        setLastUpdate(new Date())
        setIsConnected(true)

        // Store ELD location in global state (non-blocking)
        if (payloadWithDeviceId.latitude !== undefined && payloadWithDeviceId.longitude !== undefined &&
            !isNaN(payloadWithDeviceId.latitude) && !isNaN(payloadWithDeviceId.longitude)) {
          setEldLocation({
            latitude: payloadWithDeviceId.latitude,
            longitude: payloadWithDeviceId.longitude,
            timestamp: Date.now(),
          })
          console.log('📍 OBD Data Context: Stored ELD location:', payloadWithDeviceId.latitude, payloadWithDeviceId.longitude)
          
          // Add location to queue for batch upload (new driver API)
          const odometerItem = displayData.find(item => 
            item.name.includes('Total Vehicle Distance') || item.name.includes('Odometer')
          )
          const odometer = odometerItem ? parseFloat(odometerItem.value) || undefined : undefined
          
          locationQueueService.addLocation({
            latitude: payloadWithDeviceId.latitude,
            longitude: payloadWithDeviceId.longitude,
            speed_mph: speedMph,
            heading: payloadWithDeviceId.gpsRotation,
            odometer: odometer,
            accuracy_m: undefined, // ObdEldData doesn't have accuracy field, can be added later if available
          }).catch(error => {
            console.error('❌ OBD Data Context: Failed to add location to queue:', error)
          })
        }

        // Add to buffers for dual sync (Local API + AWS)
        if (!driverProfile?.driver_id) {
          console.warn('⚠️ OBD Data Context: Cannot add to buffers - missing driverProfile.driver_id')
          console.warn('⚠️ OBD Data Context: driverProfile:', driverProfile)
          return
        }

        // Local API payload
        const rawPayload = payloadWithDeviceId

        const localPayload: ObdDataPayload = {
          driver_id: driverProfile.driver_id,
          timestamp: new Date().toISOString(),
          latitude: payloadWithDeviceId.latitude,
          longitude: payloadWithDeviceId.longitude,
          raw_data: rawPayload,
          device_id: deviceIdentifier ?? undefined,
          deviceId: deviceIdentifier ?? undefined,
        }

        // AWS Lambda payload - ensure required fields are always valid
        const vehicleId = vehicleAssignment?.vehicle_info?.vin || vehicleAssignment?.vehicle_info?.vehicle_unit || 'UNKNOWN_VEHICLE'
        const timestamp = Date.now()
        
        console.log('📦 OBD Data Context: Preparing payloads - vehicleId:', vehicleId, 'timestamp:', timestamp)
        
        // Only add to AWS buffer if vehicleId and timestamp are valid
        if (vehicleId !== 'UNKNOWN_VEHICLE' && timestamp > 0) {
          const awsPayload: AwsObdPayload = {
            vehicleId: vehicleId,
            driverId: driverProfile.driver_id,
            timestamp: timestamp,
            dataType: 'engine_data',
            latitude: payloadWithDeviceId.latitude,
            longitude: payloadWithDeviceId.longitude,
            gpsSpeed: payloadWithDeviceId.gpsSpeed,
            gpsTime: payloadWithDeviceId.gpsTime,
            gpsRotation: payloadWithDeviceId.gpsRotation,
            eventTime: payloadWithDeviceId.eventTime,
            eventType: payloadWithDeviceId.eventType,
            eventId: payloadWithDeviceId.eventId,
            isLiveEvent: payloadWithDeviceId.isLiveEvent as any,
            allData: displayData,
            deviceId: deviceIdentifier ?? undefined,
          }

          // Extract specific values from display data for both payloads
          displayData.forEach((item) => {
            if (item.name.includes('Vehicle Speed')) {
              let value = parseFloat(item.value) || 0
              if (item.unit && item.unit.toLowerCase().includes('km')) {
                value = parseFloat((value * 0.621371).toFixed(2))
              }
              localPayload.vehicle_speed = value
              awsPayload.vehicleSpeed = value
            } else if (item.name.includes('Engine Speed')) {
              const value = parseFloat(item.value) || 0
              localPayload.engine_speed = value
              awsPayload.engineSpeed = value
            } else if (item.name.includes('Coolant Temperature')) {
              const value = parseFloat(item.value) || 0
              localPayload.coolant_temp = value
              awsPayload.coolantTemp = value
            } else if (item.name.includes('Fuel Level')) {
              const value = parseFloat(item.value) || 0
              localPayload.fuel_level = value
              awsPayload.fuelLevel = value
            } else if (item.name.includes('Voltage')) {
              awsPayload.batteryVoltage = (parseFloat(item.value) || 0) / 1000
            } else if (item.name.includes('Total Vehicle Distance') || item.name.includes('Odometer')) {
              awsPayload.odometer = parseFloat(item.value) || 0
            }
          })

          dataBufferRef.current.push(localPayload)
          awsBufferRef.current.push(awsPayload)
          console.log(`📦 OBD Data Context: Added to buffers - Local: ${dataBufferRef.current.length}, AWS: ${awsBufferRef.current.length} items`)
        } else {
          // Skip AWS sync if vehicleId is invalid
          console.warn(`⚠️ OBD Data Context: Skipping AWS sync - invalid vehicleId: ${vehicleId}`)
          dataBufferRef.current.push(localPayload) // Still sync to local API
        }
      }
    )

    const disconnectedListener = JMBluetoothService.addEventListener(
      'onDisconnected',
      () => {
        console.log('❌ OBD Data Context: Device disconnected')
        console.log('🔄 OBD Data Context: Setting isConnected to false')
        setIsConnected(false)
        setActivityState('disconnected')
        setCurrentSpeedMph(0)
        setEldBatteryVoltage(null)
        eldReportingStartedRef.current = false // Reset flag on disconnect
      }
    )

    const connectedListener = JMBluetoothService.addEventListener(
      'onConnected',
      () => {
        console.log('✅ OBD Data Context: Device connected')
        console.log('🔄 OBD Data Context: Setting isConnected to true')
        setIsConnected(true)
        setActivityState('idling')
        setCurrentSpeedMph(0)
        
        // Prevent duplicate calls
        if (eldReportingStartedRef.current) {
          console.log('ℹ️ OBD Data Context: ELD reporting already started, skipping duplicate call')
          return
        }
        
        // Wait for stable connection before starting ELD reporting
        setTimeout(async () => {
          try {
            if (eldReportingStartedRef.current) {
              console.log('ℹ️ OBD Data Context: ELD reporting already started during wait period, skipping')
              return
            }
            
            const status = await JMBluetoothService.getConnectionStatus()
            if (status.isConnected) {
              console.log('📊 OBD Data Context: Connection stable, starting ELD reporting...')
              await JMBluetoothService.startReportEldData()
              eldReportingStartedRef.current = true
              console.log('✅ OBD Data Context: ELD reporting started successfully from onConnected')
            } else {
              console.log('⚠️ OBD Data Context: Connection lost before starting ELD reporting')
            }
          } catch (error) {
            console.log('⚠️ OBD Data Context: Failed to start ELD reporting from onConnected:', error)
          }
        }, 2000) // Wait 2 seconds for stable connection
      }
    )

    // Listen for authentication passed event
    const authPassedListener = JMBluetoothService.addEventListener(
      'onAuthenticationPassed',
      async () => {
        console.log('✅ OBD Data Context: Authentication passed, waiting for stable connection...')
        
        // Note: Native module automatically starts ELD reporting in onAuthenticationPassed
        // This is a backup/fallback in case native module doesn't start it
        // Wait a bit after authentication before starting ELD reporting
        setTimeout(async () => {
          try {
            if (eldReportingStartedRef.current) {
              console.log('ℹ️ OBD Data Context: ELD reporting already started, skipping duplicate call')
              return
            }
            
            const status = await JMBluetoothService.getConnectionStatus()
            if (status.isConnected) {
              console.log('📊 OBD Data Context: Starting ELD reporting after authentication (fallback)...')
              await JMBluetoothService.startReportEldData()
              eldReportingStartedRef.current = true
              console.log('✅ OBD Data Context: ELD reporting started successfully after authentication')
            } else {
              console.log('⚠️ OBD Data Context: Not connected after authentication')
            }
          } catch (error) {
            console.log('⚠️ OBD Data Context: Failed to start ELD reporting after authentication:', error)
          }
        }, 3000) // Wait 3 seconds after authentication
      }
    )

    // Check current connection status on setup (runs when context initializes)
    const checkConnectionStatus = async () => {
      try {
        // Only check if authenticated
        if (!isAuthenticated) {
          console.log('⏭️ OBD Data Context: Skipping connection check - not authenticated')
          return
        }

        const status = await JMBluetoothService.getConnectionStatus()
        console.log('🔍 OBD Data Context: Initial connection check:', status)
        
        if (status.isConnected) {
          console.log('✅ OBD Data Context: Device already connected, setting connected state')
          setIsConnected(true)
          
          // Prevent duplicate calls
          if (eldReportingStartedRef.current) {
            console.log('ℹ️ OBD Data Context: ELD reporting already started, skipping duplicate call')
            return
          }
          
          // Wait a bit before starting ELD reporting to ensure stable connection
          setTimeout(async () => {
            try {
              if (eldReportingStartedRef.current) {
                console.log('ℹ️ OBD Data Context: ELD reporting already started during wait period, skipping')
                return
              }
              
              const recheckStatus = await JMBluetoothService.getConnectionStatus()
              if (recheckStatus.isConnected && !eldReportingStartedRef.current) {
                console.log('📊 OBD Data Context: Starting ELD reporting from status check...')
                await JMBluetoothService.startReportEldData()
                eldReportingStartedRef.current = true
                console.log('✅ OBD Data Context: ELD reporting started successfully from status check')
              } else {
                if (!recheckStatus.isConnected) {
                  console.log('⚠️ OBD Data Context: Connection lost during wait period')
                } else {
                  console.log('ℹ️ OBD Data Context: ELD reporting already started elsewhere')
                }
              }
            } catch (error) {
              console.log('⚠️ OBD Data Context: Failed to start ELD reporting from status check:', error)
            }
          }, 2000) // Wait 2 seconds for stable connection
        } else {
          console.log('ℹ️ OBD Data Context: Device not connected on initial check')
        }
      } catch (error) {
        console.log('⚠️ OBD Data Context: Failed to check connection status:', error)
      }
    }

    // Check connection status immediately (only if authenticated)
    if (isAuthenticated) {
      checkConnectionStatus()
      
      // Initialize location queue service
      locationQueueService.ensureInitialized().then(() => {
        // Set up auto-duty change handler
        locationQueueService.setAutoDutyChangeHandler((changes) => {
          if (changes && changes.length > 0) {
            // Process all changes, but apply the most recent one (last in array)
            // This handles cases where multiple changes occur in one batch
            changes.forEach((change, index) => {
              console.log(`🔄 OBD Data Context: Auto-duty change ${index + 1}/${changes.length}`, {
                seq: change.seq,
                from: change.old_status,
                to: change.new_status,
                reason: change.reason,
                auto_changed: change.auto_changed,
              })
            })
            
            // Get the most recent change (last in array) - this is the current state
            const latestChange = changes[changes.length - 1]
            
            // Store recent auto-duty changes (keep last 5)
            const newChanges: AutoDutyChange[] = changes.map(change => ({
              seq: change.seq,
              old_status: change.old_status,
              new_status: change.new_status,
              reason: change.reason,
              timestamp: new Date().toISOString(),
            }))
            
            setRecentAutoDutyChanges(prev => {
              const combined = [...prev, ...newChanges]
              // Keep only the last 5 changes
              return combined.slice(-5)
            })
            
            // Map API status to app status
            const appStatus = mapDriverStatusToAppStatus(latestChange.new_status)
            
            // Special logging for common auto-transitions
            if (latestChange.old_status === 'driving' && latestChange.new_status === 'on_duty') {
              console.log('🛑 OBD Data Context: Vehicle stopped - Auto-returning to On Duty', {
                reason: latestChange.reason,
                idleTime: latestChange.reason?.toLowerCase().includes('idle') ? 'detected' : 'unknown',
              })
            } else if (latestChange.old_status === 'on_duty' && latestChange.new_status === 'driving') {
              console.log('🚗 OBD Data Context: Motion detected - Auto-switching to Driving', {
                reason: latestChange.reason,
              })
            }
            
            // Update status store
            setCurrentStatus(appStatus)
            
            // Invalidate HOS status queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ['driver', 'hos', 'current-status'] })
            queryClient.invalidateQueries({ queryKey: ['driver', 'hos', 'clocks'] })
            
            console.log('✅ OBD Data Context: Status auto-changed and UI refreshed', {
              from: latestChange.old_status,
              to: latestChange.new_status,
              appStatus,
              reason: latestChange.reason,
              timestamp: new Date().toISOString(),
            })
          }
        })
        
        const locationFlushIntervalMs = Math.min(Math.max(localSyncIntervalMs, 20000), 180000)
        locationQueueService.startAutoFlush(locationFlushIntervalMs)
        console.log('📍 OBD Data Context: Location queue service initialized and started', {
          locationFlushIntervalSeconds: locationFlushIntervalMs / 1000,
        })
      }).catch(error => {
        console.error('❌ OBD Data Context: Failed to initialize location queue:', error)
      })
    }

    // Listen for other events for debugging
    const obdEldStartListener = JMBluetoothService.addEventListener(
      'onObdEldStart',
      () => {
        console.log('📊 OBD Data Context: OBD ELD started')
        setIsConnected(true)
      }
    )

    const obdEldFinishListener = JMBluetoothService.addEventListener(
      'onObdEldFinish',
      () => {
        console.log('📊 OBD Data Context: OBD ELD finished')
        if (isFetchingHistoryRef.current) {
          completeHistoryFetch()
        }
      }
    )

    const obdDataFlowListener = JMBluetoothService.addEventListener(
      'onObdDataFlowReceived',
      (data: any) => {
        console.log('📊 OBD Data Context: Received OBD data flow', data)
        // Also try to process data flow as ELD data
        if (data && data.dataFlowList) {
          console.log('📊 OBD Data Context: Processing data flow as ELD data')
          const displayData = handleData(data)
          if (displayData.length > 0) {
            console.log('📊 OBD Data Context: Processed data flow, setting obdData')
            setObdData(displayData)
            setLastUpdate(new Date())
            setIsConnected(true)
          }
        }
      }
    )

    // Listen for raw data events for debugging
    const obdRawDataListener = JMBluetoothService.addEventListener(
      'onRawDataReceived',
      (data: any) => {
        console.log('📊 OBD Data Context: Received raw data', data)
      }
    )

    const deviceIdListener = JMBluetoothService.addEventListener(
      'onEldDeviceIdDetected',
      (payload) => {
        if (payload?.deviceId) {
          const normalizedId = payload.deviceId.trim()
          if (normalizedId.length > 0) {
            console.log('🆔 OBD Data Context: Detected ELD device ID', normalizedId)
            setEldDeviceId(normalizedId)
          }
        }
      },
    )

    const historyProgressListener = JMBluetoothService.addEventListener(
      'onHistoryProgress',
      (progress) => {
        if (progress && typeof progress === 'object') {
          const normalizedProgress = {
            progress: Number((progress as any).progress) || 0,
            count: Number((progress as any).count) || 0,
          }
          setHistoryFetchProgress(normalizedProgress)
        }
      },
    )

    const obdErrorDataListener = JMBluetoothService.addEventListener(
      'onObdErrorDataReceived',
      (errorData: any) => {
        try {
          const ecuList = Array.isArray(errorData?.ecuList) ? errorData.ecuList : []
          if (!driverProfile?.driver_id) {
            console.warn('⚠️ OBD Data Context: Malfunction event received without driver profile')
            return
          }
          if (ecuList.length === 0) {
            console.log('ℹ️ OBD Data Context: Malfunction event had no ECU entries, skipping')
            return
          }

          const incomingFaultDeviceId = resolveDeviceId(errorData)
          const faultDeviceIdentifier = incomingFaultDeviceId ?? eldDeviceId ?? null

          if (faultDeviceIdentifier) {
            setEldDeviceId(faultDeviceIdentifier)
          }

          const eventTimestamp = errorData?.timestamp
            ? Number.parseInt(errorData.timestamp, 10)
            : Date.now()
          const timestamp = Number.isFinite(eventTimestamp) ? new Date(eventTimestamp) : new Date()

          const malfunctionRecords = (ecuList as Array<any>)
            .map<MalfunctionRecord | null>((ecu, index: number) => {
              const codeList = Array.isArray(ecu?.codes)
                ? (ecu.codes as string[]).filter((code) => typeof code === 'string' && code.trim() !== '')
                : []
              if (codeList.length === 0) {
                return null
              }

              const codes = codeList.map((code) => decodeObdCode(code))

              const ecuIdHex =
                typeof ecu?.ecuIdHex === 'string' && ecu.ecuIdHex.trim().length > 0
                  ? ecu.ecuIdHex
                  : typeof ecu?.ecuId === 'string' && ecu.ecuId.trim().length > 0
                    ? `0x${parseInt(ecu.ecuId, 10).toString(16).toUpperCase()}`
                    : `ECU_${index}`

              const ecuId =
                typeof ecu?.ecuId === 'string' && ecu.ecuId.trim().length > 0 ? ecu.ecuId : ecuIdHex

              return {
                id: `${timestamp.getTime()}-${ecuId}-${index}`,
                timestamp,
                ecuId,
                ecuIdHex,
                codes,
              }
            })
            .filter((record): record is MalfunctionRecord => record !== null)

          if (malfunctionRecords.length === 0) {
            console.log('ℹ️ OBD Data Context: Malfunction event had no valid codes after filtering')
            return
          }

          setRecentMalfunctions((prev) => {
            const combined = [...prev, ...malfunctionRecords]
            return combined.slice(-20)
          })

          const faultCodesPayload = malfunctionRecords.map((record) => ({
            ecu_id: record.ecuId,
            ecu_id_hex: record.ecuIdHex,
            codes: record.codes.map((code) => code.code),
            details: record.codes,
          }))

          const rawFaultDetails = {
            dataType: 'fault_data' as const,
            faultCodes: malfunctionRecords.map((record) => ({
              ecuId: record.ecuId,
              ecuIdHex: record.ecuIdHex,
              codes: record.codes.map((code) => code.code),
              details: record.codes,
            })),
          deviceId: faultDeviceIdentifier ?? undefined,
          device_id: faultDeviceIdentifier ?? undefined,
            ack: errorData?.ack,
            ackDescription: errorData?.ackDescription,
            dataTypeCode: errorData?.dataType,
            vehicleType: errorData?.vehicleType,
            msgSubtype: errorData?.msgSubtype,
            eventTime: errorData?.time,
          }

          const faultPayload: ObdDataPayload = {
            driver_id: driverProfile.driver_id,
            timestamp: new Date().toISOString(),
            raw_data: rawFaultDetails,
            data_type: 'fault_data',
            fault_codes: faultCodesPayload,
            device_id: faultDeviceIdentifier ?? undefined,
            deviceId: faultDeviceIdentifier ?? undefined,
          }

          if (typeof errorData?.latitude === 'number') {
            faultPayload.latitude = errorData.latitude
          }
          if (typeof errorData?.longitude === 'number') {
            faultPayload.longitude = errorData.longitude
          }

          dataBufferRef.current.push(faultPayload)
          console.log(
            `🚨 OBD Data Context: Recorded malfunction event with ${faultCodesPayload.length} ECU entries`,
          )

          if (awsConfig.features.enableAwsSync) {
            const vehicleId =
              vehicleAssignment?.vehicle_info?.vin ||
              vehicleAssignment?.vehicle_info?.vehicle_unit ||
              'UNKNOWN_VEHICLE'

            if (vehicleId === 'UNKNOWN_VEHICLE') {
              console.warn(
                '⚠️ OBD Data Context: Skipping AWS fault sync - unknown vehicle identifier',
              )
            } else {
              const awsFaultPayload: AwsObdPayload = {
                vehicleId,
                driverId: driverProfile.driver_id,
                timestamp: timestamp.getTime(),
                dataType: 'fault_data',
                deviceId: faultDeviceIdentifier ?? undefined,
                faultCodes: malfunctionRecords.map((record) => ({
                  ecuId: record.ecuId,
                  ecuIdHex: record.ecuIdHex,
                  codes: record.codes.map((code) => code.code),
                  details: record.codes,
                })),
                allData: malfunctionRecords.map((record) => ({
                  ecuId: record.ecuId,
                  ecuIdHex: record.ecuIdHex,
                  codes: record.codes.map((code) => code.code),
                  details: record.codes,
                })),
              }

              if (typeof errorData?.latitude === 'number') {
                awsFaultPayload.latitude = errorData.latitude
              }
              if (typeof errorData?.longitude === 'number') {
                awsFaultPayload.longitude = errorData.longitude
              }

              awsBufferRef.current.push(awsFaultPayload)
              console.log(
                '🚨 AWS Buffer: Added malfunction payload for synchronization',
                awsFaultPayload,
              )
            }
          }
        } catch (error) {
          console.error('❌ OBD Data Context: Failed to process malfunction event', error)
        }
      },
    )

    // Listen for any data received event
    const obdDataReceivedListener = JMBluetoothService.addEventListener(
      'onDataReceived',
      (data: any) => {
        console.log('📊 OBD Data Context: Received generic data', data)
      }
    )

    return () => {
      JMBluetoothService.removeEventListener(obdEldDataListener)
      JMBluetoothService.removeEventListener(disconnectedListener)
      JMBluetoothService.removeEventListener(connectedListener)
      JMBluetoothService.removeEventListener(authPassedListener)
      JMBluetoothService.removeEventListener(obdEldStartListener)
      JMBluetoothService.removeEventListener(obdEldFinishListener)
      JMBluetoothService.removeEventListener(obdDataFlowListener)
      JMBluetoothService.removeEventListener(obdRawDataListener)
      JMBluetoothService.removeEventListener(deviceIdListener)
      JMBluetoothService.removeEventListener(historyProgressListener)
      JMBluetoothService.removeEventListener(obdErrorDataListener)
      JMBluetoothService.removeEventListener(obdDataReceivedListener)
      
      // Stop location queue auto-flush
      locationQueueService.stopAutoFlush()
      resetHistoryState()
    }
  }, [isAuthenticated, driverProfile?.driver_id, vehicleAssignment?.vehicle_info?.vin, localSyncIntervalMs, eldDeviceId, completeHistoryFetch])

  // Set up periodic Local API sync using adaptive cadence
  useEffect(() => {
    if (!isAuthenticated || !driverProfile?.driver_id) {
      return
    }

    if (!awsConfig.features.enableLocalSync) {
      console.log('ℹ️  Local API sync disabled via config')
      return
    }

    console.log('⏰ OBD Data Context: Setting up Local API sync interval', {
      intervalSeconds: localSyncIntervalMs / 1000,
      isSyncThrottled,
      activityState,
      batchSize: localBatchSize,
    })

    const runLocalSync = async () => {
      if (localSyncInFlightRef.current) {
        console.log('⏳ Local API: Previous sync still in flight, skipping this tick')
        return
      }

      if (dataBufferRef.current.length === 0) {
        console.log('⏭️  Local API: No data to sync, skipping (buffer empty)')
        console.log('⏭️  Local API: Debug - isAuthenticated:', isAuthenticated, 'driverProfile:', !!driverProfile, 'isConnected:', isConnected)
        return
      }

      const payload = dataBufferRef.current.slice(0, Math.max(1, localBatchSize))

      if (payload.length === 0) {
        console.log('⏭️  Local API: Computed payload empty after slicing, skipping')
        return
      }

      try {
        localSyncInFlightRef.current = true
        setIsSyncing(true)
        console.log(
          `🔄 Local API: Syncing ${payload.length} records (buffer size ${dataBufferRef.current.length})`,
        )
        
        await sendObdDataBatch(payload)
        
        console.log(`✅ Local API: Successfully synced ${payload.length} records`)
        dataBufferRef.current = dataBufferRef.current.slice(payload.length)
      } catch (error) {
        console.error('❌ Local API: Failed to sync data:', error)

        // Keep data in buffer for next sync attempt
        // Limit buffer size to prevent memory issues
        if (dataBufferRef.current.length > 1000) {
          console.warn('⚠️  Local API: Buffer overflow, removing oldest records')
          dataBufferRef.current = dataBufferRef.current.slice(-500)
        }
      } finally {
        setIsSyncing(false)
        localSyncInFlightRef.current = false
      }
    }

    runLocalSync().catch((error) => {
      console.error('❌ Local API: Immediate sync failed:', error)
    })

    syncIntervalRef.current = setInterval(() => {
      runLocalSync().catch((error) => {
        console.error('❌ Local API: Interval sync failed:', error)
      })
    }, localSyncIntervalMs)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [
    isAuthenticated,
    driverProfile?.driver_id,
    localSyncIntervalMs,
    localBatchSize,
    isSyncThrottled,
    activityState,
  ])

  // Set up periodic AWS sync using adaptive cadence
  useEffect(() => {
    if (!isAuthenticated || !driverProfile?.driver_id) {
      return
    }

    if (!awsConfig.features.enableAwsSync) {
      console.log('ℹ️  AWS sync disabled via config')
      return
    }

    console.log('⏰ OBD Data Context: Setting up AWS sync interval', {
      intervalSeconds: awsSyncIntervalMs / 1000,
      isSyncThrottled,
      activityState,
      batchSize: awsBatchSize,
    })

    const runAwsSync = async () => {
      if (awsSyncInFlightRef.current) {
        console.log('⏳ AWS: Previous sync still in flight, skipping this tick')
        return
      }

      if (awsBufferRef.current.length === 0) {
        console.log('⏭️  AWS: No data to sync, skipping (buffer empty)')
        console.log('⏭️  AWS: Debug - isAuthenticated:', isAuthenticated, 'driverProfile:', !!driverProfile, 'vehicleAssignment:', !!vehicleAssignment)
        return
      }

      const payload = awsBufferRef.current.slice(0, Math.max(1, awsBatchSize))

      if (payload.length === 0) {
        console.log('⏭️  AWS: Computed payload empty after slicing, skipping')
        return
      }

      try {
        awsSyncInFlightRef.current = true
        setAwsSyncStatus('syncing')
        console.log(
          `🔄 AWS: Syncing ${payload.length} records to Lambda (buffer size ${awsBufferRef.current.length})`,
        )
        
        const response = await awsApiService.saveObdDataBatch(payload)
        
        if (response.success) {
          console.log(`✅ AWS: Successfully synced ${payload.length} records`)
          awsBufferRef.current = awsBufferRef.current.slice(payload.length)
          setAwsSyncStatus('success')
          setLastAwsSync(new Date())
          
          // Reset to idle after 2 seconds
          setTimeout(() => setAwsSyncStatus('idle'), 2000)
        } else {
          console.error('❌ AWS: Sync failed:', response.error)
          setAwsSyncStatus('error')
          
          // Keep data in buffer for retry
          if (awsBufferRef.current.length > 1000) {
            console.warn('⚠️  AWS: Buffer overflow, removing oldest records')
            awsBufferRef.current = awsBufferRef.current.slice(-500)
          }
          
          // Reset to idle after 3 seconds
          setTimeout(() => setAwsSyncStatus('idle'), 3000)
        }
      } catch (error) {
        console.error('❌ AWS: Failed to sync data:', error)
        setAwsSyncStatus('error')
        
        // Limit buffer size
        if (awsBufferRef.current.length > 1000) {
          console.warn('⚠️  AWS: Buffer overflow, removing oldest records')
          awsBufferRef.current = awsBufferRef.current.slice(-500)
        }
        
        // Reset to idle after 3 seconds
        setTimeout(() => setAwsSyncStatus('idle'), 3000)
      } finally {
        awsSyncInFlightRef.current = false
      }
    }

    runAwsSync().catch((error) => {
      console.error('❌ AWS: Immediate sync failed:', error)
    })

    awsSyncIntervalRef.current = setInterval(() => {
      runAwsSync().catch((error) => {
        console.error('❌ AWS: Interval sync failed:', error)
      })
    }, awsSyncIntervalMs)

    return () => {
      if (awsSyncIntervalRef.current) {
        clearInterval(awsSyncIntervalRef.current)
        awsSyncIntervalRef.current = null
      }
    }
  }, [
    isAuthenticated,
    driverProfile?.driver_id,
    awsSyncIntervalMs,
    awsBatchSize,
    isSyncThrottled,
    activityState,
  ])

  const value: ObdDataContextType = {
    obdData,
    lastUpdate,
    isConnected,
    isSyncing,
    awsSyncStatus,
    lastAwsSync,
    recentAutoDutyChanges,
    batteryLevel,
    batteryLevelPercent,
    batteryState: batteryStateValue,
    isLowPowerMode,
    isSyncThrottled,
    eldBatteryVoltage,
    currentSpeedMph,
    activityState,
    recentMalfunctions,
    eldDeviceId,
    eldHistoryRecords,
    isFetchingHistory,
    historyFetchProgress,
    fetchEldHistory,
  }

  return <ObdDataContext.Provider value={value}>{children}</ObdDataContext.Provider>
}

export const useObdData = () => {
  const context = useContext(ObdDataContext)
  if (context === undefined) {
    throw new Error('useObdData must be used within an ObdDataProvider')
  }
  return context
}

