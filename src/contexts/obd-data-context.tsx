import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { BatteryState, useBatteryLevel, useBatteryState, useLowPowerMode } from 'expo-battery'
import JMBluetoothService from '@/services/JMBluetoothService'
import { ObdEldData, HistoryProgress } from '@/types/JMBluetooth'
import { handleData } from '@/services/handleData'
import { handleDtcData } from '@/services/handleDtcData'
import { useAuth } from '@/stores/authStore'
import { useMyVehicle, useMyTrips } from '@/api/driver-hooks'
import { useStatusStore } from '@/stores/statusStore'
import { mapDriverStatusToAppStatus } from '@/utils/hos-status-mapper'
import { sendObdDataBatch, ObdDataPayload } from '@/api/obd'
import { awsApiService, AwsObdPayload } from '@/services/AwsApiService'
import { awsConfig } from '@/config/aws-config'
import { locationQueueService } from '@/services/location-queue'
import { setBatteryGetter } from '@/services/device-heartbeat-service'
import { decodeObdCode, ObdCodeDetails } from '@/utils/obd-code-decoder'
import { inactivityMonitor } from '@/services/inactivity-monitor'
import { eldHistoryService } from '@/services/eld-history-service'
import { eldOfflineSyncService, SyncStatus } from '@/services/eld-offline-sync'
import { parseEldDataTimestamp } from '@/utils/eld-timestamp-parser'
import { EldComplianceMalfunction } from '@/types/JMBluetooth'
import { createDriverNote } from '@/api/eld-notes'
import { getEldDevice } from '@/utils/eldStorage'

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

export interface MalfunctionRecord {
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
  showInactivityPrompt: boolean
  setShowInactivityPrompt: (show: boolean) => void
  triggerInactivityAutoSwitch: () => void
  // New features
  activeMalfunction: EldComplianceMalfunction | null
  setActiveMalfunction: (malfunction: EldComplianceMalfunction | null) => void
  gpsWarningVisible: boolean
  gpsLossDurationMinutes: number
  setGpsWarningVisible: (visible: boolean) => void
  onGpsNoteAdded: (note: string) => void
  offlineSyncStatus: SyncStatus
  addDriverNote: (recordId: string, note: string) => Promise<void>
  refreshConnectionStatus: () => Promise<void>
}

const ObdDataContext = createContext<ObdDataContextType | undefined>(undefined)

