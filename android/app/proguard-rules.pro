# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================================================
# Aggressive Optimization and Obfuscation Settings
# ============================================================================
# Enable multiple optimization passes for better code shrinking
-optimizationpasses 5

# Allow access modification for better optimization
-allowaccessmodification
-repackageclasses ''

# Enable class merging (disabled for stability - can cause crashes)
# -mergeinterfacesaggressively

# Aggressive obfuscation settings
-dontpreverify
-verbose
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*

# Obfuscate package names (makes reverse engineering harder)
-flattenpackagehierarchy 'com.ttmkonnect.eld.obfuscated'

# Remove source file names and line numbers (prevents stack trace analysis)
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# Remove logging in release builds (assume side effects)
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}

# Remove console.log in release (if using React Native's console)
-assumenosideeffects class com.facebook.react.bridge.ReactMarker {
    public static *** logMarker(...);
}

# ============================================================================
# React Native Core
# ============================================================================
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}
-keepclassmembers class * {
    @react.bridge.ReactMethod *;
}
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native TurboModules
-keep class com.facebook.react.turbomodule.** { *; }

# React Native Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native DateTimePicker
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# ============================================================================
# React Native Reanimated
# ============================================================================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ============================================================================
# Expo Modules
# ============================================================================
-keep class expo.modules.** { *; }
-keep class org.unimodules.** { *; }
-keepclassmembers class * {
  @expo.modules.core.interfaces.ExpoProp *;
}

# Expo Location
-keep class expo.modules.location.** { *; }

# Expo Notifications
-keep class expo.modules.notifications.** { *; }

# Expo Task Manager
-keep class expo.modules.taskManager.** { *; }

# Expo Background Fetch
-keep class expo.modules.backgroundfetch.** { *; }

# Expo Secure Store
-keep class expo.modules.securestore.** { *; }

# Expo Crypto
-keep class expo.modules.crypto.** { *; }

# Expo Device
-keep class expo.modules.device.** { *; }

# Expo Router
-keep class expo.router.** { *; }

# ============================================================================
# React Native Skia
# ============================================================================
-keep class com.shopify.reactnative.skia.** { *; }
-keep class org.jetbrains.skija.** { *; }
-keep class org.jetbrains.skia.** { *; }

# ============================================================================
# React Native Freshchat
# ============================================================================
-keep class com.freshchat.** { *; }
-keep class com.freshdesk.** { *; }
-dontwarn com.freshchat.**
-dontwarn com.freshdesk.**

# ============================================================================
# React Navigation
# ============================================================================
-keep class com.reactnavigation.** { *; }
-keep class androidx.navigation.** { *; }

# ============================================================================
# Realm Database
# ============================================================================
-keep class io.realm.** { *; }
-keep @io.realm.annotations.RealmClass class * { *; }
-keep class io.realm.internal.** { *; }
-keepclassmembers class * extends io.realm.RealmObject {
    *;
}

# ============================================================================
# React Native Vector Icons
# ============================================================================
-keep class com.oblador.vectoricons.** { *; }

# ============================================================================
# React Native SVG
# ============================================================================
-keep class com.horcrux.svg.** { *; }

# ============================================================================
# React Native Screens
# ============================================================================
-keep class com.swmansion.rnscreens.** { *; }

# ============================================================================
# React Native Gesture Handler
# ============================================================================
-keep class com.swmansion.gesturehandler.** { *; }

# ============================================================================
# React Native Safe Area Context
# ============================================================================
-keep class com.th3rdwave.safeareacontext.** { *; }

# ============================================================================
# React Native WebView
# ============================================================================
-keep class com.reactnativecommunity.webview.** { *; }

# ============================================================================
# React Native MMKV
# ============================================================================
-keep class com.tencent.mmkv.** { *; }

# ============================================================================
# React Native Paper
# ============================================================================
-keep class com.callstack.reactnativepaper.** { *; }

# ============================================================================
# React Native PDF
# ============================================================================
-keep class org.wonday.pdf.** { *; }

# ============================================================================
# React Native Chart Kit
# ============================================================================
-keep class com.github.indiespirit.** { *; }

