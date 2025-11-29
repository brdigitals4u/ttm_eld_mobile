package com.ttmkonnect.eld;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import java.io.IOException;
import java.security.GeneralSecurityException;

/**
 * Secure Configuration Storage
 * Stores sensitive API keys and configuration using Android Keystore encryption
 */
public class SecureConfig {
    private static final String PREFS_NAME = "secure_config";
    private static final String MASTER_KEY_ALIAS = "_secure_config_key";
    
    private static SharedPreferences encryptedPrefs;
    
    /**
     * Initialize encrypted shared preferences
     */
    public static void initialize(Context context) {
        if (encryptedPrefs != null) {
            return;
        }
        
        try {
            // Create or retrieve master key
            KeyGenParameterSpec keyGenParameterSpec = new KeyGenParameterSpec.Builder(
                MASTER_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build();
            
            MasterKey masterKey = new MasterKey.Builder(context)
                .setKeyGenParameterSpec(keyGenParameterSpec)
                .build();
            
            // Create encrypted shared preferences
            encryptedPrefs = EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (GeneralSecurityException | IOException e) {
            // Fallback to regular SharedPreferences if encryption fails
            encryptedPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        }
    }
    
    /**
     * Get a secure string value
     */
    public static String getString(Context context, String key, String defaultValue) {
        initialize(context);
        return encryptedPrefs.getString(key, defaultValue);
    }
    
    /**
     * Set a secure string value
     */
    public static void setString(Context context, String key, String value) {
        initialize(context);
        encryptedPrefs.edit().putString(key, value).apply();
    }
    
    /**
     * Get Freshchat App ID
     */
    public static String getFreshchatAppId(Context context) {
        return getString(context, "freshchat_app_id", "");
    }
    
    /**
     * Get Freshchat App Key
     */
    public static String getFreshchatAppKey(Context context) {
        return getString(context, "freshchat_app_key", "");
    }
    
    /**
     * Get Freshchat Domain
     */
    public static String getFreshchatDomain(Context context) {
        return getString(context, "freshchat_domain", "");
    }
    
    /**
     * Get AWS API Gateway Base URL
     */
    public static String getAwsApiGatewayUrl(Context context) {
        return getString(context, "aws_api_gateway_url", "");
    }
    
    /**
     * Get AWS Cognito User Pool ID
     */
    public static String getAwsCognitoUserPoolId(Context context) {
        return getString(context, "aws_cognito_user_pool_id", "");
    }
    
    /**
     * Get AWS Cognito Client ID
     */
    public static String getAwsCognitoClientId(Context context) {
        return getString(context, "aws_cognito_client_id", "");
    }
    
    /**
     * Initialize secure config with default values (called during app initialization)
     * In production, these should be set via secure backend or build-time injection
     */
    public static void initializeDefaults(Context context) {
        initialize(context);
        
        // Only set if not already set (allows override via secure backend)
        if (!encryptedPrefs.contains("freshchat_app_key")) {
            // These values should be injected at build time or fetched from secure backend
            // For now, we'll leave them empty to be set via React Native bridge
        }
    }
}