export const ObdDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, driverProfile, vehicleAssignment } = useAuth()
  
  // Check vehicle and trip assignment
  const { data: vehicleData } = useMyVehicle(isAuthenticated)
  const { data: tripsData } = useMyTrips({ status: 'active' }, isAuthenticated)
  
  // Use vehicleAssignment from auth store as primary source (from login), fallback to API
  const hasVehicle = useMemo(() => {
    // Priority 1: Vehicle from auth store (login data) - most reliable
    if (vehicleAssignment?.vehicle_info && vehicleAssignment.has_vehicle_assigned) {
      return true
    }
    // Priority 2: Vehicle from API
    return !!vehicleData?.vehicle
  }, [vehicleAssignment, vehicleData])
  
  const hasActiveTrip = useMemo(() => {
    if (!tripsData?.trips) return false
    const activeTrips = tripsData.trips.filter(t => t.status === 'active' || t.status === 'assigned')
    return activeTrips.length > 0
  }, [tripsData])
  
  // Allow ELD if vehicle is assigned (trip is optional for now - can be required later)
  // This allows OBD data to flow even if trip assignment API is failing
  const canUseELD = hasVehicle
  const { setEldLocation, setCurrentStatus, currentStatus } = useStatusStore()
  const queryClient = useQueryClient()
  const [obdData, setObdData] = useState<OBDDataItem[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Debounce OBD data updates to reduce re-renders
  const obdDataUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingObdDataRef = useRef<OBDDataItem[]>([])
  
  const debouncedSetObdData = useCallback((data: OBDDataItem[]) => {
    pendingObdDataRef.current = data
    
    if (obdDataUpdateTimeoutRef.current) {
      clearTimeout(obdDataUpdateTimeoutRef.current)
    }
    
    obdDataUpdateTimeoutRef.current = setTimeout(() => {
      setObdData(pendingObdDataRef.current)
      setLastUpdate(new Date())
      obdDataUpdateTimeoutRef.current = null
    }, 100) // 100ms debounce
  }, [])

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (obdDataUpdateTimeoutRef.current) {
        clearTimeout(obdDataUpdateTimeoutRef.current)
      }
    }
  }, [])
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [awsSyncStatus, setAwsSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [lastAwsSync, setLastAwsSync] = useState<Date | null>(null)
  const [recentAutoDutyChanges, setRecentAutoDutyChanges] = useState<AutoDutyChange[]>([])
  const [eldBatteryVoltage, setEldBatteryVoltage] = useState<number | null>(null)
  const [currentSpeedMph, setCurrentSpeedMph] = useState<number>(0)
  const [showInactivityPrompt, setShowInactivityPrompt] = useState<boolean>(false)
  const [activityState, setActivityState] = useState<ActivityState>('inactive')
  const [recentMalfunctions, setRecentMalfunctions] = useState<MalfunctionRecord[]>([])
  const [eldDeviceId, setEldDeviceId] = useState<string | null>(null)
  
  const [eldHistoryRecords, setEldHistoryRecords] = useState<EldHistoryRecord[]>([])
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [historyFetchProgress, setHistoryFetchProgress] = useState<HistoryProgress | null>(null)
  const [activeMalfunction, setActiveMalfunction] = useState<EldComplianceMalfunction | null>(null)
  const [gpsWarningVisible, setGpsWarningVisible] = useState(false)
  const [gpsLossDurationMinutes, setGpsLossDurationMinutes] = useState(0)
  const [offlineSyncStatus, setOfflineSyncStatus] = useState<SyncStatus>({
    totalRecords: 0,
    syncedRecords: 0,
    unsyncedRecords: 0,
    isSyncing: false,
  })
  const lastGpsTimeRef = useRef<Date | null>(null)
  const gpsLossStartRef = useRef<Date | null>(null)

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
  const lastConnectedDeviceRef = useRef<string | null>(null) // Store last connected device for reconnection
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const isHistoryFetchingRef = useRef(false) // Track active history fetch to prevent state updates
  const connectionStateBeforeHistoryRef = useRef<{ isConnected: boolean; deviceAddress: string | null } | null>(null) // Store connection state before history fetch
  
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
      console.log('ℹ️ OBD Data Context: completeHistoryFetch called but flag already cleared')
      return
    }
    const recordCount = historyRecordsRef.current.length
    console.log(`📊 OBD Data Context: Completing history fetch - ${recordCount} records collected`, {
      isFetchingHistoryRef: isFetchingHistoryRef.current,
      isHistoryFetchingRef: isHistoryFetchingRef.current,
      timestamp: new Date().toISOString(),
    })
    
    if (recordCount === 0) {
      console.warn('⚠️ OBD Data Context: No history records collected')
      console.warn('⚠️ OBD Data Context: Possible reasons:')
      console.warn('  1. Device does not have history data stored for the queried time range')
      console.warn('  2. Device was not storing data during that time period')
      console.warn('  3. Device may only store data when certain conditions are met (e.g., engine on)')
      console.warn('  4. History query time range may not match when device was storing data')
      console.warn('  5. Device may not be responding to history query command')
      console.warn('  6. Data may be arriving but not being captured (check logs for data received events)')
    } else {
      console.log(`✅ OBD Data Context: Successfully collected ${recordCount} history records`)
    }
    
    // Clear flags
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
    
    // Stop history reporting (non-blocking)
    JMBluetoothService.stopReportHistoryData().catch((error) => {
      console.log('⚠️ OBD Data Context: Failed to stop history reporting', error?.message ?? error)
    })
    
    // Clear history fetch flag and restore connection state
    isHistoryFetchingRef.current = false
    if (connectionStateBeforeHistoryRef.current) {
      console.log('🔄 OBD Data Context: Restoring connection state after history fetch completion', {
        storedState: connectionStateBeforeHistoryRef.current,
      })
      setIsConnected(connectionStateBeforeHistoryRef.current.isConnected)
      connectionStateBeforeHistoryRef.current = null
    }
    console.log('🔓 OBD Data Context: Unlocked connection state after history fetch completion', {
      isFetchingHistoryRef: isFetchingHistoryRef.current,
      isHistoryFetchingRef: isHistoryFetchingRef.current,
    })
  }, [])

  const fetchEldHistory = useCallback(
    async ({ type, start, end }: EldHistoryRequest) => {
      // Always check native connection status (most reliable source)
      let nativeStatus
      try {
        nativeStatus = await JMBluetoothService.getConnectionStatus()
        console.log('🔍 OBD Data Context: Checking connection for history fetch', {
          stateIsConnected: isConnected,
          nativeIsConnected: nativeStatus.isConnected,
          currentDevice: nativeStatus.currentDevice,
          isBluetoothEnabled: nativeStatus.isBluetoothEnabled,
        })
      } catch (error) {
        console.error('❌ OBD Data Context: Failed to check native connection status', error)
        // If we can't check native status, fall back to state
        if (!isConnected) {
          throw new Error('ELD device is not connected (unable to verify connection status)')
        }
        // If state says connected, proceed (might be stale but worth trying)
        console.log('⚠️ OBD Data Context: Using state connection status (native check failed)')
        nativeStatus = { isConnected: isConnected } as any
      }
      
      // Trust native status as the source of truth
      const actuallyConnected = nativeStatus.isConnected
      
      // Update state if native says connected but state doesn't (fix stale state)
      if (nativeStatus.isConnected && !isConnected) {
        console.log('🔄 OBD Data Context: Updating stale connection state (native says connected)')
        setIsConnected(true)
      }
      
      if (!actuallyConnected) {
        const errorMsg = `ELD device is not connected. State: ${isConnected}, Native: ${nativeStatus.isConnected}, Device: ${nativeStatus.currentDevice || 'none'}`
        console.warn('⚠️ OBD Data Context: Device not connected for history fetch', {
          isConnected,
          nativeIsConnected: nativeStatus.isConnected,
          currentDevice: nativeStatus.currentDevice,
          isBluetoothEnabled: nativeStatus.isBluetoothEnabled,
        })
        throw new Error(errorMsg)
      }
      
      console.log('✅ OBD Data Context: Device connected, proceeding with history fetch', {
        stateIsConnected: isConnected,
        nativeIsConnected: nativeStatus.isConnected,
        currentDevice: nativeStatus.currentDevice,
      })

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

      // Store connection state before starting history fetch
      connectionStateBeforeHistoryRef.current = {
        isConnected: actuallyConnected,
        deviceAddress: nativeStatus.currentDevice || lastConnectedDeviceRef.current,
      }
      
      // Set flag to prevent connection state updates during history fetch
      isHistoryFetchingRef.current = true
      console.log('🔒 OBD Data Context: Locking connection state during history fetch', {
        storedState: connectionStateBeforeHistoryRef.current,
      })

      const startTime = JMBluetoothService.formatTimeForHistory(start)
      const endTime = JMBluetoothService.formatTimeForHistory(end)

      resetHistoryState()
      setIsFetchingHistory(true)
      isFetchingHistoryRef.current = true
      
      console.log('🔒 OBD Data Context: History fetch flags set', {
        isFetchingHistoryRef: isFetchingHistoryRef.current,
        isHistoryFetchingRef: isHistoryFetchingRef.current,
        timestamp: new Date().toISOString(),
      })

      // Monitor connection during history fetch
      const monitorConnection = async () => {
        try {
          const status = await JMBluetoothService.getConnectionStatus()
          if (!status.isConnected && connectionStateBeforeHistoryRef.current?.isConnected) {
            console.warn('⚠️ OBD Data Context: Connection lost during history fetch, attempting reconnection...')
            const deviceToReconnect = connectionStateBeforeHistoryRef.current.deviceAddress || lastConnectedDeviceRef.current
            if (deviceToReconnect && status.isBluetoothEnabled && status.isBLESupported) {
              try {
                await JMBluetoothService.connect(deviceToReconnect)
                console.log('✅ OBD Data Context: Reconnection attempt initiated during history fetch')
                // Wait a bit for reconnection
                await new Promise(resolve => setTimeout(resolve, 2000))
                // Re-check connection
                const recheckStatus = await JMBluetoothService.getConnectionStatus()
                if (recheckStatus.isConnected) {
                  console.log('✅ OBD Data Context: Reconnected successfully during history fetch')
                  connectionStateBeforeHistoryRef.current = {
                    isConnected: true,
                    deviceAddress: recheckStatus.currentDevice || deviceToReconnect,
                  }
                } else {
                  throw new Error('Reconnection failed during history fetch')
                }
              } catch (reconnectError) {
                console.error('❌ OBD Data Context: Failed to reconnect during history fetch', reconnectError)
                throw new Error('Connection lost during history fetch and reconnection failed')
              }
            } else {
              throw new Error('Connection lost during history fetch and no device available for reconnection')
            }
          }
        } catch (error) {
          console.error('❌ OBD Data Context: Error monitoring connection during history fetch', error)
        }
      }

      // Set up extended timeout to complete history fetch if no data arrives
      // Increased from 30s to 60s to allow more time for device to respond
      const historyFetchTimeout = setTimeout(() => {
        if (isFetchingHistoryRef.current) {
          const recordCount = historyRecordsRef.current.length
          console.log(`⏱️ OBD Data Context: History fetch extended timeout (60s) - collected ${recordCount} records`)
          console.log('📊 OBD Data Context: History fetch timeout details', {
            recordCount,
            isFetchingHistoryRef: isFetchingHistoryRef.current,
            isHistoryFetchingRef: isHistoryFetchingRef.current,
            timeRange: {
              start: start.toISOString(),
              end: end.toISOString(),
              durationMinutes: (end.getTime() - start.getTime()) / (1000 * 60),
            },
          })
          if (recordCount === 0) {
            console.warn('⚠️ OBD Data Context: No history data received after 60 seconds')
            console.warn('⚠️ OBD Data Context: Possible reasons:')
            console.warn('  1. Device does not have history data stored for the queried time range')
            console.warn('  2. Device was not storing data during that time period')
            console.warn('  3. Device may only store data when certain conditions are met (e.g., engine on)')
            console.warn('  4. History query time range may not match when device was storing data')
            console.warn('  5. Device may be processing the query but not sending data yet')
          }
          completeHistoryFetch()
        }
      }, 60000) // 60 second timeout to wait for history data (increased from 30s)

      try {
        // Monitor connection before querying
        await monitorConnection()
        
        console.log('📤 OBD Data Context: Sending history query to device', {
          type,
          startTime,
          endTime,
          start: start.toISOString(),
          end: end.toISOString(),
        })
        
        const queryResult = await JMBluetoothService.queryHistoryData(type, startTime, endTime)
        
        console.log('✅ OBD Data Context: History query command sent', {
          queryResult,
          type,
          startTime,
          endTime,
          formattedStart: start.toISOString(),
          formattedEnd: end.toISOString(),
          isFetchingHistoryRef: isFetchingHistoryRef.current,
          timestamp: new Date().toISOString(),
        })
        console.log('⏳ OBD Data Context: Waiting for history data to arrive...')
        
        // Monitor connection after querying
        await monitorConnection()
        
        // Progressive wait strategy: 3s → 10s → 20s → 30s based on data arrival
        console.log('⏳ OBD Data Context: Step 1 - Initial wait (3 seconds)...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        let recordCount = historyRecordsRef.current.length
        console.log(`📊 OBD Data Context: After 3s wait - ${recordCount} records collected`, {
          isFetchingHistoryRef: isFetchingHistoryRef.current,
          isHistoryFetchingRef: isHistoryFetchingRef.current,
        })
        
        if (recordCount > 0) {
          console.log('📊 OBD Data Context: Data arriving! Step 2 - Extended wait (10 seconds)...')
          await new Promise(resolve => setTimeout(resolve, 10000))
          recordCount = historyRecordsRef.current.length
          console.log(`📊 OBD Data Context: After 13s total wait - ${recordCount} records collected`)
          
          if (recordCount > 0) {
            console.log('📊 OBD Data Context: More data arriving! Step 3 - Additional wait (20 seconds)...')
            await new Promise(resolve => setTimeout(resolve, 20000))
            recordCount = historyRecordsRef.current.length
            console.log(`📊 OBD Data Context: After 33s total wait - ${recordCount} records collected`)
          }
        } else {
          console.log('⚠️ OBD Data Context: No data received after 3s, waiting longer (10 seconds)...')
          await new Promise(resolve => setTimeout(resolve, 10000))
          recordCount = historyRecordsRef.current.length
          console.log(`📊 OBD Data Context: After 13s total wait - ${recordCount} records collected`)
          
          if (recordCount === 0) {
            console.log('⚠️ OBD Data Context: Still no data, waiting even longer (20 seconds)...')
            await new Promise(resolve => setTimeout(resolve, 20000))
            recordCount = historyRecordsRef.current.length
            console.log(`📊 OBD Data Context: After 33s total wait - ${recordCount} records collected`)
          }
        }
        
        console.log('✅ OBD Data Context: Progressive wait period completed', {
          finalRecordCount: recordCount,
          isFetchingHistoryRef: isFetchingHistoryRef.current,
          note: 'Flag will remain active until onObdEldFinish event or 60s timeout',
        })
      } catch (error) {
        console.error('❌ OBD Data Context: Failed to query history data', error)
        clearTimeout(historyFetchTimeout)
        isFetchingHistoryRef.current = false
        setIsFetchingHistory(false)
        setHistoryFetchProgress(null)
        // Restore connection state if it was preserved
        if (connectionStateBeforeHistoryRef.current) {
          console.log('🔄 OBD Data Context: Restoring connection state after history fetch error', {
            storedState: connectionStateBeforeHistoryRef.current,
          })
          setIsConnected(connectionStateBeforeHistoryRef.current.isConnected)
        }
        // Clear the flag
        isHistoryFetchingRef.current = false
        connectionStateBeforeHistoryRef.current = null
        throw error
      } finally {
        // Don't clear the flag here - let it stay active until:
        // 1. onObdEldFinish event fires (handled in listener)
        // 2. Extended timeout (60s) completes (handled in timeout)
        // This ensures we capture all delayed data
        console.log('ℹ️ OBD Data Context: History fetch query completed, but flag remains active to capture delayed data', {
          isFetchingHistoryRef: isFetchingHistoryRef.current,
          isHistoryFetchingRef: isHistoryFetchingRef.current,
          recordCount: historyRecordsRef.current.length,
          note: 'Flag will be cleared by completeHistoryFetch() when onObdEldFinish fires or timeout expires',
        })
        // Note: We don't clear the timeout here - let it run to completion
        // The timeout will call completeHistoryFetch() which properly cleans up
      }
    },
    [isConnected, resetHistoryState],
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

    // Track connection state independently (always active when authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('📡 OBD Data Context: User not authenticated, skipping connection tracking')
      setIsConnected(false)
      setActivityState('inactive')
      return
    }

    console.log('📡 OBD Data Context: Setting up connection state tracking')

    // Ensure SDK is initialized when setting up connection tracking
    const initializeIfNeeded = async () => {
      try {
        const status = await JMBluetoothService.getConnectionStatus()
        if (!status.isBLESupported) {
          console.log('🔄 OBD Data Context: SDK not initialized, initializing...')
          await JMBluetoothService.initializeSDK()
          console.log('✅ OBD Data Context: SDK initialized')
        }
      } catch (error) {
        console.warn('⚠️ OBD Data Context: Failed to initialize SDK on setup:', error)
      }
    }
    initializeIfNeeded()

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
      async () => {
        console.log('✅ OBD Data Context: Device connected')
        console.log('🔄 OBD Data Context: Setting isConnected to true')
        setIsConnected(true)
        setActivityState('idling')
        setCurrentSpeedMph(0)
        
        // Store connected device address for potential reconnection
        try {
          const status = await JMBluetoothService.getConnectionStatus()
          if (status.currentDevice) {
            lastConnectedDeviceRef.current = status.currentDevice
            console.log('💾 OBD Data Context: Stored connected device:', status.currentDevice)
          }
        } catch (error) {
          console.warn('⚠️ OBD Data Context: Failed to get device address on connect', error)
        }
      }
    )

    // Check current connection status on setup and periodically
    const checkConnectionStatus = async () => {
      try {
        // Don't update connection state during active history fetch (preserve state)
        if (isHistoryFetchingRef.current) {
          console.log('⏸️ OBD Data Context: Skipping connection state update during history fetch')
          return
        }
        
        const status = await JMBluetoothService.getConnectionStatus()
        console.log('🔍 OBD Data Context: Connection status check:', status)
        
        // Check if Bluetooth is enabled and BLE is supported
        if (!status.isBluetoothEnabled) {
          console.warn('⚠️ OBD Data Context: Bluetooth is disabled on device')
          setIsConnected(false)
          setActivityState('disconnected')
          return
        }
        
        if (!status.isBLESupported) {
          console.warn('⚠️ OBD Data Context: BLE not supported or SDK not initialized')
          // Try to initialize SDK if not initialized
          try {
            console.log('🔄 OBD Data Context: Attempting to initialize SDK...')
            await JMBluetoothService.initializeSDK()
            // Re-check after initialization
            const recheckStatus = await JMBluetoothService.getConnectionStatus()
            if (recheckStatus.isBLESupported) {
              console.log('✅ OBD Data Context: SDK initialized successfully')
            }
          } catch (initError) {
            console.warn('⚠️ OBD Data Context: Failed to initialize SDK:', initError)
          }
          setIsConnected(false)
          setActivityState('disconnected')
          return
        }
        
        if (status.isConnected) {
          if (!isConnected) {
            console.log('✅ OBD Data Context: Device connected (updating state)')
            setIsConnected(true)
            setActivityState('idling')
          }
          // Store connected device address
          if (status.currentDevice) {
            lastConnectedDeviceRef.current = status.currentDevice
          }
        } else {
          if (isConnected) {
            console.log('❌ OBD Data Context: Device disconnected (updating state)')
            setIsConnected(false)
            setActivityState('disconnected')
          }
        }
      } catch (error) {
        console.log('⚠️ OBD Data Context: Failed to check connection status:', error)
      }
    }

    // Check connection status immediately
    checkConnectionStatus()
    
    // Check for saved device and attempt reconnection if not connected
    const attemptReconnectionIfNeeded = async () => {
      try {
        const status = await JMBluetoothService.getConnectionStatus()
        // Only attempt if Bluetooth is enabled, BLE is supported, but not connected
        if (status.isBluetoothEnabled && status.isBLESupported && !status.isConnected) {
          const savedDevice = await getEldDevice()
          if (savedDevice?.address) {
            console.log('🔄 OBD Data Context: Found saved device, attempting reconnection...', {
              address: savedDevice.address,
              name: savedDevice.name,
            })
            try {
              await JMBluetoothService.connect(savedDevice.address)
              console.log('✅ OBD Data Context: Reconnection attempt initiated')
            } catch (reconnectError) {
              console.warn('⚠️ OBD Data Context: Reconnection failed, user may need to manually connect:', reconnectError)
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ OBD Data Context: Failed to check for reconnection:', error)
      }
    }
    
    // Attempt reconnection after a short delay (allow status check to complete first)
    setTimeout(() => {
      attemptReconnectionIfNeeded()
    }, 3000)
    
    // Periodically check connection status to keep state in sync (every 5 seconds)
    const statusCheckInterval = setInterval(() => {
      checkConnectionStatus()
    }, 5000)

    return () => {
      console.log('🧹 OBD Data Context: Cleaning up connection listeners')
      JMBluetoothService.removeEventListener(connectedListener)
      JMBluetoothService.removeEventListener(disconnectedListener)
      clearInterval(statusCheckInterval)
    }
  }, [isAuthenticated])

  // Handle app state changes (background/foreground) to maintain ELD connection
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current
      appStateRef.current = nextAppState

      console.log('📱 OBD Data Context: App state changed', {
        from: prevState,
        to: nextAppState,
      })

      // App going to background - don't disconnect, just log
      if (prevState === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('📱 OBD Data Context: App going to background - maintaining connection')
        // Don't disconnect - connection should persist
      }

      // App coming to foreground - check connection and reconnect if needed
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 OBD Data Context: App coming to foreground - checking connection')
        
        try {
          const status = await JMBluetoothService.getConnectionStatus()
          console.log('🔍 OBD Data Context: Connection status on foreground:', status)

          if (status.isConnected) {
            // Device is connected - update state if needed
            if (!isConnected) {
              console.log('✅ OBD Data Context: Device connected on foreground (updating state)')
              setIsConnected(true)
              setActivityState('idling')
              if (status.currentDevice) {
                lastConnectedDeviceRef.current = status.currentDevice
              }
            }
          } else {
            // Device not connected - attempt reconnection if we have a stored device
            const savedDevice = await getEldDevice()
            const deviceToReconnect = lastConnectedDeviceRef.current || savedDevice?.address
            
            if (deviceToReconnect && status.isBluetoothEnabled && status.isBLESupported) {
              console.log('🔄 OBD Data Context: Device disconnected on foreground, attempting reconnection...', {
                device: deviceToReconnect,
                source: lastConnectedDeviceRef.current ? 'memory' : 'storage',
              })
              
              try {
                await JMBluetoothService.connect(deviceToReconnect)
                console.log('✅ OBD Data Context: Reconnection attempt initiated')
                // State will be updated when onConnected event fires
              } catch (reconnectError) {
                console.warn('⚠️ OBD Data Context: Reconnection failed, user may need to manually connect:', reconnectError)
                setIsConnected(false)
                setActivityState('disconnected')
              }
            } else {
              console.log('ℹ️ OBD Data Context: No device available for reconnection', {
                hasLastDevice: !!lastConnectedDeviceRef.current,
                hasSavedDevice: !!savedDevice?.address,
                bluetoothEnabled: status.isBluetoothEnabled,
                bleSupported: status.isBLESupported,
              })
              setIsConnected(false)
              setActivityState('disconnected')
            }
          }
        } catch (error) {
          console.error('❌ OBD Data Context: Failed to check connection on foreground', error)
        }
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
    }
  }, [isAuthenticated, isConnected])

    // Listen for OBD data updates (only when canUseELD is true)
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('📡 OBD Data Context: User not authenticated, skipping OBD data setup')
      setActivityState('inactive')
      setCurrentSpeedMph(0)
      resetHistoryState()
      return
    }

    if (!canUseELD) {
      console.log('📡 OBD Data Context: Vehicle not assigned, ELD features disabled', {
        hasVehicle,
        vehicleAssignment: !!vehicleAssignment,
        vehicleFromAuth: !!vehicleAssignment?.vehicle_info,
        vehicleFromAPI: !!vehicleData?.vehicle,
        hasActiveTrip,
        tripsData: tripsData ? `${tripsData.trips?.length || 0} trips` : 'no data',
      })
      setActivityState('inactive')
      setCurrentSpeedMph(0)
      return
    }
    
    console.log('✅ OBD Data Context: Vehicle assigned, ELD features enabled', {
      hasVehicle,
      vehicleFromAuth: !!vehicleAssignment?.vehicle_info,
      vehicleFromAPI: !!vehicleData?.vehicle,
      hasActiveTrip,
    })

    console.log('📡 OBD Data Context: Setting up OBD data listeners for authenticated user')

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

        // During history fetch, collect ALL incoming data as history (device may send it as live data)
        // Also collect data explicitly marked as history (isLiveEvent === 0)
        const isHistoryEvent =
          isFetchingHistoryRef.current || isLiveEventFlag === 0
        
        // Enhanced logging for history fetch debugging
        if (isFetchingHistoryRef.current) {
          console.log('📥 OBD Data Context: Data received during history fetch', {
            isHistoryEvent,
            isFetchingHistoryRef: isFetchingHistoryRef.current,
            isHistoryFetchingRef: isHistoryFetchingRef.current,
            isLiveEventFlag,
            hasEventTime: !!payloadWithDeviceId.eventTime,
            eventTime: payloadWithDeviceId.eventTime,
            timestamp: payloadWithDeviceId.timestamp,
            eventType: payloadWithDeviceId.eventType,
            eventId: payloadWithDeviceId.eventId,
            willBeStored: isHistoryEvent,
            currentRecordCount: historyRecordsRef.current.length,
            hasLatLon: !!(payloadWithDeviceId.latitude && payloadWithDeviceId.longitude),
            displayDataLength: displayData.length,
            rawDataKeys: Object.keys(payloadWithDeviceId),
          })
          
          // Log a summary of the data to help diagnose issues
          if (displayData.length > 0) {
            console.log('📊 OBD Data Context: Display data summary during history fetch', {
              itemCount: displayData.length,
              items: displayData.slice(0, 5).map(item => ({ name: item.name, value: item.value })),
            })
          }
        } else {
          // Also log when NOT in history fetch to see if data is arriving but flag is wrong
          // But only log occasionally to avoid spam
          if (Math.random() < 0.01) { // Log 1% of non-history-fetch data
            console.log('📥 OBD Data Context: Data received (NOT during history fetch)', {
              isFetchingHistoryRef: isFetchingHistoryRef.current,
              isLiveEventFlag,
              hasEventTime: !!payloadWithDeviceId.eventTime,
            })
          }
        }

        // Always store data as history during history fetch, regardless of isLiveEvent flag
        // This ensures we collect all data the device sends in response to history query
        // CRITICAL: This is the main collection point - if flag is false, data won't be stored
        if (isHistoryEvent) {
          console.log('💾 OBD Data Context: Storing data as history record', {
            recordNumber: historyRecordsRef.current.length + 1,
            eventTime: payloadWithDeviceId.eventTime,
            timestamp: payloadWithDeviceId.timestamp,
          })
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

        debouncedSetObdData(displayData)
        setCurrentSpeedMph(speedMph)
        setActivityState(speedMph >= SPEED_THRESHOLD_DRIVING ? 'driving' : 'idling')

        // GPS loss detection
        const hasGps = payloadWithDeviceId.latitude && payloadWithDeviceId.longitude
        const gpsTime = parseEldDataTimestamp({
          eventTime: payloadWithDeviceId.eventTime,
          gpsTime: payloadWithDeviceId.gpsTime,
          time: payloadWithDeviceId.time,
          timestamp: payloadWithDeviceId.timestamp,
        }).date

        if (hasGps && gpsTime) {
          lastGpsTimeRef.current = gpsTime
          gpsLossStartRef.current = null
          setGpsWarningVisible(false)
          setGpsLossDurationMinutes(0)
        } else if (speedMph >= SPEED_THRESHOLD_DRIVING) {
          // Vehicle is driving but no GPS
          if (!gpsLossStartRef.current) {
            gpsLossStartRef.current = new Date()
          } else {
            const lossDuration = (Date.now() - gpsLossStartRef.current.getTime()) / (1000 * 60) // minutes
            if (lossDuration > 60) {
              setGpsLossDurationMinutes(lossDuration)
              setGpsWarningVisible(true)
            }
          }
        }

        // Update inactivity monitor with current speed and status
        if (isAuthenticated && currentStatus) {
          inactivityMonitor.update(speedMph, currentStatus)
        }

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

          // Store offline if network unavailable (will be handled by offline sync service)
          // The offline sync service will auto-upload when network returns
        } else {
          // Skip AWS sync if vehicleId is invalid
          console.warn(`⚠️ OBD Data Context: Skipping AWS sync - invalid vehicleId: ${vehicleId}`)
          dataBufferRef.current.push(localPayload) // Still sync to local API
        }
      }
    )

    // Listen for connection events to start ELD reporting (only when canUseELD is true)
    const connectedListener = JMBluetoothService.addEventListener(
      'onConnected',
      async () => {
        console.log('✅ OBD Data Context: Device connected (canUseELD=true, starting ELD reporting)')
        console.log('🔄 OBD Data Context: Setting isConnected to true (bypassing history fetch lock)')
        // Always update connection state on connect event, even if history fetch is active
        setIsConnected(true)
        setActivityState('idling')
        setCurrentSpeedMph(0)
        
        // Store connected device address for potential reconnection
        try {
          const status = await JMBluetoothService.getConnectionStatus()
          if (status.currentDevice) {
            lastConnectedDeviceRef.current = status.currentDevice
            console.log('💾 OBD Data Context: Stored connected device:', status.currentDevice)
          }
        } catch (error) {
          console.warn('⚠️ OBD Data Context: Failed to get device address on connect', error)
        }
        
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
            
            // Always check native status directly, bypassing any locks
            const status = await JMBluetoothService.getConnectionStatus()
            if (status.isConnected) {
              console.log('📊 OBD Data Context: Connection stable, starting ELD reporting...')
              try {
                await JMBluetoothService.startReportEldData()
                eldReportingStartedRef.current = true
                console.log('✅ OBD Data Context: ELD reporting started successfully from onConnected')
              } catch (startError) {
                console.error('❌ OBD Data Context: Failed to start ELD reporting from onConnected:', startError)
                // Reset flag on error so it can be retried
                eldReportingStartedRef.current = false
              }
            } else {
              console.log('⚠️ OBD Data Context: Connection lost before starting ELD reporting')
            }
          } catch (error) {
            console.log('⚠️ OBD Data Context: Failed to start ELD reporting from onConnected:', error)
            // Reset flag on error so it can be retried
            eldReportingStartedRef.current = false
          }
        }, 2000) // Wait 2 seconds for stable connection

        // Smart background history fetch on connect: 5min → 20min → 4hr → 24hr (based on data availability)
        setTimeout(async () => {
          try {
            if (!isConnected) return
            
            console.log('📥 OBD Data Context: Starting smart background history fetch on connect')
            const { eldSmartHistoryFetch } = await import('@/services/eld-smart-history-fetch')
            
            await eldSmartHistoryFetch.smartFetch({
              onProgress: (stage, hasData, recordCount) => {
                console.log(`📥 Smart history fetch: ${stage} - ${hasData ? `Found ${recordCount} records` : 'No data'}`)
              },
              onComplete: (records) => {
                console.log(`✅ OBD Data Context: Smart history fetch completed with ${records.length} records`)
              },
              onError: (error, stage) => {
                console.warn(`⚠️ OBD Data Context: Smart history fetch failed at ${stage}:`, error)
              },
            })
          } catch (error) {
            console.warn('⚠️ OBD Data Context: Smart history fetch failed:', error)
          }
        }, 3000) // Wait 3 seconds after connection to start history fetch
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
            
            // Always check native status directly, bypassing any locks
            const status = await JMBluetoothService.getConnectionStatus()
            if (status.isConnected) {
              console.log('📊 OBD Data Context: Starting ELD reporting after authentication (fallback)...')
              try {
                await JMBluetoothService.startReportEldData()
                eldReportingStartedRef.current = true
                console.log('✅ OBD Data Context: ELD reporting started successfully after authentication')
              } catch (startError) {
                console.error('❌ OBD Data Context: Failed to start ELD reporting after authentication:', startError)
                // Reset flag on error so it can be retried
                eldReportingStartedRef.current = false
              }
            } else {
              console.log('⚠️ OBD Data Context: Not connected after authentication')
            }
          } catch (error) {
            console.log('⚠️ OBD Data Context: Failed to start ELD reporting after authentication:', error)
            // Reset flag on error so it can be retried
            eldReportingStartedRef.current = false
          }
        }, 3000) // Wait 3 seconds after authentication
      }
    )

    // Check connection status and start ELD reporting if already connected (only when canUseELD is true)
    // This function bypasses the history fetch lock to ensure ELD reporting can always start
    const checkAndStartELDReporting = async () => {
      try {
        // Always check native status directly, bypassing any locks
        const status = await JMBluetoothService.getConnectionStatus()
        console.log('🔍 OBD Data Context: Checking connection for ELD reporting:', {
          isConnected: status.isConnected,
          currentDevice: status.currentDevice,
          isBluetoothEnabled: status.isBluetoothEnabled,
          isBLESupported: status.isBLESupported,
          isHistoryFetching: isHistoryFetchingRef.current,
        })
        
        if (status.isConnected) {
          // Prevent duplicate calls
          if (eldReportingStartedRef.current) {
            console.log('ℹ️ OBD Data Context: ELD reporting already started, skipping duplicate call')
            return
          }
          
          // Update connection state even if history fetch is active (ELD reporting is critical)
          if (!isConnected) {
            console.log('🔄 OBD Data Context: Updating connection state for ELD reporting (bypassing history fetch lock)')
            setIsConnected(true)
            setActivityState('idling')
            if (status.currentDevice) {
              lastConnectedDeviceRef.current = status.currentDevice
            }
          }
          
          // Wait a bit before starting ELD reporting to ensure stable connection
          setTimeout(async () => {
            try {
              if (eldReportingStartedRef.current) {
                console.log('ℹ️ OBD Data Context: ELD reporting already started during wait period, skipping')
                return
              }
              
              // Re-check connection status (bypassing locks)
              const recheckStatus = await JMBluetoothService.getConnectionStatus()
              if (recheckStatus.isConnected && !eldReportingStartedRef.current) {
                console.log('📊 OBD Data Context: Starting ELD reporting from status check...')
                try {
                  await JMBluetoothService.startReportEldData()
                  eldReportingStartedRef.current = true
                  console.log('✅ OBD Data Context: ELD reporting started successfully from status check')
                } catch (startError) {
                  console.error('❌ OBD Data Context: Failed to start ELD reporting:', startError)
                  // Reset flag on error so it can be retried
                  eldReportingStartedRef.current = false
                }
              } else {
                if (!recheckStatus.isConnected) {
                  console.log('⚠️ OBD Data Context: Connection lost during wait period')
                } else {
                  console.log('ℹ️ OBD Data Context: ELD reporting already started elsewhere')
                }
              }
            } catch (error) {
              console.log('⚠️ OBD Data Context: Failed to start ELD reporting from status check:', error)
              // Reset flag on error so it can be retried
              eldReportingStartedRef.current = false
            }
          }, 2000) // Wait 2 seconds for stable connection
        } else {
          console.log('ℹ️ OBD Data Context: Device not connected, cannot start ELD reporting', {
            isConnected: status.isConnected,
            isBluetoothEnabled: status.isBluetoothEnabled,
            isBLESupported: status.isBLESupported,
          })
        }
      } catch (error) {
        console.log('⚠️ OBD Data Context: Failed to check connection status for ELD reporting:', error)
      }
    }

    // Check and start ELD reporting if already connected
    checkAndStartELDReporting()
    
    // Initialize inactivity monitor and location queue (only when authenticated)
    if (isAuthenticated) {
      // Initialize inactivity monitor
      inactivityMonitor.setPromptTriggerCallback(() => {
        console.log('⏰ OBD Data Context: Inactivity prompt triggered')
        setShowInactivityPrompt(true)
      })

      inactivityMonitor.setAutoSwitchCallback(() => {
        console.log('🔄 OBD Data Context: Inactivity auto-switch triggered')
        // This will be handled by the InactivityPrompt component
        // We just need to ensure the prompt is shown
        setShowInactivityPrompt(true)
      })

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
        console.log('📊 OBD Data Context: OBD ELD finished event received')
        if (isFetchingHistoryRef.current) {
          const recordCount = historyRecordsRef.current.length
          console.log(`📊 OBD Data Context: History fetch finished event - collected ${recordCount} records so far`, {
            isFetchingHistoryRef: isFetchingHistoryRef.current,
            isHistoryFetchingRef: isHistoryFetchingRef.current,
            timestamp: new Date().toISOString(),
          })
          // Wait a bit more for any final data before completing
          setTimeout(() => {
            if (isFetchingHistoryRef.current) {
              const finalRecordCount = historyRecordsRef.current.length
              console.log(`📊 OBD Data Context: Final history record count after onObdEldFinish: ${finalRecordCount}`, {
                recordsAddedDuringWait: finalRecordCount - recordCount,
              })
              completeHistoryFetch()
            } else {
              console.log('⚠️ OBD Data Context: History fetch flag was cleared before onObdEldFinish wait completed')
            }
          }, 5000) // Wait 5 seconds for any final data (increased from 2s)
        } else {
          console.log('ℹ️ OBD Data Context: onObdEldFinish received but not during history fetch', {
            isFetchingHistoryRef: isFetchingHistoryRef.current,
          })
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
            debouncedSetObdData(displayData)
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

    // Listen for ELD compliance malfunctions (Codes P, E, L, T)
    const eldMalfunctionListener = JMBluetoothService.addEventListener(
      'onEldComplianceMalfunction',
      (malfunction: EldComplianceMalfunction) => {
        console.log('🚨 OBD Data Context: ELD Compliance Malfunction detected:', malfunction.code)
        setActiveMalfunction(malfunction)
      },
    )

    // Log when listener is registered
    console.log('📡 OBD Data Context: Registering onObdErrorDataReceived listener', {
      timestamp: new Date().toISOString(),
      isAuthenticated,
      canUseELD,
    })

    const obdErrorDataListener = JMBluetoothService.addEventListener(
      'onObdErrorDataReceived',
      (errorData: any) => {
        try {
          // Log event received immediately
          console.log('🚨 OBD Data Context: onObdErrorDataReceived event received', {
            timestamp: new Date().toISOString(),
            hasData: !!errorData,
            dataType: typeof errorData,
            hasEcuList: Array.isArray(errorData?.ecuList),
            ecuCount: Array.isArray(errorData?.ecuList) ? errorData.ecuList.length : 0,
            ecuCountField: errorData?.ecuCount,
            dataKeys: errorData ? Object.keys(errorData) : [],
            rawData: errorData,
          })

          // Extract CAN errors and OBD-II DTCs from new payload structure
          const canErrorCodes = Array.isArray(errorData?.canErrorCodes) ? errorData.canErrorCodes : []
          const obdDtcCodes = Array.isArray(errorData?.obdDtcCodes) ? errorData.obdDtcCodes : []
          const ecuList = Array.isArray(errorData?.ecuList) ? errorData.ecuList : []
          
          // Log CAN errors with clear distinction
          if (canErrorCodes.length > 0) {
            console.log(`═══════════════════════════════════════════════════════`)
            console.log(`🔍 OBD Data Context: CAN Bus Error Codes Found: ${canErrorCodes.length}`)
            console.log(`⚠️ NOTE: CAN errors are communication errors, NOT OBD-II diagnostic codes`)
            console.log(`⚠️ NOTE: CAN errors will appear even when OBD-II DTCs are cleared`)
            console.log(`⚠️ NOTE: These are separate from diagnostic trouble codes (P0XXX, etc.)`)
            console.log(`═══════════════════════════════════════════════════════`)
            console.log(`CAN Error Codes: ${JSON.stringify(canErrorCodes.map((c: any) => c.code))}`)
            canErrorCodes.forEach((canError: any) => {
              console.log(`  - ${canError.code}: ${canError.description || 'CAN bus error'}`)
            })
          }
          
          // Log OBD-II DTCs with clear distinction
          if (obdDtcCodes.length > 0) {
            console.log(`═══════════════════════════════════════════════════════`)
            console.log(`✅ OBD Data Context: OBD-II DTC Codes Found: ${obdDtcCodes.length}`)
            console.log(`✅ NOTE: These are actual diagnostic trouble codes (can be cleared)`)
            console.log(`═══════════════════════════════════════════════════════`)
            console.log(`OBD-II DTC Codes: ${JSON.stringify(obdDtcCodes.map((c: any) => c.code))}`)
            obdDtcCodes.forEach((dtc: any) => {
              console.log(`  - ${dtc.code}: ${dtc.description || 'OBD-II DTC'}`)
            })
            
            // Detect P0195 specifically
            const p0195 = obdDtcCodes.find((dtc: any) => dtc.code === 'P0195')
            if (p0195) {
              console.log('🔍 OBD Data Context: P0195 DETECTED - Engine Oil Temperature Sensor "A" Circuit Malfunction')
              console.log('🔍 P0195 Details:', {
                code: 'P0195',
                description: p0195.description || 'Engine Oil Temperature Sensor "A" Circuit Malfunction',
                system: 'Powertrain',
                timestamp: new Date().toISOString(),
              })
            }
          } else if (canErrorCodes.length > 0) {
            console.log(`ℹ️ OBD Data Context: Only CAN errors detected - no OBD-II DTCs present`)
            console.log(`ℹ️ This is normal if DTCs were cleared in simulator (D3→D0)`)
            console.log(`ℹ️ CAN errors are separate and will continue to appear`)
          }
          
          // Extract all codes from ecuList for backward compatibility
          const allRawCodes: string[] = []
          ecuList.forEach((ecu: any, index: number) => {
            const codes = Array.isArray(ecu?.codes) ? ecu.codes : []
            codes.forEach((code: string) => {
              if (typeof code === 'string' && code.trim()) {
                allRawCodes.push(code.trim().toUpperCase())
              }
            })
            console.log(`📋 OBD Data Context: ECU ${index} - ID: ${ecu?.ecuId || ecu?.ecuIdHex || 'unknown'}, Codes: ${JSON.stringify(codes)}`)
          })

          if (!driverProfile?.driver_id) {
            console.warn('⚠️ OBD Data Context: Malfunction event received without driver profile')
            return
          }
          
          // Check if we have any codes to process (from new structure or legacy ecuList)
          const hasNewStructureCodes = canErrorCodes.length > 0 || obdDtcCodes.length > 0
          const hasLegacyCodes = ecuList.length > 0 && allRawCodes.length > 0
          
          if (!hasNewStructureCodes && !hasLegacyCodes) {
            console.log('ℹ️ OBD Data Context: Malfunction event had no error codes, skipping')
            return
          }
          
          // Use new structure codes if available, otherwise fall back to legacy ecuList
          let codesToProcess: Array<{ code: string; type: string; description?: string }> = []
          
          if (hasNewStructureCodes) {
            // Process CAN errors and OBD-II DTCs from new structure
            canErrorCodes.forEach((canError: any) => {
              codesToProcess.push({
                code: canError.code,
                type: 'can_error',
                description: canError.description,
              })
            })
            obdDtcCodes.forEach((dtc: any) => {
              codesToProcess.push({
                code: dtc.code,
                type: 'obd_dtc',
                description: dtc.description,
              })
            })
          } else if (hasLegacyCodes) {
            // Fall back to legacy ecuList structure
            ecuList.forEach((ecu: any) => {
              const codes = Array.isArray(ecu?.codes) ? ecu.codes : []
              codes.forEach((code: string) => {
                if (typeof code === 'string' && code.trim()) {
                  codesToProcess.push({
                    code: code.trim().toUpperCase(),
                    type: 'unknown', // Legacy structure doesn't specify type
                    description: undefined,
                  })
                }
              })
            })
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

          // Process codes into malfunction records
          // Create a SEPARATE record for EACH code (not grouped) so all codes appear in the list
          const canErrorCodesList = codesToProcess.filter((c) => c.type === 'can_error')
          const obdDtcCodesList = codesToProcess.filter((c) => c.type === 'obd_dtc' || c.type === 'unknown')
          
          // Create malfunction records - use default ECU if not provided
          const defaultEcuId = '2016'
          const defaultEcuIdHex = '0x7E0'
          
          const malfunctionRecords: MalfunctionRecord[] = []
          
          // Process OBD-II DTCs - create ONE record per code
          obdDtcCodesList.forEach((codeInfo, index) => {
            const decoded = decodeObdCode(codeInfo.code)
            // Use provided description if available, otherwise use decoded description
            if (codeInfo.description && codeInfo.description !== decoded.faultDescription) {
              decoded.faultDescription = codeInfo.description
            }
            console.log(`🔧 OBD Data Context: Decoded OBD-II DTC: ${decoded.code}`, {
              system: decoded.system,
              subsystem: decoded.subsystemDescription,
              description: decoded.faultDescription,
              isGeneric: decoded.isGeneric,
            })
            
            // Create separate record for each code
            malfunctionRecords.push({
              id: `${timestamp.getTime()}-${defaultEcuId}-obd-${codeInfo.code}-${index}`,
              timestamp,
              ecuId: defaultEcuId,
              ecuIdHex: defaultEcuIdHex,
              codes: [decoded], // Single code per record
            })
          })
          
          // Process CAN errors - create ONE record per code
          canErrorCodesList.forEach((codeInfo, index) => {
            // For CAN errors, create a proper ObdCodeDetails structure
            const decoded: ObdCodeDetails = {
              code: codeInfo.code,
              system: 'CAN Bus',
              systemDescription: 'Controller Area Network bus communication system',
              isGeneric: true,
              genericDescription: 'CAN bus error frame',
              subsystem: 'Communication',
              subsystemDescription: 'Bus communication and protocol',
              faultDescription: codeInfo.description || 'CAN bus error',
            }
            console.log(`🔧 OBD Data Context: CAN Error: ${decoded.code} - ${decoded.faultDescription}`)
            
            // Create separate record for each code
            malfunctionRecords.push({
              id: `${timestamp.getTime()}-${defaultEcuId}-can-${codeInfo.code}-${index}`,
              timestamp,
              ecuId: defaultEcuId,
              ecuIdHex: defaultEcuIdHex,
              codes: [decoded], // Single code per record
            })
          })
          
          // Fallback to legacy ecuList processing if no new structure codes
          // Create ONE record per code (not grouped by ECU)
          if (malfunctionRecords.length === 0 && ecuList.length > 0) {
            ecuList.forEach((ecu: any, ecuIndex: number) => {
              const codeList = Array.isArray(ecu?.codes)
                ? (ecu.codes as string[]).filter((code) => typeof code === 'string' && code.trim() !== '')
                : []
              
              if (codeList.length === 0) {
                return
              }

              const ecuIdHex =
                typeof ecu?.ecuIdHex === 'string' && ecu.ecuIdHex.trim().length > 0
                  ? ecu.ecuIdHex
                  : typeof ecu?.ecuId === 'string' && ecu.ecuId.trim().length > 0
                    ? `0x${parseInt(ecu.ecuId, 10).toString(16).toUpperCase()}`
                    : `ECU_${ecuIndex}`

              const ecuId =
                typeof ecu?.ecuId === 'string' && ecu.ecuId.trim().length > 0 ? ecu.ecuId : ecuIdHex

              // Create a separate record for EACH code
              codeList.forEach((code: string, codeIndex: number) => {
                const decoded = decodeObdCode(code)
                console.log(`🔧 OBD Data Context: Decoded DTC Code: ${decoded.code}`, {
                  system: decoded.system,
                  subsystem: decoded.subsystemDescription,
                  description: decoded.faultDescription,
                  isGeneric: decoded.isGeneric,
                })
                
                malfunctionRecords.push({
                  id: `${timestamp.getTime()}-${ecuId}-${ecuIndex}-${code}-${codeIndex}`,
                  timestamp,
                  ecuId,
                  ecuIdHex,
                  codes: [decoded], // Single code per record
                })
              })
            })
          }

          if (malfunctionRecords.length === 0) {
            console.log('ℹ️ OBD Data Context: Malfunction event had no valid codes after filtering')
            return
          }

          setRecentMalfunctions((prev) => {
            // Group by code: if same code exists, update timestamp instead of creating duplicate
            const codeMap = new Map<string, MalfunctionRecord>()
            
            // Add existing records to map (keyed by code)
            prev.forEach((record) => {
              const code = record.codes[0]?.code
              if (code) {
                codeMap.set(code, record)
              }
            })
            
            // Add/update new records
            malfunctionRecords.forEach((newRecord) => {
              const code = newRecord.codes[0]?.code
              if (code) {
                // If code already exists, update timestamp (group same codes together)
                if (codeMap.has(code)) {
                  const existing = codeMap.get(code)!
                  // Update timestamp to most recent occurrence
                  codeMap.set(code, {
                    ...existing,
                    timestamp: newRecord.timestamp, // Update to latest timestamp
                  })
                  console.log(`🔄 OBD Data Context: Updated existing code ${code} timestamp (grouped)`)
                } else {
                  // New unique code - add it
                  codeMap.set(code, newRecord)
                }
              }
            })
            
            // Convert map back to array and sort by timestamp (newest first)
            const uniqueRecords = Array.from(codeMap.values()).sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
            )
            
            // Limit to 50 unique codes to save backend/DB space
            // This prevents repeated CAN errors from flooding the database
            const limitedRecords = uniqueRecords.slice(0, 50)
            
            if (uniqueRecords.length > 50) {
              console.warn(
                `⚠️ OBD Data Context: Limiting to 50 unique codes (had ${uniqueRecords.length}). Oldest codes removed.`
              )
            }
            
            console.log(
              `📊 OBD Data Context: Malfunction records updated: ${malfunctionRecords.length} new, ${uniqueRecords.length} total unique codes (limited to ${limitedRecords.length})`
            )
            
            return limitedRecords
          })

          // Deduplicate codes before sending to backend to save DB space
          // Group by code - only send unique codes, not duplicates
          const uniqueCodesMap = new Map<string, MalfunctionRecord>()
          malfunctionRecords.forEach((record) => {
            const code = record.codes[0]?.code
            if (code && !uniqueCodesMap.has(code)) {
              // Only add if we haven't seen this code in this batch
              uniqueCodesMap.set(code, record)
            }
          })
          
          const uniqueRecordsForBackend = Array.from(uniqueCodesMap.values())
          
          if (malfunctionRecords.length > uniqueRecordsForBackend.length) {
            console.log(
              `🔄 OBD Data Context: Deduplicated ${malfunctionRecords.length} records to ${uniqueRecordsForBackend.length} unique codes for backend sync`
            )
          }

          // Use handleDtcData() to transform DTC codes to payload format (same as handleData)
          // Create payload for each ECU record using handleDtcData transformation
          const location =
            typeof errorData?.latitude === 'number' && typeof errorData?.longitude === 'number'
              ? { latitude: errorData.latitude, longitude: errorData.longitude }
              : undefined

          // Build fault codes payload for combined payload structure (using deduplicated records)
          const faultCodesPayload = uniqueRecordsForBackend.map((record) => ({
            ecu_id: record.ecuId,
            ecu_id_hex: record.ecuIdHex,
            codes: record.codes.map((code) => code.code),
            details: record.codes,
          }))

          // Use handleDtcData to create payload structure (for first ECU, then combine others)
          // This ensures same format as handleData for consistent backend sync
          const firstRecord = uniqueRecordsForBackend[0]
          if (firstRecord) {
            const dtcCodes = firstRecord.codes.map((code) => code.code)
            const basePayload = handleDtcData(
              dtcCodes,
              firstRecord.ecuId,
              firstRecord.ecuIdHex,
              timestamp,
              location,
              driverProfile.driver_id,
              faultDeviceIdentifier ?? undefined,
            )

            // Add additional ECUs to fault_codes array if multiple ECUs present
            if (uniqueRecordsForBackend.length > 1) {
              basePayload.fault_codes = faultCodesPayload
              // Also update raw_data to include all ECUs
              basePayload.raw_data.faultCodes = uniqueRecordsForBackend.map((record) => ({
                ecuId: record.ecuId,
                ecuIdHex: record.ecuIdHex,
                codes: record.codes.map((code) => code.code),
                details: record.codes,
              }))
            }

            // Add additional metadata to raw_data
            basePayload.raw_data.ack = errorData?.ack
            basePayload.raw_data.ackDescription = errorData?.ackDescription
            basePayload.raw_data.dataTypeCode = errorData?.dataType
            basePayload.raw_data.vehicleType = errorData?.vehicleType
            basePayload.raw_data.msgSubtype = errorData?.msgSubtype
            basePayload.raw_data.eventTime = errorData?.time

            // Push to data buffer (same sync mechanism as handleData)
            dataBufferRef.current.push(basePayload)
          }
          
          // Enhanced logging with all DTC codes (using deduplicated records)
          const allCodes = uniqueRecordsForBackend.flatMap((record) => record.codes.map((c) => c.code))
          console.log(
            `🚨 OBD Data Context: Recorded malfunction event: ${malfunctionRecords.length} new codes → ${uniqueRecordsForBackend.length} unique codes sent to backend`,
            {
              newCodes: malfunctionRecords.length,
              uniqueCodes: uniqueRecordsForBackend.length,
              totalCodes: allCodes.length,
              codes: allCodes,
              ecuCount: faultCodesPayload.length,
              hasP0195: allCodes.includes('P0195'),
              deduplicated: malfunctionRecords.length > uniqueRecordsForBackend.length,
            },
          )
          
          // Log P0195 again if present in final records
          if (allCodes.includes('P0195')) {
            const p0195Record = uniqueRecordsForBackend.find((record) =>
              record.codes.some((c) => c.code === 'P0195'),
            )
            if (p0195Record) {
              console.log('🔍 OBD Data Context: P0195 in final malfunction records:', {
                ecuId: p0195Record.ecuId,
                ecuIdHex: p0195Record.ecuIdHex,
                timestamp: p0195Record.timestamp.toISOString(),
                codeDetails: p0195Record.codes.find((c) => c.code === 'P0195'),
              })
            }
          }

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
      JMBluetoothService.removeEventListener(eldMalfunctionListener)
      
      // Stop location queue auto-flush
      locationQueueService.stopAutoFlush()
      
      // Reset inactivity monitor
      inactivityMonitor.reset()
      inactivityMonitor.setPromptTriggerCallback(null)
      inactivityMonitor.setAutoSwitchCallback(null)
      
      resetHistoryState()
    }
  }, [isAuthenticated, canUseELD, driverProfile?.driver_id, vehicleAssignment?.vehicle_info?.vin, localSyncIntervalMs, eldDeviceId, completeHistoryFetch, currentStatus])

  // Update inactivity monitor when status or speed changes
  useEffect(() => {
    if (isAuthenticated && currentStatus && isConnected) {
      // Update monitor with current speed and status
      inactivityMonitor.update(currentSpeedMph, currentStatus)
    } else if (!isAuthenticated || !isConnected) {
      // Reset monitor when disconnected or not authenticated
      inactivityMonitor.reset()
    }
  }, [isAuthenticated, currentStatus, currentSpeedMph, isConnected])

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

  // Subscribe to offline sync status
  useEffect(() => {
    const unsubscribe = eldOfflineSyncService.subscribe((status) => {
      setOfflineSyncStatus(status)
    })

    // Initial status
    eldOfflineSyncService.getSyncStatus().then(setOfflineSyncStatus)

    // Auto-sync on mount and periodically
    eldOfflineSyncService.autoSyncIfNeeded()
    const syncInterval = setInterval(() => {
      eldOfflineSyncService.autoSyncIfNeeded()
    }, 60000) // Check every minute

    return () => {
      unsubscribe()
      clearInterval(syncInterval)
    }
  }, [])

  // Handle auto-switch trigger from inactivity monitor
  const triggerInactivityAutoSwitch = useCallback(() => {
    // This will be handled by the InactivityPrompt component
    // The component will call the API to change status
    console.log('🔄 OBD Data Context: triggerInactivityAutoSwitch called')
  }, [])

  // Handle GPS note addition
  const onGpsNoteAdded = useCallback(async (note: string) => {
    try {
      // Find the most recent history record to attach note to
      const recentRecord = eldHistoryRecords[eldHistoryRecords.length - 1]
      if (recentRecord) {
        await addDriverNote(recentRecord.id, note)
        console.log('✅ GPS note added to record:', recentRecord.id)
      }
    } catch (error) {
      console.error('❌ Failed to add GPS note:', error)
    }
  }, [eldHistoryRecords])

  // Add driver note to a record
  const addDriverNote = useCallback(async (recordId: string, note: string) => {
    try {
      const record = eldHistoryRecords.find(r => r.id === recordId)
      if (!record) {
        throw new Error('Record not found')
      }

      await createDriverNote({
        record_id: recordId,
        note,
        original_timestamp: record.eventTime || record.receivedAt.toISOString(),
        location: record.latitude && record.longitude
          ? { latitude: record.latitude, longitude: record.longitude }
          : undefined,
      })

      console.log('✅ Driver note added:', recordId)
    } catch (error) {
      console.error('❌ Failed to add driver note:', error)
      throw error
    }
  }, [eldHistoryRecords])

  // Refresh connection status (useful when navigating to screens that need ELD)
  const refreshConnectionStatus = useCallback(async () => {
    try {
      console.log('🔄 OBD Data Context: Refreshing connection status...')
      const status = await JMBluetoothService.getConnectionStatus()
      console.log('🔍 OBD Data Context: Refreshed connection status:', status)
      
      // Check if Bluetooth is enabled and BLE is supported
      if (!status.isBluetoothEnabled) {
        console.warn('⚠️ OBD Data Context: Bluetooth is disabled on device')
        setIsConnected(false)
        setActivityState('disconnected')
        return
      }
      
      if (!status.isBLESupported) {
        console.warn('⚠️ OBD Data Context: BLE not supported or SDK not initialized')
        // Try to initialize SDK if not initialized
        try {
          console.log('🔄 OBD Data Context: Attempting to initialize SDK during refresh...')
          await JMBluetoothService.initializeSDK()
          // Re-check after initialization
          const recheckStatus = await JMBluetoothService.getConnectionStatus()
          if (recheckStatus.isBLESupported) {
            console.log('✅ OBD Data Context: SDK initialized successfully during refresh')
            // Continue with connection check
            if (recheckStatus.isConnected) {
              setIsConnected(true)
              setActivityState('idling')
              if (recheckStatus.currentDevice) {
                lastConnectedDeviceRef.current = recheckStatus.currentDevice
              }
            } else {
              setIsConnected(false)
              setActivityState('disconnected')
            }
          } else {
            setIsConnected(false)
            setActivityState('disconnected')
          }
        } catch (initError) {
          console.warn('⚠️ OBD Data Context: Failed to initialize SDK during refresh:', initError)
          setIsConnected(false)
          setActivityState('disconnected')
        }
        return
      }
      
      if (status.isConnected) {
        if (!isConnected) {
          console.log('✅ OBD Data Context: Device connected (updating state from refresh)')
          setIsConnected(true)
          setActivityState('idling')
        }
        // Store connected device address
        if (status.currentDevice) {
          lastConnectedDeviceRef.current = status.currentDevice
        }
      } else {
        if (isConnected) {
          console.log('❌ OBD Data Context: Device disconnected (updating state from refresh)')
          setIsConnected(false)
          setActivityState('disconnected')
        }
      }
    } catch (error) {
      console.error('❌ OBD Data Context: Failed to refresh connection status', error)
    }
  }, [isConnected])

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
    showInactivityPrompt,
    setShowInactivityPrompt,
    triggerInactivityAutoSwitch,
    // New features
    activeMalfunction,
    setActiveMalfunction,
    gpsWarningVisible,
    gpsLossDurationMinutes,
    setGpsWarningVisible,
    onGpsNoteAdded,
    offlineSyncStatus,
    addDriverNote,
    refreshConnectionStatus,
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

