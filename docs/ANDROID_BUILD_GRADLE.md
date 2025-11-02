# Android Build Gradle Documentation

**File:** `android/app/build.gradle`

## Overview

Android app-level build configuration file. Defines app dependencies, build settings, signing configuration, and native module integration including the JM Bluetooth SDK.

## Key Configuration

### JM Bluetooth SDK Dependency

**Line 170**:
```gradle
implementation(files('libs/JMBluetoothLowEnergy_ktx-release.aar'))
```

**Purpose**: Includes the JM Bluetooth Low Energy SDK AAR library

**Location**: `android/app/libs/JMBluetoothLowEnergy_ktx-release.aar`

**Note**: This is a local AAR file, not from Maven repository

### React Native Dependencies

**Line 167**:
```gradle
implementation("com.facebook.react:react-android")
```

Version managed by React Native Gradle Plugin

### Hermes Engine

**Lines 190-194**:
```gradle
if (hermesEnabled.toBoolean()) {
    implementation("com.facebook.react:hermes-android")
} else {
    implementation jscFlavor
}
```

Conditionally includes Hermes or JSC JavaScript engine

### Image Format Support

**Conditional Dependencies**:

#### GIF Support
```gradle
if (isGifEnabled) {
    implementation("com.facebook.fresco:animated-gif:${expoLibs.versions.fresco.get()}")
}
```

#### WebP Support
```gradle
if (isWebpEnabled) {
    implementation("com.facebook.fresco:webpsupport:${expoLibs.versions.fresco.get()}")
    if (isWebpAnimatedEnabled) {
        implementation("com.facebook.fresco:animated-webp:${expoLibs.versions.fresco.get()}")
    }
}
```

## Packaging Options

**Lines 158-162**: Merges duplicate resources from multiple libraries

## Build Configuration

Defines:
- Application ID
- Version code and name
- SDK versions
- Build types (debug/release)
- Signing configuration
- ProGuard rules

## Dependencies Summary

### Required
- React Native core
- JM Bluetooth SDK (AAR)
- Hermes or JSC engine

### Optional
- GIF support (if enabled)
- WebP support (if enabled)
- Animated WebP (if enabled)

## Integration Points

### MainApplication.kt
Registers JMBluetoothPackage in this build file's dependencies

### Native Modules
The AAR file provides native Bluetooth functionality

## Notes

1. AAR library is local file (not from repository)
2. Image format support is conditional
3. Hermes is default JavaScript engine
4. Version managed by Expo/React Native plugins

