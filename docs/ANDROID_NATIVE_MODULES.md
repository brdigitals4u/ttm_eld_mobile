# Android Native Modules Documentation

This document covers Android Kotlin native module files.

## Native Module Files

### MainApplication.kt

[See ANDROID_MAIN_APPLICATION.md](./ANDROID_MAIN_APPLICATION.md)

Main application class that registers native modules.

### MainActivity.kt

**Purpose**: Main Android Activity entry point

**Responsibilities**:
- Activity lifecycle
- Deep linking handling
- Intent handling

### JMBluetoothModule.kt

**Purpose**: React Native bridge for JM Bluetooth SDK

**Functionality**:
- Exposes JM Bluetooth SDK to JavaScript
- Handles Bluetooth operations
- Manages device connections
- Processes OBD/ELD data
- Emits events to React Native

**Methods Exposed** (to JavaScript):
- `initializeSDK()` - Initialize Bluetooth SDK
- `requestPermissions()` - Request Bluetooth permissions
- `startScan()` - Start device scanning
- `stopScan()` - Stop scanning
- `connect(address)` - Connect to device
- `disconnect()` - Disconnect device
- `validatePassword(password)` - Validate device password
- `startReportEldData()` - Start ELD data reporting
- `startReportObdData()` - Start OBD data reporting
- `queryHistoryData()` - Query historical data
- And more...

**Events Emitted** (to JavaScript):
- `onDeviceFound` - Device discovered
- `onConnected` - Device connected
- `onDisconnected` - Device disconnected
- `onObdEldDataReceived` - OBD/ELD data received
- `onAuthenticationPassed` - Authentication successful
- And more...

### JMBluetoothPackage.kt

**Purpose**: React Native package registration

**Functionality**:
- Registers JMBluetoothModule with React Native
- Makes module available to JavaScript

**Registration**:
```kotlin
class JMBluetoothPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(JMBluetoothModule(reactContext))
    }
}
```

## Native Module Architecture

### React Native Bridge

```
JavaScript (React Native)
    ↕
React Native Bridge
    ↕
Kotlin Native Module (JMBluetoothModule)
    ↕
JM Bluetooth SDK (AAR)
    ↕
Android Bluetooth APIs
```

### Data Flow

1. **JavaScript** calls method via bridge
2. **Native Module** receives call
3. **SDK** performs operation
4. **Events** emitted back to JavaScript
5. **React Native** receives events
6. **Components** update UI

## Module Registration

### In MainApplication.kt

```kotlin
packages.add(JMBluetoothPackage())
```

Registers the package with React Native.

### In build.gradle

```gradle
implementation(files('libs/JMBluetoothLowEnergy_ktx-release.aar'))
```

Includes the SDK AAR library.

## Bluetooth Operations

### SDK Integration

The JM Bluetooth SDK provides:
- Bluetooth Low Energy scanning
- Device connection management
- OBD/ELD data communication
- Authentication handling
- Data reporting

### Permission Handling

Native module handles:
- Bluetooth permissions
- Location permissions (required for BLE)
- Runtime permission requests

### Event System

Uses React Native event emitter:
- Native → JavaScript events
- Real-time data updates
- Connection status changes

## Error Handling

Native module handles:
- Bluetooth errors
- Connection failures
- Permission denials
- SDK errors

Errors are:
- Logged to Android logcat
- Emitted as events to JavaScript
- Handled gracefully

## Threading

Native modules run on:
- Native thread for Bluetooth operations
- UI thread for React Native bridge
- Background threads for data processing

## ProGuard Rules

If ProGuard enabled, ensure:
- JM Bluetooth SDK classes preserved
- Native module classes preserved
- React Native classes preserved

## Build Requirements

### Minimum SDK

Defined in `build.gradle`:
- minSdkVersion: Typically 21+ (Android 5.0+)

### Target SDK

- targetSdkVersion: Latest Android version

### Permissions

Required in `AndroidManifest.xml`:
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_SCAN` (Android 12+)
- `BLUETOOTH_CONNECT` (Android 12+)
- `ACCESS_FINE_LOCATION` (for BLE scanning)

## Testing

### Unit Tests

Test native module methods:
- Mock React Native context
- Test method calls
- Verify event emissions

### Integration Tests

Test full flow:
- Real device scanning
- Connection handling
- Data transmission

## Debugging

### Logcat

View logs:
```bash
adb logcat | grep JMBluetooth
```

### React Native Debugger

Debug JavaScript side:
- Set breakpoints
- Inspect method calls
- Monitor events

## Future Enhancements

- Additional OBD PIDs
- Enhanced error handling
- Connection retry logic
- Data caching
- Offline support

## Notes

1. Native module is bridge to SDK
2. SDK handles actual Bluetooth operations
3. Events provide real-time updates
4. Thread-safe operations required
5. Permissions must be requested

