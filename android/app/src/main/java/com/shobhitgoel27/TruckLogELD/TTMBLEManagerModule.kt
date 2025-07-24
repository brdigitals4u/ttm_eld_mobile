package com.shobhitgoel27.TruckLogELD // IMPORTANT: Ensure this matches your actual package name

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.totaltransportmanagement.bluetoothle.BluetoothLESDK
import com.totaltransportmanagement.bluetoothle.listener.OnBluetoothScanCallback
import com.totaltransportmanagement.bluetoothle.listener.OnBluetoothGattCallback
import com.totaltransportmanagement.bluetoothle.model.BleDevice
import com.totaltransportmanagement.bluetoothle.config.BluetoothConfig
import com.totaltransportmanagement.bluetoothle.protocol.ObdProtocol
import com.totaltransportmanagement.bluetoothle.model.BtParseData
import com.totaltransportmanagement.bluetoothle.model.ProtocolParseData
import com.totaltransportmanagement.bluetoothle.listener.InstructionAnalysis
import com.totaltransportmanagement.bluetoothle.model.BaseObdData.EldData // Specific import for EldData

import android.bluetooth.BluetoothAdapter
import android.content.Intent
import android.util.Log

import androidx.annotation.NonNull
import androidx.annotation.Nullable

class TTMBLEManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "TTMBLEManagerModule"
    private val reactContext: ReactApplicationContext = reactContext
    private var bleSDK: BluetoothLESDK? = null // Nullable type, initialized later

    // Event Names (must match TTM_EVENTS in JS and iOS)
    companion object { // Use companion object for static-like members in Kotlin
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
    }

    @NonNull
    override fun getName(): String {
        return "TTMBLEManager"
    }

    @Nullable
    override fun getConstants(): Map<String, Any> {
        val constants: MutableMap<String, Any> = HashMap()
        // Expose event names to JavaScript
        constants[ON_DEVICE_SCANNED] = ON_DEVICE_SCANNED
        constants[ON_SCAN_STOP] = ON_SCAN_STOP
        constants[ON_SCAN_FINISH] = ON_SCAN_FINISH
        constants[ON_CONNECTED] = ON_CONNECTED
        constants[ON_DISCONNECTED] = ON_DISCONNECTED
        constants[ON_CONNECT_FAILURE] = ON_CONNECT_FAILURE
        constants[ON_AUTHENTICATION_PASSED] = ON_AUTHENTICATION_PASSED
        constants[ON_NOTIFY_RECEIVED] = ON_NOTIFY_RECEIVED
        constants[ON_PASSWORD_STATE_CHECKED] = ON_PASSWORD_STATE_CHECKED
        constants[ON_PASSWORD_VERIFY_RESULT] = ON_PASSWORD_VERIFY_RESULT
        constants[ON_PASSWORD_SET_RESULT] = ON_PASSWORD_SET_RESULT
        return constants
    }

    private fun sendEvent(eventName: String, @Nullable data: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    @ReactMethod
    fun initSDK(promise: Promise) {
        if (bleSDK == null) {
            try {
                // SDK configuration is handled in MainApplication.kt's onCreate()
                // Just get the instance here
                bleSDK = BluetoothLESDK.getInstance()

                // Set up GATT callback listeners
                bleSDK?.addOnBleGattCallbackListener(object : OnBluetoothGattCallback.ParsedBluetoothGattCallback() {
                    override fun onConnected() { // Device connected.
                        Log.d(TAG, "onConnected")
                        sendEvent(ON_CONNECTED, null)
                    }

                    override fun onAuthenticationPassed() { // Authentication successful.
                        Log.d(TAG, "onAuthenticationPassed")
                        sendEvent(ON_AUTHENTICATION_PASSED, null)
                    }

                    override fun onNotifyReceived(data: ProtocolParseData) { // Received Bluetooth data
                        Log.d(TAG, "onNotifyReceived: ACK=" + data.ack)
                        if (data is BtParseData) {
                            val btData = data
                            val payload = Arguments.createMap()
                            payload.putString("ack", btData.ack)

                            when (btData.ack) {
                                InstructionAnalysis.BT.ACK_OBD_CHECK_PASSWORD_SET -> { // Password check result
                                    val isSet = btData.source.getInt(8) == 1 // Parsing as per doc examples
                                    payload.putBoolean("isSet", isSet)
                                    sendEvent(ON_PASSWORD_STATE_CHECKED, payload)
                                }
                                InstructionAnalysis.BT.ACK_OBD_VERIFY_PA -> { // Password verification result (Typo in doc: VERIFY_PA)
                                    val success = btData.source.getInt(8) == 1 // Parsing as per doc examples
                                    payload.putBoolean("success", success)
                                    sendEvent(ON_PASSWORD_VERIFY_RESULT, payload)
                                }
                                InstructionAnalysis.BT.ACK_OBD_SET_PASSWORD -> { // Password set/disable result
                                    val isSuccess = btData.source.getInt(8) == 1 // Parsing as per doc examples
                                    payload.putBoolean("isSuccess", isSuccess)
                                    sendEvent(ON_PASSWORD_SET_RESULT, payload)
                                }
                                InstructionAnalysis.BT.ACK_OBD_ELD_PROCESS -> { // Process ELD data
                                    // Extract ELD data. This requires knowledge of BaseObdData.EldData structure.
                                    try {
                                        val obdData = btData.obdData // Use .obdData getter
                                        if (obdData is EldData) { // Check if it's EldData
                                            val eldDataBean = obdData
                                            // Convert dataFlowList to a WritableArray if needed, or stringify for now
                                            // You might need more granular parsing of eldDataBean.dataFlowList
                                            payload.putString("eldData", eldDataBean.dataFlowList?.toString() ?: "No ELD Data")
                                        } else {
                                            payload.putString("eldData", "Raw data: ${btData.source}") // Fallback for unknown data types
                                        }
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error parsing ELD data", e)
                                        payload.putString("eldData", "Parsing error: ${e.message}")
                                    }
                                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                                }
                                else -> {
                                    // For other notifications, send generic data
                                    payload.putString("rawData", btData.source.toString())
                                    sendEvent(ON_NOTIFY_RECEIVED, payload)
                                }
                            }
                        }
                    }

                    override fun onDisconnect() { // Bluetooth connection terminated
                        Log.d(TAG, "onDisconnect")
                        sendEvent(ON_DISCONNECTED, null)
                    }

                    override fun onConnectFailure(status: Int) { // Bluetooth connection failed
                        Log.d(TAG, "onConnectFailure: $status")
                        val payload = Arguments.createMap()
                        payload.putInt("status", status)
                        payload.putString("message", "Connection failed with status: $status")
                        sendEvent(ON_CONNECT_FAILURE, payload)
                        bleSDK?.release() // Release SDK on failure
                    }
                })

                // Set up scan callback listener
                bleSDK?.setOnScanCallbackListener(object : OnBluetoothScanCallback {
                    override fun onScan(device: BleDevice, scanRecord: ByteArray) { // Triggered per device scan event
                        Log.d(TAG, "onScan: ${device.name} ${device.address}")
                        val payload = Arguments.createMap()
                        payload.putString("name", device.name)
                        payload.putString("address", device.address)
                        payload.putInt("signal", device.signal)
                        payload.putString("id", device.address) // Using MAC address as ID for consistency with JS Peripheral ID
                        sendEvent(ON_DEVICE_SCANNED, payload)
                    }

                    override fun onScanStop() { // Callback triggered after BluetoothLESDK.stopScan () invocation
                        Log.d(TAG, "onScanStop")
                        sendEvent(ON_SCAN_STOP, null)
                    }

                    override fun onScanFinish() { // Callback triggered when scan duration elapses
                        Log.d(TAG, "onScanFinish")
                        sendEvent(ON_SCAN_FINISH, null)
                    }
                })
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing TTM SDK", e)
                promise.reject("SDK_INIT_ERROR", "Error initializing TTM SDK: ${e.message}")
            }
        } else {
            promise.resolve(null) // Already initialized
        }
    }

    @ReactMethod
    fun startScan(duration: Int, promise: Promise) { // Initiate scanning duration
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        if (!BluetoothLESDK.isSupportBLE()) { // Check if device supports Bluetooth
            promise.reject("NO_BLE_SUPPORT", "This device does not support Bluetooth!")
            return
        }
        if (!BluetoothLESDK.isBLEOpen()) { // Check if Bluetooth is enabled
            // Prompt user to turn on Bluetooth
            val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            enableBtIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) // Required as we are not in an Activity
            reactApplicationContext.startActivity(enableBtIntent)
            promise.reject("BLUETOOTH_OFF", "Bluetooth is off. User prompted to enable.")
            return
        }

        try {
            bleSDK?.setNeedFilterDevice(true) // Ensure filtering is on
            bleSDK?.startScan(duration)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopScan(promise: Promise) { // Stop scanning
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.stopScan()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_SCAN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun connect(macAddress: String, imei: String, needPair: Boolean, promise: Promise) { // Establish a connection
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            // ELD device connection parameters: BluetoothLESDK.connect(mac, "${mac}000", false)
            bleSDK?.connect(macAddress, imei, needPair)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CONNECT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) { // Disconnect from device
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.release() // Releases SDK resources and disconnects
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DISCONNECT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkPasswordEnable(promise: Promise) { // Check if password is enabled
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.checkPasswordEnable()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CHECK_PASSWORD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun validatePassword(password: String, promise: Promise) { // Verify Password
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.validatePassword(password)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("VALIDATE_PASSWORD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun enablePassword(password: String, promise: Promise) { // Enable Password
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.enablePassword(password)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ENABLE_PASSWORD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun disablePassword(password: String, promise: Promise) { // Disable Password
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.disablePassword(password)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DISABLE_PASSWORD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun startReportEldData(promise: Promise) { // Initiate ELD data transmission
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.startReportEldData()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_ELD_DATA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun replyReceivedEldData(promise: Promise) { // Acknowledge receipt of ELD data
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.replyReceivedEldData()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("REPLY_ELD_DATA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun sendUTCTime(promise: Promise) { // Send current UTC time to device
        if (bleSDK == null) {
            promise.reject("SDK_NOT_INIT", "TTM Bluetooth SDK not initialized.")
            return
        }
        try {
            bleSDK?.sendUTCTime()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SEND_UTC_TIME_ERROR", e.message)
        }
    }
}