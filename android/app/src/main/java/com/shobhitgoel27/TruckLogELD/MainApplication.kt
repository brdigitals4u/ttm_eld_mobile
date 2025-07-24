package com.shobhitgoel27.TruckLogELD

import android.app.Application
import android.content.res.Configuration
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
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

  override val reactNativeHost: ReactNativeHost =
    ReactNativeHostWrapper(this, object : DefaultReactNativeHost(this) {
      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override fun getPackages(): List<ReactPackage> {
        val packages: MutableList<ReactPackage> = PackageList(this).packages
        // Manually add your custom package to the list of packages returned by autolinking
        packages.add(TTMBLEManagerPackage())
        return packages
      }

      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    })

  override val reactHost: com.facebook.react.ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load()
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
