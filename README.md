# TruckLogELD - Electronic Logging Device Platform

A React Native application for connecting to and managing ELD (Electronic Logging Device) hardware, with comprehensive platform detection and FMCSA compliance features.

## 🚛 Overview

TruckLogELD is designed to interface with Jimi IoT ELD hardware devices, providing real-time data streaming, platform detection, and FMCSA (Federal Motor Carrier Safety Administration) compliance monitoring. The application supports multiple device types with automatic platform identification.

## 🏗️ Architecture

### Platform Detection System

The application implements a multi-layer platform detection system based on the original Jimi APK structure:

```
Hardware (Platform ID 108) → Native Module → React Native → UI Components
```

### Jimi APK Structure Reference

The platform detection follows patterns from the original Jimi APK:

- **PlatFormType.java**: Defines platform ID constants (Platform ID 108 = PLATFORM_IH009)
- **DeviceTypeUtils.java**: Contains device type detection logic and pattern matching
- **Camera.java**: Handles PlatformId extraction and device identification
- **MyCamera.java**: Device representation and type storage

#### Detection Methods:
1. **PlatformId Detection**: `platformId = 108` → ELD Device
2. **Device Name Pattern**: "KD032-43148B" → ELD Device
3. **Device Type String**: `deviceType = "181"` → ELD Device
4. **Dynamic Feature Enabling**: Based on detected platform

#### Platform Types (from PlatFormType.java)

| Platform ID | Platform Name | Description |
|-------------|---------------|-------------|
| 0-7 | IH008C/IH008E/IH010/IH018 | Camera devices (basic + night vision) |
| 100-107 | IH008C/IH008E/IH010/IH018 + IRCUT | Camera devices with IRCUT filter |
| **108** | **PLATFORM_IH009** | **ELD Device (Jimi ELD)** ⭐ |

### Key Components

#### 1. Native Module (JimiBridgeModule.kt)
- **Platform Detection**: Identifies device types using platform IDs (following Jimi APK PlatFormType.java)
- **Device Type Detection**: Uses patterns from Jimi APK DeviceTypeUtils.java
- **Quick Connection**: Establishes temporary connections during scanning for platform detection
- **SharedPreferences Storage**: Persists platform information for faster subsequent scans
- **Real-time Updates**: Sends protocol updates to React Native

#### 2. React Native Components
- **UniversalPairingScreen**: Main pairing interface with device discovery
- **DeviceCard**: Displays device information with appropriate icons
- **DataEmitScreen**: Shows ELD-specific dashboards for connected devices
- **ELDDisplay**: Comprehensive ELD data visualization

#### 3. Data Flow
```
Device Scan → Platform Detection → Protocol Classification → UI Update → Data Streaming
```

## 🔧 Technical Implementation

### Platform Detection Logic

```kotlin
// Platform ID detection in parseELDJsonObject() - following Jimi APK patterns
when (platformId) {
    PLATFORM_IH009 -> {
        // ELD Device (Platform ID 108) - KD032 devices
        eldMap.putString("deviceType", DEVICE_TYPE_ELD)
        eldMap.putString("deviceCategory", "eld")
        eldMap.putString("protocol", "ELD_DEVICE")
        eldMap.putBoolean("isELDDevice", true)
        eldMap.putBoolean("enableELDFeatures", true)
    }
    in 0..7 -> {
        // Camera devices (IH008C, IH008E, IH010, IH018)
        eldMap.putString("deviceCategory", "camera")
        eldMap.putString("protocol", "CAMERA_DEVICE")
        eldMap.putBoolean("isCameraDevice", true)
    }
    in 100..107 -> {
        // Camera devices with IRCUT filter
        eldMap.putString("deviceCategory", "camera")
        eldMap.putString("protocol", "CAMERA_DEVICE")
        eldMap.putBoolean("isCameraDevice", true)
        eldMap.putBoolean("hasIRCUT", true)
    }
    // ... other platform types
}
```

### SharedPreferences Storage

Platform information is stored persistently:

```kotlin
// Storage keys
"${deviceId}_protocol"     // Device protocol
"${deviceId}_platformId"   // Platform ID (108 for ELD)
"${deviceId}_platformName" // Platform name ("PLATFORM_IH009")
"${deviceId}_lastUpdated"  // Timestamp for expiry
```

### Device Type Mapping

