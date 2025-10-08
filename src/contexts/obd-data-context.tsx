import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import JMBluetoothService from '@/services/JMBluetoothService'
import { ObdEldData } from '@/types/JMBluetooth'
import { handleData } from '@/services/handleData'
import { useAuth } from '@/stores/authStore'
import { sendObdDataBatch, ObdDataPayload } from '@/api/obd'

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
}

const ObdDataContext = createContext<ObdDataContextType | undefined>(undefined)

export const ObdDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, driverProfile } = useAuth()
  const [obdData, setObdData] = useState<OBDDataItem[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Store data buffer for batch API sync
  const dataBufferRef = useRef<ObdDataPayload[]>([])
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Listen for OBD data updates
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    console.log('📡 OBD Data Context: Setting up listeners for authenticated user')

    // Listen for OBD ELD data
    const obdEldDataListener = JMBluetoothService.addEventListener(
      'onObdEldDataReceived',
      (data: ObdEldData) => {
        console.log('📊 OBD Data Context: Received ELD data')
        const displayData = handleData(data)
        setObdData(displayData)
        setLastUpdate(new Date())
        setIsConnected(true)

        // Add to buffer for API sync
        if (driverProfile?.driver_id) {
          const payload: ObdDataPayload = {
            driver_id: driverProfile.driver_id,
            timestamp: new Date().toISOString(),
            latitude: data.latitude,
            longitude: data.longitude,
            raw_data: data,
          }

          // Extract specific values from display data
          displayData.forEach((item) => {
            if (item.name.includes('Vehicle Speed')) {
              payload.vehicle_speed = parseFloat(item.value) || 0
            } else if (item.name.includes('Engine Speed')) {
              payload.engine_speed = parseFloat(item.value) || 0
            } else if (item.name.includes('Coolant Temperature')) {
              payload.coolant_temp = parseFloat(item.value) || 0
            } else if (item.name.includes('Fuel Level')) {
              payload.fuel_level = parseFloat(item.value) || 0
            }
          })

          dataBufferRef.current.push(payload)
          console.log(`📦 OBD Data Context: Added to buffer (${dataBufferRef.current.length} items)`)
        }
      }
    )

    const disconnectedListener = JMBluetoothService.addEventListener(
      'onDisconnected',
      () => {
        console.log('❌ OBD Data Context: Device disconnected')
        setIsConnected(false)
      }
    )

    const connectedListener = JMBluetoothService.addEventListener(
      'onConnected',
      () => {
        console.log('✅ OBD Data Context: Device connected')
        setIsConnected(true)
      }
    )

    return () => {
      JMBluetoothService.removeEventListener(obdEldDataListener)
      JMBluetoothService.removeEventListener(disconnectedListener)
      JMBluetoothService.removeEventListener(connectedListener)
    }
  }, [isAuthenticated, driverProfile?.driver_id])

  // Set up periodic API sync (every 1 minute)
  useEffect(() => {
    if (!isAuthenticated || !driverProfile?.driver_id) {
      return
    }

    console.log('⏰ OBD Data Context: Setting up 1-minute sync interval')

    syncIntervalRef.current = setInterval(async () => {
      if (dataBufferRef.current.length === 0) {
        console.log('⏭️  OBD Data Context: No data to sync, skipping')
        return
      }

      try {
        setIsSyncing(true)
        console.log(`🔄 OBD Data Context: Syncing ${dataBufferRef.current.length} records to API...`)
        
        await sendObdDataBatch(dataBufferRef.current)
        
        console.log(`✅ OBD Data Context: Successfully synced ${dataBufferRef.current.length} records`)
        dataBufferRef.current = [] // Clear buffer after successful sync
      } catch (error) {
        console.error('❌ OBD Data Context: Failed to sync data to API:', error)
        // Keep data in buffer for next sync attempt
        // Limit buffer size to prevent memory issues
        if (dataBufferRef.current.length > 1000) {
          console.warn('⚠️  OBD Data Context: Buffer overflow, removing oldest records')
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

  const value: ObdDataContextType = {
    obdData,
    lastUpdate,
    isConnected,
    isSyncing,
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

