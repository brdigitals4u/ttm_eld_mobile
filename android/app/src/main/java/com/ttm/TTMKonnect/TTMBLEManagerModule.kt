package com.ttm.TTMKonnect

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log // Added for logging

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

// TTM SDK Imports based on the actual SDK structure
import com.jimi.ble.BluetoothLESDK
import com.jimi.ble.interfaces.OnBluetoothGattCallback
import com.jimi.ble.interfaces.OnBluetoothScanCallback
import com.jimi.ble.interfaces.ProtocolParseData
import com.jimi.ble.entity.BleDevice
import com.jimi.ble.entity.parse.BtParseData
import com.jimi.ble.entity.parse.EtParseData
import com.jimi.ble.entity.parse.IotParseData
import com.jimi.ble.entity.parse.NfParseData
import com.jimi.ble.entity.parse.SimpleParserData
import com.jimi.ble.BluetoothConfig
import com.jimi.ble.protocol.ObdProtocol


class TTMBLEManagerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var bleSDK: BluetoothLESDK? = null
    private val TAG = "TTMBLEManagerModule"
    
    // Direct Android BLE scanning
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeScanner: BluetoothLeScanner? = null
    private var isDirectScanning = false
    private var isTTMScanning = false
    private var scanStartTime: Long = 0
    private var expectedScanDuration: Long = 0
    private val handler = Handler(Looper.getMainLooper())
    
    init {
        Log.d(TAG, "TTMBLEManagerModule initialized")
    }

    override fun canOverrideExistingModule(): Boolean {
        return true
    }

    companion object {
        const val ON_DEVICE_SCANNED = "onDeviceScanned"
        const val ON_SCAN_STOP = "onScanStop"
        const val ON_SCAN_FINISH = "onScanFinish"
        const val ON_CONNECTED = "onConnected"
        const val ON_DISCONNECTED = "onDisconnected"
        const val ON_CONNECT_FAILURE = "onConnectFailure"
        const val ON_AUTHENTICATION_PASSED = "onAuthenticationPassed"
        const val ON_NOTIFY_RECEIVED = "onNotifyReceived"

        const val ON_PASSWORD_STATE_CHECKED = "onPasswordStateChecked"
        const val ON_PASSWORD_VERIFY_RESULT = "onPasswordVerifyResult"
        const val ON_PASSWORD_SET_RESULT = "onPasswordSetResult"

        const val ON_HISTORY_PROGRESS = "onHistoryProgress"
        const val ON_HISTORY_DATA = "onHistoryData"
        const val ON_TERMINAL_INFO = "onTerminalInfo"
        const val ON_DATA_ITEM_CONFIG = "onDataItemConfig"
        const val ON_CUSTOM_COMMAND_REPLY = "onCustomCommandReply"
        const val ON_DRIVER_AUTH_INFO = "onDriverAuthInfo"
    }

    override fun getName(): String {
        Log.d(TAG, "getName() called, returning: TTMBLEManager")
        return "TTMBLEManager"
    }

    override fun getConstants(): Map<String, Any> {
        Log.d(TAG, "getConstants() called")
        val constants = mapOf(
            "ON_DEVICE_SCANNED" to ON_DEVICE_SCANNED,
            "ON_SCAN_STOP" to ON_SCAN_STOP,
            "ON_SCAN_FINISH" to ON_SCAN_FINISH,
            "ON_CONNECTED" to ON_CONNECTED,
            "ON_DISCONNECTED" to ON_DISCONNECTED,
            "ON_CONNECT_FAILURE" to ON_CONNECT_FAILURE,
            "ON_AUTHENTICATION_PASSED" to ON_AUTHENTICATION_PASSED,
            "ON_NOTIFY_RECEIVED" to ON_NOTIFY_RECEIVED,
            "ON_PASSWORD_STATE_CHECKED" to ON_PASSWORD_STATE_CHECKED,
            "ON_PASSWORD_VERIFY_RESULT" to ON_PASSWORD_VERIFY_RESULT,
            "ON_PASSWORD_SET_RESULT" to ON_PASSWORD_SET_RESULT,
            "ON_HISTORY_PROGRESS" to ON_HISTORY_PROGRESS,
            "ON_HISTORY_DATA" to ON_HISTORY_DATA,
            "ON_TERMINAL_INFO" to ON_TERMINAL_INFO,
            "ON_DATA_ITEM_CONFIG" to ON_DATA_ITEM_CONFIG,
            "ON_CUSTOM_COMMAND_REPLY" to ON_CUSTOM_COMMAND_REPLY,
            "ON_DRIVER_AUTH_INFO" to ON_DRIVER_AUTH_INFO
        )
        Log.d(TAG, "getConstants() returning: $constants")
        return constants
    }

    private fun sendEvent(eventName: String, data: WritableMap?) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(eventName, data)
    }

    // --- GATT Callback Listener (onGattCallback) ---
    private val gattCallback = object : OnBluetoothGattCallback.ParsedBluetoothGattCallback() {
        override fun onConnected() {
            Log.d(TAG, "onConnected - Device connected successfully")
            sendEvent(ON_CONNECTED, null)
        }

        override fun onAuthenticationPassed() {
            Log.d(TAG, "onAuthenticationPassed - Device authenticated, ready for data transmission")
            sendEvent(ON_AUTHENTICATION_PASSED, null)
        }

        override fun onDisconnect() {
            Log.d(TAG, "onDisconnect - Device disconnected")
            sendEvent(ON_DISCONNECTED, null)
        }

        override fun onConnectFailure(status: Int) {
            Log.d(TAG, "onConnectFailure: $status - Connection failed")
            val payload = Arguments.createMap()
            payload.putInt("status", status)
            payload.putString("message", "Connection failed with status: $status")
            sendEvent(ON_CONNECT_FAILURE, payload)
            bleSDK?.release()
        }
        
        override fun onNotifyReceived(data: ProtocolParseData) {
            Log.d(TAG, "=== onNotifyReceived - Real-time data received ===")
            Log.d(TAG, "Data class: ${data.javaClass.simpleName}")
            Log.d(TAG, "Data toString: ${data.toString()}")
            
            try {
                if (data is BtParseData) {
                    Log.d(TAG, "Processing BtParseData for real-time display")
                    Log.d(TAG, "BtParseData ack: ${data.ack}")
                    
                    // Handle real-time ELD data like Jimi IoT app
                    when (data.ack) {
                        0x10 -> { // ACK_OBD_ELD_START
                            Log.d(TAG, "ELD data transmission started")
                        }
                        0x11 -> { // ACK_OBD_ELD_PROCESS
                            Log.d(TAG, "Real-time ELD data received - sending to UI")
                            // Note: replyReceivedEldData method not available in this SDK version
                            Log.d(TAG, "Skipping reply to ELD data (method not implemented)")
                        }
                        0x12 -> { // ACK_OBD_ELD_FINISH
                            Log.d(TAG, "ELD data transmission finished")
                        }
                        0x04 -> { // ACK_OBD_REQUEST_TIME
                            Log.d(TAG, "Device requesting UTC time - sending current time")
                            // Note: sendUTCTime method not available in this SDK version
                            Log.d(TAG, "Skipping UTC time send (method not implemented)")
                        }
                        else -> {
                            Log.d(TAG, "Other ACK code: ${data.ack}")
                        }
                    }
                    
                    val payload = Arguments.createMap().apply {
                        putString("dataType", "BtParseData")
                        putString("rawData", data.toString())
                        putInt("ack", data.ack)
                        putBoolean("isRealTime", true)
                    }
                    Log.d(TAG, "Sending real-time BtParseData to JavaScript UI")
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                } else if (data is EtParseData) {
                    Log.d(TAG, "Processing EtParseData for real-time display")
                    val payload = Arguments.createMap().apply {
                        putString("dataType", "EtParseData")
                        putString("rawData", data.toString())
                        putBoolean("isRealTime", true)
                    }
                    Log.d(TAG, "Sending real-time EtParseData to JavaScript UI")
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                } else if (data is IotParseData) {
                    Log.d(TAG, "Processing IotParseData for real-time display")
                    val payload = Arguments.createMap().apply {
                        putString("dataType", "IotParseData")
                        putString("rawData", data.toString())
                        putBoolean("isRealTime", true)
                    }
                    Log.d(TAG, "Sending real-time IotParseData to JavaScript UI")
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                } else if (data is NfParseData) {
                    Log.d(TAG, "Processing NfParseData for real-time display")
                    val payload = Arguments.createMap().apply {
                        putString("dataType", "NfParseData")
                        putString("rawData", data.toString())
                        putBoolean("isRealTime", true)
                    }
                    Log.d(TAG, "Sending real-time NfParseData to JavaScript UI")
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                } else if (data is SimpleParserData) {
                    Log.d(TAG, "Processing SimpleParserData for real-time display")
                    val payload = Arguments.createMap().apply {
                        putString("dataType", "SimpleParserData")
                        putString("rawData", data.toString())
                        putBoolean("isRealTime", true)
                    }
                    Log.d(TAG, "Sending real-time SimpleParserData to JavaScript UI")
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                } else {
                    Log.d(TAG, "Processing other data type: ${data.javaClass.simpleName}")
                    val payload = Arguments.createMap().apply {
                        putString("dataType", data.javaClass.simpleName)
                        putString("rawData", data.toString())
                        putBoolean("isRealTime", true)
                    }
                    Log.d(TAG, "Sending real-time ${data.javaClass.simpleName} to JavaScript UI")
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                }
                Log.d(TAG, "=== Real-time data processing completed ===")
            } catch (e: Exception) {
                Log.e(TAG, "Error processing real-time data", e)
                val errorPayload = Arguments.createMap().apply {
                    putString("error", e.message)
                    putString("dataType", "unknown")
                    putString("rawData", "Error processing data: ${e.message}")
                    putBoolean("isRealTime", true)
                }
                sendEvent(ON_NOTIFY_RECEIVED, errorPayload)
            }
        }
    }

    // --- Scan Callback Listener with early termination detection ---
    private val scanCallback = object : OnBluetoothScanCallback {
        override fun onScan(device: BleDevice, scanRecord: ByteArray) {
            // Enhanced device name handling
            val deviceName = when {
                !device.name.isNullOrBlank() -> device.name
                else -> extractDeviceNameFromScanRecord(scanRecord) ?: "Unnamed Device"
            }
            
            Log.d(TAG, "TTM SDK onScan - Device found: $deviceName (${device.address}) Signal: ${device.signal}")
            Log.d(TAG, "TTM SDK - Scan record length: ${scanRecord.size} bytes")
            Log.d(TAG, "TTM SDK - Original device name: '${device.name}', Final name: '$deviceName'")
            
            // Log ALL devices including headphones for debugging
            val deviceNameLower = deviceName?.lowercase() ?: ""
            if (deviceNameLower.contains("headphone") || 
                deviceNameLower.contains("earbud") || 
                deviceNameLower.contains("airpod") ||
                deviceNameLower.contains("galaxy") ||
                deviceNameLower.contains("sony") ||
                deviceNameLower.contains("bose") ||
                deviceNameLower.contains("jbl")) {
                Log.i(TAG, "*** HEADPHONE DEVICE FOUND: $deviceName (${device.address}) Signal: ${device.signal} ***")
            }
            
            // Special logging for devices that might match the target pattern
            if (device.address?.contains("B7:4C", ignoreCase = true) == true || 
                device.address?.contains("97:B7", ignoreCase = true) == true) {
                Log.i(TAG, "*** POTENTIAL TARGET DEVICE FOUND: $deviceName (${device.address}) ***")
            }
            
            val payload = Arguments.createMap().apply {
                putString("name", deviceName)
                putString("address", device.address)
                putInt("signal", device.signal) // Correctly use putInt for integer signal
                putString("id", device.address) // Device ID (MAC address)
                putString("scanType", "ttm_sdk") // Mark as TTM SDK scan
            }
            sendEvent(ON_DEVICE_SCANNED, payload)
        }
        
        override fun onScanStop() {
            val currentTime = System.currentTimeMillis()
            val scanDuration = currentTime - scanStartTime
            Log.d(TAG, "TTM SDK onScanStop - Scan stopped after ${scanDuration}ms")
            
            isTTMScanning = false
            
            // Check if scan stopped too early (less than 5 seconds for more aggressive fallback)
            if (scanDuration < 5000 && expectedScanDuration > 5000) {
                Log.w(TAG, "TTM SDK scan stopped too early! Expected ${expectedScanDuration}ms, got ${scanDuration}ms")
                Log.w(TAG, "This indicates a potential TTM SDK scan issue - starting fallback immediately")
                
                // ENABLED FALLBACK - TTM SDK scan failed, using direct BLE scan
                Log.w(TAG, "TTM SDK scan failed - starting direct BLE scan as fallback")
                // Start direct scan as fallback immediately
                handler.postDelayed({
                    Log.i(TAG, "Starting direct scan as fallback for failed TTM scan")
                    try {
                        startDirectScanFallback((expectedScanDuration / 1000).toInt())
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to start direct scan fallback: ${e.message}")
                    }
                }, 200) // Reduced delay
            }
            
            sendEvent(ON_SCAN_STOP, null)
        }
        
        override fun onScanFinish() {
            val currentTime = System.currentTimeMillis()
            val scanDuration = currentTime - scanStartTime
            Log.d(TAG, "TTM SDK onScanFinish - Scan completed after ${scanDuration}ms")
            
            isTTMScanning = false
            
            // Check if scan finished too early (lowered threshold for more aggressive fallback)
            if (scanDuration < 5000 && expectedScanDuration > 5000) {
                Log.w(TAG, "TTM SDK scan finished too early! Expected ${expectedScanDuration}ms, got ${scanDuration}ms")
                Log.w(TAG, "This indicates the TTM SDK may have internal issues - starting fallback")
                
                // ENABLED FALLBACK - TTM SDK scan finished too early, using direct BLE scan
                Log.w(TAG, "TTM SDK scan finished too early - starting direct BLE scan as fallback")
                // Start direct scan as fallback immediately when TTM scan finishes too early
                handler.postDelayed({
                    Log.i(TAG, "Starting direct scan as fallback for early TTM scan completion")
                    try {
                        startDirectScanFallback((expectedScanDuration / 1000).toInt())
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to start direct scan fallback: ${e.message}")
                    }
                }, 200) // Reduced delay
            } else {
                Log.i(TAG, "TTM SDK scan completed normally after ${scanDuration}ms")
            }
            
            sendEvent(ON_SCAN_FINISH, null)
        }
    }

    @ReactMethod
    fun initSDK(promise: Promise) {
        Log.d(TAG, "initSDK() called from JavaScript")
        try {
            // Enhanced configuration for better scanning
            val configBuilder = BluetoothConfig.Builder()
            configBuilder.setProtocol(ObdProtocol())
            configBuilder.setNeedNegotiationMTU(517)
        configBuilder.setNeedFilterDevice(false) // Ensure all BLE devices are visible
            
            // Note: Additional configuration options like setScanMode and setConnectTimeout
            // may not be available in this TTM SDK version
            
            val config = configBuilder.build()
            Log.d(TAG, "TTM SDK config built successfully")

            BluetoothLESDK.init(reactContext.applicationContext, config, true)
            BluetoothLESDK.setDebug(true)
            Log.d(TAG, "TTM SDK initialized successfully")
            
            // Set up callbacks using static methods with enhanced error handling
            try {
                BluetoothLESDK.addOnBleGattCallbackListener(gattCallback)
                Log.d(TAG, "GATT callback set up successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set up GATT callback: ${e.message}", e)
            }
            
            try {
                BluetoothLESDK.setOnScanCallbackListener(scanCallback)
                Log.d(TAG, "Scan callback set up successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set up scan callback: ${e.message}", e)
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize TTM SDK", e)
            Log.e(TAG, "TTM SDK init error details: ${e.stackTrace.contentToString()}")
            promise.reject("SDK_INIT_ERROR", "Failed to initialize TTM SDK: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startScan(duration: Int, promise: Promise) {
        Log.d(TAG, "startScan() called with duration: $duration seconds")
        try {
            // Check BLE support
            val supportsBLE = BluetoothLESDK.isSupportBLE()
            Log.d(TAG, "TTM SDK - Device supports BLE: $supportsBLE")
            if (!supportsBLE) {
                Log.e(TAG, "Device does not support BLE")
                return promise.reject("NO_BLE_SUPPORT", "Device does not support Bluetooth")
            }
            
            // Check Bluetooth state
            val bleOpen = BluetoothLESDK.isBLEOpen()
            Log.d(TAG, "TTM SDK - Bluetooth is enabled: $bleOpen")
            if (!bleOpen) {
                Log.e(TAG, "Bluetooth is not enabled")
                Log.d(TAG, "Prompting user to enable Bluetooth")
                val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(enableBtIntent)
                return promise.reject("BLUETOOTH_OFF", "Bluetooth is off, prompting user.")
            }
            
            // Check for already connected devices and emit them as "connected" scan results
            checkConnectedDevices()
            
            // Stop any previous scan (the SDK might not have an isScanning method)
            try {
                Log.d(TAG, "TTM SDK - Stopping any previous scan")
                BluetoothLESDK.stopScan()
                Thread.sleep(100) // Brief pause to ensure stop completes
            } catch (e: Exception) {
                Log.w(TAG, "Could not stop previous scan: ${e.message}")
            }
            
            // Reset scan tracking variables
            scanStartTime = System.currentTimeMillis()
            expectedScanDuration = (duration * 1000).toLong()
            isTTMScanning = true
            
            // Configure scan parameters
            Log.d(TAG, "TTM SDK - Using existing filter device setting from configureSDK")
            Log.d(TAG, "TTM SDK - Configuring scan for testing")
            
            Log.d(TAG, "TTM SDK - Starting BLE scan for $duration seconds (${expectedScanDuration}ms expected)")
            val startTime = System.currentTimeMillis()
            
            // Try the TTM SDK startScan without duration parameter first
            try {
                BluetoothLESDK.startScan()
                Log.d(TAG, "TTM SDK - Using startScan() without duration parameter")
            } catch (e: Exception) {
                Log.w(TAG, "TTM SDK startScan() without duration failed: ${e.message}")
                // Fallback to duration parameter
                try {
                    BluetoothLESDK.startScan(duration.toLong())
                    Log.d(TAG, "TTM SDK - Using startScan($duration) with duration parameter")
                } catch (e2: Exception) {
                    Log.e(TAG, "TTM SDK startScan with duration also failed: ${e2.message}")
                    // Both TTM methods failed, will use direct BLE fallback
                    throw e2
                }
            }
            
            val endTime = System.currentTimeMillis()
            Log.d(TAG, "TTM SDK - startScan() call completed in ${endTime - startTime}ms")
            Log.d(TAG, "TTM SDK - BLE scan started successfully")
            Log.d(TAG, "TTM SDK - BLE scan parameters - Filter Device disabled for testing")
            
            // Monitor scan progress
            handler.postDelayed({
                Log.d(TAG, "TTM SDK - 100ms after scan start - monitoring for events")
                if (isTTMScanning) {
                    Log.d(TAG, "TTM SDK - Scan is still active after 100ms")
                } else {
                    Log.w(TAG, "TTM SDK - Scan already stopped within 100ms - this is suspicious")
                }
            }, 100)
            
            // Monitor for early termination
            handler.postDelayed({
                if (isTTMScanning) {
                    Log.d(TAG, "TTM SDK - Scan is still active after 500ms - looking good")
                } else {
                    Log.w(TAG, "TTM SDK - Scan stopped before 500ms - definite issue")
                }
            }, 500)
            
            // Timeout check - if TTM scan doesn't work, start direct scan as fallback
            handler.postDelayed({
                if (isTTMScanning) {
                    Log.w(TAG, "TTM SDK - Scan is taking too long or may be stuck, stopping and starting direct scan as fallback")
                    try {
                        BluetoothLESDK.stopScan()
                        isTTMScanning = false
                    } catch (e: Exception) {
                        Log.e(TAG, "Error stopping TTM scan: ${e.message}")
                    }
                    
                    // Start direct scan as fallback
                    handler.postDelayed({
                        Log.i(TAG, "Starting direct scan as fallback after TTM timeout")
                        startDirectScanFallback(duration)
                    }, 200)
                }
            }, (duration * 1000 + 2000).toLong()) // TTM scan timeout + 2 seconds buffer
            
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "TTM SDK - Scan failed with exception", e)
            Log.e(TAG, "TTM SDK - Exception stack trace: ${e.stackTrace.contentToString()}")
            isTTMScanning = false
            promise.reject("SCAN_ERROR", "Scan failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopScan(promise: Promise) {
        try {
            BluetoothLESDK.stopScan()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Stop scan failed", e)
            promise.reject("STOP_SCAN_ERROR", "Stop scan failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun connect(deviceId: String, passcode: String, needPair: Boolean, promise: Promise) {
        Log.d(TAG, "connect() called - deviceId: $deviceId, passcode: ${if(passcode.isEmpty()) "NONE" else "[REDACTED]"}, needPair: $needPair")
        try {
            // Check device connection state first
            val currentDevice = BluetoothLESDK.getConnectDevice()
            if (currentDevice != null) {
                Log.w(TAG, "Device already connected: ${currentDevice.address}, disconnecting first")
                BluetoothLESDK.disconnect()
                BluetoothLESDK.close()
                Thread.sleep(500) // Brief pause to ensure disconnection
            }
            
            // Follow Jimi IoT app flow - simple connection without passcode
            Log.d(TAG, "Connecting to ELD device using Jimi IoT app flow")
            BluetoothLESDK.connect(deviceId, "", false) // No passcode, no pairing
            
            Log.d(TAG, "Connection request sent successfully")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Connect failed with exception: ${e.message}", e)
            Log.e(TAG, "Exception stack trace: ${e.stackTrace.contentToString()}")
            
            // Provide specific error codes based on the exception
            val errorCode = when {
                e.message?.contains("timeout", ignoreCase = true) == true -> "CONNECTION_TIMEOUT"
                e.message?.contains("not found", ignoreCase = true) == true -> "DEVICE_NOT_FOUND"
                e.message?.contains("already connected", ignoreCase = true) == true -> "DEVICE_ALREADY_CONNECTED"
                e.message?.contains("permission", ignoreCase = true) == true -> "BLUETOOTH_PERMISSION_DENIED"
                e.message?.contains("bluetooth", ignoreCase = true) == true -> "BLUETOOTH_ERROR"
                else -> "CONNECTION_FAILED"
            }
            
            promise.reject(errorCode, "TTM SDK Connection Error: ${e.message}", e)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            BluetoothLESDK.release()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Disconnect failed", e)
            promise.reject("DISCONNECT_ERROR", "Disconnect failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun checkPasswordEnable(promise: Promise) {
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: Method may not exist in this SDK version - implement when SDK documentation is available
            Log.w(TAG, "checkPasswordEnable method not implemented yet")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Check password failed", e)
            promise.reject("CHECK_PASSWORD_ERROR", "Check password failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun validatePassword(password: String, promise: Promise) {
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: Method may not exist in this SDK version - implement when SDK documentation is available
            Log.w(TAG, "validatePassword method not implemented yet: $password")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Validate password failed", e)
            promise.reject("VALIDATE_PASSWORD_ERROR", "Validate password failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun enablePassword(password: String, promise: Promise) {
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: Method may not exist in this SDK version - implement when SDK documentation is available
            Log.w(TAG, "enablePassword method not implemented yet: $password")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Enable password failed", e)
            promise.reject("ENABLE_PASSWORD_ERROR", "Enable password failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun disablePassword(password: String, promise: Promise) {
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: Method may not exist in this SDK version - implement when SDK documentation is available
            Log.w(TAG, "disablePassword method not implemented yet: $password")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Disable password failed", e)
            promise.reject("DISABLE_PASSWORD_ERROR", "Disable password failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startReportEldData(promise: Promise) {
        Log.d(TAG, "=== startReportEldData() called - Jimi IoT app flow ===")
        try {
            // Check if we have a connected device
            val connectDevice = BluetoothLESDK.getConnectDevice()
            val connectMac = BluetoothLESDK.getConnectMac()
            val gatt = BluetoothLESDK.getGatt()
            
            Log.d(TAG, "Connection status - Device: $connectDevice, MAC: $connectMac, GATT: $gatt")
            
            if (connectDevice == null) {
                Log.e(TAG, "No device connected - cannot start ELD data reporting")
                return promise.reject("NO_DEVICE_CONNECTED", "TTM SDK Error: No device connected. Connect to an ELD device first.")
            }
            
            if (gatt == null) {
                Log.e(TAG, "GATT connection is null - cannot start ELD data reporting")
                return promise.reject("GATT_NOT_AVAILABLE", "TTM SDK Error: GATT connection not available. Reconnect to the device.")
            }
            
            Log.d(TAG, "Connected to device: ${connectDevice.name} (${connectDevice.address})")
            
            // Check if this might be a non-ELD device (like headphones)
            val deviceName = connectDevice.name?.lowercase() ?: ""
            val isNonELDDevice = deviceName.contains("headphone") || 
                                deviceName.contains("earbud") || 
                                deviceName.contains("speaker") || 
                                deviceName.contains("audio") ||
                                deviceName.contains("music")
            
            if (isNonELDDevice) {
                Log.w(TAG, "Detected non-ELD device: ${connectDevice.name}")
                return promise.reject("NON_ELD_DEVICE", "TTM SDK Error: This device (${connectDevice.name}) is not an ELD device. Please connect to a certified Electronic Logging Device.")
            }
            
            // Follow Jimi IoT app flow - start ELD data immediately
            Log.d(TAG, "=== Starting ELD data transmission like Jimi IoT app ===")
            
            // Note: startReportEldData method does not exist in this SDK version
            // Data will flow automatically once connected and authenticated
            Log.d(TAG, "ELD data transmission will start automatically - monitoring for incoming data")
            
            // Resolve immediately - data will flow in real-time like Jimi IoT app
            promise.resolve(null)
            
        } catch (e: Exception) {
            Log.e(TAG, "Start ELD data failed with exception", e)
            Log.e(TAG, "Exception stack trace: ${e.stackTrace.contentToString()}")
            promise.reject("START_ELD_DATA_ERROR", "TTM SDK Error: Start ELD data failed: ${e.message}", e)
        }
    }
    
    // Helper method to check if connected device appears to be an ELD device
    private fun checkIfELDDevice(gatt: android.bluetooth.BluetoothGatt): Boolean {
        try {
            // Check for common ELD device characteristics
            gatt.services?.forEach { service ->
                // Look for services that might indicate ELD functionality
                val serviceUuid = service.uuid.toString().lowercase()
                
                // Common patterns for ELD devices (these are examples - adjust based on your device)
                if (serviceUuid.contains("fff0") || // Common custom service UUID pattern
                    serviceUuid.contains("6e40") || // Another common pattern
                    serviceUuid.contains("ffe0")) { // Yet another pattern
                    Log.d(TAG, "Found potential ELD service: $serviceUuid")
                    return true
                }
                
                // Check characteristics that might indicate ELD data capability
                service.characteristics?.forEach { characteristic ->
                    val charUuid = characteristic.uuid.toString().lowercase()
                    if (charUuid.contains("fff1") || charUuid.contains("fff2") ||
                        charUuid.contains("6e41") || charUuid.contains("6e42") ||
                        charUuid.contains("ffe1") || charUuid.contains("ffe2")) {
                        Log.d(TAG, "Found potential ELD characteristic: $charUuid")
                        return true
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking ELD device compatibility: ${e.message}")
        }
        return false
    }

    @ReactMethod
    fun replyReceivedEldData(promise: Promise) {
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: replyReceivedEldData method does not exist in this SDK version
            Log.w(TAG, "replyReceivedEldData method not implemented yet")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Reply received ELD data failed", e)
            promise.reject("REPLY_ELD_DATA_ERROR", "Reply received ELD data failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendUTCTime(promise: Promise) {
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: sendUTCTime method does not exist in this SDK version
            Log.w(TAG, "sendUTCTime method not implemented yet")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Send UTC time failed", e)
            promise.reject("SEND_UTC_TIME_ERROR", "Send UTC time failed: ${e.message}", e)
        }
    }

    // Helper function to extract device name from scan record
    private fun extractDeviceNameFromScanRecord(scanRecord: ByteArray): String? {
        try {
            Log.d(TAG, "Parsing scan record of ${scanRecord.size} bytes: ${scanRecord.joinToString(" ") { "%02x".format(it) }}")
            
            var index = 0
            var foundName: String? = null
            
            while (index < scanRecord.size) {
                val length = scanRecord[index].toInt() and 0xFF
                if (length == 0 || index + length >= scanRecord.size) break
                
                val type = scanRecord[index + 1].toInt() and 0xFF
                Log.d(TAG, "Scan record AD type: 0x${String.format("%02x", type)}, length: $length")
                
                when (type) {
                    0x08, 0x09 -> { // Shortened/Complete local name
                        val nameBytes = scanRecord.copyOfRange(index + 2, index + 1 + length)
                        val name = String(nameBytes, Charsets.UTF_8).trim()
                        if (name.isNotBlank()) {
                            Log.d(TAG, "Found device name in scan record (type 0x${String.format("%02x", type)}): '$name'")
                            foundName = name
                            // Complete name takes priority over shortened name
                            if (type == 0x09) break
                        }
                    }
                    0xFF -> { // Manufacturer specific data - some devices put names here
                        if (length > 2) {
                            val manufacturerData = scanRecord.copyOfRange(index + 2, index + 1 + length)
                            // Try to extract text from manufacturer data
                            val possibleName = extractTextFromManufacturerData(manufacturerData)
                            if (!possibleName.isNullOrBlank()) {
                                Log.d(TAG, "Found possible device name in manufacturer data: '$possibleName'")
                                if (foundName == null) foundName = possibleName
                            }
                        }
                    }
                }
                index += length + 1
            }
            
            return foundName
        } catch (e: Exception) {
            Log.w(TAG, "Error extracting device name from scan record: ${e.message}")
        }
        return null
    }
    
    // Helper function to extract text from manufacturer data
    private fun extractTextFromManufacturerData(data: ByteArray): String? {
        try {
            // Skip first 2 bytes (manufacturer ID) and look for printable text
            if (data.size > 2) {
                val textData = data.copyOfRange(2, data.size)
                val text = String(textData, Charsets.UTF_8).trim().filter { it.isLetterOrDigit() || it.isWhitespace() || it in "._-()[]" }
                if (text.length >= 3) { // Minimum reasonable name length
                    return text
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error extracting text from manufacturer data: ${e.message}")
        }
        return null
    }

    // Direct Android BLE scan callback
    private val directScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            val rssi = result.rssi
            val scanRecord = result.scanRecord?.bytes
            
            // Enhanced device name handling for direct scan
            val deviceName = when {
                !device.name.isNullOrBlank() -> device.name
                scanRecord != null -> extractDeviceNameFromScanRecord(scanRecord) ?: "Unnamed Device"
                else -> "Unnamed Device"
            }
            
            Log.d(TAG, "Direct scan - Device found: $deviceName (${device.address}) RSSI: $rssi")
            Log.d(TAG, "Direct scan - Original device name: '${device.name}', Final name: '$deviceName'")
            
            // Special logging for devices that might match the target pattern
            if (device.address?.contains("B7:4C", ignoreCase = true) == true || 
                device.address?.contains("97:B7", ignoreCase = true) == true ||
                device.address?.contains("92:B7:4C", ignoreCase = true) == true) {
                Log.i(TAG, "*** POTENTIAL TARGET DEVICE FOUND IN DIRECT SCAN: $deviceName (${device.address}) RSSI: $rssi ***")
                Log.i(TAG, "*** Scan record: ${scanRecord?.joinToString(" ") { "%02x".format(it) }} ***")
            }
            
            val payload = Arguments.createMap().apply {
                putString("name", deviceName)
                putString("address", device.address)
                putInt("signal", rssi)
                putString("id", device.address)
                putString("scanType", "direct")
            }
            sendEvent(ON_DEVICE_SCANNED, payload)
        }
        
        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "Direct BLE scan failed with error code: $errorCode")
            isDirectScanning = false
        }
    }
    
    @ReactMethod
    fun startDirectScan(duration: Int, promise: Promise) {
        Log.d(TAG, "startDirectScan() called with duration: $duration seconds")
        try {
            val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
                Log.e(TAG, "Bluetooth is not available or not enabled")
                return promise.reject("BLUETOOTH_NOT_AVAILABLE", "Bluetooth is not available or not enabled")
            }
            
            bluetoothLeScanner = bluetoothAdapter!!.bluetoothLeScanner
            if (bluetoothLeScanner == null) {
                Log.e(TAG, "BluetoothLeScanner is not available")
                return promise.reject("BLE_SCANNER_NOT_AVAILABLE", "BLE scanner is not available")
            }
            
            if (isDirectScanning) {
                Log.w(TAG, "Direct scan is already running")
                return promise.reject("SCAN_ALREADY_RUNNING", "Direct scan is already running")
            }
            
            val scanSettings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
                .build()
            
            Log.d(TAG, "Starting direct BLE scan for $duration seconds")
            bluetoothLeScanner!!.startScan(directScanCallback)
            isDirectScanning = true
            
            // Schedule scan stop
            handler.postDelayed({
                if (isDirectScanning) {
                    stopDirectScan()
                    sendEvent(ON_SCAN_FINISH, null)
                }
            }, (duration * 1000).toLong())
            
            Log.d(TAG, "Direct BLE scan started successfully")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Direct scan failed with exception", e)
            isDirectScanning = false
            promise.reject("DIRECT_SCAN_ERROR", "Direct scan failed: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun stopDirectScan(promise: Promise? = null) {
        try {
            if (isDirectScanning && bluetoothLeScanner != null) {
                Log.d(TAG, "Stopping direct BLE scan")
                bluetoothLeScanner!!.stopScan(directScanCallback)
                isDirectScanning = false
                sendEvent(ON_SCAN_STOP, null)
                Log.d(TAG, "Direct BLE scan stopped")
            }
            promise?.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Stop direct scan failed", e)
            promise?.reject("STOP_DIRECT_SCAN_ERROR", "Stop direct scan failed: ${e.message}", e)
        }
    }

    // Test method to inject mock devices for UI testing
    @ReactMethod
    fun injectTestDevices(promise: Promise) {
        Log.d(TAG, "injectTestDevices() called - Adding mock BLE devices for testing")
        try {
            // Simulate finding several BLE devices
            val testDevices = listOf(
                mapOf("name" to "PT30-ELD", "address" to "AA:BB:CC:DD:EE:FF", "signal" to -45),
                mapOf("name" to "Apple Watch", "address" to "11:22:33:44:55:66", "signal" to -55),
                mapOf("name" to "Bluetooth Headphones", "address" to "AA:11:BB:22:CC:33", "signal" to -35),
                mapOf("name" to "Test ELD Device", "address" to "FF:EE:DD:CC:BB:AA", "signal" to -50)
            )
            
            testDevices.forEach { device ->
                val payload = Arguments.createMap().apply {
                    putString("name", device["name"] as String)
                    putString("address", device["address"] as String)
                    putInt("signal", device["signal"] as Int)
                    putString("id", device["address"] as String)
                }
                Log.d(TAG, "Injecting test device: ${device["name"]} (${device["address"]})")
                sendEvent(ON_DEVICE_SCANNED, payload)
            }
            
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inject test devices", e)
            promise.reject("TEST_INJECT_ERROR", "Failed to inject test devices: ${e.message}", e)
        }
    }
    
    // Method to check for already connected devices and emit them
    private fun checkConnectedDevices() {
        Log.d(TAG, "checkConnectedDevices() - Checking for already connected BLE devices")
        try {
            val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
                Log.w(TAG, "Bluetooth is not available or not enabled for connected device check")
                return
            }
            
            val bondedDevices = bluetoothAdapter!!.bondedDevices
            Log.d(TAG, "Checking ${bondedDevices.size} bonded devices for connection status")
            
            bondedDevices.forEach { device ->
                try {
                    val deviceName = device.name ?: "Unknown Device"
                    // Check if device is currently connected (this is a simplified check)
                    val isConnected = device.bondState == android.bluetooth.BluetoothDevice.BOND_BONDED
                    
                    // Special attention to your target device
                    if (device.address?.contains("B7:4C", ignoreCase = true) == true || 
                        device.address?.contains("92:B7:4C", ignoreCase = true) == true) {
                        Log.i(TAG, "*** TARGET DEVICE FOUND IN CONNECTED DEVICES: $deviceName (${device.address}) ***")
                        Log.i(TAG, "*** Device bond state: ${device.bondState}, type: ${device.type} ***")
                        
                        // Emit this device as a "connected" scan result
                        val payload = Arguments.createMap().apply {
                            putString("name", deviceName)
                            putString("address", device.address)
                            putInt("signal", -30) // Strong signal for connected devices
                            putString("id", device.address)
                            putString("scanType", "connected")
                            putInt("deviceType", device.type)
                        }
                        sendEvent(ON_DEVICE_SCANNED, payload)
                    }
                    
                    Log.d(TAG, "Connected device check: $deviceName (${device.address}) Bond: ${device.bondState} Type: ${device.type}")
                } catch (e: Exception) {
                    Log.w(TAG, "Error checking device ${device.address}: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking connected devices: ${e.message}")
        }
    }

    // Method to get bonded/paired Bluetooth devices (which will have names)
    @ReactMethod
    fun getBondedDevices(promise: Promise) {
        Log.d(TAG, "getBondedDevices() called - Getting paired Bluetooth devices")
        try {
            val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
                Log.e(TAG, "Bluetooth is not available or not enabled")
                return promise.reject("BLUETOOTH_NOT_AVAILABLE", "Bluetooth is not available or not enabled")
            }
            
            val bondedDevices = bluetoothAdapter!!.bondedDevices
            Log.d(TAG, "Found ${bondedDevices.size} bonded devices")
            
            bondedDevices.forEach { device ->
                val deviceName = device.name ?: "Unknown Device"
                Log.d(TAG, "Bonded device: $deviceName (${device.address}) Type: ${device.type}")
                
                val payload = Arguments.createMap().apply {
                    putString("name", deviceName)
                    putString("address", device.address)
                    putInt("signal", -50) // Default signal strength for bonded devices
                    putString("id", device.address)
                    putString("scanType", "bonded")
                    putInt("deviceType", device.type) // DEVICE_TYPE_CLASSIC=1, DEVICE_TYPE_LE=2, DEVICE_TYPE_DUAL=3
                }
                sendEvent(ON_DEVICE_SCANNED, payload)
            }
            
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get bonded devices", e)
            promise.reject("BONDED_DEVICES_ERROR", "Failed to get bonded devices: ${e.message}", e)
        }
    }

    // Fallback direct scan method (internal use only)
    private fun startDirectScanFallback(duration: Int) {
        Log.d(TAG, "startDirectScanFallback() called with duration: $duration seconds")
        try {
            val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
                Log.e(TAG, "Bluetooth is not available or not enabled for fallback scan")
                return
            }
            
            bluetoothLeScanner = bluetoothAdapter!!.bluetoothLeScanner
            if (bluetoothLeScanner == null) {
                Log.e(TAG, "BluetoothLeScanner is not available for fallback scan")
                return
            }
            
            if (isDirectScanning) {
                Log.w(TAG, "Direct scan is already running, stopping previous scan")
                bluetoothLeScanner!!.stopScan(directScanCallback)
                isDirectScanning = false
            }
            
            val scanSettings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
                .build()
            
            Log.d(TAG, "Starting fallback direct BLE scan for $duration seconds")
            bluetoothLeScanner!!.startScan(directScanCallback)
            isDirectScanning = true
            
            // Schedule scan stop
            handler.postDelayed({
                if (isDirectScanning) {
                    stopDirectScan()
                    sendEvent(ON_SCAN_FINISH, null)
                }
            }, (duration * 1000).toLong())
            
            Log.d(TAG, "Fallback direct BLE scan started successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Fallback direct scan failed with exception", e)
            isDirectScanning = false
        }
    }

    @ReactMethod
    fun configureSDK(options: ReadableMap, promise: Promise) {
        val filterDevices = options.getBoolean("filterDevices")
        val debugMode = options.getBoolean("debugMode")
        Log.d(TAG, "configureSDK() called - filterDevices: $filterDevices, debugMode: $debugMode")
        try {
            // Configure TTM SDK settings
            BluetoothLESDK.setNeedFilterDevice(filterDevices)
            BluetoothLESDK.setDebug(debugMode)
            
            Log.d(TAG, "TTM SDK configured successfully - Filter devices: $filterDevices, Debug mode: $debugMode")
            Log.d(TAG, "This should show ALL BLE devices including headphones when filterDevices=false")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Configure SDK failed with exception: ${e.message}", e)
            promise.reject("CONFIGURE_SDK_ERROR", "TTM SDK Error: Configure SDK failed: ${e.message}", e)
        }
    }

    // Required methods for NativeEventEmitter.
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}