| Device Type | Platform ID | Category | Protocol | Icon |
|-------------|-------------|----------|----------|------|
| ELD Device | 108 | eld | ELD_DEVICE | 🚛 |
| Camera | 0-7, 100-107 | camera | CAMERA_DEVICE | 📷 |
| Tracking | 165 | tracking | TRACKING_DEVICE | 📍 |
| IoT Sensor | - | sensor | IOT_SENSOR | 🔬 |

## 📱 Features

### ELD Device Support
- **Platform ID 108 Detection**: Automatically identifies ELD devices
- **FMCSA Compliance**: Displays all mandatory ELD data elements
- **Real-time Data Streaming**: CAN bus, GPS, and event data
- **Comprehensive Dashboards**: Engine metrics, location tracking, event timeline

### Device Management
- **Universal Pairing**: Supports multiple device types
- **Quick Platform Detection**: Identifies device type during scanning
- **Persistent Storage**: Remembers device configurations
- **Real-time Updates**: Protocol and status updates

### Analytics & Logging
- **Multi-platform Logging**: Firebase, Sentry, Supabase
- **Event Tracking**: Device connections, data streaming, errors
- **Performance Monitoring**: Connection quality, data rates

## 🚀 Getting Started

### Prerequisites
- React Native 0.70+
- Android SDK
- Jimi IoT SDK
- Bluetooth permissions

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TruckLogELD_old
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Android setup**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

4. **Run the application**
   ```bash
   npx react-native run-android
   ```

### Configuration

#### Bluetooth Permissions
Ensure the following permissions are granted:
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `ACCESS_FINE_LOCATION`

#### Platform Detection
The application automatically detects ELD devices with Platform ID 108. No additional configuration required.

## 📊 Data Structures

### UniversalDevice Interface
```typescript
interface UniversalDevice {
  id: string;
  name: string;
  address: string;
  platformId?: number;        // 108 for ELD devices
  platformName?: string;       // "PLATFORM_IH009"
  deviceType?: string;         // "181" for ELD
  deviceCategory?: string;     // "eld"
  protocol?: string;           // "ELD_DEVICE"
  // ... additional fields
}
```

### ELD Data Structure
```typescript
interface ELDData {
  // FMCSA Compliance Data
  periodStartTime?: string;
  carrierName?: string;
  vin?: string;
  engineHours?: number;
  
  // CAN Data (Engine Metrics)
  engine_throttle?: number;
  engine_speed?: number;
  vehicle_distance?: number;
  
  // GPS Data
  latitude?: number;
  longitude?: number;
  heading?: number;
  
  // Event Data
  event_type?: string;
  event_code?: string;
  // ... additional fields
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Device not detected as ELD**
   - Check if device sends `platformId = 108`
   - Verify device name contains "KD032" or "ELD"
   - Check Bluetooth permissions

2. **Platform detection fails**
   - Clear SharedPreferences: `adb shell pm clear com.ttm.TTMKonnect`
   - Restart the application
   - Check device logs for platform detection errors

3. **Data streaming issues**
   - Verify device connection status
   - Check ELD service characteristics
   - Monitor data reception logs

### Debug Logs

Enable debug logging by checking the following log tags:
- `JimiBridgeModule`: Platform detection and device management
- `ELDServiceEventBroadcaster`: Event broadcasting
- `UniversalPairingScreen`: React Native pairing logic

## 📈 Analytics

### Logged Events
- `device_discovered`: Device found during scanning
- `platform_detected`: Platform ID identification
- `eld_data_received`: ELD data streaming
- `connection_established`: Device connection
- `protocol_updated`: Protocol changes

### Performance Metrics
- Connection latency
- Data streaming rates
- Platform detection accuracy
- Error rates and types

## 🤝 Contributing

### Development Guidelines
1. Follow the existing code structure
2. Add comprehensive logging for new features
3. Update platform detection logic for new device types
4. Test with real ELD hardware

### Testing
- Test with KD032-43148B ELD device
- Verify platform ID 108 detection
- Test SharedPreferences persistence
- Validate FMCSA compliance data

## 📄 License

This project is proprietary software. All rights reserved.

## 🔗 Related Documentation

- [FMCSA ELD Technical Specifications](https://www.fmcsa.dot.gov/regulations/electronic-logging-devices)
- [Jimi IoT SDK Documentation](https://jimi-iot.com/docs)
- [React Native Bluetooth Documentation](https://reactnative.dev/docs/bluetooth)

---

**Version**: 1.0.0  
**Last Updated**: 2024-08-04  
**Platform Support**: Android  
**ELD Compliance**: FMCSA Certified
