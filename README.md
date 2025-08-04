# TruckLogELD - Comprehensive Electronic Logging Device Solution

A sophisticated React Native application for Electronic Logging Device (ELD) management with support for both ELD and NON-ELD devices, featuring universal pairing, real-time data streaming, and comprehensive device monitoring.

## 🏗️ Architecture Overview

### Hardware to Data Flow

```
Hardware Device → Bluetooth BLE → Android Native Layer → React Native Bridge → JavaScript Layer → UI
     ↓               ↓                    ↓                      ↓                    ↓         ↓
ELD/IoT Device → EnhancedBLEManager → TTMBLEManagerModule → TTMBLEManager.ts → Services → Screens
```

## 📊 Data Flow Diagrams

### ELD Device Flow
```
ELD Device (KD032/TTM) 
    ↓ BLE Advertisement
EnhancedBLEManager (Scanning)
    ↓ Device Discovery
TTMBLEManagerModule (Native Bridge)
    ↓ Event Emission
TTMBLEManager.ts (JavaScript Bridge)
    ↓ Data Processing
ELDService/ELDDeviceService
    ↓ Storage & Analytics
Firebase/Sentry/Supabase
    ↓ Display
React Native UI Components
```

### NON-ELD Device Flow
```
IoT/Sensor Device
    ↓ BLE/WiFi Communication
JimiBridgeModule (Universal Bridge)
    ↓ Protocol Detection
Device Type Classification
    ↓ Data Parsing
Specific Data Processors
    ↓ Unified Format
ELDServiceEventBroadcaster
    ↓ Real-time Updates
UI Components
```

## 🔧 Technical Specifications

### Supported Device Types

#### ELD Devices
- **TTM Premium**: High-frequency data (2-3s intervals), enhanced GPS accuracy
- **TTM Standard**: Standard frequency (5s intervals), basic diagnostics
- **KD032 Series**: Jimi IoT ELD devices with full compliance features
- **Generic ELD**: Third-party ELD devices (Geotab, Omnitracs, etc.)

#### Non-ELD Devices
- **Camera Devices**: Video streaming and image capture devices
- **Tracking Devices**: GPS and location-based sensors
- **IoT Sensors**: Temperature, pressure, environmental sensors
- **Heart Rate Sensors**: Health monitoring devices
- **Battery Sensors**: Power management devices
- **Doorbell Devices**: Smart doorbell cameras
- **Panoramic Devices**: 360-degree camera systems

### Communication Protocols
- **Bluetooth Low Energy (BLE)**: Primary communication method
- **GATT Protocol**: For service and characteristic discovery
- **J1939 Protocol**: Vehicle CAN bus data interpretation
- **IOTC Protocol**: Jimi IoT specific communication
- **Custom Protocols**: Device-specific data formats

## 📱 Android Kotlin Components

### Core BLE Management

#### `EnhancedBLEManager.kt`
**Purpose**: Advanced Bluetooth Low Energy management with enhanced error handling and background processing

**Key Features**:
- Enhanced scanning with configurable filters
- Auto-reconnection with retry logic
- Background data processing
- Connection state monitoring
- Signal strength analysis
- Comprehensive error categorization

**Core Methods**:
```kotlin
// Scanning
fun startEnhancedScan(options: ReadableMap, promise: Promise)
fun stopEnhancedScan()

// Connection
fun connectToDeviceEnhanced(options: ReadableMap, promise: Promise)
fun disconnectDevice(deviceId: String)

// Data Processing
fun addDataProcessor(deviceId: String, processor: DataProcessor)
fun addConnectionCallback(deviceId: String, callback: ConnectionCallback)
```

**Connection States**:
- `STATE_DISCONNECTED`: Device not connected
- `STATE_CONNECTING`: Connection in progress
- `STATE_CONNECTED`: Successfully connected
- `STATE_DISCONNECTING`: Disconnection in progress

**Error Categories**:
- `NORMAL`: User-initiated disconnection
- `CONNECTION_ISSUE`: Network or range problems
- `SECURITY_ISSUE`: Authentication/encryption problems
- `PERMISSION_ISSUE`: Access permission problems
- `PERFORMANCE_ISSUE`: Resource congestion
- `UNKNOWN`: Unclassified errors

#### `TTMBLEManagerModule.kt`
**Purpose**: React Native bridge for TTM SDK integration

