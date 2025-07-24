package com.shobhitgoel27.TruckLogELD

import android.bluetooth.BluetoothAdapter
import android.content.Intent
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
import com.jimi.ble.BluetoothConfig // Corrected import
import com.jimi.ble.protocol.ObdProtocol // Corrected import

class TTMBLEManagerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var bleSDK: BluetoothLESDK? = null
    private val TAG = "TTMBLEManagerModule"
    
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
            Log.d(TAG, "onConnected")
            sendEvent(ON_CONNECTED, null)
        }

        override fun onAuthenticationPassed() {
            Log.d(TAG, "onAuthenticationPassed")
            sendEvent(ON_AUTHENTICATION_PASSED, null)
        }

        override fun onDisconnect() {
            Log.d(TAG, "onDisconnect")
            sendEvent(ON_DISCONNECTED, null)
        }

        override fun onConnectFailure(status: Int) {
            Log.d(TAG, "onConnectFailure: $status")
            val payload = Arguments.createMap()
            payload.putInt("status", status)
            payload.putString("message", "Connection failed with status: $status")
            sendEvent(ON_CONNECT_FAILURE, payload)
            bleSDK?.release()
        }
        
        override fun onNotifyReceived(data: ProtocolParseData) {
            Log.d(TAG, "onNotifyReceived - received data")
            try {
                if (data is BtParseData) {
                    val payload = Arguments.createMap().apply {
                        putString("dataType", "BtParseData")
                        putString("rawData", data.toString())
                        // Add any basic properties that are available
                        try {
                            putInt("ack", data.ack)
                        } catch (e: Exception) {
                            Log.w(TAG, "Could not access ack property: ${e.message}")
                        }
                    }
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                } else {
                    val payload = Arguments.createMap().apply {
                        putString("dataType", data.javaClass.simpleName)
                        putString("rawData", data.toString())
                    }
                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing received data", e)
                val errorPayload = Arguments.createMap().apply {
                    putString("error", e.message)
                    putString("dataType", "unknown")
                }
                sendEvent(ON_NOTIFY_RECEIVED, errorPayload)
            }
        }
    }

    // --- Scan Callback Listener ---
    private val scanCallback = object : OnBluetoothScanCallback {
        override fun onScan(device: BleDevice, scanRecord: ByteArray) {
            val payload = Arguments.createMap().apply {
                putString("name", device.name)
                putString("address", device.address)
                putInt("signal", device.signal) // Correctly use putInt for integer signal
                putString("id", device.address) // Device ID (MAC address)
            }
            sendEvent(ON_DEVICE_SCANNED, payload)
        }
        override fun onScanStop() {
            Log.d(TAG, "onScanStop")
            sendEvent(ON_SCAN_STOP, null)
        }
        override fun onScanFinish() {
            Log.d(TAG, "onScanFinish")
            sendEvent(ON_SCAN_FINISH, null)
        }
    }

    @ReactMethod
    fun initSDK(promise: Promise) {
        Log.d(TAG, "initSDK() called from JavaScript")
        try {
            val configBuilder = BluetoothConfig.Builder()
            configBuilder.setProtocol(ObdProtocol())
            configBuilder.setNeedNegotiationMTU(517)
            configBuilder.setNeedFilterDevice(true)
            val config = configBuilder.build()

            BluetoothLESDK.init(reactContext.applicationContext, config, true)
            BluetoothLESDK.setDebug(true)
            
            // Set up callbacks using static methods
            try {
                BluetoothLESDK.addOnBleGattCallbackListener(gattCallback)
                BluetoothLESDK.setOnScanCallbackListener(scanCallback)
                Log.d(TAG, "Callbacks set up successfully")
            } catch (e: Exception) {
                Log.w(TAG, "Could not set up callbacks: ${e.message}")
                // Continue anyway, callbacks might be set up differently
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize TTM SDK", e)
            promise.reject("SDK_INIT_ERROR", "Failed to initialize TTM SDK: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startScan(duration: Int, promise: Promise) {
        try {
            if (!BluetoothLESDK.isSupportBLE()) return promise.reject("NO_BLE_SUPPORT", "Device does not support Bluetooth")
            if (!BluetoothLESDK.isBLEOpen()) {
                val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(enableBtIntent)
                return promise.reject("BLUETOOTH_OFF", "Bluetooth is off, prompting user.")
            }
            BluetoothLESDK.setNeedFilterDevice(true)
            BluetoothLESDK.startScan(duration.toLong())
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Scan failed", e)
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
    fun connect(macAddress: String, imei: String, needPair: Boolean, promise: Promise) {
        try {
            BluetoothLESDK.connect(macAddress, imei, needPair)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Connect failed", e)
            promise.reject("CONNECT_ERROR", "Connect failed: ${e.message}", e)
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
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: Method may not exist in this SDK version - implement when SDK documentation is available
            Log.w(TAG, "startReportEldData method not implemented yet")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Start ELD data failed", e)
            promise.reject("START_ELD_DATA_ERROR", "Start ELD data failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun replyReceivedEldData(promise: Promise) {
        try {
            if (bleSDK == null) return promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            // Note: Method may not exist in this SDK version - implement when SDK documentation is available
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
            // Note: Method may not exist in this SDK version - implement when SDK documentation is available
            Log.w(TAG, "sendUTCTime method not implemented yet")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Send UTC time failed", e)
            promise.reject("SEND_UTC_TIME_ERROR", "Send UTC time failed: ${e.message}", e)
        }
    }

    // Required methods for NativeEventEmitter.
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}