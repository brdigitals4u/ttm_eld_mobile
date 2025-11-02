# iOS Native Files Documentation Summary

This document covers iOS native code files in the application.

## iOS Structure

```
ios/
├── TTMKonnect/
│   ├── AppDelegate.swift
│   ├── Info.plist
│   ├── PrivacyInfo.xcprivacy
│   ├── Images.xcassets/
│   ├── Supporting/
│   ├── TTMKonnect-Bridging-Header.h
│   └── TTMKonnect.entitlements
├── Podfile
├── Podfile.lock
└── TTMKonnect.xcodeproj/
```

## AppDelegate.swift

**Purpose**: iOS application entry point and lifecycle management

**Key Features**:
- App initialization
- React Native bridge setup
- Expo module integration
- Lifecycle event handling

**Main Responsibilities**:
1. **React Native Setup**: Configures React Native bridge
2. **Expo Integration**: Integrates Expo modules
3. **URL Handling**: Deep link handling
4. **Notification Handling**: Push notification setup

## Info.plist

**Purpose**: iOS app configuration and metadata

**Key Settings**:
- Bundle identifier: `com.ttmkonnect.eld`
- App version
- Required device capabilities
- URL schemes
- Privacy descriptions
- Background modes

**Privacy Descriptions**:
- Location usage description
- Bluetooth usage description
- Camera usage (if needed)
- Photo library (if needed)

**Background Modes** (if applicable):
- Location updates
- Background fetch
- Bluetooth communication

## PrivacyInfo.xcprivacy

**Purpose**: Privacy manifest for App Store compliance

**Required for**: iOS 17+ apps

**Information**:
- Data collection types
- Usage purposes
- Third-party SDKs
- Tracking practices

## Images.xcassets

**Purpose**: App icons and image assets

**Contents**:
- App icon sets
- Launch images
- Asset catalogs

## Supporting Files

### TTMKonnect-Bridging-Header.h

**Purpose**: Swift-Objective-C bridging header

**Usage**: Imports Objective-C headers for Swift

### TTMKonnect.entitlements

**Purpose**: App capabilities and entitlements

**Capabilities**:
- Background modes
- Keychain access
- Push notifications
- Associated domains

## Podfile

**Purpose**: CocoaPods dependency management

**Key Dependencies**:
- React Native
- Expo modules
- Native modules
- Third-party libraries

**Structure**:
```ruby
platform :ios, '13.0'
use_expo_modules!
use_react_native!

target 'TTMKonnect' do
  # Dependencies
end
```

**Common Pods**:
- `React-Core`
- `React-RCTAppDelegate`
- `ExpoModulesCore`
- Other Expo modules

## Podfile.lock

**Purpose**: Locked dependency versions

**Usage**: Ensures consistent builds across environments

## Xcode Project

### TTMKonnect.xcodeproj

**Purpose**: Xcode project file

**Configuration**:
- Build settings
- Target configurations
- Scheme definitions
- Code signing

### Project Structure

- **Targets**: App target configuration
- **Build Phases**: Compile, link, resources
- **Build Settings**: Compiler, linker options
- **Capabilities**: App capabilities

## iOS-Specific Features

### Deep Linking

**URL Scheme**: `ttmkonnectbind://`

**Implementation**: Handled in AppDelegate

### Background Execution

**Modes** (if enabled):
- Location tracking
- Bluetooth communication
- Background fetch

### Push Notifications

**Setup**: Configured in Info.plist and entitlements

**Integration**: Via Expo notifications module

## Build Configuration

### Minimum iOS Version

**Requirement**: iOS 13.0+

### Architectures

- arm64 (devices)
- x86_64 (simulator, Intel Macs)
- arm64 (Apple Silicon)

### Code Signing

- Development: Automatic signing
- Production: Distribution certificate
- Provisioning profiles

## Native Modules

### Current Modules

- Expo modules (autolinked)
- React Native modules

### Custom Modules

- None currently (Android has JMBluetooth)

**Note**: Bluetooth functionality primarily on Android

## Privacy Requirements

### Required Descriptions

**Location**:
- "Allow $(PRODUCT_NAME) to use your location for HOS compliance tracking."

**Bluetooth**:
- Bluetooth usage description (if implemented)

### Data Collection

Documented in PrivacyInfo.xcprivacy

## App Store Requirements

### Required Info

- Privacy policy URL
- Support URL
- App description
- Screenshots
- App icons

### Compliance

- Privacy manifest
- Data collection disclosure
- Age rating
- Content guidelines

## Development

### Setup

```bash
cd ios
pod install
```

### Build

```bash
npm run ios
# or
expo run:ios
```

### Debugging

- Xcode for native debugging
- React Native debugger for JS
- Console logs
- Network debugging

## Testing

### Simulator

- iPhone simulators
- iPad simulators
- Different iOS versions

### Device Testing

- Physical devices required for:
  - Bluetooth
  - Location services
  - Push notifications

## Notes

1. **Bluetooth**: Primary implementation on Android
2. **Expo Integration**: Uses Expo modules system
3. **Autolinking**: Most modules autolink
4. **Hermes**: JavaScript engine enabled
5. **New Architecture**: Supported if enabled

## Future iOS Development

- Custom native modules (if needed)
- iOS-specific features
- Swift native code
- Objective-C compatibility