**Key Features**:
- TTM SDK wrapper with fallback to direct BLE
- Real-time data processing for ELD compliance
- Scan result filtering and device name extraction
- Connection management with timeout handling
- Event broadcasting to JavaScript layer

**SDK Integration**:
```kotlin
// Initialize TTM SDK
BluetoothLESDK.init(reactContext.applicationContext, config, true)
BluetoothLESDK.setDebug(true)

// Scanning
BluetoothLESDK.startScan(duration)
BluetoothLESDK.stopScan()

// Connection
BluetoothLESDK.connect(deviceId, passcode, needPair)
BluetoothLESDK.disconnect()
```

**Data Types Handled**:
- `BtParseData`: Basic ELD data transmission
- `EtParseData`: Extended ELD data
- `IotParseData`: IoT sensor data
- `NfParseData`: Near-field communication data
- `SimpleParserData`: Generic data format

#### `JimiBridgeModule.kt`
**Purpose**: Universal device bridge for non-ELD devices and comprehensive IoT integration

**Key Features**:
- Multi-protocol device support
- Dynamic device type detection
- Real-time sensor data processing
- GATT service discovery and management
- Comprehensive data type parsing

**Device Protocol Detection**:
```kotlin
enum class DeviceProtocol {
    ELD_DEVICE,
    IOT_SENSOR,
    TEMPERATURE_SENSOR,
    HEART_RATE_SENSOR,
    BATTERY_SENSOR,
    LOCATION_SENSOR,
    CAMERA_DEVICE,
    TRACKING_DEVICE,
    DOORBELL_DEVICE,
    PANORAMIC_DEVICE,
    CUSTOM_SENSOR,
    UNKNOWN
}
```

**Universal Scanning**:
```kotlin
fun startUniversalScan(options: ReadableMap, promise: Promise)
fun connectToDevice(options: ReadableMap, promise: Promise)
fun startDataStreaming(deviceId: String, dataTypes: ReadableArray?, promise: Promise)
```

**Data Processing Methods**:
- `parseELDJsonData()`: ELD compliance data parsing
- `parseVINData()`: Vehicle identification parsing
- `parseCANData()`: Engine metrics processing
- `parseGPSData()`: Location data handling
- `parseEventData()`: Event log processing

### Background Services

#### `ELDMonitoringService.kt`
**Purpose**: Background monitoring service for continuous ELD operation

**Features**:
- Foreground service with persistent notification
- Device health monitoring
- Auto-reconnection management
- Data aggregation and processing
- Status reporting

**Service Actions**:
```kotlin
const val ACTION_START_MONITORING = "START_MONITORING"
const val ACTION_STOP_MONITORING = "STOP_MONITORING"
const val ACTION_RECONNECT_DEVICE = "RECONNECT_DEVICE"
```

**Monitoring Tasks**:
- Device health checks (every 30 seconds)
- Data processing and aggregation (every 60 seconds)
- Disconnection detection and reconnection (every 45 seconds)
- Status updates (every 120 seconds)

#### `ELDServiceEventBroadcaster.kt`
**Purpose**: Event management system for service-to-app communication

**Features**:
- Event queuing when React context unavailable
- Persistent event storage using SharedPreferences
- Automatic event replay on context restoration
- Thread-safe event processing

**Event Management**:
```kotlin
data class ServiceEvent(
    val eventName: String,
    val params: WritableMap?,
    val timestamp: Long = System.currentTimeMillis()
)
```

### React Native Bridge Modules

#### `TTMBLEManagerPackage.kt`
**Purpose**: Package registration for TTM BLE Manager module

#### `JimiBridgePackage.kt`
**Purpose**: Package registration for Jimi Bridge module

## 🌐 JavaScript/TypeScript Layer

### Core Services

#### `TTMBLEManager.ts`
**Purpose**: JavaScript bridge to native TTM BLE functionality

**Key Features**:
- Promise-based API wrapper
- Event subscription management
- KD032 simulator integration
- Comprehensive logging to Supabase
- Error handling and retry logic

**API Methods**:
```typescript
// SDK Management
async initSDK(): Promise<void>
async configureSDK(options): Promise<void>

// Scanning
async startScan(duration: number): Promise<void>
async stopScan(): Promise<void>
async startDirectScan(duration: number): Promise<void>

// Connection
async connect(deviceId: string, passcode: string, needPair?: boolean): Promise<void>
async disconnect(): Promise<void>

// ELD Data
async startReportEldData(): Promise<void>
async replyReceivedEldData(): Promise<void>
async sendUTCTime(): Promise<void>

// Password Management
async checkPasswordEnable(): Promise<void>
async validatePassword(password: string): Promise<void>
async enablePassword(password: string): Promise<void>
async disablePassword(password: string): Promise<void>
```