# ============================================================================
# Victory Charts
# ============================================================================
-keep class com.victory.** { *; }

# ============================================================================
# Lottie React Native
# ============================================================================
-keep class com.airbnb.lottie.** { *; }

# ============================================================================
# React Native Keyboard Controller
# ============================================================================
-keep class com.reactnativekeyboardcontroller.** { *; }

# ============================================================================
# React Native Drawer Layout
# ============================================================================
-keep class com.reactnativedrawerlayout.** { *; }

# ============================================================================
# React Native Edge to Edge
# ============================================================================
-keep class com.reactnativeedgetoedge.** { *; }

# ============================================================================
# React Native Toast Message
# ============================================================================
-keep class com.reactnativetoastmessage.** { *; }

# ============================================================================
# React Native Blob Util
# ============================================================================
-keep class com.ReactNativeBlobUtil.** { *; }

# ============================================================================
# React Native Progress
# ============================================================================
-keep class com.reactnativecommunity.progressbar.** { *; }

# ============================================================================
# Chatwoot Widget
# ============================================================================
-keep class com.chatwoot.** { *; }

# ============================================================================
# Gorhom Bottom Sheet
# ============================================================================
-keep class com.gorhom.** { *; }

# ============================================================================
# JM Bluetooth SDK (Custom Native Module)
# ============================================================================
-keep class com.ttmkonnect.eld.** { *; }
-keep class com.jimi.** { *; }
-keep class com.jm.** { *; }

# ============================================================================
# JSON Serialization (Gson, Jackson, etc.)
# ============================================================================
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ============================================================================
# OkHttp / Retrofit / Apisauce
# ============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ============================================================================
# Fresco (Image Loading)
# ============================================================================
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.common.internal.DoNotStrip *;
}
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.jni.annotations.DoNotStrip *;
}
-keep class com.facebook.fresco.** { *; }

# ============================================================================
# Reflection-based Libraries
# ============================================================================
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================================================
# Parcelable
# ============================================================================
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}

# ============================================================================
# Serializable
# ============================================================================
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================================================
# Keep Application class
# ============================================================================
-keep class com.ttmkonnect.eld.MainApplication { *; }
-keep class com.ttmkonnect.eld.MainActivity { *; }

# ============================================================================
# Secure Configuration Module (keep for React Native bridge)
# ============================================================================
-keep class com.ttmkonnect.eld.SecureConfig { *; }
-keep class com.ttmkonnect.eld.SecureConfigModule { *; }
-keep class com.ttmkonnect.eld.SecureConfigPackage { *; }

# ============================================================================
# Security Checker Module (keep for React Native bridge)
# ============================================================================
-keep class com.ttmkonnect.eld.SecurityChecker { *; }
-keep class com.ttmkonnect.eld.SecurityCheckerModule { *; }
-keep class com.ttmkonnect.eld.SecurityCheckerPackage { *; }

# ============================================================================
# Certificate Pinning Module (keep for React Native bridge)
# ============================================================================
-keep class com.ttmkonnect.eld.CertificatePinningModule { *; }
-keep class com.ttmkonnect.eld.CertificatePinningPackage { *; }
-keep class okhttp3.** { *; }

# ============================================================================
# Keep all native module packages
# ============================================================================
-keep class com.ttmkonnect.eld.** { *; }

# ============================================================================
# Remove logging in release builds (optional - reduces size)
# ============================================================================
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# ============================================================================
# Optimization
# ============================================================================
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Remove unused code
-dontpreverify
-repackageclasses ''
-allowaccessmodification
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*

# Remove source file names for security (keep minimal for crash reports)
-renamesourcefileattribute SourceFile
-keepattributes LineNumberTable

# ============================================================================
# Google Play Integrity API
# ============================================================================
-keep class com.google.android.play.core.integrity.** { *; }
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# ============================================================================
# Firebase Analytics
# ============================================================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Analytics specific
-keep class com.google.firebase.analytics.** { *; }
-keep class com.google.firebase.iid.** { *; }

# Google Play Services
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
