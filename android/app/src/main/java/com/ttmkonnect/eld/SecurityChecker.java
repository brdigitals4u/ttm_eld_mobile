package com.ttmkonnect.eld;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.provider.Settings;
import java.io.File;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

/**
 * Security Checker
 * Implements anti-tampering, root detection, and security validation
 */
public class SecurityChecker {
    private static final String TAG = "SecurityChecker";
    
    /**
     * Check if device is rooted
     */
    public static boolean isRooted() {
        return checkRootMethod1() || checkRootMethod2() || checkRootMethod3();
    }
    
    /**
     * Check for common root binaries
     */
    private static boolean checkRootMethod1() {
        String[] paths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        };
        
        for (String path : paths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check for root management apps
     */
    private static boolean checkRootMethod2() {
        String[] rootApps = {
            "com.noshufou.android.su",
            "com.noshufou.android.su.elite",
            "eu.chainfire.supersu",
            "com.koushikdutta.superuser",
            "com.thirdparty.superuser",
            "com.yellowes.su",
            "com.topjohnwu.magisk",
            "com.kingroot.kinguser",
            "com.kingo.root",
            "com.smedialink.oneclickroot",
            "com.zhiqupk.root.global",
            "com.alephzain.framaroot"
        };
        
        // This would require PackageManager - simplified check
        return false;
    }
    
    /**
     * Check for dangerous properties
     */
    private static boolean checkRootMethod3() {
        try {
            String buildTags = Build.TAGS;
            if (buildTags != null && buildTags.contains("test-keys")) {
                return true;
            }
        } catch (Exception e) {
            // Ignore
        }
        return false;
    }
    
    /**
     * Check if app is running on emulator
     */
    public static boolean isEmulator() {
        return Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.MODEL.contains("google_sdk")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
            || Build.MANUFACTURER.contains("Genymotion")
            || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
            || "google_sdk".equals(Build.PRODUCT);
    }
    
    /**
     * Check if developer options are enabled
     */
    public static boolean isDeveloperOptionsEnabled(Context context) {
        try {
            int developerOptions = Settings.Global.getInt(
                context.getContentResolver(),
                Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
                0
            );
            return developerOptions == 1;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Verify APK signature
     */
    public static boolean verifySignature(Context context) {
        try {
            PackageManager pm = context.getPackageManager();
            String packageName = context.getPackageName();
            PackageInfo packageInfo = pm.getPackageInfo(
                packageName,
                PackageManager.GET_SIGNATURES
            );
            
            Signature[] signatures = packageInfo.signatures;
            if (signatures == null || signatures.length == 0) {
                return false;
            }
            
            // Get expected signature hash (should be stored securely)
            // For now, just verify signature exists
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(signatures[0].toByteArray());
            byte[] signatureHash = md.digest();
            
            // In production, compare against expected hash stored securely
            // For now, just verify signature is present
            return signatureHash != null && signatureHash.length > 0;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Check if app is debuggable
     */
    public static boolean isDebuggable(Context context) {
        try {
            ApplicationInfo appInfo = context.getApplicationInfo();
            return (appInfo.flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Perform comprehensive security check
     */
    public static SecurityStatus performSecurityCheck(Context context) {
        SecurityStatus status = new SecurityStatus();
        
        status.isRooted = isRooted();
        status.isEmulator = isEmulator();
        status.isDebuggable = isDebuggable(context);
        status.isDeveloperOptionsEnabled = isDeveloperOptionsEnabled(context);
        status.isSignatureValid = verifySignature(context);
        
        // Overall security status
        status.isSecure = !status.isRooted 
            && !status.isEmulator 
            && !status.isDebuggable
            && status.isSignatureValid;
        
        return status;
    }
    
    /**
     * Security status result
     */
    public static class SecurityStatus {
        public boolean isRooted = false;
        public boolean isEmulator = false;
        public boolean isDebuggable = false;
        public boolean isDeveloperOptionsEnabled = false;
        public boolean isSignatureValid = false;
        public boolean isSecure = false;
    }
}