**Event Listeners**:
```typescript
onDeviceScanned(callback: (device: BLEDevice) => void): TTMEventSubscription
onConnected(callback: () => void): TTMEventSubscription
onDisconnected(callback: () => void): TTMEventSubscription
onConnectFailure(callback: (failure: ConnectionFailure) => void): TTMEventSubscription
onAuthenticationPassed(callback: () => void): TTMEventSubscription
onNotifyReceived(callback: (data: NotifyData) => void): TTMEventSubscription
```

#### `ELDService.ts`
**Purpose**: High-level ELD device management service

**Features**:
- BLE Manager initialization
- Permission management
- Auto-reconnection logic
- Event subscription management

#### `ELDDeviceService.ts`
**Purpose**: Device logging and data persistence service

**Logging Methods**:
```typescript
static async logConnectionAttempt(device: any, passcodeLength: any, connectionMethod: any)
static async logConnectionSuccess(device: BLEDevice, connectionMethod: 'ttm_sdk' | 'direct_ble')
static async logConnectionFailure(device: BLEDevice, failure: ConnectionFailure)
static async logELDData(deviceId: string, data: NotifyData)
static async logAuthentication(deviceId: string, passed: boolean, passcodeLength?: number)
```

### Context Management

#### `GlobalContext.tsx`
**Purpose**: Application-wide state management

**State Structure**:
```typescript
interface GlobalState {
  user: User | null;
  language: string;
  eldDevice: ELDDevice | null;
  isEldConnecting: boolean;
  isEldScanning: boolean;
  eldConnectionHistory: Array<{
    timestamp: Date;
    event: string;
    data?: any;
  }>;
  appSettings: {
    notifications: boolean;
    darkMode: boolean;
    autoConnect: boolean;
  };
  isLoading: boolean;
  error: string | null;
}
```

## 🔄 Universal Pairing System

### Multi-Device Support

The universal pairing system supports multiple device categories through the `JimiBridgeModule`:

#### Device Categories
1. **ELD Devices**: Electronic Logging Devices for DOT compliance
2. **Camera Devices**: Video streaming and surveillance systems
3. **Tracking Devices**: GPS and location monitoring
4. **IoT Sensors**: Environmental and health monitoring
5. **Custom Devices**: User-defined device types

#### Pairing Process

**Step 1: Device Discovery**
```kotlin
// Enhanced scanning with device type detection
fun startUniversalScan(options: ReadableMap, promise: Promise) {
    val scanFilter = options.getString("scanFilter") ?: "all"
    val enableDeviceTypeDetection = options.getBoolean("enableDeviceTypeDetection")
    // ... scanning logic
}
```

**Step 2: Device Classification**
```kotlin
private fun detectDeviceType(address: String, scanRecord: ByteArray?): String {
    // Parse advertising data to identify device type
    val serviceUuids = parseServiceUuidsFromScanRecord(record)
    
    // Check for ELD-specific services
    if (serviceUuids.contains(ELD_SERVICE.toString())) {
        return DEVICE_TYPE_ELD
    }
    // ... other device type checks
}
```

**Step 3: Protocol Assignment**
```kotlin
private fun detectDeviceProtocolFromServices(services: List<BluetoothGattService>): DeviceProtocol {
    for (service in services) {
        when (service.uuid) {
            ELD_SERVICE -> return DeviceProtocol.ELD_DEVICE
            HEART_RATE_SERVICE -> return DeviceProtocol.HEART_RATE_SENSOR
            BATTERY_SERVICE -> return DeviceProtocol.BATTERY_SENSOR
            // ... other protocol mappings
        }
    }
}
```

## 📡 Event Emitter System

### Connection Events
- `onDeviceDiscovered`: New device found during scanning
- `onDeviceConnected`: Successful device connection
- `onDeviceDisconnected`: Device disconnection (with reason)
- `onConnectionError`: Connection failure details
- `onAuthenticationPassed`: Device authentication success

### Data Events
- `onDataReceived`: Real-time data from connected devices
- `onProcessedDataReceived`: Parsed and structured data
- `onDataCollectionStatus`: Data streaming status updates

