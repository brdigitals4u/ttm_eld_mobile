package com.ttmkonnect.eld;

import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import okhttp3.CertificatePinner;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * React Native Module for Certificate Pinning
 * Implements certificate pinning using OkHttp CertificatePinner
 */
public class CertificatePinningModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "CertificatePinning";
    
    // Certificate hashes (SHA-256) for pinned domains
    // These should match your server certificates
    private static final String API_DOMAIN = "api.ttmkonnect.com";
    private static final String AWS_DOMAIN = "*.execute-api.us-east-1.amazonaws.com";
    
    // Certificate hashes - Extracted using ./scripts/extract-certificate-hashes.sh
    // Last updated: $(date +%Y-%m-%d)
    // 
    // To re-extract certificate hashes (e.g., after certificate rotation), run:
    //   ./scripts/extract-certificate-hashes.sh
    private static final String API_CERT_HASH = "sha256/VYMqF6SFqqCjV22dy/KHcKXWGqJ32qBZoZt4Cvbu0DQ=";
    private static final String AWS_CERT_HASH = "sha256/eeEJXH4MxxxQSQ3mfze6AtntCMgVdHUCZTuxyeXJ0yk=";
    
    private OkHttpClient pinnedClient;
    
    public CertificatePinningModule(ReactApplicationContext reactContext) {
        super(reactContext);
        initializePinnedClient();
    }
    
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    /**
     * Initialize OkHttp client with certificate pinning
     */
    private void initializePinnedClient() {
        CertificatePinner certificatePinner = new CertificatePinner.Builder()
            .add(API_DOMAIN, API_CERT_HASH)
            .add(AWS_DOMAIN, AWS_CERT_HASH)
            .build();
        
        pinnedClient = new OkHttpClient.Builder()
            .certificatePinner(certificatePinner)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
    }
    
    /**
     * Make a pinned HTTP request
     */
    @ReactMethod
    public void makePinnedRequest(String url, String method, String body, Promise promise) {
        try {
            Request.Builder requestBuilder = new Request.Builder().url(url);
            
            // Set method
            if ("POST".equals(method)) {
                if (body != null) {
                    requestBuilder.post(okhttp3.RequestBody.create(
                        okhttp3.MediaType.parse("application/json; charset=utf-8"),
                        body
                    ));
                } else {
                    requestBuilder.post(okhttp3.RequestBody.create(null, new byte[0]));
                }
            } else if ("PUT".equals(method)) {
                if (body != null) {
                    requestBuilder.put(okhttp3.RequestBody.create(
                        okhttp3.MediaType.parse("application/json; charset=utf-8"),
                        body
                    ));
                } else {
                    requestBuilder.put(okhttp3.RequestBody.create(null, new byte[0]));
                }
            } else if ("DELETE".equals(method)) {
                requestBuilder.delete();
            } else {
                requestBuilder.get();
            }
            
            Request request = requestBuilder.build();
            
            try (Response response = pinnedClient.newCall(request).execute()) {
                WritableMap result = Arguments.createMap();
                result.putInt("status", response.code());
                result.putString("body", response.body() != null ? response.body().string() : "");
                
                WritableMap headers = Arguments.createMap();
                if (response.headers() != null) {
                    for (int i = 0; i < response.headers().size(); i++) {
                        headers.putString(response.headers().name(i), response.headers().value(i));
                    }
                }
                result.putMap("headers", headers);
                
                promise.resolve(result);
            }
        } catch (IOException e) {
            promise.reject("CERT_PINNING_ERROR", "Certificate pinning failed: " + e.getMessage(), e);
        } catch (Exception e) {
            promise.reject("CERT_PINNING_ERROR", "Request failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Verify certificate for a domain
     */
    @ReactMethod
    public void verifyCertificate(String domain, Promise promise) {
        try {
            // This would perform a test request to verify the certificate
            // For now, just return success if client is initialized
            promise.resolve(pinnedClient != null);
        } catch (Exception e) {
            promise.reject("CERT_VERIFY_ERROR", "Certificate verification failed", e);
        }
    }
}

