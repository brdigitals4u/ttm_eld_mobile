# Android Main Application Documentation

**File:** `android/app/src/main/java/com/ttmkonnect/eld/MainApplication.kt`

## Overview

Main Android Application class that initializes React Native, Expo modules, and custom native packages including the JM Bluetooth module for ELD device communication.

## Class Structure

```kotlin
class MainApplication : Application(), ReactApplication
```

Extends Android `Application` and implements `ReactApplication` interface.

## Key Components

### React Native Host

Uses `ReactNativeHostWrapper` (Expo) and `DefaultReactNativeHost`:

```kotlin
override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
  this,
  object : DefaultReactNativeHost(this) {
    // Configuration
  }
)
```

### React Host (New Architecture)

```kotlin
override val reactHost: ReactHost
  get() = ReactNativeHostWrapper.createReactHost(
    applicationContext, 
    reactNativeHost
  )
```

## Package Registration

### Auto-linked Packages

Packages from `PackageList` (Expo/React Native autolinking).

### Manual Packages

**JM Bluetooth Package**:
```kotlin
packages.add(JMBluetoothPackage())
```

Registers the custom native module for ELD Bluetooth communication.

## Configuration

### JavaScript Entry Point

```kotlin
override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
```

Uses Expo's virtual Metro entry point.

### Developer Support

```kotlin
override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
```

Enabled in debug builds only.

### New Architecture

```kotlin
override val isNewArchEnabled: Boolean = 
  BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
```

Controlled by build configuration.

### Hermes Engine

```kotlin
override val isHermesEnabled: Boolean = 
  BuildConfig.IS_HERMES_ENABLED
```

Uses Hermes JavaScript engine (enabled in app.json).

## Lifecycle Methods

### onCreate()

Initializes native modules:

1. **SoLoader**: Native library loader
   ```kotlin
   SoLoader.init(this, OpenSourceMergedSoMapping)
   ```

2. **New Architecture**: Loads if enabled
   ```kotlin
   if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
     load()
   }
   ```

3. **Expo Lifecycle**: Dispatches application create event
   ```kotlin
   ApplicationLifecycleDispatcher.onApplicationCreate(this)
   ```

### onConfigurationChanged()

Handles configuration changes (orientation, locale, etc.):

```kotlin
override fun onConfigurationChanged(newConfig: Configuration) {
  super.onConfigurationChanged(newConfig)
  ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
}
```

## Native Modules

### JMBluetoothModule

Custom native module for ELD device communication:
- Package: `com.ttmkonnect.eld.JMBluetoothPackage`
- AAR Library: `JMBluetoothLowEnergy_ktx-release.aar`
- Location: `android/app/libs/`

## Integration Points

### Expo Integration

- Uses `ReactNativeHostWrapper` for Expo compatibility
- Integrates with Expo application lifecycle
- Supports Expo modules

### React Native Integration

- Standard React Native host setup
- Supports both old and new architectures
- Configurable JavaScript engine (Hermes)

## Build Configuration

Controlled by `BuildConfig`:
- `DEBUG` - Developer support flag
- `IS_NEW_ARCHITECTURE_ENABLED` - New architecture flag
- `IS_HERMES_ENABLED` - Hermes engine flag

## Dependencies

### Required Libraries

- `com.facebook.react` - React Native core
- `expo.modules` - Expo modules
- `com.ttmkonnect.eld` - JM Bluetooth package (custom)

### Native Libraries

Loaded via SoLoader:
- React Native native modules
- Hermes engine
- Custom native libraries

## File Location

```
android/app/src/main/java/com/ttmkonnect/eld/
└── MainApplication.kt
```

## Package Name

Matches `app.json` configuration:
```
com.ttmkonnect.eld
```

## Notes

1. **JM Bluetooth Package**: Manually registered (not autolinked)
2. **Expo Integration**: Uses Expo wrappers for compatibility
3. **New Architecture**: Supports React Native new architecture
4. **Hermes**: JavaScript engine enabled
5. **Lifecycle**: Properly handles app lifecycle events

## Related Files

- `android/app/build.gradle` - Build configuration
- `android/app/src/main/java/com/ttmkonnect/eld/JMBluetoothModule.kt` - Native module
- `android/app/libs/JMBluetoothLowEnergy_ktx-release.aar` - AAR library

