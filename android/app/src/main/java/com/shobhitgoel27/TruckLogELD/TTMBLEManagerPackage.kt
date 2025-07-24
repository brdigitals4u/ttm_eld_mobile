package com.shobhitgoel27.TruckLogELD

import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Collections

class TTMBLEManagerPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        Log.d("TTMBLEManagerPackage", "createNativeModules called")
        val modules = ArrayList<NativeModule>()
        val ttmModule = TTMBLEManagerModule(reactContext)
        modules.add(ttmModule)
        Log.d("TTMBLEManagerPackage", "TTMBLEManagerModule created and added, module name: ${ttmModule.name}")
        return modules
    }
}
