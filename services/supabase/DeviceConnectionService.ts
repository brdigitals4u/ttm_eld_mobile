import { supabase, Database } from '../../lib/supabase'

type DeviceConnection = Database['public']['Tables']['device_connections']['Insert']
type DeviceConnectionRow = Database['public']['Tables']['device_connections']['Row']

export class DeviceConnectionService {
  
  /**
   * Log a device connection event
   */
  static async logConnection(connectionData: DeviceConnection): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('device_connections')
        .insert(connectionData)

      if (error) {
        console.error('Error logging device connection:', error.message)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error logging device connection:', error)
      return { success: false, error: 'Failed to log connection' }
    }
  }

  /**
   * Log Bluetooth connection attempt
   */
  static async logBluetoothConnection({
    deviceId,
    driverId,
    status,
    signalStrength,
    errorCode,
    errorMessage,
    metadata
  }: {
    deviceId: string
    driverId?: string
    status: 'connected' | 'disconnected' | 'failed' | 'timeout'
    signalStrength?: number
    errorCode?: string
    errorMessage?: string
    metadata?: any
  }): Promise<{ success: boolean; error?: string }> {
    
    return this.logConnection({
      device_id: deviceId,
      driver_id: driverId,
      connection_type: 'bluetooth',
      connection_status: status,
      signal_strength: signalStrength,
      error_code: errorCode,
      error_message: errorMessage,
      metadata
    })
  }

  /**
   * Get recent connection logs for a device
   */
  static async getDeviceConnectionHistory(
    deviceId: string, 
    limit: number = 50
  ): Promise<{ data: DeviceConnectionRow[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('device_connections')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching connection history:', error.message)
        return { data: null, error: error.message }
      }

      return { data }
    } catch (error) {
      console.error('Error fetching connection history:', error)
      return { data: null, error: 'Failed to fetch connection history' }
    }
  }

  /**
   * Get connection status for multiple devices
   */
  static async getDevicesConnectionStatus(deviceIds: string[]): Promise<{
    data: Array<{
      device_id: string
      last_connection: DeviceConnectionRow | null
      is_connected: boolean
    }> | null
    error?: string
  }> {
    try {
      const results = await Promise.all(
        deviceIds.map(async (deviceId) => {
          const { data, error } = await supabase
            .from('device_connections')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()

          return {
            device_id: deviceId,
            last_connection: error ? null : data,
            is_connected: data?.connection_status === 'connected' || false
          }
        })
      )

      return { data: results }
    } catch (error) {
      console.error('Error fetching devices connection status:', error)
      return { data: null, error: 'Failed to fetch connection status' }
    }
  }

  /**
   * Get connection statistics for a device
   */
  static async getConnectionStats(
    deviceId: string, 
    days: number = 7
  ): Promise<{
    data: {
      total_attempts: number
      successful_connections: number
      failed_connections: number
      success_rate: number
      avg_signal_strength: number | null
    } | null
    error?: string
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('device_connections')
        .select('connection_status, signal_strength')
        .eq('device_id', deviceId)
        .gte('timestamp', startDate.toISOString())

      if (error) {
        console.error('Error fetching connection stats:', error.message)
        return { data: null, error: error.message }
      }

      const totalAttempts = data.length
      const successfulConnections = data.filter(conn => conn.connection_status === 'connected').length
      const failedConnections = totalAttempts - successfulConnections
      const successRate = totalAttempts > 0 ? (successfulConnections / totalAttempts) * 100 : 0
      
      const signalStrengths = data
        .filter(conn => conn.signal_strength !== null)
        .map(conn => conn.signal_strength!)
      
      const avgSignalStrength = signalStrengths.length > 0 
        ? signalStrengths.reduce((sum, strength) => sum + strength, 0) / signalStrengths.length
        : null

      return {
        data: {
          total_attempts: totalAttempts,
          successful_connections: successfulConnections,
          failed_connections: failedConnections,
          success_rate: Math.round(successRate * 100) / 100,
          avg_signal_strength: avgSignalStrength ? Math.round(avgSignalStrength * 100) / 100 : null
        }
      }
    } catch (error) {
      console.error('Error calculating connection stats:', error)
      return { data: null, error: 'Failed to calculate connection stats' }
    }
  }

  /**
   * Subscribe to real-time connection events for a device
   */
  static subscribeToDeviceConnections(
    deviceId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`device_connections:${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_connections',
          filter: `device_id=eq.${deviceId}`
        },
        callback
      )
      .subscribe()
  }
}
