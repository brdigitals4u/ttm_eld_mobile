package com.ttm.TTMKonnect

import android.Manifest
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class EnhancedBLEManager(private val context: ReactApplicationContext) {
    companion object {
        private const val TAG = "EnhancedBLEManager"
        private const val SCAN_PERIOD = 30000L // 30 seconds
        private const val RECONNECT_DELAY = 5000L // 5 seconds
        private const val MAX_RECONNECT_ATTEMPTS = 3
    }

    // BLE Components
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothGatt: BluetoothGatt? = null
    private var scanCallback: ScanCallback? = null
    
    // State Management
    private var isScanning = false
    private var isConnecting = false
    private var currentDevice: BluetoothDevice? = null
    private var reconnectAttempts = 0
    private var isBackgroundMode = false
    
    // Threading
    private val mainHandler = Handler(Looper.getMainLooper())
    private val backgroundExecutor: ScheduledExecutorService = Executors.newScheduledThreadPool(2)
    private val connectedDevices = ConcurrentHashMap<String, BluetoothGatt>()
    
    // Data Processing
    private val dataProcessors = mutableMapOf<String, DataProcessor>()
    private val connectionCallbacks = mutableMapOf<String, ConnectionCallback>()

    interface ConnectionCallback {
        fun onConnected(device: BluetoothDevice)
        fun onDisconnected(device: BluetoothDevice)
        fun onError(device: BluetoothDevice, error: String)
        fun onDataReceived(device: BluetoothDevice, data: ByteArray)
    }

    interface DataProcessor {
        fun processData(data: ByteArray): Map<String, Any>
        fun getDeviceType(): String
    }

    init {
        initializeBluetoothAdapter()
        setupBackgroundProcessing()
    }

    // Initialization
    private fun initializeBluetoothAdapter() {
        try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null) {
                Log.e(TAG, "Bluetooth not supported on this device")
                sendEvent("onBluetoothError", createErrorInfo("Bluetooth not supported"))
            }
        } catch (error: Exception) {
            Log.e(TAG, "Failed to initialize Bluetooth adapter: ${error.message}")
            sendEvent("onBluetoothError", createErrorInfo("Failed to initialize Bluetooth"))
        }
    }

    // Enhanced Scanning with Background Support
    fun startEnhancedScan(options: ReadableMap, promise: Promise) {
        try {
            if (!checkPermissions()) {
                promise.reject("PERMISSION_DENIED", "Bluetooth permissions required")
                return
            }

            if (bluetoothAdapter?.isEnabled == false) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth is not enabled")
                return
            }

            val scanFilter = options.getString("scanFilter") ?: "all"
            val enableBackgroundScan = options.getBoolean("enableBackgroundScan")
            val scanDuration = options.getInt("scanDuration").toLong()

            isBackgroundMode = enableBackgroundScan
            startScanning(scanFilter, scanDuration)
            promise.resolve(true)

        } catch (error: Exception) {
            Log.e(TAG, "Error starting enhanced scan: ${error.message}")
            promise.reject("SCAN_ERROR", error.message)
        }
    }

    private fun startScanning(scanFilter: String, scanDuration: Long) {
        if (isScanning) {
            Log.w(TAG, "Scan already in progress")
            return
        }

        isScanning = true
        
        // Enhanced scan settings for better performance
        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0) // Immediate reporting
            .setNumOfMatches(ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT)
            .setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
            .build()

        // Create scan filters based on device type
        val scanFilters = createEnhancedScanFilters(scanFilter)

        // Enhanced scan callback with comprehensive error handling
        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                super.onScanResult(callbackType, result)
                handleEnhancedScanResult(result)
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                super.onBatchScanResults(results)
                results.forEach { handleEnhancedScanResult(it) }
            }

            override fun onScanFailed(errorCode: Int) {
                super.onScanFailed(errorCode)
                val errorMessage = when (errorCode) {
                    SCAN_FAILED_ALREADY_STARTED -> "Scan already started"
                    SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "Application registration failed"
                    SCAN_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                    SCAN_FAILED_INTERNAL_ERROR -> "Internal error"
                    SCAN_FAILED_OUT_OF_HARDWARE_RESOURCES -> "Out of hardware resources"
                    else -> "Unknown scan error: $errorCode"
                }
                Log.e(TAG, "Scan failed: $errorMessage")
                sendEvent("onScanError", createErrorInfo(errorMessage))
                isScanning = false
            }
        }

        // Start scanning with enhanced error handling
        try {
            bluetoothAdapter?.bluetoothLeScanner?.startScan(scanFilters, scanSettings, scanCallback)
            Log.d(TAG, "Started enhanced scanning with filter: $scanFilter")
            
            // Auto-stop scanning after duration
            mainHandler.postDelayed({
                stopEnhancedScan()
            }, scanDuration)
            
        } catch (error: Exception) {
            Log.e(TAG, "Failed to start scanning: ${error.message}")
            sendEvent("onScanError", createErrorInfo("Failed to start scanning: ${error.message}"))
            isScanning = false
        }
    }

    private fun createEnhancedScanFilters(scanFilter: String): List<ScanFilter> {
        val filters = mutableListOf<ScanFilter>()
        
        when (scanFilter) {
            "eld" -> {
                // ELD-specific filters - using setDeviceName for exact match
                filters.add(ScanFilter.Builder()
                    .setDeviceName("ELD")
                    .build())
                filters.add(ScanFilter.Builder()
                    .setDeviceName("KD")
                    .build())
            }
            "camera" -> {
                // Camera-specific filters
                filters.add(ScanFilter.Builder()
                    .setDeviceName("CAM")
                    .build())
            }
            "tracking" -> {
                // Tracking-specific filters
                filters.add(ScanFilter.Builder()
                    .setDeviceName("GPS")
                    .build())
            }
            else -> {
                // Accept all devices
                filters.add(ScanFilter.Builder().build())
            }
        }
        
        return filters
    }

    private fun handleEnhancedScanResult(result: ScanResult) {
        val device = result.device
        val deviceInfo = createEnhancedDeviceInfo(device, result)
        
        // Process scan record for additional information
        result.scanRecord?.let { scanRecord ->
            val manufacturerData = scanRecord.manufacturerSpecificData
            val serviceData = scanRecord.serviceData
            
            deviceInfo.putString("manufacturerData", manufacturerData?.toString())
            deviceInfo.putString("serviceData", serviceData?.toString())
        }
        
        Log.d(TAG, "Enhanced device discovered: ${device.name} (${device.address}) RSSI: ${result.rssi}")
        sendEvent("onDeviceDiscovered", deviceInfo)
    }

    // Enhanced Connection Management
    fun connectToDeviceEnhanced(options: ReadableMap, promise: Promise) {
        try {
            val deviceId = options.getString("deviceId")
            val deviceType = options.getString("deviceType")
            val enableAutoReconnect = options.getBoolean("enableAutoReconnect")
            
            if (deviceId == null) {
                promise.reject("INVALID_DEVICE", "Device ID is required")
                return
            }

            val device = bluetoothAdapter?.getRemoteDevice(deviceId)
            if (device == null) {
                promise.reject("DEVICE_NOT_FOUND", "Device not found")
                return
            }

            currentDevice = device
            isConnecting = true
            reconnectAttempts = 0

            // Enhanced connection with timeout and retry logic
            connectWithRetry(device, enableAutoReconnect)
            promise.resolve(true)

        } catch (error: Exception) {
            Log.e(TAG, "Error connecting to device: ${error.message}")
            promise.reject("CONNECTION_ERROR", error.message)
        }
    }

    private fun connectWithRetry(device: BluetoothDevice, enableAutoReconnect: Boolean) {
        try {
            // Disconnect existing connection if any
            bluetoothGatt?.disconnect()
            bluetoothGatt = null

            // Create new GATT connection with enhanced callback
            bluetoothGatt = device.connectGatt(context, false, object : BluetoothGattCallback() {
                override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                    when (newState) {
                        BluetoothProfile.STATE_CONNECTED -> {
                            Log.d(TAG, "Connected to device: ${device.address}")
                            isConnecting = false
                            reconnectAttempts = 0
                            
                            // Discover services
                            gatt.discoverServices()
                            
                            // Add to connected devices
                            connectedDevices[device.address] = gatt
                            
                            // Send connection event
                            sendEvent("onDeviceConnected", createEnhancedDeviceInfo(device, null))
                            
                            // Setup auto-reconnect if enabled
                            if (enableAutoReconnect) {
                                setupAutoReconnect(device)
                            }
                        }
                        
                        BluetoothProfile.STATE_DISCONNECTED -> {
                            Log.d(TAG, "Disconnected from device: ${device.address}")
                            isConnecting = false
                            
                            // Remove from connected devices
                            connectedDevices.remove(device.address)
                            
                            // Send disconnection event
                            sendEvent("onDeviceDisconnected", createEnhancedDeviceInfo(device, null))
                            
                            // Attempt reconnection if enabled and within limits
                            if (enableAutoReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                                reconnectAttempts++
                                mainHandler.postDelayed({
                                    connectWithRetry(device, enableAutoReconnect)
                                }, RECONNECT_DELAY)
                            }
                        }
                    }
                }

                override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        Log.d(TAG, "Services discovered for device: ${device.address}")
                        setupDataStreaming(gatt)
                    } else {
                        Log.e(TAG, "Service discovery failed: $status")
                    }
                }

                override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
                    super.onCharacteristicChanged(gatt, characteristic)
                    
                    // Process received data
                    val data = characteristic.value
                    processReceivedData(device, data)
                }

                override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        val data = characteristic.value
                        processReceivedData(device, data)
                    }
                }
            })

        } catch (error: Exception) {
            Log.e(TAG, "Failed to connect to device: ${error.message}")
            isConnecting = false
            sendEvent("onConnectionError", createErrorInfo("Failed to connect: ${error.message}"))
        }
    }

    private fun setupDataStreaming(gatt: BluetoothGatt) {
        // Enable notifications for all characteristics
        gatt.services.forEach { service ->
            service.characteristics.forEach { characteristic ->
                if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) {
                    gatt.setCharacteristicNotification(characteristic, true)
                    
                    // Find descriptor and enable notifications
                    characteristic.descriptors.forEach { descriptor ->
                        if (descriptor.uuid == UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")) {
                            descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                            gatt.writeDescriptor(descriptor)
                        }
                    }
                }
            }
        }
    }

    private fun processReceivedData(device: BluetoothDevice, data: ByteArray) {
        // Process data in background thread
        backgroundExecutor.execute {
            try {
                // Create data info
                val dataInfo = Arguments.createMap().apply {
                    putString("deviceId", device.address)
                    putString("timestamp", Date().toString())
                    putString("dataType", "raw")
                    putArray("data", Arguments.fromArray(data.toTypedArray()))
                }
                
                // Send data event
                sendEvent("onDataReceived", dataInfo)
                
                // Process with device-specific processor
                val processor = dataProcessors[device.address]
                processor?.let {
                    val processedData = it.processData(data)
                    val processedDataMap = Arguments.createMap()
                    processedData.forEach { (key, value) ->
                        when (value) {
                            is String -> processedDataMap.putString(key, value)
                            is Number -> processedDataMap.putDouble(key, value.toDouble())
                            is Boolean -> processedDataMap.putBoolean(key, value)
                            else -> processedDataMap.putString(key, value.toString())
                        }
                    }
                    val processedInfo = Arguments.createMap().apply {
                        putString("deviceId", device.address)
                        putString("deviceType", it.getDeviceType())
                        putString("timestamp", Date().toString())
                        putMap("processedData", processedDataMap)
                    }
                    sendEvent("onProcessedDataReceived", processedInfo)
                }
                
            } catch (error: Exception) {
                Log.e(TAG, "Error processing received data: ${error.message}")
            }
        }
    }

    private fun setupAutoReconnect(device: BluetoothDevice) {
        // Monitor connection state and attempt reconnection
        backgroundExecutor.scheduleAtFixedRate({
            val gatt = connectedDevices[device.address]
            if (gatt == null && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                Log.d(TAG, "Attempting to reconnect to device: ${device.address}")
                reconnectAttempts++
                mainHandler.post {
                    connectWithRetry(device, true)
                }
            }
        }, 10, 10, TimeUnit.SECONDS)
    }

    // Background Processing Setup
    private fun setupBackgroundProcessing() {
        // Setup background data processing
        backgroundExecutor.scheduleAtFixedRate({
            // Monitor connected devices
            connectedDevices.forEach { (deviceId, gatt) ->
                if (!gatt.services.isEmpty()) {
                    // Read device information periodically
                    gatt.services.forEach { service ->
                        service.characteristics.forEach { characteristic ->
                            if (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
                                gatt.readCharacteristic(characteristic)
                            }
                        }
                    }
                }
            }
        }, 5, 30, TimeUnit.SECONDS)
    }

    // Utility Methods
    private fun checkPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun createEnhancedDeviceInfo(device: BluetoothDevice, scanResult: ScanResult?): WritableMap {
        return Arguments.createMap().apply {
            putString("id", device.address)
            putString("name", device.name ?: "Unknown Device")
            putString("address", device.address)
            putBoolean("isConnected", connectedDevices.containsKey(device.address))
            putInt("bondState", device.bondState)
            putInt("deviceType", device.type)
            
            scanResult?.let { result ->
                putInt("rssi", result.rssi)
                putInt("txPower", result.txPower)
            }
            
            // Enhanced device information
            putString("deviceClass", device.bluetoothClass?.toString())
            putString("uuids", device.uuids?.joinToString(","))
        }
    }

    private fun createErrorInfo(message: String): WritableMap {
        return Arguments.createMap().apply {
            putString("message", message)
            putString("timestamp", Date().toString())
            putString("errorType", "BLE_ERROR")
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (error: Exception) {
            Log.e(TAG, "Error sending event $eventName: ${error.message}")
        }
    }

    // Public API Methods
    fun stopEnhancedScan() {
        if (!isScanning) return
        
        isScanning = false
        scanCallback?.let { callback ->
            bluetoothAdapter?.bluetoothLeScanner?.stopScan(callback)
        }
        scanCallback = null
        
        Log.d(TAG, "Stopped enhanced scanning")
    }

    fun disconnectDevice(deviceId: String) {
        val gatt = connectedDevices[deviceId]
        gatt?.disconnect()
        connectedDevices.remove(deviceId)
    }

    fun addDataProcessor(deviceId: String, processor: DataProcessor) {
        dataProcessors[deviceId] = processor
    }

    fun addConnectionCallback(deviceId: String, callback: ConnectionCallback) {
        connectionCallbacks[deviceId] = callback
    }

    fun cleanup() {
        stopEnhancedScan()
        connectedDevices.values.forEach { it.disconnect() }
        connectedDevices.clear()
        backgroundExecutor.shutdown()
    }
} 