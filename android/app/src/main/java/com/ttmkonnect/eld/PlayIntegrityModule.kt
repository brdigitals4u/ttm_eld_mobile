package com.ttmkonnect.eld

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import com.google.android.play.core.integrity.IntegrityServiceException

class PlayIntegrityModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PlayIntegrityModule"
    }

    /**
     * Request an integrity token from Google Play Integrity API
     * @param nonce A unique nonce for this request (should be generated server-side for security)
     * @param cloudProjectNumber Optional cloud project number (if null, uses project linked in Play Console)
     * @param promise Promise to resolve with token or reject with error
     */
    @ReactMethod
    fun requestIntegrityToken(nonce: String, cloudProjectNumber: String?, promise: Promise) {
        try {
            val integrityManager = IntegrityManagerFactory.create(reactApplicationContext)

            val requestBuilder = IntegrityTokenRequest.builder()
                .setNonce(nonce)
            
            // Only set cloudProjectNumber if provided (non-null and non-empty)
            cloudProjectNumber?.let { projectNumber ->
                try {
                    val projectNumberLong = projectNumber.toLong()
                    requestBuilder.setCloudProjectNumber(projectNumberLong)
                } catch (e: NumberFormatException) {
                    Log.w(TAG, "Invalid cloudProjectNumber format: $projectNumber. Using Play Console linked project.")
                }
            }

            val request = requestBuilder.build()

            integrityManager.requestIntegrityToken(request)
                .addOnSuccessListener { integrityTokenResponse ->
                    try {
                        val token = integrityTokenResponse.token()
                        
                        val result = Arguments.createMap()
                        result.putString("token", token)
                        result.putBoolean("success", true)
                        
                        promise.resolve(result)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error extracting token", e)
                        promise.reject("TOKEN_ERROR", "Failed to extract token: ${e.message}", e)
                    }
                }
                .addOnFailureListener { e ->
                    when (e) {
                        is IntegrityServiceException -> {
                            val errorCode = e.errorCode
                            // Use error code directly since constants may not be available
                            val errorMessage = when (errorCode) {
                                1 -> "Integrity service unavailable. Please try again later."
                                2 -> "Network error. Please check your internet connection."
                                3 -> "App not installed from Google Play."
                                4 -> "Google Play Services not found."
                                5 -> "App UID mismatch."
                                6 -> "Google Play Store not found."
                                7 -> "No Google Play account found."
                                8 -> "Transient client error. Please try again."
                                9 -> "Client error occurred."
                                else -> "Play Integrity API error (code: $errorCode)"
                            }
                            
                            Log.e(TAG, "Play Integrity API error: $errorMessage (code: $errorCode)", e)
                            promise.reject("INTEGRITY_ERROR", errorMessage, e)
                        }
                        else -> {
                            Log.e(TAG, "Unexpected error requesting integrity token", e)
                            promise.reject("UNEXPECTED_ERROR", "Unexpected error: ${e.message}", e)
                        }
                    }
                }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create integrity manager", e)
            promise.reject("INIT_ERROR", "Failed to initialize Play Integrity API: ${e.message}", e)
        }
    }

    /**
     * Check if Play Integrity API is available on this device
     * @param promise Promise to resolve with availability status
     */
    @ReactMethod
    fun isPlayIntegrityAvailable(promise: Promise) {
        try {
            val integrityManager = IntegrityManagerFactory.create(reactApplicationContext)
            val result = Arguments.createMap()
            result.putBoolean("available", true)
            result.putString("message", "Play Integrity API is available")
            promise.resolve(result)
        } catch (e: Exception) {
            val result = Arguments.createMap()
            result.putBoolean("available", false)
            result.putString("message", "Play Integrity API is not available: ${e.message}")
            promise.resolve(result)
        }
    }

    companion object {
        private const val TAG = "PlayIntegrityModule"
    }
}
