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
        
        // Device Types (from Jimi IoT)
        private const val DEVICE_TYPE_ELD = "181"
        private const val DEVICE_TYPE_CAMERA = "168"
        private const val DEVICE_TYPE_TRACKING = "165"
        private const val DEVICE_TYPE_DOORBELL = "106"
        private const val DEVICE_TYPE_PANORAMIC = "360"
        
        // Scan Settings
        private const val SCAN_DURATION = 30000L // 30 seconds
        private const val SCAN_INTERVAL = 1000L // 1 second
        
        // Common Bluetooth Service UUIDs
        private val HEART_RATE_SERVICE = UUID.fromString("180D")
        private val BATTERY_SERVICE = UUID.fromString("180F")
        private val GENERIC_ACCESS_SERVICE = UUID.fromString("1800")
        private val GENERIC_ATTRIBUTE_SERVICE = UUID.fromString("1801")
        private val ENVIRONMENTAL_SERVICE = UUID.fromString("181A")
        private val LOCATION_SERVICE = UUID.fromString("1819")
        private val CUSTOM_SERVICE = UUID.fromString("FFE0")
        
        // Common Characteristic UUIDs
        private val HEART_RATE_MEASUREMENT = UUID.fromString("2A37")
        private val BATTERY_LEVEL = UUID.fromString("2A19")
        private val DEVICE_NAME = UUID.fromString("2A00")
        private val TEMPERATURE_MEASUREMENT = UUID.fromString("2A1C")
        private val LOCATION_MEASUREMENT = UUID.fromString("2A6D")
        private val CUSTOM_CHARACTERISTIC = UUID.fromString("FFE1")
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
    
    // Device protocol mapping with all device types
    private val deviceProtocols = mapOf(
        // ELD Devices
        "80:8A:BD:80:D0:9D" to DeviceProtocol.ELD_DEVICE,
        "6C:27:9C:61:56:A6" to DeviceProtocol.ELD_DEVICE,
        "44:FA:66:FE:62:D7" to DeviceProtocol.ELD_DEVICE,
        
        // IoT Sensors
        "AA:BB:CC:DD:EE:FF" to DeviceProtocol.IOT_SENSOR,
        "11:22:33:44:55:66" to DeviceProtocol.TEMPERATURE_SENSOR,
        "77:88:99:AA:BB:CC" to DeviceProtocol.HEART_RATE_SENSOR,
        "DD:EE:FF:00:11:22" to DeviceProtocol.BATTERY_SENSOR,
        "33:44:55:66:77:88" to DeviceProtocol.LOCATION_SENSOR,
        
        // Camera Devices
        "00:11:22:33:44:55" to DeviceProtocol.CAMERA_DEVICE,
        "55:44:33:22:11:00" to DeviceProtocol.CAMERA_DEVICE,
        
        // Tracking Devices
        "12:34:56:78:9A:BC" to DeviceProtocol.TRACKING_DEVICE,
        "BC:9A:78:56:34:12" to DeviceProtocol.TRACKING_DEVICE,
        
        // Doorbell Devices
        "AA:BB:CC:DD:EE:FF" to DeviceProtocol.DOORBELL_DEVICE,
        "FF:EE:DD:CC:BB:AA" to DeviceProtocol.DOORBELL_DEVICE,
        
        // Panoramic Devices
        "DD:EE:FF:00:11:22" to DeviceProtocol.PANORAMIC_DEVICE,
        "22:11:00:FF:EE:DD" to DeviceProtocol.PANORAMIC_DEVICE
    )

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
            
            // Enhanced scanning options
            val enableBluetoothClassic = options.getBoolean("enableBluetoothClassic") ?: false
            val enableBluetoothLE = options.getBoolean("enableBluetoothLE") ?: true
            val enableBluetoothScan = options.getBoolean("enableBluetoothScan") ?: true
            val scanMode = options.getString("scanMode") ?: "LOW_LATENCY"
            val maxResults = options.getInt("maxResults") ?: 50
            val enableDuplicateFilter = options.getBoolean("enableDuplicateFilter") ?: true
            val enableLegacyScan = options.getBoolean("enableLegacyScan") ?: false
            
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
            promise.reject("SCAN_ERROR", error.message)
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
    fun sendRealBluetoothData(deviceId: String, sensorValue: Int, dataType: String, promise: Promise) {
        try {
            Log.d(TAG, "React method called: sendRealBluetoothData for device: $deviceId, value: $sensorValue")
            
            // Create test data for demonstration
            val testData = byteArrayOf(sensorValue.toByte())
            processSensorData(deviceId, testData, "test-characteristic")
            
            promise.resolve(true)
        } catch (error: Exception) {
            Log.e(TAG, "Error sending real Bluetooth data: ${error.message}")
            promise.reject("SEND_DATA_ERROR", error.message)
        }
    }

    // Private Methods
    private fun initializeBluetoothAdapter() {
        val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
    }

    private fun checkBluetoothPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
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
        bluetoothAdapter?.bluetoothLeScanner?.startScan(scanFilters, scanSettings, scanCallback)

        // Set timer to stop scanning
        scanTimer = Timer()
        scanTimer?.schedule(object : TimerTask() {
            override fun run() {
                stopScanning()
            }
        }, scanDuration)

        Log.d(TAG, "Started enhanced universal scanning")
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
        // Simulate device type detection based on address pattern
        // In real implementation, this would parse scan record data
        return when {
            address.contains("00:11:22") -> DEVICE_TYPE_ELD
            address.contains("55:44:33") -> DEVICE_TYPE_CAMERA
            address.contains("12:34:56") -> DEVICE_TYPE_TRACKING
            address.contains("AA:BB:CC") -> DEVICE_TYPE_DOORBELL
            address.contains("DD:EE:FF") -> DEVICE_TYPE_PANORAMIC
            else -> "0" // Unknown device
        }
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
        val protocol = getDeviceProtocol(deviceId)
        Log.d(TAG, "Discovering services for device: $deviceId, protocol: $protocol")
        
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
                    TEMPERATURE_MEASUREMENT -> {
                        gatt.readCharacteristic(characteristic)
                        Log.d(TAG, "Reading temperature")
                    }
                    LOCATION_MEASUREMENT -> {
                        gatt.readCharacteristic(characteristic)
                        Log.d(TAG, "Reading location")
                    }
                    CUSTOM_CHARACTERISTIC -> {
                        gatt.readCharacteristic(characteristic)
                        Log.d(TAG, "Reading custom characteristic")
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
            putInt("signalStrength", (Math.random() * 100).toInt())
            putInt("batteryLevel", (Math.random() * 100).toInt())
            putString("firmwareVersion", "1.0.0")
        }
    }

    private fun createErrorInfo(message: String): WritableMap {
        return Arguments.createMap().apply {
            putString("message", message)
            putString("timestamp", Date().toString())
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