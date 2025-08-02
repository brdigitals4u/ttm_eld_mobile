package com.ttm.TTMKonnect

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
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
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var isScanning = false
    private var connectedDevices = mutableMapOf<String, BluetoothDevice>()
    private var scanCallback: ScanCallback? = null
    private var scanTimer: Timer? = null

    init {
        // Register this React context with the event broadcaster
        ELDServiceEventBroadcaster.getInstance().setReactContext(reactContext)
        Log.d(TAG, "JimiBridgeModule initialized and registered with event broadcaster")
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
            
            startScanning(scanFilter, scanDuration, enableRSSI, enableDeviceTypeDetection)
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
            
            // Simulate connection process (in real implementation, this would use TUTK IOTC)
            simulateDeviceConnection(deviceId, uid, deviceType, deviceCategory)
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
            
            val device = connectedDevices[deviceId]
            if (device != null) {
                // Simulate disconnection
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

    private fun startScanning(scanFilter: String, scanDuration: Long, enableRSSI: Boolean, enableDeviceTypeDetection: Boolean) {
        if (isScanning) {
            Log.w(TAG, "Scan already in progress")
            return
        }

        isScanning = true
        
        // Create scan settings
        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        // Create scan filters based on device type
        val scanFilters = createScanFilters(scanFilter)

        // Create scan callback
        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                super.onScanResult(callbackType, result)
                handleScanResult(result, enableRSSI, enableDeviceTypeDetection)
            }

            override fun onScanFailed(errorCode: Int) {
                super.onScanFailed(errorCode)
                Log.e(TAG, "Scan failed with error code: $errorCode")
                sendEvent("onScanError", createErrorInfo("Scan failed with error code: $errorCode"))
            }
        }

        // Start scanning
        bluetoothAdapter?.bluetoothLeScanner?.startScan(scanFilters, scanSettings, scanCallback)

        // Set timer to stop scanning
        scanTimer = Timer()
        scanTimer?.schedule(object : TimerTask() {
            override fun run() {
                stopScanning()
            }
        }, scanDuration)

        Log.d(TAG, "Started universal scanning")
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

    private fun createScanFilters(scanFilter: String): List<ScanFilter> {
        val filters = mutableListOf<ScanFilter>()
        
        // Add filters based on device type
        when (scanFilter) {
            "eld" -> {
                // Filter for ELD devices (type 181)
                filters.add(ScanFilter.Builder().build()) // Accept all for now
            }
            "camera" -> {
                // Filter for camera devices (type 168)
                filters.add(ScanFilter.Builder().build()) // Accept all for now
            }
            "tracking" -> {
                // Filter for tracking devices (type 165)
                filters.add(ScanFilter.Builder().build()) // Accept all for now
            }
            else -> {
                // Accept all devices
                filters.add(ScanFilter.Builder().build())
            }
        }
        
        return filters
    }

    private fun handleScanResult(result: ScanResult, enableRSSI: Boolean, enableDeviceTypeDetection: Boolean) {
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
        }
        
        Log.d(TAG, "Device discovered: ${device.name} (${device.address})")
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

    private fun simulateDeviceConnection(deviceId: String, uid: String?, deviceType: String?, deviceCategory: String?) {
        // Simulate connection process
        Log.d(TAG, "Simulating connection to device: $deviceId")
        
        // In real implementation, this would use TUTK IOTC connection
        // For now, we'll simulate the connection
        
        val deviceInfo = Arguments.createMap().apply {
            putString("id", deviceId)
            putString("name", "Connected Device")
            putString("address", deviceId)
            putString("uid", uid)
            putString("deviceType", deviceType)
            putString("deviceCategory", deviceCategory)
            putBoolean("isConnected", true)
            putInt("signalStrength", 85)
            putInt("batteryLevel", 90)
            putString("firmwareVersion", "1.0.0")
        }
        
        // Add to connected devices
        val mockDevice = bluetoothAdapter?.getRemoteDevice(deviceId)
        if (mockDevice != null) {
            connectedDevices[deviceId] = mockDevice
        }
        
        // Send connection event
        sendEvent("onDeviceConnected", deviceInfo)
        
        // Simulate data streaming
        startDataStreaming(deviceId)
    }

    private fun startDataStreaming(deviceId: String) {
        // Simulate periodic data updates
        Timer().scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                if (connectedDevices.containsKey(deviceId)) {
                    val data = createDataStream(deviceId)
                    sendEvent("onDataReceived", data)
                } else {
                    this.cancel()
                }
            }
        }, 1000, 5000) // Send data every 5 seconds
    }

    private fun createDataStream(deviceId: String): WritableMap {
        return Arguments.createMap().apply {
            putString("deviceId", deviceId)
            putString("timestamp", Date().toString())
            putString("dataType", "sensor")
            putInt("value", (Math.random() * 100).toInt())
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
        connectedDevices.clear()
        
        // Unregister from event broadcaster
        ELDServiceEventBroadcaster.getInstance().setReactContext(null)
        Log.d(TAG, "JimiBridgeModule destroyed and unregistered from event broadcaster")
    }
} 