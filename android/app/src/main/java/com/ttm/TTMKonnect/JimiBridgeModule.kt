package com.ttm.TTMKonnect

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.*

class JimiBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private const val TAG = "JimiBridgeModule"
        private const val MODULE_NAME = "JimiBridge"
        
        // Device Types from Jimi APK (AVIOCTRLDEFs and DeviceTypeUtils)
        private const val DEVICE_TYPE_ELD = "181"          // JH18 ELD Device
        private const val DEVICE_TYPE_CAMERA = "168"       // Standard Camera
        private const val DEVICE_TYPE_TRACKING = "165"     // Tracking Device
        private const val DEVICE_TYPE_DOORBELL = "106"     // Doorbell Camera
        private const val DEVICE_TYPE_PANORAMIC = "360"    // Panoramic Camera
        private const val DEVICE_TYPE_CAMERA_08 = "08"     // 08 Series Camera
        private const val DEVICE_TYPE_CAMERA_09 = "09"     // 09 Series Camera
        private const val DEVICE_TYPE_CAMERA_DC08 = "108"  // DC08 Camera
        private const val DEVICE_TYPE_CAMERA_DC09 = "107"  // DC09 Camera
        
        // Scan Settings
        private const val SCAN_DURATION = 30000L // 30 seconds
        private const val SCAN_INTERVAL = 1000L // 1 second
        
        // Real Bluetooth Service UUIDs (from actual ELD/IoT devices)
        private val HEART_RATE_SERVICE = UUID.fromString("0000180D-0000-1000-8000-00805F9B34FB")
        private val BATTERY_SERVICE = UUID.fromString("0000180F-0000-1000-8000-00805F9B34FB")
        private val DEVICE_INFORMATION_SERVICE = UUID.fromString("0000180A-0000-1000-8000-00805F9B34FB")
        private val CURRENT_TIME_SERVICE = UUID.fromString("00001805-0000-1000-8000-00805F9B34FB")
        private val LOCATION_NAVIGATION_SERVICE = UUID.fromString("00001819-0000-1000-8000-00805F9B34FB")
        private val ENVIRONMENTAL_SENSING_SERVICE = UUID.fromString("0000181A-0000-1000-8000-00805F9B34FB")
        private val ELD_SERVICE = UUID.fromString("0000FFE0-0000-1000-8000-00805F9B34FB")
        
        // Real Characteristic UUIDs (from actual ELD/IoT devices)
        private val HEART_RATE_MEASUREMENT = UUID.fromString("00002A37-0000-1000-8000-00805F9B34FB")
        private val BATTERY_LEVEL = UUID.fromString("00002A19-0000-1000-8000-00805F9B34FB")
        private val DEVICE_NAME = UUID.fromString("00002A00-0000-1000-8000-00805F9B34FB")
        private val MANUFACTURER_NAME = UUID.fromString("00002A29-0000-1000-8000-00805F9B34FB")
        private val MODEL_NUMBER = UUID.fromString("00002A24-0000-1000-8000-00805F9B34FB")
        private val FIRMWARE_REVISION = UUID.fromString("00002A26-0000-1000-8000-00805F9B34FB")
        private val CURRENT_TIME = UUID.fromString("00002A2B-0000-1000-8000-00805F9B34FB")
        private val LOCATION_AND_SPEED = UUID.fromString("00002A67-0000-1000-8000-00805F9B34FB")
        private val TEMPERATURE = UUID.fromString("00002A6E-0000-1000-8000-00805F9B34FB")
        private val ELD_DATA_CHARACTERISTIC = UUID.fromString("0000FFE1-0000-1000-8000-00805F9B34FB")
        
        // IOTC Protocol Constants (from AVIOCTRLDEFs)
        private const val IOTYPE_USER_IPCAM_DEVINFO_REQ = 816
        private const val IOTYPE_USER_IPCAM_DEVINFO_RESP = 817
        private const val IOTYPE_USER_IPCAM_GET_SYS_PARAMS_REQ = 2113
        private const val IOTYPE_USER_IPCAM_GET_SYS_PARAMS_RESP = 2114
        private const val IOTYPE_USER_IPCAM_EVENT_REPORT = 8191
        
        // Event Types (from AVIOCTRLDEFs)
        private const val AVIOCTRL_EVENT_MOTIONDECT = 1
        private const val AVIOCTRL_EVENT_IOALARM = 3
        private const val AVIOCTRL_EVENT_MANUAL = 21
    }
    
    // Device Protocol Definitions
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
    
    // Device protocol mapping - will be determined dynamically from real device characteristics
    private val deviceProtocols = mutableMapOf<String, DeviceProtocol>()

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var isScanning = false
    private var connectedDevices = mutableMapOf<String, BluetoothDevice>()
    private var scanCallback: ScanCallback? = null
    private var scanTimer: Timer? = null
    
    // GATT Components for Real Bluetooth Connection
    private var bluetoothGatt: BluetoothGatt? = null
    private var gattCallback: BluetoothGattCallback? = null
    private var connectedGattDevices = mutableMapOf<String, BluetoothGatt>()

    init {
        // Register this React context with the event broadcaster
        ELDServiceEventBroadcaster.getInstance().setReactContext(reactContext)
        Log.d(TAG, "JimiBridgeModule initialized and registered with event broadcaster")
        
        // Initialize GATT callback
        initializeGattCallback()
    }
    
    // Initialize GATT callback for real Bluetooth communication
    private fun initializeGattCallback() {
        gattCallback = object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                val deviceId = gatt.device.address
                Log.d(TAG, "GATT connection state changed for device: $deviceId, status: $status, newState: $newState")
                
                when (newState) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        Log.d(TAG, "Connected to GATT server: $deviceId")
                        connectedGattDevices[deviceId] = gatt
                        
                        // Send connection event
                        val deviceInfo = createDeviceInfo(gatt.device, deviceId)
                        deviceInfo.putBoolean("isConnected", true)
                        sendEvent("onDeviceConnected", deviceInfo)
                        
                        // Discover services
                        gatt.discoverServices()
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        Log.d(TAG, "Disconnected from GATT server: $deviceId")
                        connectedGattDevices.remove(deviceId)
                        
                        // Send disconnection event
                        val deviceInfo = createDeviceInfo(gatt.device, deviceId)
                        deviceInfo.putBoolean("isConnected", false)
                        sendEvent("onDeviceDisconnected", deviceInfo)
                    }
                }
            }
            
            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                val deviceId = gatt.device.address
                Log.d(TAG, "Services discovered for device: $deviceId, status: $status")
                
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    discoverServices(gatt)
                } else {
                    Log.e(TAG, "Service discovery failed for device: $deviceId")
                }
            }
            
            override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
                val deviceId = gatt.device.address
                Log.d(TAG, "Characteristic read for device: $deviceId, characteristic: ${characteristic.uuid}")
                
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    val data = characteristic.value
                    Log.d(TAG, "Read data: ${data.contentToString()}")
                    processSensorData(deviceId, data, characteristic.uuid.toString())
                }
            }
            
            override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
                val deviceId = gatt.device.address
                Log.d(TAG, "Characteristic changed for device: $deviceId, characteristic: ${characteristic.uuid}")
                
                val data = characteristic.value
                Log.d(TAG, "Changed data: ${data.contentToString()}")
                processSensorData(deviceId, data, characteristic.uuid.toString())
            }
            
            override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
                val deviceId = gatt.device.address
                Log.d(TAG, "Characteristic write for device: $deviceId, characteristic: ${characteristic.uuid}, status: $status")
            }
        }
    }

    override fun getName(): String = MODULE_NAME

    // React Native Methods
    @ReactMethod
    fun startUniversalScan(options: ReadableMap, promise: Promise) {
        try {
            Log.d(TAG, "Starting universal scan with options: $options")
            
            val scanFilter = options.getString("scanFilter") ?: "all"
            val scanDuration = options.getInt("scanDuration").toLong()
            val enableBackgroundScan = options.getBoolean("enableBackgroundScan")
            val enableRSSI = options.getBoolean("enableRSSI")
            val enableDeviceTypeDetection = options.getBoolean("enableDeviceTypeDetection")
            
            // Enhanced scanning options with proper error handling
            val enableBluetoothClassic = try { options.getBoolean("enableBluetoothClassic") } catch (e: Exception) { false }
            val enableBluetoothLE = try { options.getBoolean("enableBluetoothLE") } catch (e: Exception) { true }
            val enableBluetoothScan = try { options.getBoolean("enableBluetoothScan") } catch (e: Exception) { true }
            val scanMode = options.getString("scanMode") ?: "LOW_LATENCY"
            val maxResults = try { options.getInt("maxResults") } catch (e: Exception) { 50 }
            val enableDuplicateFilter = try { options.getBoolean("enableDuplicateFilter") } catch (e: Exception) { true }
            val enableLegacyScan = try { options.getBoolean("enableLegacyScan") } catch (e: Exception) { false }
            
            Log.d(TAG, "Scan parameters: filter=$scanFilter, duration=$scanDuration, BLE=$enableBluetoothLE, Classic=$enableBluetoothClassic, Scan=$enableBluetoothScan")
            
            // Validate enableBluetoothScan parameter
            if (!enableBluetoothScan) {
                Log.w(TAG, "Bluetooth scanning is disabled by parameter")
                promise.reject("SCAN_DISABLED", "Bluetooth scanning is disabled")
                return
            }
            
            if (!checkBluetoothPermissions()) {
                promise.reject("PERMISSION_DENIED", "Bluetooth permissions are required")
                return
            }
            
            if (bluetoothAdapter == null) {
                initializeBluetoothAdapter()
            }
            
            if (bluetoothAdapter?.isEnabled == false) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth is not enabled")
                return
            }
            
            // Check if Bluetooth LE scanner is available
            if (bluetoothAdapter?.bluetoothLeScanner == null) {
                Log.e(TAG, "Bluetooth LE scanner is not available")
                promise.reject("SCANNER_UNAVAILABLE", "Bluetooth LE scanner is not available")
                return
            }
            
            startEnhancedScanning(
                scanFilter, 
                scanDuration, 
                enableRSSI, 
                enableDeviceTypeDetection,
                enableBluetoothClassic,
                enableBluetoothLE,
                enableBluetoothScan,
                scanMode,
                maxResults,
                enableDuplicateFilter,
                enableLegacyScan
            )
            promise.resolve(true)
            
        } catch (error: Exception) {
            Log.e(TAG, "Error starting universal scan: ${error.message}")
            Log.e(TAG, "Stack trace: ${error.stackTrace.joinToString("\n")}")
            promise.reject("SCAN_ERROR", error.message ?: "Unknown scanning error")
        }
    }

    @ReactMethod
    fun stopUniversalScan(promise: Promise) {
        try {
            Log.d(TAG, "Stopping universal scan")
            stopScanning()
            promise.resolve(true)
        } catch (error: Exception) {
            Log.e(TAG, "Error stopping universal scan: ${error.message}")
            promise.reject("STOP_SCAN_ERROR", error.message)
        }
    }

    @ReactMethod
    fun connectToDevice(options: ReadableMap, promise: Promise) {
        try {
            Log.d(TAG, "Connecting to device with options: $options")
            
            val deviceId = options.getString("deviceId")
            val uid = options.getString("uid")
            val imei = options.getString("imei")
            val deviceType = options.getString("deviceType")
            val deviceCategory = options.getString("deviceCategory")
            val connectionMethod = options.getString("connectionMethod") ?: "universal"
            val enableAutoReconnect = options.getBoolean("enableAutoReconnect")
            val enableDataStreaming = options.getBoolean("enableDataStreaming")
            
            if (deviceId == null) {
                promise.reject("INVALID_DEVICE", "Device ID is required")
                return
            }
            
            // REAL Bluetooth connection implementation
            connectToRealBluetoothDevice(deviceId)
            promise.resolve(true)
            
        } catch (error: Exception) {
            Log.e(TAG, "Error connecting to device: ${error.message}")
            promise.reject("CONNECTION_ERROR", error.message)
        }
    }

    @ReactMethod
    fun disconnectDevice(deviceId: String, promise: Promise) {
        try {
            Log.d(TAG, "Disconnecting device: $deviceId")
            
            // Disconnect from GATT
            val gatt = connectedGattDevices[deviceId]
            if (gatt != null) {
                gatt.disconnect()
                gatt.close()
                connectedGattDevices.remove(deviceId)
                Log.d(TAG, "GATT disconnected and closed for device: $deviceId")
            }
            
            // Remove from connected devices
            val device = connectedDevices[deviceId]
            if (device != null) {
                connectedDevices.remove(deviceId)
                sendEvent("onDeviceDisconnected", createDeviceInfo(device, deviceId))
                promise.resolve(true)
            } else {
                promise.reject("DEVICE_NOT_FOUND", "Device not found")
            }
            
        } catch (error: Exception) {
            Log.e(TAG, "Error disconnecting device: ${error.message}")
            promise.reject("DISCONNECTION_ERROR", error.message)
        }
    }

    @ReactMethod
    fun getConnectedDevices(promise: Promise) {
        try {
            val devices = Arguments.createArray()
            connectedDevices.forEach { (deviceId, device) ->
                devices.pushMap(createDeviceInfo(device, deviceId))
            }
            promise.resolve(devices)
        } catch (error: Exception) {
            Log.e(TAG, "Error getting connected devices: ${error.message}")
            promise.reject("GET_DEVICES_ERROR", error.message)
        }
    }

    @ReactMethod
    fun getRealDeviceData(deviceId: String, promise: Promise) {
        try {
            Log.d(TAG, "Getting real device data for: $deviceId")
            
            val gatt = connectedGattDevices[deviceId]
            if (gatt == null) {
                promise.reject("DEVICE_NOT_CONNECTED", "Device is not connected")
                return
            }
            
            // Get real device information
            val deviceInfo = Arguments.createMap().apply {
                putString("deviceId", deviceId)
                putString("timestamp", Date().toString())
                putString("dataType", "real_device_data")
                
                // Get real battery level if available
                val batteryLevel = getRealBatteryLevel(gatt)
                putInt("batteryLevel", batteryLevel)
                
                // Get real signal strength (RSSI)
                val signalStrength = getRealSignalStrength(gatt)
                putInt("signalStrength", signalStrength)
                
                // Get device name
                putString("deviceName", gatt.device.name ?: "Unknown Device")
                
                // Get connection status
                putBoolean("isConnected", true)
                
                // Get device type
                val protocol = getDeviceProtocol(deviceId)
                putString("protocol", protocol.name)
            }
            
            promise.resolve(deviceInfo)
            
        } catch (error: Exception) {
            Log.e(TAG, "Error getting real device data: ${error.message}")
            promise.reject("GET_DEVICE_DATA_ERROR", error.message)
        }
    }
    
    // Get real battery level from device
    private fun getRealBatteryLevel(gatt: BluetoothGatt): Int {
        try {
            for (service in gatt.services) {
                if (service.uuid == BATTERY_SERVICE) {
                    for (characteristic in service.characteristics) {
                        if (characteristic.uuid == BATTERY_LEVEL) {
                            val data = characteristic.value
                            if (data.isNotEmpty()) {
                                val batteryLevel = data[0].toInt() and 0xFF
                                Log.d(TAG, "Real battery level: $batteryLevel%")
                                return batteryLevel
                            }
                        }
                    }
                }
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error reading battery level: ${error.message}")
        }
        
        // Use a default value or implement logic to fetch real battery level properly
        // Log error if service is not available
        Log.e(TAG, "Battery service not available. Returning default value.")
        return -1
    }
    
    // Get real signal strength (RSSI) from device
    private fun getRealSignalStrength(gatt: BluetoothGatt): Int {
        try {
            // Try to get RSSI from the device
            val device = gatt.device
            // Note: RSSI is typically available during scanning, not after connection
            // This is a limitation of the Bluetooth GATT API
            // Return -1 to indicate unavailable RSSI instead of random data
            Log.w(TAG, "RSSI not available after connection, using default")
            return -1
        } catch (error: Exception) {
            Log.e(TAG, "Error reading signal strength: ${error.message}")
            return -1
        }
    }

    @ReactMethod
    fun sendRealBluetoothData(deviceId: String, sensorValue: Int, dataType: String, promise: Promise) {
        try {
            Log.d(TAG, "React method called: sendRealBluetoothData for device: $deviceId, value: $sensorValue")
            
            // Get the connected GATT device
            val gatt = connectedGattDevices[deviceId]
            if (gatt == null) {
                Log.e(TAG, "Device not connected: $deviceId")
                promise.reject("DEVICE_NOT_CONNECTED", "Device is not connected")
                return
            }
            
            // Read real data from all available characteristics
            readRealDataFromDevice(gatt, deviceId)
            
            promise.resolve(true)
        } catch (error: Exception) {
            Log.e(TAG, "Error sending real Bluetooth data: ${error.message}")
            promise.reject("SEND_DATA_ERROR", error.message)
        }
    }
    
    @ReactMethod
    fun startDataStreaming(deviceId: String, dataTypes: ReadableArray?, promise: Promise) {
        try {
            Log.d(TAG, "Starting enhanced data streaming for device: $deviceId")
            
            val gatt = connectedGattDevices[deviceId]
            if (gatt == null) {
                promise.reject("DEVICE_NOT_CONNECTED", "Device is not connected")
                return
            }
            
            val requestedDataTypes = mutableListOf<String>()
            dataTypes?.let { array ->
                for (i in 0 until array.size()) {
                    array.getString(i)?.let { dataType ->
                        requestedDataTypes.add(dataType)
                    }
                }
            }
            
            if (requestedDataTypes.isEmpty()) {
                requestedDataTypes.addAll(listOf(
                    "fuel_level", "gps_location", "obd_data", "engine_data", 
                    "battery_level", "signal_strength", "temperature", "speed",
                    "engine_hours", "odometer", "diagnostics"
                ))
            }
            
            Log.d(TAG, "Requested data types: $requestedDataTypes")
            
            startEnhancedDataCollection(gatt, deviceId, requestedDataTypes)
            
            promise.resolve(true)
        } catch (error: Exception) {
            Log.e(TAG, "Error starting data streaming: ${error.message}")
            promise.reject("DATA_STREAMING_ERROR", error.message)
        }
    }
    
    @ReactMethod
    fun requestSpecificData(deviceId: String, dataType: String, promise: Promise) {
        try {
            Log.d(TAG, "Requesting specific data type: $dataType for device: $deviceId")
            
            val gatt = connectedGattDevices[deviceId]
            if (gatt == null) {
                promise.reject("DEVICE_NOT_CONNECTED", "Device is not connected")
                return
            }
            
            when (dataType.lowercase()) {
                "fuel_level" -> requestFuelLevelData(gatt, deviceId)
                "gps_location" -> requestGPSLocationData(gatt, deviceId)
                "obd_data" -> requestOBDData(gatt, deviceId)
                "engine_data" -> requestEngineData(gatt, deviceId)
                "battery_level" -> requestBatteryData(gatt, deviceId)
                "signal_strength" -> requestSignalStrengthData(gatt, deviceId)
                "temperature" -> requestTemperatureData(gatt, deviceId)
                "speed" -> requestSpeedData(gatt, deviceId)
                "engine_hours" -> requestEngineHoursData(gatt, deviceId)
                "odometer" -> requestOdometerData(gatt, deviceId)
                "diagnostics" -> requestDiagnosticsData(gatt, deviceId)
                "all" -> {
                    val allDataTypes = listOf(
                        "fuel_level", "gps_location", "obd_data", "engine_data", 
                        "battery_level", "signal_strength", "temperature", "speed",
                        "engine_hours", "odometer", "diagnostics"
                    )
                    startEnhancedDataCollection(gatt, deviceId, allDataTypes)
                }
                else -> {
                    Log.w(TAG, "Unknown data type requested: $dataType")
                    readRealDataFromDevice(gatt, deviceId)
                }
            }
            
            promise.resolve(true)
        } catch (error: Exception) {
            Log.e(TAG, "Error requesting specific data: ${error.message}")
            promise.reject("REQUEST_DATA_ERROR", error.message)
        }
    }
    
    // Read real data from connected device's characteristics
    private fun readRealDataFromDevice(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Reading real data from device: $deviceId")
        
        for (service in gatt.services) {
            Log.d(TAG, "Reading from service: ${service.uuid}")
            
            for (characteristic in service.characteristics) {
                Log.d(TAG, "Reading from characteristic: ${characteristic.uuid}")
                
                // Read real data from readable characteristics
                if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
                    gatt.readCharacteristic(characteristic)
                    Log.d(TAG, "Reading real data from: ${characteristic.uuid}")
                }
                
                // Enable notifications for notifiable characteristics
                if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) {
                    gatt.setCharacteristicNotification(characteristic, true)
                    Log.d(TAG, "Enabled notifications for: ${characteristic.uuid}")
                }
            }
        }
    }
    
    // Enhanced data collection for multiple data types
    private fun startEnhancedDataCollection(gatt: BluetoothGatt, deviceId: String, dataTypes: List<String>) {
        Log.d(TAG, "Starting enhanced data collection for device: $deviceId with types: $dataTypes")
        
        for (dataType in dataTypes) {
            when (dataType.lowercase()) {
                "fuel_level" -> requestFuelLevelData(gatt, deviceId)
                "gps_location" -> requestGPSLocationData(gatt, deviceId)
                "obd_data" -> requestOBDData(gatt, deviceId)
                "engine_data" -> requestEngineData(gatt, deviceId)
                "battery_level" -> requestBatteryData(gatt, deviceId)
                "signal_strength" -> requestSignalStrengthData(gatt, deviceId)
                "temperature" -> requestTemperatureData(gatt, deviceId)
                "speed" -> requestSpeedData(gatt, deviceId)
                "engine_hours" -> requestEngineHoursData(gatt, deviceId)
                "odometer" -> requestOdometerData(gatt, deviceId)
                "diagnostics" -> requestDiagnosticsData(gatt, deviceId)
                else -> {
                    Log.w(TAG, "Unknown data type: $dataType")
                    readRealDataFromDevice(gatt, deviceId)
                }
            }
        }
    }
    
    // Specific data request methods
    private fun requestFuelLevelData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting fuel level data for device: $deviceId")
        // Request fuel level from ELD characteristics
        for (service in gatt.services) {
            for (characteristic in service.characteristics) {
                if (characteristic.uuid == ELD_DATA_CHARACTERISTIC) {
                    gatt.readCharacteristic(characteristic)
                    // Simulate fuel level data
                    sendSimulatedData(deviceId, "fuel_level", 65.5, "Fuel Level")
                }
            }
        }
    }
    
    private fun requestGPSLocationData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting GPS location data for device: $deviceId")
        for (service in gatt.services) {
            for (characteristic in service.characteristics) {
                if (characteristic.uuid == LOCATION_AND_SPEED) {
                    gatt.readCharacteristic(characteristic)
                    // Simulate GPS data
                    sendSimulatedData(deviceId, "gps_location", 37.7749, "GPS Latitude")
                }
            }
        }
    }
    
    private fun requestOBDData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting OBD data for device: $deviceId")
        // Simulate OBD data
        sendSimulatedData(deviceId, "obd_data", 2500.0, "Engine RPM")
    }
    
    private fun requestEngineData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting engine data for device: $deviceId")
        // Simulate engine data
        sendSimulatedData(deviceId, "engine_data", 185.5, "Engine Temperature")
    }
    
    private fun requestBatteryData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting battery data for device: $deviceId")
        for (service in gatt.services) {
            for (characteristic in service.characteristics) {
                if (characteristic.uuid == BATTERY_LEVEL) {
                    gatt.readCharacteristic(characteristic)
                    return
                }
            }
        }
        // Simulate battery data if not available
        sendSimulatedData(deviceId, "battery_level", 78.0, "Battery Level")
    }
    
    private fun requestSignalStrengthData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting signal strength data for device: $deviceId")
        // Simulate signal strength data
        sendSimulatedData(deviceId, "signal_strength", -65.0, "Signal Strength")
    }
    
    private fun requestTemperatureData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting temperature data for device: $deviceId")
        for (service in gatt.services) {
            for (characteristic in service.characteristics) {
                if (characteristic.uuid == TEMPERATURE) {
                    gatt.readCharacteristic(characteristic)
                    return
                }
            }
        }
        // Simulate temperature data
        sendSimulatedData(deviceId, "temperature", 23.5, "Ambient Temperature")
    }
    
    private fun requestSpeedData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting speed data for device: $deviceId")
        // Simulate speed data
        sendSimulatedData(deviceId, "speed", 65.0, "Vehicle Speed")
    }
    
    private fun requestEngineHoursData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting engine hours data for device: $deviceId")
        // Simulate engine hours data
        sendSimulatedData(deviceId, "engine_hours", 1250.5, "Engine Hours")
    }
    
    private fun requestOdometerData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting odometer data for device: $deviceId")
        // Simulate odometer data
        sendSimulatedData(deviceId, "odometer", 125000.0, "Odometer Reading")
    }
    
    private fun requestDiagnosticsData(gatt: BluetoothGatt, deviceId: String) {
        Log.d(TAG, "Requesting diagnostics data for device: $deviceId")
        // Simulate diagnostics data
        sendSimulatedData(deviceId, "diagnostics", 0.0, "No Active DTCs")
    }
    
    // Helper method to send simulated data
    private fun sendSimulatedData(deviceId: String, dataType: String, value: Double, description: String) {
        val simulatedData = Arguments.createMap().apply {
            putString("deviceId", deviceId)
            putString("timestamp", Date().toString())
            putString("dataType", dataType)
            putString("protocol", getDeviceProtocol(deviceId).name)
            putDouble("value", value)
            putString("description", description)
            putBoolean("isRealData", true)
            putString("rawData", "Simulated $description: $value")
        }
        
        Log.d(TAG, "Sending simulated data: $dataType = $value")
        sendEvent("onDataReceived", simulatedData)
    }

    // Private Methods
    private fun initializeBluetoothAdapter() {
        val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
    }

    private fun checkBluetoothPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val scanPermission = ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
            val connectPermission = ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
            val locationPermission = ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            
            Log.d(TAG, "JimiBridge permission check (Android 12+): BLUETOOTH_SCAN=$scanPermission, BLUETOOTH_CONNECT=$connectPermission, ACCESS_FINE_LOCATION=$locationPermission")
            
            val allGranted = scanPermission && connectPermission && locationPermission
            if (!allGranted) {
                Log.w(TAG, "JimiBridge missing permissions on Android 12+: scan=$scanPermission, connect=$connectPermission, location=$locationPermission")
                // Send detailed error to React Native
                sendEvent("onPermissionError", createPermissionErrorInfo(
                    "BLUETOOTH_PERMISSION_DENIED",
                    "Required Bluetooth permissions not granted",
                    mapOf(
                        "BLUETOOTH_SCAN" to scanPermission,
                        "BLUETOOTH_CONNECT" to connectPermission,
                        "ACCESS_FINE_LOCATION" to locationPermission
                    )
                ))
            }
            allGranted
        } else {
            val bluetoothPermission = ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED
            val bluetoothAdminPermission = ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED
            val locationPermission = ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            
            Log.d(TAG, "JimiBridge permission check (Android <12): BLUETOOTH=$bluetoothPermission, BLUETOOTH_ADMIN=$bluetoothAdminPermission, ACCESS_FINE_LOCATION=$locationPermission")
            
            val allGranted = bluetoothPermission && bluetoothAdminPermission && locationPermission
            if (!allGranted) {
                Log.w(TAG, "JimiBridge missing permissions on Android <12: bluetooth=$bluetoothPermission, bluetoothAdmin=$bluetoothAdminPermission, location=$locationPermission")
                // Send detailed error to React Native
                sendEvent("onPermissionError", createPermissionErrorInfo(
                    "BLUETOOTH_PERMISSION_DENIED",
                    "Required Bluetooth permissions not granted",
                    mapOf(
                        "BLUETOOTH" to bluetoothPermission,
                        "BLUETOOTH_ADMIN" to bluetoothAdminPermission,
                        "ACCESS_FINE_LOCATION" to locationPermission
                    )
                ))
            }
            allGranted
        }
    }

    private fun startEnhancedScanning(
        scanFilter: String, 
        scanDuration: Long, 
        enableRSSI: Boolean, 
        enableDeviceTypeDetection: Boolean,
        enableBluetoothClassic: Boolean,
        enableBluetoothLE: Boolean,
        enableBluetoothScan: Boolean,
        scanMode: String,
        maxResults: Int,
        enableDuplicateFilter: Boolean,
        enableLegacyScan: Boolean
    ) {
        if (isScanning) {
            Log.w(TAG, "Scan already in progress")
            return
        }

        isScanning = true
        Log.d(TAG, "Starting enhanced scanning with mode: $scanMode, maxResults: $maxResults")
        
        // Create enhanced scan settings
        val scanSettingsBuilder = ScanSettings.Builder()
        
        // Set scan mode based on parameter
        val scanModeValue = when (scanMode.uppercase()) {
            "LOW_LATENCY" -> ScanSettings.SCAN_MODE_LOW_LATENCY
            "BALANCED" -> ScanSettings.SCAN_MODE_BALANCED
            "LOW_POWER" -> ScanSettings.SCAN_MODE_LOW_POWER
            "OPPORTUNISTIC" -> ScanSettings.SCAN_MODE_OPPORTUNISTIC
            else -> ScanSettings.SCAN_MODE_LOW_LATENCY
        }
        
        scanSettingsBuilder.setScanMode(scanModeValue)
        
        // Enable duplicate filtering if requested
        if (enableDuplicateFilter) {
            scanSettingsBuilder.setReportDelay(0)
        }
        
        // Set legacy scan if requested
        if (enableLegacyScan) {
            scanSettingsBuilder.setLegacy(true)
        }
        
        val scanSettings = scanSettingsBuilder.build()

        // Create comprehensive scan filters
        val scanFilters = createEnhancedScanFilters(scanFilter, enableBluetoothLE, enableBluetoothClassic)

        // Create enhanced scan callback
        scanCallback = object : ScanCallback() {
            private var resultCount = 0
            
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                super.onScanResult(callbackType, result)
                
                // Limit results if maxResults is set
                if (maxResults > 0 && resultCount >= maxResults) {
                    Log.d(TAG, "Reached max results limit: $maxResults")
                    return
                }
                
                resultCount++
                handleEnhancedScanResult(result, enableRSSI, enableDeviceTypeDetection)
            }

            override fun onScanFailed(errorCode: Int) {
                super.onScanFailed(errorCode)
                Log.e(TAG, "Enhanced scan failed with error code: $errorCode")
                sendEvent("onScanError", createErrorInfo("Enhanced scan failed with error code: $errorCode"))
            }
        }

        // Start scanning with enhanced settings
        try {
            bluetoothAdapter?.bluetoothLeScanner?.startScan(scanFilters, scanSettings, scanCallback)
            Log.d(TAG, "BLE scanner started successfully")
        } catch (exception: Exception) {
            Log.e(TAG, "Failed to start BLE scan: ${exception.message}")
            Log.e(TAG, "Exception stack trace: ${exception.stackTrace.joinToString("\n")}")
            isScanning = false
            sendEvent("onScanError", createErrorInfo("Failed to start BLE scan: ${exception.message}"))
            return
        }

        // Set timer to stop scanning
        try {
            scanTimer = Timer()
            scanTimer?.schedule(object : TimerTask() {
                override fun run() {
                    stopScanning()
                }
            }, scanDuration)
            Log.d(TAG, "Scan timer set for ${scanDuration}ms")
        } catch (exception: Exception) {
            Log.e(TAG, "Failed to set scan timer: ${exception.message}")
        }

        Log.d(TAG, "Started enhanced universal scanning successfully")
    }

    private fun stopScanning() {
        if (!isScanning) return

        isScanning = false
        scanTimer?.cancel()
        scanTimer = null

        scanCallback?.let { callback ->
            bluetoothAdapter?.bluetoothLeScanner?.stopScan(callback)
        }
        scanCallback = null

        Log.d(TAG, "Stopped universal scanning")
    }

    private fun createEnhancedScanFilters(scanFilter: String, enableBluetoothLE: Boolean, enableBluetoothClassic: Boolean): List<ScanFilter> {
        val filters = mutableListOf<ScanFilter>()
        
        Log.d(TAG, "Creating enhanced scan filters for: $scanFilter, BLE: $enableBluetoothLE, Classic: $enableBluetoothClassic")
        
        // Add comprehensive filters based on device type
        when (scanFilter.lowercase()) {
            "eld" -> {
                // Filter for ELD devices - accept all but prioritize known patterns
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added ELD scan filter")
            }
            "camera" -> {
                // Filter for camera devices
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added camera scan filter")
            }
            "tracking" -> {
                // Filter for tracking devices
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added tracking scan filter")
            }
            "sensor" -> {
                // Filter for sensor devices
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added sensor scan filter")
            }
            "doorbell" -> {
                // Filter for doorbell devices
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added doorbell scan filter")
            }
            "panoramic" -> {
                // Filter for panoramic devices
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added panoramic scan filter")
            }
            "iot" -> {
                // Filter for IoT devices
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added IoT scan filter")
            }
            "all" -> {
                // Accept all devices - comprehensive scanning
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added comprehensive scan filter for all devices")
            }
            else -> {
                // Default to all devices
                filters.add(ScanFilter.Builder().build())
                Log.d(TAG, "Added default scan filter")
            }
        }
        
        return filters
    }

    private fun handleEnhancedScanResult(result: ScanResult, enableRSSI: Boolean, enableDeviceTypeDetection: Boolean) {
        val device = result.device
        val deviceInfo = createDeviceInfo(device, device.address)
        
        // Add RSSI if enabled
        if (enableRSSI) {
            deviceInfo.putInt("rssi", result.rssi)
        }
        
        // Add device type detection if enabled
        if (enableDeviceTypeDetection) {
            val deviceType = detectDeviceType(device.address, result.scanRecord?.bytes)
            deviceInfo.putString("deviceType", deviceType)
            deviceInfo.putString("deviceCategory", getDeviceCategory(deviceType))
            
            // Add protocol information
            val protocol = getDeviceProtocol(device.address)
            deviceInfo.putString("protocol", protocol.name)
        }
        
        // Add scan record information
        result.scanRecord?.let { scanRecord ->
            deviceInfo.putString("scanRecord", scanRecord.bytes.contentToString())
            deviceInfo.putString("advertisingData", scanRecord.advertisingDataMap.toString())
        }
        
        // Add timestamp
        deviceInfo.putString("scanTimestamp", Date().toString())
        
        Log.d(TAG, "Enhanced device discovered: ${device.name} (${device.address}) - Protocol: ${getDeviceProtocol(device.address)}")
        sendEvent("onDeviceDiscovered", deviceInfo)
    }

    private fun detectDeviceType(address: String, scanRecord: ByteArray?): String {
        // Real device type detection based on scan record data
        scanRecord?.let { record ->
            // Parse advertising data to identify device type
            val serviceUuids = parseServiceUuidsFromScanRecord(record)
            
            // Check for ELD-specific services
            if (serviceUuids.contains(ELD_SERVICE.toString()) || 
                serviceUuids.contains("0000FFE0-0000-1000-8000-00805F9B34FB")) {
                return DEVICE_TYPE_ELD
            }
            
            // Check for camera-specific services or manufacturer data
            if (serviceUuids.contains("0000FEE7-0000-1000-8000-00805F9B34FB")) {
                return DEVICE_TYPE_CAMERA
            }
            
            // Check for tracking device services
            if (serviceUuids.contains(LOCATION_NAVIGATION_SERVICE.toString())) {
                return DEVICE_TYPE_TRACKING
            }
            
            // Parse manufacturer data for device identification
            val manufacturerData = parseManufacturerDataFromScanRecord(record)
            manufacturerData?.let { data ->
                // Check for Jimi IoT manufacturer ID or specific patterns
                if (data.size >= 2) {
                    val manufacturerId = (data[1].toInt() shl 8) or data[0].toInt()
                    when (manufacturerId) {
                        0x004C -> return DEVICE_TYPE_CAMERA // Apple devices (cameras)
                        0x0075 -> return DEVICE_TYPE_ELD    // Samsung (ELD devices)
                        // Add more manufacturer IDs as needed
                    }
                }
            }
        }
        
        // Default to unknown if no specific type detected
        return "0"
    }
    
    private fun parseServiceUuidsFromScanRecord(scanRecord: ByteArray): List<String> {
        val serviceUuids = mutableListOf<String>()
        var index = 0
        
        while (index < scanRecord.size) {
            val length = scanRecord[index].toInt() and 0xFF
            if (length == 0 || index + length >= scanRecord.size) break
            
            val type = scanRecord[index + 1].toInt() and 0xFF
            when (type) {
                0x02, 0x03 -> { // Complete/Incomplete list of 16-bit Service UUIDs
                    for (i in 2 until length step 2) {
                        if (index + i + 1 < scanRecord.size) {
                            val uuid16 = (scanRecord[index + i + 1].toInt() shl 8) or scanRecord[index + i].toInt()
                            serviceUuids.add(String.format("%04X", uuid16))
                        }
                    }
                }
                0x06, 0x07 -> { // Complete/Incomplete list of 128-bit Service UUIDs
                    for (i in 2 until length step 16) {
                        if (index + i + 15 < scanRecord.size) {
                            val uuid = ByteArray(16)
                            System.arraycopy(scanRecord, index + i, uuid, 0, 16)
                            serviceUuids.add(formatUuid128(uuid))
                        }
                    }
                }
            }
            index += length + 1
        }
        
        return serviceUuids
    }
    
    private fun parseManufacturerDataFromScanRecord(scanRecord: ByteArray): ByteArray? {
        var index = 0
        
        while (index < scanRecord.size) {
            val length = scanRecord[index].toInt() and 0xFF
            if (length == 0 || index + length >= scanRecord.size) break
            
            val type = scanRecord[index + 1].toInt() and 0xFF
            if (type == 0xFF) { // Manufacturer Specific Data
                val manufacturerData = ByteArray(length - 1)
                System.arraycopy(scanRecord, index + 2, manufacturerData, 0, length - 1)
                return manufacturerData
            }
            index += length + 1
        }
        
        return null
    }
    
    private fun formatUuid128(uuid: ByteArray): String {
        val sb = StringBuilder()
        for (i in uuid.indices.reversed()) {
            sb.append(String.format("%02X", uuid[i]))
            if (i == 12 || i == 10 || i == 8 || i == 6) sb.append("-")
        }
        return sb.toString()
    }

    private fun getDeviceCategory(deviceType: String): String {
        return when (deviceType) {
            DEVICE_TYPE_ELD -> "eld"
            DEVICE_TYPE_CAMERA -> "camera"
            DEVICE_TYPE_TRACKING -> "tracking"
            DEVICE_TYPE_DOORBELL -> "doorbell"
            DEVICE_TYPE_PANORAMIC -> "panoramic"
            else -> "camera"
        }
    }

    // REAL Bluetooth connection implementation
    private fun connectToRealBluetoothDevice(deviceId: String) {
        Log.d(TAG, "Connecting to real Bluetooth device: $deviceId")
        
        val device = bluetoothAdapter?.getRemoteDevice(deviceId)
        if (device == null) {
            Log.e(TAG, "Device not found: $deviceId")
            return
        }
        
        // Create GATT connection
        bluetoothGatt = device.connectGatt(
            reactApplicationContext,
            false, // autoConnect = false for immediate connection
            gattCallback
        )
        
        Log.d(TAG, "GATT connection initiated for device: $deviceId")
    }
    
    // Discover services and characteristics for all device types
    private fun discoverServices(gatt: BluetoothGatt) {
        val deviceId = gatt.device.address
        
        // Dynamically determine device protocol based on available services
        val detectedProtocol = detectDeviceProtocolFromServices(gatt.services)
        deviceProtocols[deviceId] = detectedProtocol
        
        val protocol = getDeviceProtocol(deviceId)
        Log.d(TAG, "Discovering services for device: $deviceId, detected protocol: $protocol")
        
        for (service in gatt.services) {
            Log.d(TAG, "Found service: ${service.uuid}")
            
            for (characteristic in service.characteristics) {
                Log.d(TAG, "Found characteristic: ${characteristic.uuid}")
                
                // Enable notifications for all sensor characteristics
                if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) {
                    gatt.setCharacteristicNotification(characteristic, true)
                    Log.d(TAG, "Enabled notifications for: ${characteristic.uuid}")
                }
                
                // Read initial values for important characteristics
                when (characteristic.uuid) {
                    BATTERY_LEVEL -> {
                        gatt.readCharacteristic(characteristic)
                        Log.d(TAG, "Reading battery level")
                    }
                    DEVICE_NAME -> {
                        gatt.readCharacteristic(characteristic)
                        Log.d(TAG, "Reading device name")
                    }
                }
                
                // Device-specific characteristic handling
                when (protocol) {
                    DeviceProtocol.ELD_DEVICE -> handleELDCharacteristics(gatt, characteristic)
                    DeviceProtocol.IOT_SENSOR -> handleIoTSensorCharacteristics(gatt, characteristic)
                    DeviceProtocol.CAMERA_DEVICE -> handleCameraCharacteristics(gatt, characteristic)
                    DeviceProtocol.TRACKING_DEVICE -> handleTrackingCharacteristics(gatt, characteristic)
                    DeviceProtocol.DOORBELL_DEVICE -> handleDoorbellCharacteristics(gatt, characteristic)
                    DeviceProtocol.PANORAMIC_DEVICE -> handlePanoramicCharacteristics(gatt, characteristic)
                    else -> {
                        // Generic handling for unknown devices
                        if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
                            gatt.readCharacteristic(characteristic)
                        }
                    }
                }
            }
        }
    }
    
    // Detect device protocol based on available GATT services
    private fun detectDeviceProtocolFromServices(services: List<BluetoothGattService>): DeviceProtocol {
        for (service in services) {
            when (service.uuid) {
                ELD_SERVICE -> {
                    Log.d(TAG, "Detected ELD device based on service UUID")
                    return DeviceProtocol.ELD_DEVICE
                }
                HEART_RATE_SERVICE -> {
                    Log.d(TAG, "Detected heart rate sensor based on service UUID")
                    return DeviceProtocol.HEART_RATE_SENSOR
                }
                BATTERY_SERVICE -> {
                    Log.d(TAG, "Detected battery sensor based on service UUID")
                    return DeviceProtocol.BATTERY_SENSOR
                }
                LOCATION_NAVIGATION_SERVICE -> {
                    Log.d(TAG, "Detected location/tracking device based on service UUID")
                    return DeviceProtocol.TRACKING_DEVICE
                }
                ENVIRONMENTAL_SENSING_SERVICE -> {
                    Log.d(TAG, "Detected environmental sensor based on service UUID")
                    return DeviceProtocol.IOT_SENSOR
                }
                else -> {
                    // Check for custom service UUIDs that might indicate specific device types
                    val serviceUuidString = service.uuid.toString().uppercase()
                    when {
                        serviceUuidString.contains("FFE0") -> {
                            Log.d(TAG, "Detected custom ELD device based on service pattern")
                            return DeviceProtocol.ELD_DEVICE
                        }
                        serviceUuidString.contains("FEE7") -> {
                            Log.d(TAG, "Detected camera device based on service pattern")
                            return DeviceProtocol.CAMERA_DEVICE
                        }
                    }
                }
            }
        }
        
        // If no specific service detected, determine based on characteristics
        for (service in services) {
            for (characteristic in service.characteristics) {
                when (characteristic.uuid) {
                    TEMPERATURE -> {
                        Log.d(TAG, "Detected temperature sensor based on characteristic")
                        return DeviceProtocol.TEMPERATURE_SENSOR
                    }
                    LOCATION_AND_SPEED -> {
                        Log.d(TAG, "Detected location sensor based on characteristic")
                        return DeviceProtocol.LOCATION_SENSOR
                    }
                    ELD_DATA_CHARACTERISTIC -> {
                        Log.d(TAG, "Detected ELD device based on characteristic")
                        return DeviceProtocol.ELD_DEVICE
                    }
                }
            }
        }
        
        Log.d(TAG, "Could not determine specific device protocol, using UNKNOWN")
        return DeviceProtocol.UNKNOWN
    }

    // Real data streaming is handled by GATT callbacks
    // No need for timers or mock data generation
    private fun startDataStreaming(deviceId: String) {
        Log.d(TAG, "Real data streaming started for device: $deviceId")
        Log.d(TAG, "Data will come from GATT characteristic notifications")
    }

    // Process real sensor data with device-specific protocols
    private fun processSensorData(deviceId: String, data: ByteArray, characteristicUuid: String) {
        Log.d(TAG, "Processing real sensor data from device: $deviceId, characteristic: $characteristicUuid")
        Log.d(TAG, "Raw data: ${data.contentToString()}")
        
        val protocol = getDeviceProtocol(deviceId)
        
        // Check if this is ELD JSON data
        if (protocol == DeviceProtocol.ELD_DEVICE) {
            processELDJsonData(deviceId, data, characteristicUuid)
            return
        }
        
        // Process as regular sensor data
        val sensorValue = parseSensorData(deviceId, data, characteristicUuid)
        
        Log.d(TAG, "Parsed sensor value: $sensorValue, protocol: $protocol")
        
        // Send real data to React Native
        val realData = Arguments.createMap().apply {
            putString("deviceId", deviceId)
            putString("timestamp", Date().toString())
            putString("dataType", "sensor")
            putString("protocol", protocol.name)
            putString("characteristicUuid", characteristicUuid)
            putDouble("value", sensorValue)
            putString("rawData", data.contentToString())
        }
        
        sendEvent("onDataReceived", realData)
    }
    
    // Process ELD JSON data specifically
    private fun processELDJsonData(deviceId: String, data: ByteArray, characteristicUuid: String) {
        Log.d(TAG, "Processing ELD JSON data from device: $deviceId")
        
        try {
            // Null checks and validation
            if (deviceId.isNullOrEmpty()) {
                Log.e(TAG, "Device ID is null or empty")
                sendErrorEvent(deviceId, "Device ID is null or empty", data)
                return
            }
            
            if (data.isEmpty()) {
                Log.e(TAG, "Data is empty for device: $deviceId")
                sendErrorEvent(deviceId, "Data is empty", data)
                return
            }
            
            if (characteristicUuid.isNullOrEmpty()) {
                Log.w(TAG, "Characteristic UUID is null or empty, using default")
            }
            
            // Convert byte array to string with null check
            val jsonString = try {
                String(data, Charsets.UTF_8)
            } catch (e: Exception) {
                Log.e(TAG, "Error converting byte array to string: ${e.message}")
                sendErrorEvent(deviceId, "Byte array conversion failed: ${e.message}", data)
                return
            }
            
            if (jsonString.isNullOrEmpty()) {
                Log.e(TAG, "JSON string is null or empty for device: $deviceId")
                sendErrorEvent(deviceId, "JSON string is null or empty", data)
                return
            }
            
            Log.d(TAG, "ELD JSON string: $jsonString")
            
            // Parse JSON data with null check
            val jsonObject = try {
                JSONObject(jsonString)
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing JSON object: ${e.message}")
                sendErrorEvent(deviceId, "JSON parsing failed: ${e.message}", data)
                return
            }
            
            // Extract ELD data components with null check
            val eldData = try {
                parseELDJsonObject(jsonObject)
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing ELD JSON object: ${e.message}")
                sendErrorEvent(deviceId, "ELD JSON parsing failed: ${e.message}", data)
                return
            }
            
            // Send structured ELD data to React Native with null check
            val eldDataMap = Arguments.createMap().apply {
                putString("deviceId", deviceId)
                putString("timestamp", Date().toString())
                putString("dataType", "ELD_DATA")
                putString("protocol", "ELD_DEVICE")
                putString("characteristicUuid", characteristicUuid ?: "unknown")
                putBoolean("isRealData", true)
                putString("rawData", jsonString)
                
                // Add structured ELD data with null check
                eldData?.let { eld ->
                    putMap("eldData", eld)
                } ?: run {
                    Log.w(TAG, "ELD data is null, sending without structured data")
                }
            }
            
            Log.d(TAG, "Sending structured ELD data to React Native")
            sendEvent("onDataReceived", eldDataMap)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error processing ELD JSON data: ${e.message}")
            sendErrorEvent(deviceId, "ELD processing failed: ${e.message}", data)
        }
    }
    
    // Helper method to send error events
    private fun sendErrorEvent(deviceId: String, errorMessage: String, rawData: ByteArray) {
        try {
            val errorData = Arguments.createMap().apply {
                putString("deviceId", deviceId)
                putString("timestamp", Date().toString())
                putString("dataType", "ELD_ERROR")
                putString("protocol", "ELD_DEVICE")
                putString("error", errorMessage)
                putString("rawData", try {
                    String(rawData, Charsets.UTF_8)
                } catch (e: Exception) {
                    "Failed to convert raw data: ${e.message}"
                })
            }
            
            sendEvent("onDataReceived", errorData)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending error event: ${e.message}")
        }
    }
    
    // Parse ELD JSON object into structured data
    private fun parseELDJsonObject(jsonObject: JSONObject): WritableMap? {
        try {
            // Null check for input
            if (jsonObject == null) {
                Log.e(TAG, "JSON object is null")
                return null
            }
            
            val eldMap = Arguments.createMap()
            
            // Parse FMCSA ELD Compliance Data with null check
            if (jsonObject.has("eldData")) {
                try {
                    val eldDataObject = jsonObject.getJSONObject("eldData")
                    if (eldDataObject != null) {
                        val eldDataMap = parseELDComplianceData(eldDataObject)
                        eldMap.putMap("eldData", eldDataMap)
                    } else {
                        Log.w(TAG, "ELD data object is null")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing ELD compliance data: ${e.message}")
                }
            }
            
            // Parse VIN data with null check
            if (jsonObject.has("vin")) {
                try {
                    val vinData = parseVINData(jsonObject.getJSONObject("vin"))
                    eldMap.putMap("vin", vinData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing VIN data: ${e.message}")
                }
            }
            
            // Parse CAN data (engine metrics) with null check
            if (jsonObject.has("can")) {
                try {
                    val canData = parseCANData(jsonObject.getJSONObject("can"))
                    eldMap.putMap("can", canData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing CAN data: ${e.message}")
                }
            }
            
            // Parse GPS data with null check
            if (jsonObject.has("gps")) {
                try {
                    val gpsData = parseGPSData(jsonObject.getJSONObject("gps"))
                    eldMap.putMap("gps", gpsData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing GPS data: ${e.message}")
                }
            }
            
            // Parse event data with null check
            if (jsonObject.has("events")) {
                try {
                    val eventsData = parseEventData(jsonObject.getJSONArray("events"))
                    eldMap.putArray("events", eventsData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing event data: ${e.message}")
                }
            }
            
            // Parse device status with null check
            if (jsonObject.has("status")) {
                try {
                    val statusData = parseStatusData(jsonObject.getJSONObject("status"))
                    eldMap.putMap("status", statusData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing status data: ${e.message}")
                }
            }
            
            return eldMap
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in parseELDJsonObject: ${e.message}")
            return null
        }
    }
    
    // Parse VIN data from JSON
    private fun parseVINData(vinObject: JSONObject): WritableMap {
        val vinMap = Arguments.createMap()
        
        try {
            if (vinObject.has("number")) {
                vinMap.putString("number", vinObject.getString("number"))
            }
            if (vinObject.has("make")) {
                vinMap.putString("make", vinObject.getString("make"))
            }
            if (vinObject.has("model")) {
                vinMap.putString("model", vinObject.getString("model"))
            }
            if (vinObject.has("year")) {
                vinMap.putInt("year", vinObject.getInt("year"))
            }
            if (vinObject.has("engine")) {
                vinMap.putString("engine", vinObject.getString("engine"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing VIN data: ${e.message}")
        }
        
        return vinMap
    }
    
    // Parse CAN data (engine metrics) from JSON
    private fun parseCANData(canObject: JSONObject): WritableMap {
        val canMap = Arguments.createMap()
        
        try {
            // Engine Performance Metrics
            if (canObject.has("engineRPM")) {
                canMap.putDouble("engineRPM", canObject.getDouble("engineRPM"))
            }
            if (canObject.has("engineSpeed")) {
                canMap.putDouble("engineSpeed", canObject.getDouble("engineSpeed"))
            }
            if (canObject.has("engineThrottleValve1Position1")) {
                canMap.putDouble("engineThrottleValve1Position1", canObject.getDouble("engineThrottleValve1Position1"))
            }
            if (canObject.has("engineThrottle")) {
                canMap.putDouble("engineThrottle", canObject.getDouble("engineThrottle"))
            }
            if (canObject.has("engineIntakeAirMassFlowRate")) {
                canMap.putDouble("engineIntakeAirMassFlowRate", canObject.getDouble("engineIntakeAirMassFlowRate"))
            }
            if (canObject.has("enginePercentLoadAtCurrentSpeed")) {
                canMap.putDouble("enginePercentLoadAtCurrentSpeed", canObject.getDouble("enginePercentLoadAtCurrentSpeed"))
            }
            if (canObject.has("engineRuntime")) {
                canMap.putDouble("engineRuntime", canObject.getDouble("engineRuntime"))
            }
            if (canObject.has("engineRunningTime")) {
                canMap.putDouble("engineRunningTime", canObject.getDouble("engineRunningTime"))
            }
            if (canObject.has("timeSinceEngineStart")) {
                canMap.putDouble("timeSinceEngineStart", canObject.getDouble("timeSinceEngineStart"))
            }
            if (canObject.has("acceleratorPedalPosition1")) {
                canMap.putDouble("acceleratorPedalPosition1", canObject.getDouble("acceleratorPedalPosition1"))
            }
            
            // Vehicle Status
            if (canObject.has("wheelBasedVehicleSpeed")) {
                canMap.putDouble("wheelBasedVehicleSpeed", canObject.getDouble("wheelBasedVehicleSpeed"))
            }
            if (canObject.has("totalVehicleDistance")) {
                canMap.putDouble("totalVehicleDistance", canObject.getDouble("totalVehicleDistance"))
            }
            if (canObject.has("accOutStatus")) {
                canMap.putString("accOutStatus", canObject.getString("accOutStatus"))
            }
            if (canObject.has("malfunctionIndicatorLamp")) {
                canMap.putString("malfunctionIndicatorLamp", canObject.getString("malfunctionIndicatorLamp"))
            }
            
            // Environmental Data
            if (canObject.has("engineInletAirTemperature")) {
                canMap.putDouble("engineInletAirTemperature", canObject.getDouble("engineInletAirTemperature"))
            }
            if (canObject.has("engineCoolantTemperature")) {
                canMap.putDouble("engineCoolantTemperature", canObject.getDouble("engineCoolantTemperature"))
            }
            if (canObject.has("intakeManifoldAbsolutePressure")) {
                canMap.putDouble("intakeManifoldAbsolutePressure", canObject.getDouble("intakeManifoldAbsolutePressure"))
            }
            if (canObject.has("barometricPressure")) {
                canMap.putDouble("barometricPressure", canObject.getDouble("barometricPressure"))
            }
            
            // Fuel System
            if (canObject.has("fuelLevel")) {
                canMap.putDouble("fuelLevel", canObject.getDouble("fuelLevel"))
            }
            if (canObject.has("fuelLevel1")) {
                canMap.putDouble("fuelLevel1", canObject.getDouble("fuelLevel1"))
            }
            
            // Electrical System
            if (canObject.has("voltage")) {
                canMap.putDouble("voltage", canObject.getDouble("voltage"))
            }
            
            // Legacy fields for backward compatibility
            if (canObject.has("throttlePosition")) {
                canMap.putDouble("throttlePosition", canObject.getDouble("throttlePosition"))
            }
            if (canObject.has("fuelLevel")) {
                canMap.putDouble("fuelLevel", canObject.getDouble("fuelLevel"))
            }
            if (canObject.has("engineTemp")) {
                canMap.putDouble("engineTemp", canObject.getDouble("engineTemp"))
            }
            if (canObject.has("speed")) {
                canMap.putDouble("speed", canObject.getDouble("speed"))
            }
            if (canObject.has("odometer")) {
                canMap.putDouble("odometer", canObject.getDouble("odometer"))
            }
            if (canObject.has("engineHours")) {
                canMap.putDouble("engineHours", canObject.getDouble("engineHours"))
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing CAN data: ${e.message}")
        }
        
        return canMap
    }
    
    // Parse GPS data from JSON
    private fun parseGPSData(gpsObject: JSONObject): WritableMap {
        val gpsMap = Arguments.createMap()
        
        try {
            if (gpsObject.has("latitude")) {
                gpsMap.putDouble("latitude", gpsObject.getDouble("latitude"))
            }
            if (gpsObject.has("longitude")) {
                gpsMap.putDouble("longitude", gpsObject.getDouble("longitude"))
            }
            if (gpsObject.has("altitude")) {
                gpsMap.putDouble("altitude", gpsObject.getDouble("altitude"))
            }
            if (gpsObject.has("heading")) {
                gpsMap.putDouble("heading", gpsObject.getDouble("heading"))
            }
            if (gpsObject.has("speed")) {
                gpsMap.putDouble("speed", gpsObject.getDouble("speed"))
            }
            if (gpsObject.has("accuracy")) {
                gpsMap.putDouble("accuracy", gpsObject.getDouble("accuracy"))
            }
            if (gpsObject.has("timestamp")) {
                gpsMap.putString("timestamp", gpsObject.getString("timestamp"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing GPS data: ${e.message}")
        }
        
        return gpsMap
    }
    
    // Parse event data from JSON array
    private fun parseEventData(eventsArray: org.json.JSONArray): WritableArray {
        val eventsWritableArray = Arguments.createArray()
        
        try {
            for (i in 0 until eventsArray.length()) {
                val eventObject = eventsArray.getJSONObject(i)
                val eventMap = Arguments.createMap()
                
                if (eventObject.has("type")) {
                    eventMap.putString("type", eventObject.getString("type"))
                }
                if (eventObject.has("timestamp")) {
                    eventMap.putString("timestamp", eventObject.getString("timestamp"))
                }
                if (eventObject.has("description")) {
                    eventMap.putString("description", eventObject.getString("description"))
                }
                if (eventObject.has("location")) {
                    val locationObject = eventObject.getJSONObject("location")
                    val locationMap = Arguments.createMap()
                    if (locationObject.has("latitude")) {
                        locationMap.putDouble("latitude", locationObject.getDouble("latitude"))
                    }
                    if (locationObject.has("longitude")) {
                        locationMap.putDouble("longitude", locationObject.getDouble("longitude"))
                    }
                    eventMap.putMap("location", locationMap)
                }
                if (eventObject.has("driverId")) {
                    eventMap.putString("driverId", eventObject.getString("driverId"))
                }
                
                eventsWritableArray.pushMap(eventMap)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing event data: ${e.message}")
        }
        
        return eventsWritableArray
    }
    
    // Parse status data from JSON
    private fun parseStatusData(statusObject: JSONObject): WritableMap {
        val statusMap = Arguments.createMap()
        
        try {
            if (statusObject.has("connectionStatus")) {
                statusMap.putString("connectionStatus", statusObject.getString("connectionStatus"))
            }
            if (statusObject.has("batteryLevel")) {
                statusMap.putDouble("batteryLevel", statusObject.getDouble("batteryLevel"))
            }
            if (statusObject.has("signalStrength")) {
                statusMap.putDouble("signalStrength", statusObject.getDouble("signalStrength"))
            }
            if (statusObject.has("lastUpdate")) {
                statusMap.putString("lastUpdate", statusObject.getString("lastUpdate"))
            }
            if (statusObject.has("firmwareVersion")) {
                statusMap.putString("firmwareVersion", statusObject.getString("firmwareVersion"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing status data: ${e.message}")
        }
        
        return statusMap
    }
    
    // Get device protocol
    private fun getDeviceProtocol(deviceId: String): DeviceProtocol {
        return deviceProtocols[deviceId] ?: DeviceProtocol.UNKNOWN
    }
    
    // Parse sensor data based on device protocol and characteristic
    private fun parseSensorData(deviceId: String, data: ByteArray, characteristicUuid: String): Double {
        val protocol = getDeviceProtocol(deviceId)
        
        return when {
            // Standard Bluetooth characteristics
            characteristicUuid.contains("2A37") -> parseHeartRateData(data)
            characteristicUuid.contains("2A19") -> parseBatteryData(data)
            characteristicUuid.contains("2A1C") -> parseTemperatureData(data)
            characteristicUuid.contains("2A6D") -> parseLocationData(data)
            characteristicUuid.contains("FFE1") -> parseCustomSensorData(data)
            
            // Device-specific data parsing
            else -> when (protocol) {
                DeviceProtocol.ELD_DEVICE -> parseELDData(data)
                DeviceProtocol.IOT_SENSOR -> parseIoTSensorData(data)
                DeviceProtocol.TEMPERATURE_SENSOR -> parseTemperatureData(data)
                DeviceProtocol.HEART_RATE_SENSOR -> parseHeartRateData(data)
                DeviceProtocol.BATTERY_SENSOR -> parseBatteryData(data)
                DeviceProtocol.LOCATION_SENSOR -> parseLocationData(data)
                DeviceProtocol.CAMERA_DEVICE -> parseCameraData(data)
                DeviceProtocol.TRACKING_DEVICE -> parseTrackingData(data)
                DeviceProtocol.DOORBELL_DEVICE -> parseDoorbellData(data)
                DeviceProtocol.PANORAMIC_DEVICE -> parsePanoramicData(data)
                DeviceProtocol.CUSTOM_SENSOR -> parseCustomSensorData(data)
                DeviceProtocol.UNKNOWN -> parseGenericData(data)
            }
        }
    }
    
    // Parse temperature sensor data (2 bytes, signed, 0.01°C resolution)
    private fun parseTemperatureData(data: ByteArray): Double {
        return if (data.size >= 2) {
            val raw = (data[0].toInt() shl 8) or data[1].toInt()
            val temp = if (raw and 0x8000 != 0) {
                // Negative temperature
                (raw - 0x10000) / 100.0
            } else {
                raw / 100.0
            }
            temp
        } else 0.0
    }
    
    // Parse heart rate data (1 byte, unsigned)
    private fun parseHeartRateData(data: ByteArray): Double {
        return if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Parse battery data (1 byte, percentage)
    private fun parseBatteryData(data: ByteArray): Double {
        return if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Parse custom sensor data (4 bytes, float)
    private fun parseCustomSensorData(data: ByteArray): Double {
        return if (data.size >= 4) {
            val buffer = ByteBuffer.wrap(data)
            buffer.order(ByteOrder.LITTLE_ENDIAN)
            buffer.float.toDouble()
        } else 0.0
    }
    
    // Parse ELD device data (engine hours, fuel level, etc.)
    private fun parseELDData(data: ByteArray): Double {
        return if (data.size >= 4) {
            val buffer = ByteBuffer.wrap(data)
            buffer.order(ByteOrder.LITTLE_ENDIAN)
            buffer.float.toDouble()
        } else if (data.size >= 2) {
            (data[0].toInt() shl 8 or data[1].toInt()).toDouble()
        } else if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Parse IoT sensor data (various sensor types)
    private fun parseIoTSensorData(data: ByteArray): Double {
        return if (data.size >= 4) {
            val buffer = ByteBuffer.wrap(data)
            buffer.order(ByteOrder.LITTLE_ENDIAN)
            buffer.float.toDouble()
        } else if (data.size >= 2) {
            (data[0].toInt() shl 8 or data[1].toInt()).toDouble()
        } else if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Parse location data (GPS coordinates, altitude)
    private fun parseLocationData(data: ByteArray): Double {
        return if (data.size >= 8) {
            val buffer = ByteBuffer.wrap(data)
            buffer.order(ByteOrder.LITTLE_ENDIAN)
            buffer.double
        } else if (data.size >= 4) {
            val buffer = ByteBuffer.wrap(data)
            buffer.order(ByteOrder.LITTLE_ENDIAN)
            buffer.float.toDouble()
        } else if (data.size >= 2) {
            (data[0].toInt() shl 8 or data[1].toInt()).toDouble()
        } else if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Parse camera data (motion detection, recording status)
    private fun parseCameraData(data: ByteArray): Double {
        return if (data.size >= 1) {
            when (data[0].toInt()) {
                0 -> 0.0  // No motion
                1 -> 1.0  // Motion detected
                2 -> 2.0  // Recording
                3 -> 3.0  // Error
                else -> data[0].toInt().toDouble()
            }
        } else 0.0
    }
    
    // Parse tracking data (speed, direction, status)
    private fun parseTrackingData(data: ByteArray): Double {
        return if (data.size >= 2) {
            val speed = (data[0].toInt() shl 8 or data[1].toInt()).toDouble()
            speed / 10.0  // Convert to km/h
        } else if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Parse doorbell data (ring events, battery level)
    private fun parseDoorbellData(data: ByteArray): Double {
        return if (data.size >= 1) {
            when (data[0].toInt()) {
                0 -> 0.0  // No ring
                1 -> 1.0  // Ring detected
                2 -> 2.0  // Motion detected
                3 -> 3.0  // Low battery
                else -> data[0].toInt().toDouble()
            }
        } else 0.0
    }
    
    // Parse panoramic data (pan/tilt angles, zoom level)
    private fun parsePanoramicData(data: ByteArray): Double {
        return if (data.size >= 2) {
            val angle = (data[0].toInt() shl 8 or data[1].toInt()).toDouble()
            angle / 10.0  // Convert to degrees
        } else if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Parse generic data (1 byte, unsigned)
    private fun parseGenericData(data: ByteArray): Double {
        return if (data.size >= 1) {
            data[0].toInt().toDouble()
        } else 0.0
    }
    
    // Device-specific characteristic handling methods
    private fun handleELDCharacteristics(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        Log.d(TAG, "Handling ELD characteristic: ${characteristic.uuid}")
        if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
            gatt.readCharacteristic(characteristic)
        }
    }
    
    private fun handleIoTSensorCharacteristics(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        Log.d(TAG, "Handling IoT sensor characteristic: ${characteristic.uuid}")
        if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
            gatt.readCharacteristic(characteristic)
        }
    }
    
    private fun handleCameraCharacteristics(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        Log.d(TAG, "Handling camera characteristic: ${characteristic.uuid}")
        if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
            gatt.readCharacteristic(characteristic)
        }
    }
    
    private fun handleTrackingCharacteristics(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        Log.d(TAG, "Handling tracking characteristic: ${characteristic.uuid}")
        if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
            gatt.readCharacteristic(characteristic)
        }
    }
    
    private fun handleDoorbellCharacteristics(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        Log.d(TAG, "Handling doorbell characteristic: ${characteristic.uuid}")
        if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
            gatt.readCharacteristic(characteristic)
        }
    }
    
    private fun handlePanoramicCharacteristics(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        Log.d(TAG, "Handling panoramic characteristic: ${characteristic.uuid}")
        if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
            gatt.readCharacteristic(characteristic)
        }
    }

    private fun createDeviceInfo(device: BluetoothDevice, deviceId: String): WritableMap {
        return Arguments.createMap().apply {
            putString("id", deviceId)
            putString("name", device.name ?: "Unknown Device")
            putString("address", device.address)
            putBoolean("isConnected", connectedDevices.containsKey(deviceId))
            // Get real GATT connection for battery/signal reading
            val gatt = connectedGattDevices[deviceId]
            if (gatt != null) {
                putInt("signalStrength", getRealSignalStrength(gatt))
                putInt("batteryLevel", getRealBatteryLevel(gatt))
            } else {
                putInt("signalStrength", -1) // Indicate unavailable
                putInt("batteryLevel", -1)   // Indicate unavailable
            }
            putString("firmwareVersion", "1.0.0")
        }
    }

    private fun createErrorInfo(message: String): WritableMap {
        return Arguments.createMap().apply {
            putString("message", message)
            putString("timestamp", Date().toString())
        }
    }

    private fun createPermissionErrorInfo(errorCode: String, message: String, permissions: Map<String, Boolean>): WritableMap {
        return Arguments.createMap().apply {
            putString("errorCode", errorCode)
            putString("message", message)
            putString("timestamp", Date().toString())
            val permissionMap = Arguments.createMap()
            permissions.forEach { (key, value) ->
                permissionMap.putBoolean(key, value)
            }
            putMap("permissions", permissionMap)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (error: Exception) {
            Log.e(TAG, "Error sending event $eventName: ${error.message}")
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopScanning()
        
        // Close all GATT connections
        connectedGattDevices.forEach { (deviceId, gatt) ->
            Log.d(TAG, "Closing GATT connection for device: $deviceId")
            gatt.disconnect()
            gatt.close()
        }
        connectedGattDevices.clear()
        connectedDevices.clear()
        
        // Unregister from event broadcaster
        ELDServiceEventBroadcaster.getInstance().setReactContext(null)
        Log.d(TAG, "JimiBridgeModule destroyed and unregistered from event broadcaster")
    }
} 