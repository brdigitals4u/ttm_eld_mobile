/**
 * Background Services Component
 *
 * Handles background services that run when authenticated:
 * - Device heartbeat (every 5 minutes)
 * - Background location tracking via expo-location
 * - Notification polling (every 60 seconds)
 */

import { useEffect, useRef } from 'react'
import { Alert, Linking, Platform } from 'react-native'
import * as Location from 'expo-location'

import { useNotifications } from '@/api/driver-hooks'
import { driverApi } from '@/api/driver'
import { usePermissions } from '@/contexts'
import { NotificationService } from '@/services/NotificationService'
import { deviceHeartbeatService } from '@/services/device-heartbeat-service'
import { BACKGROUND_LOCATION_TASK } from '@/tasks/location-task'
import { registerBackgroundFetchAsync, unregisterBackgroundFetchAsync } from '@/tasks/background-fetch-task'
import { useAuth } from '@/stores/authStore'
import { getAppVersion, getDeviceId } from '@/utils/device'

export const BackgroundServices: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { permissions } = usePermissions()
  const locationPermissionGranted = permissions.find((perm) => perm.name === 'location')?.granted ?? false
  const batteryPromptedRef = useRef(false)

  // Poll notifications every 60 seconds
  const { data: notifications } = useNotifications({
    status: 'unread',
    limit: 50,
    enabled: isAuthenticated,
    refetchInterval: 60000,
  })

  // Start/stop device heartbeat based on authentication
  useEffect(() => {
    if (!isAuthenticated) {
      deviceHeartbeatService.stop()
      console.log('💓 BackgroundServices: Device heartbeat stopped')
      return
    }

    deviceHeartbeatService.start()
    console.log('💓 BackgroundServices: Device heartbeat started')

    return () => {
      deviceHeartbeatService.stop()
      console.log('💓 BackgroundServices: Device heartbeat stopped')
    }
  }, [isAuthenticated])

  // Background location lifecycle using expo-location
  useEffect(() => {
    const stopUpdates = async () => {
      try {
        const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        if (started) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
          console.log('🛑 BackgroundServices: Background location updates stopped')
        }
      } catch (error) {
        console.error('❌ BackgroundServices: Failed to stop background location updates:', error)
      }
    }

    if (isAuthenticated && locationPermissionGranted) {
      const startUpdates = async () => {
        try {
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
          if (!hasStarted) {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Highest,
              distanceInterval: 25,
              timeInterval: 15000,
              deferredUpdatesInterval: 60000,
              deferredUpdatesDistance: 50,
              pausesUpdatesAutomatically: false,
              showsBackgroundLocationIndicator: true,
              foregroundService: {
                notificationTitle: 'TTM Konnect',
                notificationBody: 'Tracking location to keep HOS compliant.',
              },
            })
            console.log('✅ BackgroundServices: Background location updates started')
          }

          if (Platform.OS === 'android') {
            try {
              await Location.enableNetworkProviderAsync()
            } catch (error) {
              console.log('ℹ️ BackgroundServices: enableNetworkProviderAsync result:', error)
            }
          }
        } catch (error) {
          console.error('❌ BackgroundServices: Failed to start background location updates:', error)
        }
      }

      startUpdates()

      return () => {
        stopUpdates()
      }
    }

    stopUpdates()
    return undefined
  }, [isAuthenticated, locationPermissionGranted])

  // Background fetch lifecycle
  useEffect(() => {
    if (isAuthenticated) {
      registerBackgroundFetchAsync().catch((error) =>
        console.error('❌ BackgroundServices: Failed to register background fetch task:', error),
      )
      return () => {
        unregisterBackgroundFetchAsync().catch((error) =>
          console.error('❌ BackgroundServices: Failed to unregister background fetch task:', error),
        )
      }
    }

    unregisterBackgroundFetchAsync().catch((error) =>
      console.error('❌ BackgroundServices: Failed to unregister background fetch task:', error),
    )
    return undefined
  }, [isAuthenticated])

  // Prompt to disable battery optimizations on Android
  useEffect(() => {
    if (Platform.OS !== 'android' || !isAuthenticated || batteryPromptedRef.current) {
      return
    }

    batteryPromptedRef.current = true

    Alert.alert(
      'Optimize Background Tracking',
      'To keep HOS tracking accurate, please exclude TTM Konnect from battery optimization.',
      [
        {
          text: 'Later',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings().catch((error: any) =>
              console.error('❌ BackgroundServices: Failed to open app settings:', error),
            )
          },
        },
      ],
    )
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
      console.log(`📬 BackgroundServices: ${notifications.results.length} unread notifications`)
    }
  }, [notifications])

  return null
}

