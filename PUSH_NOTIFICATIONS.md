# Push Notifications Implementation

This document describes the push notification implementation for the TTM ELD mobile app.

## Overview

The app now supports **both in-app and push notifications** for driver alerts:
- **Push Notifications**: Critical safety alerts (HOS violations, malfunctions) delivered even when app is closed
- **In-App Notifications**: Less urgent updates (pending edits, certification reminders) shown when app is active

## Architecture

### Components

1. **NotificationService** (`src/services/NotificationService.ts`)
   - Handles push notification setup and management
   - Registers device push tokens with backend
   - Manages notification channels (Android)
   - Provides helpers for sending local notifications

2. **API Integration** (`src/api/notifications.ts`)
   - Endpoint to register push tokens: `POST /driver/register-push-token/`
   - Existing endpoints for in-app notifications still work

3. **HOS Monitoring** (`src/hooks/useHOSMonitoring.ts`)
   - Monitors HOS time limits in background
   - Automatically sends push notifications for:
     - 11-hour driving limit (30min, 15min, 5min warnings)
     - 14-hour shift limit (30min, 15min, 5min warnings)
     - 70-hour cycle limit (2hr, 1hr warnings)

4. **App Initialization** (`src/app/_layout.tsx`)
   - Initializes notification service on app start
   - Registers push token with backend

## Configuration

### app.json
```json
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/images/app-icon-android-adaptive-foreground.png",
        "color": "#4338CA",
        "sounds": [],
        "mode": "production"
      }
    ]
  ]
}
```

### Android Notification Channels

Three channels are configured with different priorities:

| Channel | Priority | Use Case | Sound | Vibration | Bypass DND |
|---------|----------|----------|-------|-----------|------------|
| `critical` | MAX | HOS violations, malfunctions | ✅ | ✅ | ✅ |
| `high` | HIGH | Important warnings | ✅ | ✅ | ❌ |
| `default` | DEFAULT | General notifications | ✅ | ✅ | ❌ |

## Usage

### Automatic HOS Monitoring

To enable automatic HOS violation alerts in any screen:

```typescript
import { useHOSMonitoring } from '@/hooks/useHOSMonitoring'

export function YourScreen() {
  // Enable HOS monitoring
  const { hosClock, isMonitoring } = useHOSMonitoring(true)
  
  // ... rest of your component
}
```

### Manual Notifications

Send custom notifications:

```typescript
import { NotificationService, sendHOSViolationAlert, sendMalfunctionAlert } from '@/services/NotificationService'

// HOS violation
await sendHOSViolationAlert('11_hour', 25) // 25 minutes remaining

// Malfunction alert
await sendMalfunctionAlert('M1 - Power Compliance', 'ELD lost power')

// Custom notification
await NotificationService.sendLocalNotification(
  'Title',
  'Message body',
  { action: '/some-route' }, // Optional navigation
  'critical' // Priority level
)
```

### Badge Management

Badge count is automatically synced with unread notification count:

```typescript
// Manual badge management
await NotificationService.setBadgeCount(5)
await NotificationService.clearBadge()
```

## Backend Requirements

### Push Token Registration Endpoint

**Endpoint:** `POST /driver/register-push-token/`

**Request:**
```json
{
  "push_token": "ExponentPushToken[xxxxx]",
  "device_type": "ios" | "android",
  "device_id": "optional-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push token registered successfully"
}
```

### Sending Push Notifications from Backend

When backend detects HOS violations or other events, send push notification using Expo Push API:

```python
import requests

def send_push_notification(push_token, title, body, data=None, priority='default'):
    """Send push notification via Expo Push API"""
    
    message = {
        "to": push_token,
        "title": title,
        "body": body,
        "data": data or {},
        "priority": priority,  # 'default' or 'high'
        "sound": "default" if priority in ['high', 'critical'] else None,
        "channelId": priority if priority in ['critical', 'high'] else 'default'
    }
    
    response = requests.post(
        'https://exp.host/--/api/v2/push/send',
        json=message,
        headers={
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    )
    
    return response.json()

# Example: Send HOS violation alert
send_push_notification(
    push_token=driver.push_token,
    title="⚠️ 11-Hour Driving Limit Approaching",
    body="You have 30 minutes of driving time remaining. Plan your stop.",
    data={
        "type": "hos_violation",
        "violation_type": "11_hour",
        "action": "/(tabs)/logs"
    },
    priority="critical"
)
```

## Testing

### 1. Physical Device Required
Push notifications require a physical device (iOS or Android). They won't work in simulators/emulators.

### 2. Test Local Notifications
```typescript
import { NotificationService } from '@/services/NotificationService'

// Test critical alert
await NotificationService.sendLocalNotification(
  '🚨 Test Critical Alert',
  'This is a test critical notification',
  { test: true },
  'critical'
)

// Test HOS violation
import { sendHOSViolationAlert } from '@/services/NotificationService'
await sendHOSViolationAlert('11_hour', 30)
```

### 3. Check Push Token
Look for this log on app start:
```
✅ Push notification initialized: ExponentPushToken[xxxxx]
✅ Push token registered with backend
```

### 4. Test Background Notifications
1. Close the app completely
2. Have backend send a push notification
3. Verify notification appears on device
4. Tap notification and verify navigation works

## Notification Priority Guidelines

| Priority | Use Cases | Behavior |
|----------|-----------|----------|
| **critical** | HOS violations, ELD malfunctions, safety alerts | MAX priority, bypasses DND, persistent sound |
| **high** | Break reminders, certification deadlines | HIGH priority, sound, no DND bypass |
| **medium** | Pending log edits, dispatcher messages | DEFAULT priority, sound |
| **low** | General updates, non-urgent info | DEFAULT priority, silent |

## Troubleshooting

### Notifications Not Appearing

1. **Check permissions:**
   ```typescript
   const { status } = await Notifications.getPermissionsAsync()
   console.log('Permission status:', status)
   ```

2. **Verify push token:**
   ```typescript
   const token = NotificationService.getPushToken()
   console.log('Push token:', token)
   ```

3. **Check backend registration:**
   - Verify `/driver/register-push-token/` endpoint received the token
   - Check backend logs for push send attempts

4. **Android: Check notification channels:**
   - Go to device Settings → Apps → TTMKonnect → Notifications
   - Verify channels are enabled

### iOS-Specific Issues

- Ensure notification capabilities are enabled in Xcode
- Run `npx expo prebuild` after adding notifications plugin
- Check Apple Developer Console for APNs certificate

### Android-Specific Issues

- Verify Firebase Cloud Messaging (FCM) is configured if using custom server
- Check notification channel settings in device
- Battery optimization may block background notifications

## Future Enhancements

1. **Progressive Warnings**: More granular time-based alerts
2. **Quiet Hours**: Respect driver's sleep schedule
3. **Notification History**: Persistent log of all alerts
4. **Custom Sounds**: Different sounds for different alert types
5. **Grouped Notifications**: Stack related alerts together
6. **Rich Notifications**: Images, actions, and interactive elements
