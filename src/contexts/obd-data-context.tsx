import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import JMBluetoothService from '@/services/JMBluetoothService'
import { ObdEldData } from '@/types/JMBluetooth'
import { handleData } from '@/services/handleData'
import { useAuth } from '@/stores/authStore'
import { useStatusStore } from '@/stores/statusStore'
import { sendObdDataBatch, ObdDataPayload } from '@/api/obd'
import { awsApiService, AwsObdPayload } from '@/services/AwsApiService'
import { awsConfig } from '@/config/aws-config'

interface OBDDataItem {
  id: string
  name: string
  value: string
  unit: string
  isError?: boolean
}

interface ObdDataContextType {
  obdData: OBDDataItem[]
  lastUpdate: Date | null
  isConnected: boolean
  isSyncing: boolean
  awsSyncStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastAwsSync: Date | null
}

const ObdDataContext = createContext<ObdDataContextType | undefined>(undefined)

export const ObdDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, driverProfile, vehicleAssignment } = useAuth()
  const { setEldLocation } = useStatusStore()
  const [obdData, setObdData] = useState<OBDDataItem[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [awsSyncStatus, setAwsSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [lastAwsSync, setLastAwsSync] = useState<Date | null>(null)
  
  // Store data buffers for batch API sync
  const dataBufferRef = useRef<ObdDataPayload[]>([]) // Local API buffer
  const awsBufferRef = useRef<AwsObdPayload[]>([]) // AWS buffer
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const awsSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const eldReportingStartedRef = useRef<boolean>(false) // Track if ELD reporting has been started

    // Listen for OBD data updates
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('📡 OBD Data Context: User not authenticated, skipping setup')
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
        const displayData = handleData(data)
        console.log('📊 OBD Data Context: Processed display data', { 
          displayDataLength: displayData.length,
          displayDataItems: displayData.map(item => ({ name: item.name, value: item.value }))
        })
        setObdData(displayData)
        setLastUpdate(new Date())
        setIsConnected(true)

        // Store ELD location in global state (non-blocking)
        if (data.latitude !== undefined && data.longitude !== undefined && 
            !isNaN(data.latitude) && !isNaN(data.longitude)) {
          setEldLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: Date.now(),
          })
          console.log('📍 OBD Data Context: Stored ELD location:', data.latitude, data.longitude)
        }

        // Add to buffers for dual sync (Local API + AWS)
        if (!driverProfile?.driver_id) {
          console.warn('⚠️ OBD Data Context: Cannot add to buffers - missing driverProfile.driver_id')
          console.warn('⚠️ OBD Data Context: driverProfile:', driverProfile)
          return
        }

        // Local API payload
        const localPayload: ObdDataPayload = {
          driver_id: driverProfile.driver_id,
          timestamp: new Date().toISOString(),
          latitude: data.latitude,
          longitude: data.longitude,
          raw_data: data,
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
            latitude: data.latitude,
            longitude: data.longitude,
            gpsSpeed: data.gpsSpeed,
            gpsTime: data.gpsTime,
            gpsRotation: data.gpsRotation,
            eventTime: data.eventTime,
            eventType: data.eventType,
            eventId: data.eventId,
            isLiveEvent: data.isLiveEvent,
            allData: displayData,
          }

          // Extract specific values from display data for both payloads
          displayData.forEach((item) => {
            if (item.name.includes('Vehicle Speed')) {
              const value = parseFloat(item.value) || 0
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
        eldReportingStartedRef.current = false // Reset flag on disconnect
      }
    )

    const connectedListener = JMBluetoothService.addEventListener(
      'onConnected',
      () => {
        console.log('✅ OBD Data Context: Device connected')
        console.log('🔄 OBD Data Context: Setting isConnected to true')
        setIsConnected(true)
        
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
      JMBluetoothService.removeEventListener(obdDataReceivedListener)
    }
  }, [isAuthenticated, driverProfile?.driver_id])

  // Set up periodic Local API sync (every 1 minute)
  useEffect(() => {
    if (!isAuthenticated || !driverProfile?.driver_id) {
      return
    }

    if (!awsConfig.features.enableLocalSync) {
      console.log('ℹ️  Local API sync disabled via config')
      return
    }

    console.log('⏰ OBD Data Context: Setting up 1-minute Local API sync interval')

    syncIntervalRef.current = setInterval(async () => {
      if (dataBufferRef.current.length === 0) {
        console.log('⏭️  Local API: No data to sync, skipping (buffer empty)')
        console.log('⏭️  Local API: Debug - isAuthenticated:', isAuthenticated, 'driverProfile:', !!driverProfile, 'isConnected:', isConnected)
        return
      }

      try {
        setIsSyncing(true)
        console.log(`🔄 Local API: Syncing ${dataBufferRef.current.length} records...`)
        
        await sendObdDataBatch(dataBufferRef.current)
        
        console.log(`✅ Local API: Successfully synced ${dataBufferRef.current.length} records`)
        dataBufferRef.current = [] // Clear buffer after successful sync
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
      }
    }, 60000) // 1 minute = 60000ms

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [isAuthenticated, driverProfile?.driver_id])

  // Set up periodic AWS sync (every 1 minute)
  useEffect(() => {
    if (!isAuthenticated || !driverProfile?.driver_id) {
      return
    }

    if (!awsConfig.features.enableAwsSync) {
      console.log('ℹ️  AWS sync disabled via config')
      return
    }

    console.log('⏰ OBD Data Context: Setting up 1-minute AWS sync interval')

    awsSyncIntervalRef.current = setInterval(async () => {
      if (awsBufferRef.current.length === 0) {
        console.log('⏭️  AWS: No data to sync, skipping (buffer empty)')
        console.log('⏭️  AWS: Debug - isAuthenticated:', isAuthenticated, 'driverProfile:', !!driverProfile, 'vehicleAssignment:', !!vehicleAssignment)
        return
      }

      try {
        setAwsSyncStatus('syncing')
        console.log(`🔄 AWS: Syncing ${awsBufferRef.current.length} records to Lambda...`)
        
        const response = await awsApiService.saveObdDataBatch(awsBufferRef.current)
        
        if (response.success) {
          console.log(`✅ AWS: Successfully synced ${awsBufferRef.current.length} records`)
          awsBufferRef.current = [] // Clear buffer after successful sync
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
      }
    }, awsConfig.features.awsSyncInterval)

    return () => {
      if (awsSyncIntervalRef.current) {
        clearInterval(awsSyncIntervalRef.current)
      }
    }
  }, [isAuthenticated, driverProfile?.driver_id])

  const value: ObdDataContextType = {
    obdData,
    lastUpdate,
    isConnected,
    isSyncing,
    awsSyncStatus,
    lastAwsSync,
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

