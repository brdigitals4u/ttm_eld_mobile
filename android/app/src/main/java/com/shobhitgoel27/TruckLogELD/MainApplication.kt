package com.shobhitgoel27.TruckLogELD // IMPORTANT: Ensure this matches your actual package name

import android.app.Application
import android.util.Log // Import for logging
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import java.util.List

// TTM SDK Imports
import com.totaltransportmanagement.bluetoothle.BluetoothLESDK
import com.totaltransportmanagement.bluetoothle.config.BluetoothConfig
import com.totaltransportmanagement.bluetoothle.protocol.ObdProtocol

// Import your custom package
import com.shobhitgoel27.TruckLogELD.TTMBLEManagerPackage // Use your actual package name here

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean =
            BuildConfig.DEBUG

        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added here:
              // add(MyReactNativePackage())
              add(TTMBLEManagerPackage()) // Add your custom native package here
            }

        override fun getJSMainModuleName(): String =
            "index"

        override fun getNewArchitectureEntryPoint(): DefaultNewArchitectureEntryPoint =
            DefaultNewArchitectureEntryPoint.load()
      }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load()
    }
    // Initialize TTM SDK here when the application starts
    // It's crucial for the SDK's lifecycle management
    try {
        val builder = BluetoothConfig.Builder()
        builder.setProtocol(ObdProtocol())
        builder.setNeedNegotiationMTU(517)
        builder.setNeedFilterDevice(true)
        val config = builder.build()
        // true to enable logs in debug mode
        BluetoothLESDK.init(this, config, true)
        BluetoothLESDK.setDebug(true) // Enable debug logging
        Log.d("MainApplication", "TTM Bluetooth SDK initialized in onCreate.")
    } catch (e: Exception) {
        Log.e("MainApplication", "Error initializing TTM SDK in onCreate", e)
    }
  }
}