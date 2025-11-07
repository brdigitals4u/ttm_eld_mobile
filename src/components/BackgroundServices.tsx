/**
 * Background Services Component
 * 
 * Handles background services that run when authenticated:
 * - Device heartbeat (every 5 minutes)
 * - Notification polling (every 60 seconds)
 */

import { useEffect } from 'react'
import { useAuth } from '@/stores/authStore'
import { deviceHeartbeatService } from '@/services/device-heartbeat-service'
import { useNotifications } from '@/api/driver-hooks'
import { driverApi } from '@/api/driver'
import { NotificationService } from '@/services/NotificationService'
import { Platform } from 'react-native'
import { getDeviceId, getAppVersion } from '@/utils/device'

export const BackgroundServices: React.FC = () => {
  const { isAuthenticated } = useAuth()

  // Poll notifications every 60 seconds
  const { data: notifications } = useNotifications({
    status: 'unread',
    limit: 50,
    enabled: isAuthenticated,
    refetchInterval: 60000, // 60 seconds
  })

  // Start/stop device heartbeat based on authentication
  useEffect(() => {
    if (isAuthenticated) {
      deviceHeartbeatService.start()
      console.log('💓 BackgroundServices: Device heartbeat started')
    } else {
      deviceHeartbeatService.stop()
      console.log('💓 BackgroundServices: Device heartbeat stopped')
    }

    return () => {
      deviceHeartbeatService.stop()
    }
  }, [isAuthenticated])

  // Register push token on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const registerPushToken = async () => {
        try {
          const pushToken = await NotificationService.getPushToken()
          if (pushToken) {
            const deviceId = await getDeviceId()
            const appVersion = getAppVersion()
            
            await driverApi.registerPushToken({
              device_token: pushToken,
              platform: Platform.OS as 'ios' | 'android',
              device_id: deviceId,
              app_version: appVersion,
            })
            console.log('✅ BackgroundServices: Push token registered with driver API')
          }
        } catch (error) {
          console.error('❌ BackgroundServices: Failed to register push token:', error)
        }
      }

      registerPushToken()
    }
  }, [isAuthenticated])

  // Handle notifications when received
  useEffect(() => {
    if (notifications?.results && notifications.results.length > 0) {
      // Notifications are handled by the notification service
      // This just ensures they're polled regularly
      console.log(`📬 BackgroundServices: ${notifications.results.length} unread notifications`)
    }
  }, [notifications])

  return null // This component doesn't render anything
}

