package com.ttm.TTMKonnect

import android.app.*
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class ELDMonitoringService : Service() {
    companion object {
        private const val TAG = "ELDMonitoringService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "eld_monitoring_channel"
        private const val CHANNEL_NAME = "ELD Monitoring"
        
        // Service actions
        const val ACTION_START_MONITORING = "START_MONITORING"
        const val ACTION_STOP_MONITORING = "STOP_MONITORING"
        const val ACTION_RECONNECT_DEVICE = "RECONNECT_DEVICE"
    }

    private var enhancedBLEManager: EnhancedBLEManager? = null
    private var backgroundExecutor: ScheduledExecutorService? = null
    private var isMonitoring = false
    private var connectedDevices = mutableSetOf<String>()
    private var monitoringData = mutableMapOf<String, Any>()
    private lateinit var eventBroadcaster: ELDServiceEventBroadcaster

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "ELD Monitoring Service created")
        
        // Initialize event broadcaster
        eventBroadcaster = ELDServiceEventBroadcaster.getInstance()
        eventBroadcaster.initialize(this)
        
        // Initialize enhanced BLE manager - will be initialized when React context is available
        // enhancedBLEManager = EnhancedBLEManager(ReactApplicationContext(this))
        
        // Setup background executor
        backgroundExecutor = Executors.newScheduledThreadPool(2)
        
        // Create notification channel
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "ELD Monitoring Service started with action: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_START_MONITORING -> {
                startMonitoring()
                return START_STICKY
            }
            ACTION_STOP_MONITORING -> {
                stopMonitoring()
                return START_NOT_STICKY
            }
            ACTION_RECONNECT_DEVICE -> {
                val deviceId = intent.getStringExtra("deviceId")
                deviceId?.let { reconnectDevice(it) }
                return START_NOT_STICKY
            }
        }
        
        return START_NOT_STICKY
    }

    private fun startMonitoring() {
        if (isMonitoring) {
            Log.w(TAG, "Monitoring already in progress")
            return
        }

        isMonitoring = true
        Log.d(TAG, "Starting ELD monitoring service")

        // Start foreground service with notification
        startForeground(NOTIFICATION_ID, createNotification())

        // Setup monitoring tasks
        setupMonitoringTasks()

        // Send service started event
        sendServiceEvent("onServiceStarted", createServiceInfo("Monitoring started"))
    }

    private fun stopMonitoring() {
        if (!isMonitoring) {
            Log.w(TAG, "Monitoring not in progress")
            return
        }

        isMonitoring = false
        Log.d(TAG, "Stopping ELD monitoring service")

        // Stop background tasks
        backgroundExecutor?.shutdown()

        // Stop foreground service
        stopForeground(true)
        stopSelf()

        // Send service stopped event
        sendServiceEvent("onServiceStopped", createServiceInfo("Monitoring stopped"))
    }

    private fun setupMonitoringTasks() {
        backgroundExecutor?.let { executor ->
            
            // Task 1: Monitor connected devices health
            executor.scheduleAtFixedRate({
                monitorDeviceHealth()
            }, 10, 30, TimeUnit.SECONDS)

            // Task 2: Process and aggregate data
            executor.scheduleAtFixedRate({
                processMonitoringData()
            }, 5, 60, TimeUnit.SECONDS)

            // Task 3: Check for disconnected devices and attempt reconnection
            executor.scheduleAtFixedRate({
                checkDisconnectedDevices()
            }, 15, 45, TimeUnit.SECONDS)

            // Task 4: Send periodic status updates
            executor.scheduleAtFixedRate({
                sendStatusUpdate()
            }, 30, 120, TimeUnit.SECONDS)
        }
    }

    private fun monitorDeviceHealth() {
        try {
            connectedDevices.forEach { deviceId ->
                val deviceHealth = checkDeviceHealth(deviceId)
                monitoringData["health_$deviceId"] = deviceHealth
                
                if (deviceHealth["status"] == "disconnected") {
                    Log.w(TAG, "Device $deviceId appears disconnected, attempting reconnection")
                    reconnectDevice(deviceId)
                }
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error monitoring device health: ${error.message}")
        }
    }

    private fun checkDeviceHealth(deviceId: String): Map<String, Any> {
        val health = mutableMapOf<String, Any>()
        
        try {
            // Check if device is still connected
            val isConnected = enhancedBLEManager?.let { manager ->
                // This would check the actual connection status
                true // Placeholder
            } ?: false

            health["status"] = if (isConnected) "connected" else "disconnected"
            health["lastSeen"] = Date().toString()
            health["signalStrength"] = 85 // Placeholder
            health["batteryLevel"] = 90 // Placeholder

        } catch (error: Exception) {
            health["status"] = "error"
            health["error"] = error.message ?: "Unknown error"
        }

        return health
    }

    private fun reconnectDevice(deviceId: String) {
        try {
            Log.d(TAG, "Attempting to reconnect device: $deviceId")
            
            // Send reconnection event
            sendServiceEvent("onReconnectionAttempt", createDeviceInfo(deviceId, "Reconnecting"))
            
            // Attempt reconnection through enhanced BLE manager
            enhancedBLEManager?.let { manager ->
                val options = Arguments.createMap().apply {
                    putString("deviceId", deviceId)
                    putBoolean("enableAutoReconnect", true)
                }
                
                // This would trigger the reconnection logic
                // manager.connectToDeviceEnhanced(options, Promise { resolve, reject ->
                //     // Handle reconnection result
                // })
            }
            
        } catch (error: Exception) {
            Log.e(TAG, "Error reconnecting device $deviceId: ${error.message}")
            sendServiceEvent("onReconnectionError", createErrorInfo("Failed to reconnect: ${error.message}"))
        }
    }

    private fun checkDisconnectedDevices() {
        try {
            // Check for devices that should be connected but aren't
            val expectedDevices = getExpectedConnectedDevices()
            
            expectedDevices.forEach { deviceId ->
                if (!connectedDevices.contains(deviceId)) {
                    Log.w(TAG, "Expected device $deviceId is not connected, attempting reconnection")
                    reconnectDevice(deviceId)
                }
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error checking disconnected devices: ${error.message}")
        }
    }

    private fun getExpectedConnectedDevices(): List<String> {
        // This would return the list of devices that should be connected
        // based on user preferences or previous connections
        return listOf() // Placeholder
    }

    private fun processMonitoringData() {
        try {
            // Process and aggregate monitoring data
            val aggregatedData = mutableMapOf<String, Any>()
            
            monitoringData.forEach { (key, value) ->
                when {
                    key.startsWith("health_") -> {
                        val deviceId = key.removePrefix("health_")
                        aggregatedData["device_$deviceId"] = value
                    }
                    key.startsWith("data_") -> {
                        val deviceId = key.removePrefix("data_")
                        aggregatedData["data_$deviceId"] = value
                    }
                }
            }
            
            // Send aggregated data event
            sendServiceEvent("onMonitoringData", createMonitoringDataInfo(aggregatedData))
            
        } catch (error: Exception) {
            Log.e(TAG, "Error processing monitoring data: ${error.message}")
        }
    }

    private fun sendStatusUpdate() {
        try {
            val status = createStatusInfo()
            sendServiceEvent("onStatusUpdate", status)
            
            // Update notification with current status
            updateNotification(status)
            
        } catch (error: Exception) {
            Log.e(TAG, "Error sending status update: ${error.message}")
        }
    }

    private fun createStatusInfo(): WritableMap {
        return Arguments.createMap().apply {
            putString("timestamp", Date().toString())
            putInt("connectedDevices", connectedDevices.size)
            putBoolean("isMonitoring", isMonitoring)
            putString("serviceStatus", "running")
        }
    }

    private fun createMonitoringDataInfo(data: Map<String, Any>): WritableMap {
        return Arguments.createMap().apply {
            putString("timestamp", Date().toString())
            val dataMap = Arguments.createMap()
            data.forEach { (key, value) ->
                when (value) {
                    is String -> dataMap.putString(key, value)
                    is Number -> dataMap.putDouble(key, value.toDouble())
                    is Boolean -> dataMap.putBoolean(key, value)
                    else -> dataMap.putString(key, value.toString())
                }
            }
            putMap("data", dataMap)
        }
    }

    private fun createDeviceInfo(deviceId: String, status: String): WritableMap {
        return Arguments.createMap().apply {
            putString("deviceId", deviceId)
            putString("status", status)
            putString("timestamp", Date().toString())
        }
    }

    private fun createErrorInfo(message: String): WritableMap {
        return Arguments.createMap().apply {
            putString("message", message)
            putString("timestamp", Date().toString())
            putString("errorType", "SERVICE_ERROR")
        }
    }

    private fun createServiceInfo(message: String): WritableMap {
        return Arguments.createMap().apply {
            putString("message", message)
            putString("timestamp", Date().toString())
            putString("serviceType", "ELD_MONITORING")
        }
    }

    private fun sendServiceEvent(eventName: String, params: WritableMap?) {
        try {
            // Use the event broadcaster to handle the event properly
            eventBroadcaster.sendEvent(eventName, params)
            Log.d(TAG, "Service event sent via broadcaster: $eventName")
        } catch (error: Exception) {
            Log.e(TAG, "Error sending service event $eventName: ${error.message}")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "ELD Monitoring Service"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ELD Monitoring Active")
            .setContentText("Monitoring ${connectedDevices.size} connected devices")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(status: WritableMap) {
        val notification = createNotification()
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "ELD Monitoring Service destroyed")
        
        // Cleanup resources
        enhancedBLEManager?.cleanup()
        backgroundExecutor?.shutdown()
        
        // Send service destroyed event
        sendServiceEvent("onServiceDestroyed", createServiceInfo("Service destroyed"))
    }
} 