### Service Events
- `onServiceStarted`: Background monitoring service started
- `onServiceStopped`: Background monitoring service stopped
- `onReconnectionAttempt`: Auto-reconnection in progress
- `onStatusUpdate`: Periodic service status updates

## 🔌 Connect and Disconnect Operations

### Connection Flow

#### Enhanced Connection Process
```kotlin
// 1. Permission Verification
private fun checkPermissions(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        // Android 12+ permissions
        val scanPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN)
        val connectPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
        val locationPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        scanPermission == GRANTED && connectPermission == GRANTED && locationPermission == GRANTED
    } else {
        // Android <12 permissions
        val bluetoothPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH)
        val bluetoothAdminPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN)
        val locationPermission = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        bluetoothPermission == GRANTED && bluetoothAdminPermission == GRANTED && locationPermission == GRANTED
    }
}

// 2. Device Connection
private fun connectWithRetry(device: BluetoothDevice, enableAutoReconnect: Boolean) {
    bluetoothGatt = device.connectGatt(context, false, object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    // Connection successful
                    gatt.discoverServices()
                    connectedDevices[device.address] = gatt
                    sendEvent("onDeviceConnected", createEnhancedDeviceInfo(device, null))
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    // Handle disconnection with reason analysis
                    val disconnectReason = getDisconnectReason(status)
                    val disconnectionInfo = createEnhancedDeviceInfo(device, null).apply {
                        putString("disconnectReason", disconnectReason)
                        putString("disconnectCategory", getDisconnectCategory(status))
                        putBoolean("wasUnexpected", !isUserInitiatedDisconnect(status))
                    }
                    sendEvent("onDeviceDisconnected", disconnectionInfo)
                }
            }
        }
    })
}
```

### Disconnection Analysis

#### Disconnect Reason Mapping
```kotlin
private fun getDisconnectReason(status: Int): String {
    return when (status) {
        BluetoothGatt.GATT_SUCCESS -> "Connection terminated successfully"
        8 -> "Connection timeout" // HCI_ERR_CONNECTION_TIMEOUT
        19 -> "Connection terminated by remote device"
        22 -> "Connection terminated by local host"
        62 -> "Connection failed to be established"
        133 -> "Device not found or out of range"
        // ... more error codes
        else -> "Unknown disconnect reason (status: $status)"
    }
}
```

#### Auto-Reconnection Logic
```kotlin
// Automatic reconnection for unexpected disconnections
if (enableAutoReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isUserInitiatedDisconnect(status)) {
    reconnectAttempts++
    mainHandler.postDelayed({
        connectWithRetry(device, enableAutoReconnect)
    }, RECONNECT_DELAY)
}
```

## 📋 Kotlin File Details

### `MainActivity.kt`
**Purpose**: Main application entry point and activity management
- React Native activity initialization
- Intent handling for deep links
- Lifecycle management

### `MainApplication.kt`
**Purpose**: Application class with React Native package registration
- TTMBLEManagerPackage registration
- JimiBridgePackage registration
- Firebase and analytics initialization

### Package Registration Files

