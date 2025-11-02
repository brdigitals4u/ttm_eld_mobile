# App.json Configuration Documentation

**File:** `app.json`

## Overview

Expo application configuration file that defines app metadata, icons, permissions, plugins, and platform-specific settings for Android, iOS, and Web.

## Basic Information

- **Name:** `TTMKonnect`
- **Slug:** `TTMKonnectBind` (used for Expo project identification)
- **Scheme:** `ttmkonnectbind` (deep linking URL scheme)
- **Version:** `1.0.0`
- **Orientation:** `portrait` (portrait mode only)
- **User Interface Style:** `automatic` (follows system theme)

## Icons

- **Icon:** `./assets/images/app-icon-all.png` (primary app icon)
- **Android Icon:** `./assets/images/app-icon-android-legacy.png`
- **iOS Icon:** `./assets/images/app-icon-ios.png`
- **Web Favicon:** `./assets/images/app-icon-web-favicon.png`

### Android Adaptive Icon

- **Foreground:** `./assets/images/app-icon-android-adaptive-foreground.png`
- **Background:** `./assets/images/app-icon-android-adaptive-background.png`

## Updates

- **Fallback to Cache Timeout:** `0` (always check for updates)

## Architecture

- **New Architecture Enabled:** `true` (React Native new architecture)
- **JS Engine:** `hermes` (Hermes JavaScript engine for better performance)
- **Asset Bundle Patterns:** `**/*` (bundle all assets)

## Android Configuration

### Package

- **Package Name:** `com.ttmkonnect.eld`

### Security

- **Allow Backup:** `false` (prevents Android backup to avoid exposing sensitive data)

### UI

- **Edge to Edge Enabled:** `true` (modern edge-to-edge UI)

### Permissions

Required Android permissions:
- `android.permission.ACCESS_COARSE_LOCATION` - Approximate location for HOS tracking
- `android.permission.ACCESS_FINE_LOCATION` - Precise location for ELD compliance

**Usage:** Location is required for Hours of Service (HOS) compliance tracking and ELD event recording.

## iOS Configuration

- **Bundle Identifier:** `com.ttmkonnect.eld`
- **Supports Tablet:** `true`

## Web Configuration

- **Favicon:** `./assets/images/app-icon-web-favicon.png`
- **Bundler:** `metro` (uses Metro bundler)

## Plugins

### Expo Localization

Enables internationalization support.

### Expo Font

Handles custom font loading.

### Expo Secure Store

Provides secure storage for sensitive data (tokens, credentials).

### Expo Location

Location services with permission configuration:

```json
{
  "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location for HOS compliance tracking."
}
```

**Permission Message:** Shown to users when requesting location access.

### Expo Splash Screen

Splash screen configuration:

```json
{
  "image": "./assets/images/app-icon-ios.png",
  "imageWidth": 300,
  "resizeMode": "contain",
  "backgroundColor": "#4338CA"
}
```

- **Image:** iOS app icon as splash image
- **Width:** 300px
- **Resize Mode:** `contain` (maintain aspect ratio)
- **Background Color:** Indigo (#4338CA) - matches app theme

### React Native Edge to Edge

Modern edge-to-edge UI support:

```json
{
  "android": {
    "parentTheme": "Light",
    "enforceNavigationBarContrast": false
  }
}
```

- **Parent Theme:** Light theme
- **Enforce Navigation Bar Contrast:** Disabled for cleaner look

### Expo Router

File-based routing system.

## Experiments

Experimental features enabled:

- **TSConfig Paths:** `true` - TypeScript path aliases support
- **Typed Routes:** `true` - Type-safe routing with TypeScript

## Extra Configuration

### Ignite

Ignite boilerplate version:
- **Version:** `11.1.2`

### Router

Expo Router configuration (empty object for defaults).

### EAS

Expo Application Services project ID:
- **Project ID:** `4e91789b-89ce-4512-acb7-c7f9c86560bf`

Used for:
- EAS Build
- EAS Submit
- EAS Update

## Platform-Specific Notes

### Android

- Uses adaptive icons for modern Android versions
- Legacy icon for older Android versions
- Edge-to-edge UI for immersive experience
- Location permissions required for ELD compliance

### iOS

- Tablet support enabled
- Custom bundle identifier
- Automatic icon generation

### Web

- Metro bundler for web builds
- Custom favicon

## Deep Linking

URL scheme: `ttmkonnectbind://`

Example deep links:
- `ttmkonnectbind://login`
- `ttmkonnectbind://dashboard`
- `ttmkonnectbind://status`

## Important Notes

1. **Location Permissions**: Required for HOS compliance and ELD functionality
2. **Backup Disabled**: Sensitive ELD data is not backed up to Android backup
3. **Edge-to-Edge**: Modern UI that extends to screen edges
4. **New Architecture**: Uses React Native new architecture for better performance
5. **Hermes Engine**: JavaScript engine optimized for mobile performance
6. **Indigo Theme**: Splash screen uses indigo background (#4338CA)

## Environment-Specific Configurations

Configuration can be extended via:
- `app.config.ts` (TypeScript config with environment-specific values)
- `app.json.backup` (backup configuration)

## Related Files

- `app.config.ts.backup` - Backup configuration file
- `assets/images/` - Icon assets directory
- `plugins/withSplashScreen.ts` - Custom splash screen plugin

