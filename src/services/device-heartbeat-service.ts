/**
 * Device Heartbeat Service
 * 
 * Sends device heartbeat to backend every 5 minutes while driver session is active.
 * Runs in background on all screens.
 */

import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { getEldDeviceId, getAppVersion } from '@/utils/device'
import { driverApi } from '@/api/driver'

// Helper to get battery level from ELD data if available
let getBatteryFromEld: (() => number | undefined) | null = null

export function setBatteryGetter(fn: () => number | undefined) {
  getBatteryFromEld = fn
}

// Network info - simple fallback
async function getNetworkType(): Promise<string> {
  // Return 'unknown' as fallback (can be enhanced later with NetInfo if needed)
  return 'unknown'
}

class DeviceHeartbeatService {
  private interval: ReturnType<typeof setInterval> | null = null
  private isRunning: boolean = false

  /**
   * Start sending heartbeats every 5 minutes
   */
  async start() {
    if (this.isRunning) {
      console.log('💓 DeviceHeartbeat: Already running')
      return
    }

    this.isRunning = true
    
    // Send initial heartbeat immediately
    await this.sendHeartbeat()

    // Then send every 5 minutes
    this.interval = setInterval(async () => {
      await this.sendHeartbeat()
    }, 5 * 60 * 1000) // 5 minutes

    console.log('💓 DeviceHeartbeat: Started (every 5 minutes)')
  }

  /**
   * Stop sending heartbeats
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isRunning = false
    console.log('💓 DeviceHeartbeat: Stopped')
  }

  /**
   * Send a single heartbeat
   */
  private async sendHeartbeat() {
    try {
      const networkType = await getNetworkType()
      const eldDeviceId = await getEldDeviceId()
      const appVersion = getAppVersion()

      // Get battery from ELD data if available, otherwise use device battery
      let batteryPercent: number | undefined
      if (getBatteryFromEld) {
        const eldBattery = getBatteryFromEld()
        if (eldBattery !== undefined) {
          batteryPercent = Math.round(eldBattery)
        }
      }
      // Note: expo-device doesn't have batteryLevel, use ELD data only

      await driverApi.sendHeartbeat({
        device_id: eldDeviceId || 'unknown',
        timestamp: new Date().toISOString(),
        battery_percent: batteryPercent,
        gps_enabled: true,
        network_type: networkType,
        app_version: appVersion,
      })

      console.log('💓 DeviceHeartbeat: Sent successfully')
    } catch (error) {
      console.error('❌ DeviceHeartbeat: Failed to send:', error)
    }
  }

  /**
   * Check if service is running
   */
  getIsRunning(): boolean {
    return this.isRunning
  }
}

// Export singleton instance
export const deviceHeartbeatService = new DeviceHeartbeatService()

