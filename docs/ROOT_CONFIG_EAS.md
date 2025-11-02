# EAS Build Configuration Documentation

**File:** `eas.json`

## Overview

Expo Application Services (EAS) build configuration file. Defines build profiles for different environments (development, preview, production) across iOS and Android platforms.

## CLI Version Requirement

- **Minimum EAS CLI Version:** `>= 3.15.1`

## Build Profiles

### Development

Development build for testing and debugging.

```json
{
  "extends": "production",
  "distribution": "internal",
  "android": {
    "gradleCommand": ":app:assembleDebug"
  },
  "ios": {
    "buildConfiguration": "Debug",
    "simulator": true
  }
}
```

**Features:**
- Extends production profile
- Internal distribution (not published to stores)
- Android: Debug build
- iOS: Debug configuration, simulator build

**Usage:**
```bash
npm run build:android:sim
npm run build:ios:sim
```

### Development: Device

Development build for physical devices.

```json
{
  "extends": "development",
  "distribution": "internal",
  "ios": {
    "buildConfiguration": "Debug",
    "simulator": false
  }
}
```

**Features:**
- Extends development profile
- Internal distribution
- iOS: Debug configuration, device build (not simulator)

**Usage:**
```bash
npm run build:android:dev
npm run build:ios:dev
```

### Preview

Preview build for testing before production.

```json
{
  "extends": "production",
  "distribution": "internal",
  "ios": { "simulator": true },
  "android": { "buildType": "apk" }
}
```

**Features:**
- Extends production profile
- Internal distribution
- iOS: Simulator build
- Android: APK build (easy to install)

**Usage:**
```bash
npm run build:android:preview
npm run build:ios:preview
```

### Preview: Device

Preview build for physical devices.

```json
{
  "extends": "preview",
  "ios": { "simulator": false }
}
```

**Features:**
- Extends preview profile
- iOS: Device build (not simulator)

**Usage:**
```bash
npm run build:android:preview  # Uses preview profile
npm run build:ios:preview:device
```

### Production

Production build configuration (base).

```json
{}
```

**Features:**
- Empty configuration (uses defaults)
- Release builds
- App Store / Play Store distribution
- Code signing from EAS credentials

**Note:** This is the base profile that other profiles extend.

**Usage:**
```bash
npm run build:android:prod
npm run build:ios:prod
```

### Production: APK

Production Android APK build.

```json
{
  "extends": "production",
  "android": { "buildType": "apk" }
}
```

**Features:**
- Extends production profile
- Android: APK format (not AAB)
- Useful for direct distribution

**Usage:**
```bash
npm run build:android:prod:apk
```

## Submit Configuration

### Production Submit

Production submission profile for app stores.

```json
{
  "production": {}
}
```

**Usage:**
```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## Build Profile Hierarchy

```
production (base)
├── development
│   └── development:device
├── preview
│   └── preview:device
└── production-apk
```

## Platform-Specific Settings

### Android

- **`gradleCommand`**: Gradle command to run (e.g., `:app:assembleDebug`)
- **`buildType`**: `apk` or `aab` (Android App Bundle)

### iOS

- **`buildConfiguration`**: `Debug` or `Release`
- **`simulator`**: `true` for simulator, `false` for device

## Distribution Types

- **`internal`**: Internal distribution (TestFlight internal testing, Firebase App Distribution, etc.)
- **`store`**: App Store / Play Store distribution (default for production)

## Local vs Cloud Builds

All build scripts use `--local` flag:
- Builds run on local machine
- Requires native development environment setup
- Faster for development
- No EAS Build credits consumed

For cloud builds, remove `--local` flag:
```bash
eas build --profile production --platform android
```

## Build Scripts Reference

From `package.json`:

### iOS Builds
- `build:ios:sim` - iOS simulator (development, local)
- `build:ios:dev` - iOS device (development, local)
- `build:ios:preview` - iOS simulator (preview, local)
- `build:ios:prod` - iOS production (local)

### Android Builds
- `build:android:sim` - Android simulator (development, local)
- `build:android:dev` - Android device (development, local)
- `build:android:preview` - Android preview APK (local)
- `build:android:prod` - Android production (local)
- `build:android:prod:apk` - Android production APK (local)

## EAS Project

The project is linked to EAS:
- **Project ID:** `4e91789b-89ce-4512-acb7-c7f9c86560bf` (from `app.json`)

This ID is used to:
- Link builds to your Expo account
- Store build credentials
- Track build history

## Environment Variables

Build profiles can reference environment variables in `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "API_URL": "https://api.production.com"
      }
    }
  }
}
```

## Code Signing

- **iOS**: Managed by EAS credentials (automatic)
- **Android**: Uses keystore from `android/key.properties` (if exists)

## Best Practices

1. **Development**: Use simulator builds for faster iteration
2. **Testing**: Use preview builds for QA testing
3. **Production**: Use production profile for app store releases
4. **Local Builds**: Use `--local` for development to save EAS credits
5. **Cloud Builds**: Use cloud builds for consistent build environment

## Troubleshooting

### Build Fails
1. Check EAS CLI version: `eas --version`
2. Verify credentials: `eas credentials`
3. Check build logs in EAS dashboard

### Simulator Build Issues
- Ensure Xcode is installed (iOS)
- Ensure Android SDK is configured (Android)

### Code Signing Issues
- Run `eas credentials` to manage certificates
- For local builds, ensure proper provisioning profiles (iOS)

## Related Files

- `app.json` - EAS project ID configuration
- `android/key.properties` - Android signing keys (if exists)
- `package.json` - Build scripts

## EAS CLI Commands

```bash
# View build status
eas build:list

# View build logs
eas build:view [BUILD_ID]

# Manage credentials
eas credentials

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

