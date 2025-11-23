# Play Integrity API Setup Guide

## Overview

Google Play Integrity API helps protect your app from tampering and verify that it's running on a genuine Android device. This guide explains how to set up and use Play Integrity API in the TTM Konnect ELD app.

## What is Play Integrity API?

Play Integrity API provides:
- **Device Integrity**: Verifies the device is genuine and not compromised
- **App Integrity**: Verifies the app matches the version distributed by Google Play
- **Account Integrity**: Verifies the user has a valid license from Google Play

## Setup Steps

### 1. Google Play Console Setup

1. **Navigate to Play Console:**
   - Go to [Google Play Console](https://play.google.com/console)
   - Select your app (TTM Konnect)

2. **Link Cloud Project:**
   - Navigate to **Release > App integrity**
   - Under **Play Integrity API**, click **Link a Cloud project**
   - Choose an existing Google Cloud project or create a new one
   - Click **Link**

3. **Configure API Responses (Optional):**
   - In the same page, under **Responses**, you can configure:
     - Optional device information (device attributes, recent activity)
     - Environment details (app access risk, Play Protect verdict)
   - Click **Save** after making changes

### 2. Google Cloud Console Setup (Alternative)

If you're not distributing through Google Play or want to set up separately:

1. **Create/Select Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one

2. **Enable Play Integrity API:**
   - Navigate to **APIs & Services > Library**
   - Search for "Play Integrity API"
   - Click **Enable**

### 3. App Integration

The Play Integrity API is already integrated in the app:

- **Native Module**: `PlayIntegrityModule.kt`
- **TypeScript Service**: `src/services/PlayIntegrityService.ts`
- **Package Registration**: Already registered in `MainApplication.kt`

### 4. Usage

#### Basic Usage

```typescript
import { playIntegrityService } from '@/services/PlayIntegrityService'

// Check if Play Integrity is available
const availability = await playIntegrityService.isAvailable()
if (!availability.available) {
  console.log('Play Integrity not available:', availability.message)
  return
}

// Request integrity token (nonce should come from your backend)
const nonce = await fetchNonceFromBackend() // Get from your server
const result = await playIntegrityService.requestToken(nonce)

// Send token to backend for verification
await verifyTokenOnBackend(result.token)
```

#### Verify Device Integrity

```typescript
// Convenience method that checks availability and requests token
const verification = await playIntegrityService.verifyDeviceIntegrity(nonce)

if (verification.available && verification.token) {
  // Send token to backend for verification
  await sendTokenToBackend(verification.token)
} else {
  console.error('Integrity check failed:', verification.error)
}
```

## Backend Verification

**Important**: Always verify integrity tokens on your backend server. Never trust client-side verification alone.

### Server-Side Verification

1. **Generate Nonce on Server:**
   ```typescript
   // On your backend
   const nonce = crypto.randomBytes(16).toString('hex')
   // Send to client
   ```

2. **Client Requests Token:**
   ```typescript
   // On client
   const token = await playIntegrityService.requestToken(nonce)
   // Send token to server
   ```

3. **Server Verifies Token:**
   ```typescript
   // On your backend
   // Use Google Play Integrity API to verify the token
   // Check device integrity, app integrity, and account integrity
   ```

### Verification Endpoints

You'll need to implement backend endpoints:
- `POST /api/integrity/nonce` - Generate and return a nonce
- `POST /api/integrity/verify` - Verify the integrity token

## Quota and Limits

### Default Quota
- **10,000 requests per day per app** (shared between token requests and decryptions)
- This is usually sufficient for most apps

### Requesting Quota Increase

If you need more than 10,000 requests per day:

1. **Link Cloud Project** in Play Console (if not already done)
2. **Ensure Proper Implementation** with retry strategy
3. **Request Quota Increase:**
   - Use [this form](https://support.google.com/googleplay/android-developer/contact/pi_quota_increase)
   - Explain your use case and expected traffic

## Best Practices

### 1. Use Server-Generated Nonces
- Always generate nonces on your backend server
- Never use client-generated nonces in production
- Nonces should be unique per request

### 2. Verify on Backend
- Never trust client-side verification
- Always verify tokens on your backend server
- Check all integrity verdicts (device, app, account)

### 3. Use for Critical Actions
- Login/authentication
- Sensitive operations (payment, data access)
- Not for every API call (respect quota limits)

### 4. Handle Errors Gracefully
- Play Integrity may not be available on all devices
- Handle errors gracefully without blocking users
- Log errors for monitoring

### 5. Retry Strategy
- Implement exponential backoff for transient errors
- Don't retry on permanent errors (e.g., app not installed from Play)

## Error Handling

The service handles common errors:

- **INTEGRITY_SERVICE_UNAVAILABLE**: Service temporarily unavailable, retry later
- **NETWORK_ERROR**: Network issue, check connection
- **APP_NOT_INSTALLED**: App not installed from Google Play
- **PLAY_SERVICES_NOT_FOUND**: Google Play Services not available
- **CLIENT_TRANSIENT_ERROR**: Transient error, retry

## Testing

### Test on Real Devices
- Play Integrity API works best on real devices
- Emulators may have limited functionality
- Test on devices with and without Google Play Services

### Test Scenarios
1. **Normal Device**: Should return valid token
2. **Rooted Device**: May return different integrity verdicts
3. **Sideloaded App**: May have limited functionality
4. **No Google Play Services**: Should handle gracefully

## Troubleshooting

### Issue: "Play Integrity module not found"
**Solution**: Ensure the native module is properly built and linked. Run:
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Issue: "Integrity service unavailable"
**Solution**: 
- Check internet connection
- Ensure Google Play Services is up to date
- Retry after a few minutes

### Issue: "App not installed from Google Play"
**Solution**: 
- This is expected for sideloaded apps
- Consider allowing sideloaded apps with a warning
- Or require Google Play installation

### Issue: Quota Exceeded
**Solution**:
- Monitor your quota usage in Play Console
- Request quota increase if needed
- Implement rate limiting on client side
- Cache integrity checks when appropriate

## References

- [Play Integrity API Documentation](https://developer.android.com/google/play/integrity)
- [Play Integrity API Setup](https://developer.android.com/google/play/integrity/setup)
- [Server-Side Verification](https://developer.android.com/google/play/integrity/verify-server)

## Summary

✅ **Setup Complete**: Play Integrity API is integrated and ready to use
✅ **Native Module**: `PlayIntegrityModule.kt` handles Android integration
✅ **TypeScript Service**: `PlayIntegrityService.ts` provides easy-to-use interface
✅ **Next Steps**: 
1. Link Cloud project in Play Console
2. Implement backend verification endpoints
3. Integrate into critical app flows (login, etc.)


