package com.ttm.TTMKonnect

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Event broadcaster for ELD Service events
 * Stores events when React context is not available and sends them when it becomes available
 */
class ELDServiceEventBroadcaster private constructor() {
    companion object {
        private const val TAG = "ELDServiceEventBroadcaster"
        private const val PREFS_NAME = "eld_service_events"
        private const val KEY_PENDING_EVENTS = "pending_events"
        private const val MAX_STORED_EVENTS = 100
        
        @Volatile
        private var INSTANCE: ELDServiceEventBroadcaster? = null
        
        fun getInstance(): ELDServiceEventBroadcaster {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ELDServiceEventBroadcaster().also { INSTANCE = it }
            }
        }
    }
    
    private var reactContext: ReactApplicationContext? = null
    private val eventQueue = ConcurrentLinkedQueue<ServiceEvent>()
    private var sharedPrefs: SharedPreferences? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isProcessingQueue = false
    
    data class ServiceEvent(
        val eventName: String,
        val params: WritableMap?,
        val timestamp: Long = System.currentTimeMillis()
    )
    
    /**
     * Initialize the broadcaster with Android context
     */
    fun initialize(context: Context) {
        sharedPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        loadStoredEvents()
    }
    
    /**
     * Set the React context when available
     */
    fun setReactContext(context: ReactApplicationContext?) {
        reactContext = context
        if (context != null) {
            Log.d(TAG, "React context available, processing queued events")
            processQueuedEvents()
        } else {
            Log.d(TAG, "React context lost")
        }
    }
    
    /**
     * Send an event - either immediately if React context is available, or queue it
     */
    fun sendEvent(eventName: String, params: WritableMap?) {
        val event = ServiceEvent(eventName, params)
        
        if (reactContext != null) {
            sendEventImmediately(event)
        } else {
            queueEvent(event)
        }
    }
    
    /**
     * Queue an event for later sending
     */
    private fun queueEvent(event: ServiceEvent) {
        eventQueue.offer(event)
        
        // Limit queue size
        while (eventQueue.size > MAX_STORED_EVENTS) {
            eventQueue.poll()
        }
        
        // Store to SharedPreferences for persistence
        storeEvents()
        
        Log.d(TAG, "Queued event: ${event.eventName} (Queue size: ${eventQueue.size})")
    }
    
    /**
     * Send event immediately to React Native
     */
    private fun sendEventImmediately(event: ServiceEvent) {
        try {
            reactContext?.let { context ->
                mainHandler.post {
                    try {
                        context
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit(event.eventName, event.params)
                        
                        Log.d(TAG, "Event sent: ${event.eventName}")
                    } catch (error: Exception) {
                        Log.e(TAG, "Failed to send event ${event.eventName}: ${error.message}")
                        // Re-queue the event if sending fails
                        queueEvent(event)
                    }
                }
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error in sendEventImmediately: ${error.message}")
            queueEvent(event)
        }
    }
    
    /**
     * Process all queued events
     */
    private fun processQueuedEvents() {
        if (isProcessingQueue || reactContext == null) return
        
        isProcessingQueue = true
        
        mainHandler.post {
            try {
                val eventsToProcess = mutableListOf<ServiceEvent>()
                
                // Drain the queue
                while (eventQueue.isNotEmpty()) {
                    eventQueue.poll()?.let { eventsToProcess.add(it) }
                }
                
                Log.d(TAG, "Processing ${eventsToProcess.size} queued events")
                
                // Send each event with a small delay to avoid overwhelming the JS thread
                eventsToProcess.forEachIndexed { index, event ->
                    mainHandler.postDelayed({
                        sendEventImmediately(event)
                    }, index * 50L) // 50ms delay between events
                }
                
                // Clear stored events after successful processing
                clearStoredEvents()
                
            } catch (error: Exception) {
                Log.e(TAG, "Error processing queued events: ${error.message}")
            } finally {
                isProcessingQueue = false
            }
        }
    }
    
    /**
     * Store events to SharedPreferences for persistence
     */
    private fun storeEvents() {
        try {
            sharedPrefs?.let { prefs ->
                val eventsJson = JSONObject()
                val eventsArray = org.json.JSONArray()
                
                eventQueue.forEachIndexed { index, event ->
                    val eventJson = JSONObject().apply {
                        put("eventName", event.eventName)
                        put("timestamp", event.timestamp)
                        // Convert WritableMap to JSON string (simplified)
                        put("params", event.params?.toString() ?: "null")
                    }
                    eventsArray.put(eventJson)
                }
                
                eventsJson.put("events", eventsArray)
                
                prefs.edit()
                    .putString(KEY_PENDING_EVENTS, eventsJson.toString())
                    .apply()
                
                Log.d(TAG, "Stored ${eventQueue.size} events to SharedPreferences")
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error storing events: ${error.message}")
        }
    }
    
    /**
     * Load stored events from SharedPreferences
     */
    private fun loadStoredEvents() {
        try {
            sharedPrefs?.let { prefs ->
                val eventsJsonString = prefs.getString(KEY_PENDING_EVENTS, null)
                if (eventsJsonString != null) {
                    val eventsJson = JSONObject(eventsJsonString)
                    val eventsArray = eventsJson.getJSONArray("events")
                    
                    for (i in 0 until eventsArray.length()) {
                        val eventJson = eventsArray.getJSONObject(i)
                        val eventName = eventJson.getString("eventName")
                        val timestamp = eventJson.getLong("timestamp")
                        
                        // Create a simple event (params will be reconstructed)
                        val event = ServiceEvent(eventName, null, timestamp)
                        eventQueue.offer(event)
                    }
                    
                    Log.d(TAG, "Loaded ${eventQueue.size} stored events")
                }
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error loading stored events: ${error.message}")
        }
    }
    
    /**
     * Clear stored events from SharedPreferences
     */
    private fun clearStoredEvents() {
        try {
            sharedPrefs?.edit()?.remove(KEY_PENDING_EVENTS)?.apply()
            Log.d(TAG, "Cleared stored events")
        } catch (error: Exception) {
            Log.e(TAG, "Error clearing stored events: ${error.message}")
        }
    }
    
    /**
     * Get queue status for debugging
     */
    fun getQueueStatus(): String {
        return "Queue size: ${eventQueue.size}, React context: ${if (reactContext != null) "available" else "null"}"
    }
    
    /**
     * Cleanup resources
     */
    fun cleanup() {
        storeEvents() // Store any remaining events
        eventQueue.clear()
        reactContext = null
    }
}