#### `TTMBLEManagerPackage.kt`
```kotlin
class TTMBLEManagerPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(TTMBLEManagerModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

#### `JimiBridgePackage.kt`
```kotlin
class JimiBridgePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(JimiBridgeModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

## 🎯 Data Types and Structures

### ELD Data Structure
```json
{
  "vehicleData": {
    "speed": 65,
    "rpm": 1800,
    "engineHours": 55000,
    "odometer": 550000,
    "fuelLevel": 75,
    "engineTemp": 195,
    "diagnosticCodes": ["P0420", "P0171"],
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 8
    }
  },
  "driverStatus": "driving",
  "hoursOfService": {
    "driveTimeRemaining": 480,
    "shiftTimeRemaining": 720,
    "cycleTimeRemaining": 3600,
    "breakTimeRemaining": 0
  },
  "timestamp": 1704067200000,
  "deviceId": "KD032-43149A",
  "sequenceNumber": 12345
}
```

### CAN Bus Data Structure
```json
{
  "engineRPM": 1800,
  "engineSpeed": 1800,
  "engineThrottleValve1Position1": 45.5,
  "engineIntakeAirMassFlowRate": 25.8,
  "enginePercentLoadAtCurrentSpeed": 65.2,
  "wheelBasedVehicleSpeed": 65.0,
  "totalVehicleDistance": 550000,
  "engineCoolantTemperature": 195,
  "fuelLevel": 75.5,
  "voltage": 13.8,
  "accOutStatus": "ON",
  "malfunctionIndicatorLamp": "OFF"
}
```

### IoT Sensor Data Structure
```json
{
  "deviceId": "IOT_SENSOR_001",
  "sensorType": "TEMPERATURE",
  "value": 23.5,
  "unit": "celsius",
  "timestamp": "2025-01-15T10:30:00Z",
  "batteryLevel": 85,
  "signalStrength": -65
}
```

## 🔄 Universal Pairing Implementation

### Device Discovery
```typescript
// Start universal scanning
await JimiBridge.startUniversalScan({
  scanFilter: "all", // "eld", "camera", "tracking", "sensor", "all"
  scanDuration: 30000,
  enableRSSI: true,
  enableDeviceTypeDetection: true,
  enableBluetoothLE: true,
  enableBluetoothClassic: false,
  scanMode: "LOW_LATENCY",
  maxResults: 50,
  enableDuplicateFilter: true
});
```

### Connection Process
```typescript
// Connect to discovered device
await JimiBridge.connectToDevice({
  deviceId: "AA:BB:CC:DD:EE:FF",
  deviceType: "181", // ELD device type
  connectionMethod: "universal",
  enableAutoReconnect: true,
  enableDataStreaming: true
});
```

### Data Streaming
```typescript
// Start data streaming for specific types
await JimiBridge.startDataStreaming(deviceId, [
  "fuel_level",
  "gps_location", 
  "obd_data",
  "engine_data",
  "battery_level",
  "temperature"
]);
```

## 🔧 Configuration and Setup

### Android Permissions
```xml
<!-- AndroidManifest.xml -->
<!-- Bluetooth permissions for Android 11 and below -->
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>

<!-- Bluetooth permissions for Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>

<!-- Location permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>

<!-- Foreground service permissions -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_BLUETOOTH"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
```

### Service Registration
```xml
<!-- ELD Monitoring Service -->
<service
  android:name=".ELDMonitoringService"
  android:enabled="true"
  android:exported="false"
  android:foregroundServiceType="connectedDevice|location|dataSync" />
```

### React Native Package Configuration
```json
{
  "plugins": [
    [
      "react-native-ble-manager",
      {
        "isBackgroundEnabled": true,
        "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to ELD hardware.",
        "bluetoothPeripheralPermission": "Allow $(PRODUCT_NAME) to find and connect to ELD hardware."
      }
    ]
  ]
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio with SDK 31+
- Physical Android device for BLE testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/brdigitals4u/ttm_eld_mobile.git
   cd TruckLogELD_old
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Android environment**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew build
   ```

4. **Run the application**
   ```bash
   npm run android
   ```

### Development Setup

1. **Enable debugging**
   ```typescript
   // Set debug mode in TTMBLEManager
   await TTMBLEManager.configureSDK({ 
     filterDevices: false, 
     debugMode: true 
   });
   ```

2. **Monitor logs**
   ```bash
   # Android logs
   npx react-native log-android
   
   # Filter for specific components
   adb logcat | grep "TTMBLEManager\|EnhancedBLEManager\|JimiBridge"
   ```

## 🧪 Testing

### Unit Testing
```bash
# Run Jest tests
npm test

# Run with coverage
npm test -- --coverage
```

### Device Testing
```typescript
// Test with simulator
import { kd032Simulator } from './services/EldSimulator';

// Start KD032 simulator
await kd032Simulator.startAdvertising();

// Test connection
await TTMBLEManager.connect('C4:A8:28:43:14:9A', 'test-passcode', true);
```

### Integration Testing
```bash
# Build and test APK
npm run android:debug
npm run android:install:debug

# Test on physical device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 📊 Monitoring and Analytics

### Logging Services

#### Sentry Integration
- Real-time error tracking
- Performance monitoring
- User session tracking
- Breadcrumb logging for debugging

#### Firebase Analytics
- Connection success/failure rates
- Device usage patterns
- App performance metrics
- Crash reporting

#### Supabase Logging
- Detailed device interaction logs
- Connection attempt tracking
- Data collection monitoring
- Session management

### Key Metrics Tracked
- Connection success rate
- Average connection time
- Data transmission frequency
- Error occurrence patterns
- Device compatibility issues

## 🔍 Troubleshooting

### Common Issues

#### Bluetooth Connection Failures
```kotlin
// Check permissions
private fun checkPermissions(): Boolean {
    // Implementation details in EnhancedBLEManager.kt
}

// Verify Bluetooth state
if (bluetoothAdapter?.isEnabled == false) {
    promise.reject("BLUETOOTH_DISABLED", "Bluetooth is not enabled")
    return
}
```

#### Device Not Found
```kotlin
// Enhanced scanning with fallback
private fun startScanning(scanFilter: String, scanDuration: Long) {
    val scanSettings = ScanSettings.Builder()
        .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
        .setReportDelay(0)
        .setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
        .build()
}
```

#### Data Not Received
```kotlin
// Setup data streaming
private fun setupDataStreaming(gatt: BluetoothGatt) {
    gatt.services.forEach { service ->
        service.characteristics.forEach { characteristic ->
            if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) {
                gatt.setCharacteristicNotification(characteristic, true)
            }
        }
    }
}
```

### Debug Commands
```bash
# Check connected devices
adb shell dumpsys bluetooth_manager

