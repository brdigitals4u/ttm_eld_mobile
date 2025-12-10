# Code Protection Setup Guide

## Quick Start

### 1. Build with Obfuscation

To build the app with JavaScript obfuscation enabled:

```bash
npm run build:android:prod:obfuscated
```

Or set environment variables:

```bash
ENABLE_OBFUSCATION=true NODE_ENV=production npm run build:android:prod
```

### 2. Initialize Secure Configuration

API keys need to be set in secure storage. You have two options:

#### Option A: Set via Secure Backend (Recommended)

Create a secure endpoint that returns API keys after authentication, then call:

```typescript
import { secureConfigService } from '@/services/SecureConfigService'

// After user authentication
await secureConfigService.setSecureValue('freshchat_app_key', 'YOUR_KEY')
await secureConfigService.setSecureValue('aws_cognito_user_pool_id', 'YOUR_POOL_ID')
// ... etc
```

#### Option B: Build-Time Injection

Modify `SecureConfig.java` to set default values during build (less secure).

### 3. Configure Certificate Pinning

Extract your server certificate hashes and update `CertificatePinningModule.java`:

```bash
# Extract certificate hash
openssl s_client -connect api.ttmkonnect.com:443 -showcerts | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Update the `API_CERT_HASH` and `AWS_CERT_HASH` constants in `CertificatePinningModule.java`.

### 4. Test Security

Run security tests:

```bash
npm run test:security
```

## Protection Features

### ✅ JavaScript Obfuscation
- Aggressive code obfuscation
- String array encoding
- Control flow flattening
- Self-defending code

### ✅ API Key Protection
- Keys stored in Android Keystore
- Encrypted SharedPreferences
- Not accessible from JavaScript bundle

### ✅ Native Code Protection
- Enhanced ProGuard/R8 rules
- Package name obfuscation
- Source file name removal

### ✅ Anti-Tampering
- Root detection
- Emulator detection
- APK signature verification
- Debuggable app detection

### ✅ Certificate Pinning
- Prevents MITM attacks
- Validates server certificates
- Uses OkHttp CertificatePinner

## Security Checklist

- [ ] Build app with obfuscation enabled
- [ ] Initialize secure config with API keys
- [ ] Update certificate hashes for pinning
- [ ] Test on rooted device (should detect)
- [ ] Test on emulator (should detect)
- [ ] Verify obfuscation in bundle
- [ ] Verify API keys not in bundle
- [ ] Test certificate pinning
- [ ] Run security tests

## Troubleshooting

### Obfuscation Not Working
- Ensure `ENABLE_OBFUSCATION=true` and `NODE_ENV=production`
- Check Metro config for errors
- Verify `javascript-obfuscator` is installed

### Secure Config Not Loading
- Check Android Keystore is available
- Verify `SecureConfigPackage` is registered in `MainApplication.kt`
- Check logs for initialization errors

### Certificate Pinning Failing
- Verify certificate hashes are correct
- Check OkHttp version compatibility
- Ensure `CertificatePinningPackage` is registered

## Additional Security Recommendations

1. **Backend Key Injection**: Fetch keys from secure backend at runtime
2. **Key Rotation**: Implement key rotation strategy
3. **Monitoring**: Set up alerts for security violations
4. **Block Compromised Devices**: Consider blocking app on rooted devices
5. **Commercial Solutions**: Consider RASP solutions for maximum protection













