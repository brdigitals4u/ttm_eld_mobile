import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import JMBluetoothService from '@/services/JMBluetoothService'
import { ObdEldData } from '@/types/JMBluetooth'
import { handleData } from '@/services/handleData'
import { useAuth } from '@/stores/authStore'
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
  const debugIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        console.log('📊 OBD Data Context: Received ELD data', { 
          dataKeys: Object.keys(data),
          hasDataFlowList: !!data.dataFlowList,
          dataFlowListLength: data.dataFlowList?.length || 0,
          fullData: data
        })
        const displayData = handleData(data)
        console.log('📊 OBD Data Context: Processed display data', { 
          displayDataLength: displayData.length,
          displayDataItems: displayData.map(item => ({ name: item.name, value: item.value }))
        })
        setObdData(displayData)
        setLastUpdate(new Date())
        setIsConnected(true)

        // Add to buffers for dual sync (Local API + AWS)
        if (driverProfile?.driver_id) {
          // Local API payload
          const localPayload: ObdDataPayload = {
            driver_id: driverProfile.driver_id,
            timestamp: new Date().toISOString(),
            latitude: data.latitude,
            longitude: data.longitude,
            raw_data: data,
          }

          // AWS Lambda payload
          const awsPayload: AwsObdPayload = {
            vehicleId: vehicleAssignment?.vehicle_info?.vin || 'unknown',
            driverId: driverProfile.driver_id,
            timestamp: Date.now(),
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
          console.log(`📦 AWS Payload structure:`, {
            vehicleId: awsPayload.vehicleId,
            driverId: awsPayload.driverId,
            timestamp: awsPayload.timestamp,
            dataType: awsPayload.dataType,
            hasLatitude: !!awsPayload.latitude,
            hasLongitude: !!awsPayload.longitude,
            allDataLength: awsPayload.allData?.length || 0
          })
          console.log(`📦 AWS Buffer Status: ${awsBufferRef.current.length} items ready for sync`)
        }
      }
    )

    const disconnectedListener = JMBluetoothService.addEventListener(
      'onDisconnected',
      () => {
        console.log('❌ OBD Data Context: Device disconnected')
        console.log('🔄 OBD Data Context: Setting isConnected to false')
        setIsConnected(false)
      }
    )

    const connectedListener = JMBluetoothService.addEventListener(
      'onConnected',
      () => {
        console.log('✅ OBD Data Context: Device connected')
        console.log('🔄 OBD Data Context: Setting isConnected to true')
        setIsConnected(true)
        
        // Try to start OBD reporting if not already started
        JMBluetoothService.startReportObdData().then(() => {
          console.log('📊 OBD Data Context: OBD reporting started from context')
        }).catch((error) => {
          console.log('⚠️ OBD Data Context: Failed to start OBD reporting:', error)
        })
      }
    )

    // Check current connection status on setup
    const checkConnectionStatus = async () => {
      try {
        const status = await JMBluetoothService.getConnectionStatus()
        console.log('🔍 OBD Data Context: Initial connection check:', status)
        if (status.isConnected) {
          console.log('✅ OBD Data Context: Device already connected, setting connected state')
          setIsConnected(true)
          
          // Try to start OBD reporting
          JMBluetoothService.startReportObdData().then(() => {
            console.log('📊 OBD Data Context: OBD reporting started from status check')
          }).catch((error) => {
            console.log('⚠️ OBD Data Context: Failed to start OBD reporting from status check:', error)
          })
        }
      } catch (error) {
        console.log('⚠️ OBD Data Context: Failed to check connection status:', error)
      }
    }

    // Check connection status immediately
    checkConnectionStatus()

    // Listen for OBD data collection events
    const obdCollectStartListener = JMBluetoothService.addEventListener(
      'onObdCollectStart',
      () => {
        console.log('📊 OBD Data Context: OBD data collection started')
        setIsConnected(true)
      }
    )

    const obdCollectFinishListener = JMBluetoothService.addEventListener(
      'onObdCollectFinish',
      () => {
        console.log('📊 OBD Data Context: OBD data collection finished')
        // Don't set disconnected here as collection can finish and restart
      }
    )

    // Listen for other OBD data events for debugging
    const obdDataListener = JMBluetoothService.addEventListener(
      'onObdDataReceived',
      (data: any) => {
        console.log('📊 OBD Data Context: Received OBD data', data)
      }
    )

    const obdDataFlowListener = JMBluetoothService.addEventListener(
      'onObdDataFlowReceived',
      (data: any) => {
        console.log('📊 OBD Data Context: Received OBD data flow', data)
      }
    )

    const obdRawDataListener = JMBluetoothService.addEventListener(
      'onObdRawDataReceived',
      (data: any) => {
        console.log('📊 OBD Data Context: Received OBD raw data', data)
      }
    )

    const eldDataListener = JMBluetoothService.addEventListener(
      'onEldDataReceived',
      (data: any) => {
        console.log('📊 OBD Data Context: Received ELD data (non-OBD)', data)
      }
    )

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

    return () => {
      JMBluetoothService.removeEventListener(obdEldDataListener)
      JMBluetoothService.removeEventListener(disconnectedListener)
      JMBluetoothService.removeEventListener(connectedListener)
      JMBluetoothService.removeEventListener(obdCollectStartListener)
      JMBluetoothService.removeEventListener(obdCollectFinishListener)
      JMBluetoothService.removeEventListener(obdDataListener)
      JMBluetoothService.removeEventListener(obdDataFlowListener)
      JMBluetoothService.removeEventListener(obdRawDataListener)
      JMBluetoothService.removeEventListener(eldDataListener)
      JMBluetoothService.removeEventListener(obdEldStartListener)
      JMBluetoothService.removeEventListener(obdEldFinishListener)
    }
  }, [isAuthenticated, driverProfile?.driver_id])

  // Set up debug interval to monitor OBD data flow
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    console.log('🔍 OBD Data Context: Setting up debug monitoring')

    debugIntervalRef.current = setInterval(async () => {
      console.log('🔍 OBD Data Context Debug Status:', {
        isConnected,
        obdDataLength: obdData.length,
        lastUpdate: lastUpdate?.toISOString(),
        dataBufferLength: dataBufferRef.current.length,
        awsBufferLength: awsBufferRef.current.length,
        isSyncing,
        awsSyncStatus
      })

      // Try to get connection status and sync if needed
      try {
        const connectionStatus = await JMBluetoothService.getConnectionStatus()
        console.log('🔍 Connection Status:', connectionStatus)
        
        // Sync connection status if there's a mismatch
        if (connectionStatus.isConnected && !isConnected) {
          console.log('🔄 Syncing connection status: Device is connected but context shows disconnected')
          console.log('🔄 OBD Data Context: Setting isConnected to true (from periodic check)')
          setIsConnected(true)
          
          // Try to start OBD reporting
          JMBluetoothService.startReportObdData().then(() => {
            console.log('📊 OBD Data Context: OBD reporting started from periodic check')
          }).catch((error) => {
            console.log('⚠️ OBD Data Context: Failed to start OBD reporting from periodic check:', error)
          })
        } else if (!connectionStatus.isConnected && isConnected) {
          console.log('🔄 Syncing connection status: Device is disconnected but context shows connected')
          console.log('🔄 OBD Data Context: Setting isConnected to false (from periodic check)')
          setIsConnected(false)
        }
      } catch (error) {
        console.log('⚠️ Could not get connection status:', error)
      }
    }, 10000) // Every 10 seconds

    return () => {
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current)
      }
    }
  }, [isAuthenticated, isConnected, obdData.length, lastUpdate, isSyncing, awsSyncStatus])

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
        console.log('⏭️  Local API: No data to sync, skipping')
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
    console.log('🔍 AWS Sync Setup Check:', {
      isAuthenticated,
      hasDriverId: !!driverProfile?.driver_id,
      enableAwsSync: awsConfig.features.enableAwsSync,
      enableLocalSync: awsConfig.features.enableLocalSync
    })

    if (!isAuthenticated || !driverProfile?.driver_id) {
      console.log('❌ AWS sync not set up: Missing authentication or driver ID')
      return
    }

    if (!awsConfig.features.enableAwsSync) {
      console.log('ℹ️  AWS sync disabled via config')
      return
    }

    console.log('⏰ OBD Data Context: Setting up 1-minute AWS sync interval')

    awsSyncIntervalRef.current = setInterval(async () => {
      if (awsBufferRef.current.length === 0) {
        console.log('⏭️  AWS: No data to sync, skipping')
        return
      }

      try {
        setAwsSyncStatus('syncing')
        console.log(`🔄 AWS: Syncing ${awsBufferRef.current.length} records to Lambda...`)
        
        // Log the first record structure for debugging
        if (awsBufferRef.current.length > 0) {
          console.log(`🔍 AWS: First record structure:`, {
            vehicleId: awsBufferRef.current[0].vehicleId,
            driverId: awsBufferRef.current[0].driverId,
            timestamp: awsBufferRef.current[0].timestamp,
            dataType: awsBufferRef.current[0].dataType
          })
        }
        
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
          console.error('❌ AWS: Response details:', response)
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