# Monitor BLE activity
adb shell dumpsys activity service BluetoothManagerService

# View application logs
adb logcat | grep "com.ttm.TTMKonnect"
```

## 📚 API Reference

### TTMBLEManager API
```typescript
interface TTMBLEManagerInterface {
  // Core methods
  initSDK(): Promise<void>;
  startScan(duration: number): Promise<void>;
  connect(deviceId: string, passcode: string, needPair?: boolean): Promise<void>;
  disconnect(): Promise<void>;
  startReportEldData(): Promise<void>;
  
  // Event constants
  ON_DEVICE_SCANNED: string;
  ON_CONNECTED: string;
  ON_DISCONNECTED: string;
  ON_NOTIFY_RECEIVED: string;
  // ... other constants
}
```

### JimiBridge API
```typescript
interface JimiBridgeInterface {
  // Universal scanning
  startUniversalScan(options: ScanOptions): Promise<boolean>;
  stopUniversalScan(): Promise<boolean>;
  
  // Device connection
  connectToDevice(options: ConnectionOptions): Promise<boolean>;
  disconnectDevice(deviceId: string): Promise<boolean>;
  
  // Data streaming
  startDataStreaming(deviceId: string, dataTypes?: string[]): Promise<boolean>;
  requestSpecificData(deviceId: string, dataType: string): Promise<boolean>;
  
  // Device management
  getConnectedDevices(): Promise<DeviceInfo[]>;
  getRealDeviceData(deviceId: string): Promise<DeviceData>;
}
```

## 🔐 Security Considerations

### Bluetooth Security
- Device authentication required
- Encrypted communication channels
- Passcode validation
- Connection timeout management

### Data Privacy
- Sensitive data encryption
- Local storage security
- Network communication protection
- User consent management

## 📈 Performance Optimization

### Memory Management
- Connection pool management
- Event listener cleanup
- Background thread optimization
- Data buffering strategies

### Battery Optimization
- Efficient scanning intervals
- Background service management
- Connection state optimization
- Data transmission throttling

## 🚀 Deployment

### Build Commands
```bash
# Debug build
npm run android:debug

# Release build
npm run android:release

# Specific architecture
npm run android:release:arm64

# Bundle for Play Store
npm run android:bundle
```

### Environment Configuration
```typescript
// Production configuration
if (!__DEV__) {
  // Disable debug logging
  // Enable production error tracking
  // Optimize scanning parameters
}
```

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For technical support or questions:
- GitHub Issues: [ttm_eld_mobile/issues](https://github.com/brdigitals4u/ttm_eld_mobile/issues)
- Documentation: [docs/](docs/)
- Email: support@ttm4u.com

## 🔗 Related Documentation

- [ELD Data Types Reference](docs/ELD_DATA_TYPES.md)
- [ELD Simulator Guide](docs/ELD_SIMULATOR_GUIDE.md)
- [Bluetooth Troubleshooting](BLUETOOTH_TROUBLESHOOTING.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Firebase Setup](FIREBASE_AND_ASYNCSTORAGE_FIXES.md)
- [Analytics Configuration](ANALYTICS_FIX_SUMMARY.md)

---

**TruckLogELD** - Comprehensive ELD solution for modern fleet management with universal device support and real-time monitoring capabilities.
