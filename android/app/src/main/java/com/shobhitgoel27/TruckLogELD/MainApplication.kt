package com.shobhitgoel27.TruckLogELD

import android.app.Application
import android.content.res.Configuration
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

// TTM SDK imports
import com.jimi.ble.BluetoothLESDK
import com.jimi.ble.BluetoothConfig
import com.jimi.ble.protocol.ObdProtocol

// Import your custom package
import com.shobhitgoel27.TruckLogELD.TTMBLEManagerPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            // Add your custom TTM package
            packages.add(TTMBLEManagerPackage())
            Log.d("MainApplication", "Total packages registered: ${packages.size}")
            Log.d("MainApplication", "TTMBLEManagerPackage added to packages")
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }

    // Initialize TTM SDK once when the application starts
    try {
        val builder = BluetoothConfig.Builder()
        builder.setProtocol(ObdProtocol())
        builder.setNeedNegotiationMTU(517)
        val config = builder.build()
        BluetoothLESDK.init(this, config, true) // true to enable logs
        BluetoothLESDK.setDebug(true)
        Log.d("MainApplication", "TTM Bluetooth SDK initialized successfully in onCreate.")
    } catch (e: Exception) {
        Log.e("MainApplication", "Error initializing TTM SDK in onCreate", e)
    }

    // This is required for Expo modules to receive lifecycle events
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
