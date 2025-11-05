import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import * as Device from 'expo-device'
import { router } from 'expo-router'

// ============================================================================
// Notification Configuration
// ============================================================================

// Set notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority as string

    // Show notification based on priority
    // Critical/High priority: Always show with sound
    // Medium/Low: Show without sound
    return {
      shouldShowAlert: true,
      shouldPlaySound: priority === 'critical' || priority === 'high',
      shouldSetBadge: true,
      priority: priority === 'critical' 
        ? Notifications.AndroidNotificationPriority.MAX 
        : Notifications.AndroidNotificationPriority.DEFAULT,
    }
  },
})

// ============================================================================
// Notification Service
// ============================================================================

export class NotificationService {
  private static pushToken: string | null = null
  private static notificationListener: Notifications.Subscription | null = null
  private static responseListener: Notifications.Subscription | null = null

  /**
   * Initialize notification service
   * - Request permissions
   * - Get push token
   * - Set up listeners
   */
  static async initialize(): Promise<string | null> {
    try {
      // Check if running on physical device (required for push notifications)
      if (!Device.isDevice) {
        console.warn('Push notifications require a physical device')
        return null
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted')
        return null
      }

      // Get push notification token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '4e91789b-89ce-4512-acb7-c7f9c86560bf', // From app.json
      })
      this.pushToken = tokenData.data

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels()
      }

      // Set up notification listeners
      this.setupListeners()

      console.log('✅ Push notification initialized:', this.pushToken)
      return this.pushToken
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error)
      return null
    }
  }

  /**
   * Setup Android notification channels
   */
  private static async setupAndroidChannels() {
    // Critical channel (HOS violations, malfunctions)
    await Notifications.setNotificationChannelAsync('critical', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#DC2626',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    })

    // High priority channel (Warnings)
    await Notifications.setNotificationChannelAsync('high', {
      name: 'Important Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#F59E0B',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })

    // Default channel (General notifications)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      sound: 'default',
      lightColor: '#4338CA',
    })
  }

  /**
   * Setup notification listeners
   */
  private static setupListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received (foreground):', notification)
      // Notification is automatically displayed by handler
    })

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('👆 Notification tapped:', response)
      
      const data = response.notification.request.content.data
      // Get notification ID from data.id or identifier
      const notificationId = data?.id || data?.notification_id || response.notification.request.identifier
      const notificationType = data?.type as string
      
      // Handle profile change notifications
      if (notificationType === 'profile_change_approved' || notificationType === 'profile_change_rejected') {
        // Navigate to profile requests page with notification ID for marking as read
        if (notificationId) {
          router.push({
            pathname: '/profile-requests',
            params: { notificationId: String(notificationId) },
          } as any)
        } else {
          // Fallback: navigate without notification ID
          router.push('/profile-requests' as any)
        }
        return
      }
      
      // Navigate based on notification action (for other notification types)
      // Skip actions that point to /driver/profile/requests since we handle it above
      if (data?.action && !data.action.includes('/driver/profile/requests')) {
        router.push(data.action as any)
      } else {
        // Default: Navigate to notifications panel/dashboard
        router.push('/(tabs)/dashboard')
      }
    })
  }

  /**
   * Get current push token
   */
  static getPushToken(): string | null {
    return this.pushToken
  }

  /**
   * Send local notification (for testing or immediate alerts)
   */
  static async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    const channelId = priority === 'critical' || priority === 'high' ? priority : 'default'

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, priority },
        sound: priority === 'critical' || priority === 'high' ? 'default' : undefined,
        priority:
          priority === 'critical'
            ? Notifications.AndroidNotificationPriority.MAX
            : priority === 'high'
            ? Notifications.AndroidNotificationPriority.HIGH
            : Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null, // Show immediately
    })
  }

  /**
   * Schedule notification for later
   */
  static async scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: Record<string, any>,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    const channelId = priority === 'critical' || priority === 'high' ? priority : 'default'

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, priority },
        sound: priority === 'critical' || priority === 'high' ? 'default' : undefined,
        priority:
          priority === 'critical'
            ? Notifications.AndroidNotificationPriority.MAX
            : priority === 'high'
            ? Notifications.AndroidNotificationPriority.HIGH
            : Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: triggerDate,
    })
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  /**
   * Get notification badge count
   */
  static async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync()
  }

  /**
   * Set notification badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count)
  }

  /**
   * Clear badge count
   */
  static async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0)
  }

  /**
   * Cleanup listeners
   */
  static cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener)
      this.notificationListener = null
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener)
      this.responseListener = null
    }
  }
}

// ============================================================================
// HOS-Specific Notification Helpers
// ============================================================================

/**
 * Send HOS violation warning
 */
export async function sendHOSViolationAlert(
  violationType: '11_hour' | '14_hour' | '70_hour' | '30_min_break',
  timeRemaining: number // in minutes
): Promise<void> {
  const messages = {
    '11_hour': {
      title: '⚠️ 11-Hour Driving Limit Approaching',
      body: `You have ${timeRemaining} minutes of driving time remaining. Plan your stop.`,
    },
    '14_hour': {
      title: '⚠️ 14-Hour Shift Limit Approaching',
      body: `You have ${timeRemaining} minutes before your 14-hour shift ends.`,
    },
    '70_hour': {
      title: '⚠️ 70-Hour Cycle Limit Approaching',
      body: `You have ${Math.floor(timeRemaining / 60)} hours remaining in your cycle.`,
    },
    '30_min_break': {
      title: '🛑 30-Minute Break Required',
      body: 'You must take a 30-minute break before continuing to drive.',
    },
  }

  const { title, body } = messages[violationType]

  await NotificationService.sendLocalNotification(
    title,
    body,
    {
      type: 'hos_violation',
      violation_type: violationType,
      action: '/(tabs)/logs', // Navigate to HOS logs
    },
    'critical'
  )
}

/**
 * Send malfunction alert
 */
export async function sendMalfunctionAlert(
  malfunctionType: string,
  description: string
): Promise<void> {
  await NotificationService.sendLocalNotification(
    '🔧 ELD Malfunction Detected',
    `${malfunctionType}: ${description}`,
    {
      type: 'malfunction_alert',
      action: '/settings', // Navigate to settings/malfunction screen
    },
    'critical'
  )
}

/**
 * Send certification reminder
 */
export async function sendCertificationReminder(date: string): Promise<void> {
  await NotificationService.sendLocalNotification(
    '📋 Log Certification Required',
    `Please certify your logs for ${date}`,
    {
      type: 'certification_reminder',
      action: '/(tabs)/logs',
    },
    'high'
  )
}
