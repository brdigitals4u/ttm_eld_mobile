# Firebase Analytics Setup Guide

## Overview

Firebase Analytics provides comprehensive user behavior tracking and app insights. This guide explains how to set up and use Firebase Analytics in the TTM Konnect ELD app.

## What is Firebase Analytics?

Firebase Analytics provides:
- **User Behavior Tracking**: Screen views, user actions, custom events
- **User Properties**: Driver ID, vehicle assignment, organization info
- **App Insights**: User engagement, retention, conversion funnels
- **Real-time Analytics**: View events as they happen

## Setup Steps

### 1. Create Firebase Project

1. **Go to Firebase Console:**
   - Navigate to [Firebase Console](https://console.firebase.google.com)
   - Click **Add project** or select an existing project

2. **Create/Select Project:**
   - Enter project name (e.g., "TTM Konnect ELD")
   - Follow the setup wizard
   - Enable Google Analytics (recommended)

### 2. Add Android App to Firebase

1. **Add Android App:**
   - In Firebase Console, click **Add app** > **Android**
   - Enter package name: `com.ttmkonnect.eld`
   - Enter app nickname: "TTM Konnect ELD Android"
   - Enter SHA-1 certificate fingerprint (optional, for dynamic links)
   - Click **Register app**

2. **Download google-services.json:**
   - Download the `google-services.json` file
   - Place it in `android/app/` directory
   - **Important**: Never commit this file to public repositories

3. **Add to .gitignore:**
   ```gitignore
   # Firebase
   android/app/google-services.json
   ```

### 3. Install Dependencies

Dependencies are already added to `package.json`:
- `@react-native-firebase/app`
- `@react-native-firebase/analytics`

Install them:
```bash
npm install
# or
yarn install
```

### 4. Build Configuration

The Google Services plugin is already configured:
- ✅ Added to `android/build.gradle` (classpath)
- ✅ Applied in `android/app/build.gradle`
- ✅ ProGuard rules added

### 5. Initialize Analytics

Analytics is automatically initialized in `src/app/_layout.tsx` on app startup.

## Usage

### Basic Tracking

```typescript
import { analyticsService } from '@/services/AnalyticsService'

// Log a custom event
await analyticsService.logEvent('button_click', {
  button_name: 'login',
  screen: 'login_screen',
})

// Log screen view
await analyticsService.logScreenView('DashboardScreen')

// Set user property
await analyticsService.setUserProperty('driver_type', 'commercial')
```

### Predefined Event Helpers

The service includes helper methods for common events:

```typescript
// Login
await analyticsService.logLogin('email')

// ELD Connection
await analyticsService.logEldConnection('device-123', 'bluetooth')

// ELD Disconnection
await analyticsService.logEldDisconnection('device-123')

// HOS Status Change
await analyticsService.logHosStatusChange('off_duty', 'driving')

// Log Certification
await analyticsService.logLogCertification('2025-01-15')

// Location Batch Upload
await analyticsService.logLocationBatchUpload(50)

// ELD Malfunction
await analyticsService.logEldMalfunction('M1')

// App Error
await analyticsService.logError('Connection failed', 'network_error')
```

### User Properties

Set driver properties for better analytics:

```typescript
// Set driver properties (on login)
await analyticsService.setDriverProperties(
  'driver-123',
  'vehicle-456',
  'org-789'
)

// Clear driver properties (on logout)
await analyticsService.clearDriverProperties()
```

### Screen Tracking

Screen views can be tracked automatically with Expo Router or manually:

```typescript
// Manual screen tracking
import { useFocusEffect } from '@react-navigation/native'

useFocusEffect(
  useCallback(() => {
    analyticsService.logScreenView('DashboardScreen')
  }, [])
)
```

## Event Tracking Strategy

### Recommended Events to Track

1. **User Actions:**
   - Login/logout
   - ELD connection/disconnection
   - HOS status changes
   - Log certification
   - Settings changes

2. **App Usage:**
   - Screen views
   - Feature usage
   - Error occurrences
   - API call failures

3. **ELD Operations:**
   - Device scan
   - Connection attempts
   - Data sync
   - Malfunction reports

### Event Naming Convention

- Use snake_case: `eld_connection`, `hos_status_change`
- Be descriptive: `log_certification` not `certify`
- Group related events: `eld_*`, `hos_*`, `location_*`

## User Properties

### Recommended User Properties

- `driver_id`: Driver identifier
- `vehicle_id`: Assigned vehicle
- `organization_id`: Organization identifier
- `driver_type`: Type of driver (commercial, etc.)
- `app_version`: App version for debugging

## Privacy and Compliance

### GDPR Compliance

Firebase Analytics is GDPR compliant:
- Users can opt-out of analytics
- Data is anonymized
- No personally identifiable information (PII) should be tracked

### Opt-Out Implementation

```typescript
// Disable analytics collection
await analyticsService.setAnalyticsCollectionEnabled(false)

// Enable analytics collection
await analyticsService.setAnalyticsCollectionEnabled(true)
```

### Data Retention

- Default retention: 14 months
- Can be configured in Firebase Console
- Consider your compliance requirements

## Viewing Analytics

### Firebase Console

1. **Navigate to Analytics:**
   - Go to Firebase Console
   - Select your project
   - Click **Analytics** in the left menu

2. **View Reports:**
   - **Events**: See all tracked events
   - **User Properties**: See user property values
   - **Audiences**: Create user segments
   - **Funnels**: Track conversion funnels

### Real-time Analytics

- View events as they happen
- Useful for testing and debugging
- Available in Firebase Console > Analytics > Events

## Testing

### Test Events

1. **Enable Debug Mode:**
   ```bash
   # Android
   adb shell setprop debug.firebase.analytics.app com.ttmkonnect.eld
   ```

2. **View Debug Events:**
   - Events appear in Firebase Console within seconds
   - Look for "DebugView" in Analytics

3. **Test on Device:**
   - Install app on test device
   - Perform actions that trigger events
   - Verify events appear in Firebase Console

## Troubleshooting

### Issue: "Firebase not initialized"
**Solution**: 
- Ensure `google-services.json` is in `android/app/`
- Rebuild the app: `cd android && ./gradlew clean && ./gradlew assembleDebug`
- Check that Google Services plugin is applied

### Issue: Events not appearing
**Solution**:
- Wait a few minutes (events may be delayed)
- Check internet connection
- Verify analytics is enabled: `analytics().setAnalyticsCollectionEnabled(true)`
- Check Firebase Console for any errors

### Issue: "Module not found"
**Solution**:
- Run `npm install` or `yarn install`
- Rebuild native modules: `cd android && ./gradlew clean`
- For Expo: May need to rebuild dev client

### Issue: ProGuard errors
**Solution**:
- ProGuard rules are already added
- If issues persist, check `android/app/proguard-rules.pro`
- Ensure Firebase classes are kept

## Best Practices

### 1. Don't Track PII
- Never track personally identifiable information
- Use hashed or anonymized identifiers
- Follow privacy regulations (GDPR, CCPA)

### 2. Use Meaningful Event Names
- Use descriptive names
- Follow naming conventions
- Document custom events

### 3. Set User Properties Early
- Set user properties on login
- Update when they change
- Clear on logout

### 4. Don't Over-Track
- Track meaningful events only
- Avoid tracking every click
- Focus on key user actions

### 5. Test Before Production
- Test all events in debug mode
- Verify events appear in Firebase Console
- Check event parameters are correct

## Integration Examples

### Login Flow

```typescript
// On successful login
await analyticsService.logLogin('email')
await analyticsService.setDriverProperties(
  driver.id,
  driver.vehicleId,
  driver.organizationId
)
```

### ELD Connection Flow

```typescript
// On ELD connection
await analyticsService.logEldConnection(deviceId, 'bluetooth')
await analyticsService.setUserProperty('eld_connected', 'true')
```

### HOS Status Change

```typescript
// On duty status change
await analyticsService.logHosStatusChange(
  previousStatus,
  newStatus
)
```

### Error Tracking

```typescript
// On error
try {
  // ... operation
} catch (error) {
  await analyticsService.logError(
    error.message,
    error.constructor.name
  )
  throw error
}
```

## References

- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [React Native Firebase](https://rnfirebase.io/)
- [Analytics Events](https://firebase.google.com/docs/analytics/events)

## Summary

✅ **Setup Complete**: Firebase Analytics is integrated and ready to use
✅ **Service Created**: `AnalyticsService.ts` provides easy-to-use interface
✅ **Auto-Initialized**: Analytics initializes on app startup
✅ **Next Steps**:
1. Download `google-services.json` from Firebase Console
2. Place in `android/app/` directory
3. Rebuild the app
4. Start tracking events!


