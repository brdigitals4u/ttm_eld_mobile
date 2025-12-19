package com.ttmkonnect.eld;

import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

/**
 * React Native Module for Security Checks
 * Provides security validation including root detection, tamper detection, etc.
 */
public class SecurityCheckerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "SecurityChecker";
    
    public SecurityCheckerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    /**
     * Perform comprehensive security check
     */
    @ReactMethod
    public void performSecurityCheck(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SecurityChecker.SecurityStatus status = SecurityChecker.performSecurityCheck(context);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("isRooted", status.isRooted);
            result.putBoolean("isEmulator", status.isEmulator);
            result.putBoolean("isDebuggable", status.isDebuggable);
            result.putBoolean("isDeveloperOptionsEnabled", status.isDeveloperOptionsEnabled);
            result.putBoolean("isSignatureValid", status.isSignatureValid);
            result.putBoolean("isSecure", status.isSecure);
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("SECURITY_CHECK_ERROR", "Failed to perform security check", e);
        }
    }
    
    /**
     * Check if device is rooted
     */
    @ReactMethod
    public void isRooted(Promise promise) {
        try {
            promise.resolve(SecurityChecker.isRooted());
        } catch (Exception e) {
            promise.reject("SECURITY_CHECK_ERROR", "Failed to check root status", e);
        }
    }
    
    /**
     * Check if running on emulator
     */
    @ReactMethod
    public void isEmulator(Promise promise) {
        try {
            promise.resolve(SecurityChecker.isEmulator());
        } catch (Exception e) {
            promise.reject("SECURITY_CHECK_ERROR", "Failed to check emulator status", e);
        }
    }
    
    /**
     * Verify APK signature
     */
    @ReactMethod
    public void verifySignature(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            promise.resolve(SecurityChecker.verifySignature(context));
        } catch (Exception e) {
            promise.reject("SECURITY_CHECK_ERROR", "Failed to verify signature", e);
        }
    }
}



















