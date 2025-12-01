package com.ttmkonnect.eld;

import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

/**
 * React Native Module for Secure Configuration
 * Provides secure access to API keys and sensitive configuration
 */
public class SecureConfigModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "SecureConfig";
    
    public SecureConfigModule(ReactApplicationContext reactContext) {
        super(reactContext);
        // Initialize secure config
        SecureConfig.initialize(reactContext);
    }
    
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    /**
     * Get Freshchat configuration
     */
    @ReactMethod
    public void getFreshchatConfig(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            WritableMap config = Arguments.createMap();
            
            config.putString("appId", SecureConfig.getFreshchatAppId(context));
            config.putString("appKey", SecureConfig.getFreshchatAppKey(context));
            config.putString("domain", SecureConfig.getFreshchatDomain(context));
            
            promise.resolve(config);
        } catch (Exception e) {
            promise.reject("SECURE_CONFIG_ERROR", "Failed to get Freshchat config", e);
        }
    }
    
    /**
     * Get AWS configuration
     */
    @ReactMethod
    public void getAwsConfig(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            WritableMap config = Arguments.createMap();
            
            WritableMap apiGateway = Arguments.createMap();
            apiGateway.putString("baseUrl", SecureConfig.getAwsApiGatewayUrl(context));
            config.putMap("apiGateway", apiGateway);
            
            WritableMap cognito = Arguments.createMap();
            cognito.putString("userPoolId", SecureConfig.getAwsCognitoUserPoolId(context));
            cognito.putString("clientId", SecureConfig.getAwsCognitoClientId(context));
            config.putMap("cognito", cognito);
            
            promise.resolve(config);
        } catch (Exception e) {
            promise.reject("SECURE_CONFIG_ERROR", "Failed to get AWS config", e);
        }
    }
    
    /**
     * Set secure configuration value (for initialization from secure backend)
     * This should only be called during app initialization with values from secure source
     */
    @ReactMethod
    public void setSecureValue(String key, String value, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SecureConfig.setString(context, key, value);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SECURE_CONFIG_ERROR", "Failed to set secure value", e);
        }
    }
    
    /**
     * Get a secure string value by key
     */
    @ReactMethod
    public void getSecureValue(String key, String defaultValue, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            String value = SecureConfig.getString(context, key, defaultValue);
            promise.resolve(value);
        } catch (Exception e) {
            promise.reject("SECURE_CONFIG_ERROR", "Failed to get secure value", e);
        }
    }
}


