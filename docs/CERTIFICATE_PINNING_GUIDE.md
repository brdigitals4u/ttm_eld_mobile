# Certificate Pinning Setup Guide

## File Location

The certificate pinning module is located at:
```
android/app/src/main/java/com/ttmkonnect/eld/CertificatePinningModule.java
```

## Current Configuration

The file currently has placeholder values that need to be replaced:

```java
// Lines 26-32
private static final String API_DOMAIN = "api.ttmkonnect.com";
private static final String AWS_DOMAIN = "*.execute-api.us-east-1.amazonaws.com";

// REPLACE THESE WITH ACTUAL HASHES:
private static final String API_CERT_HASH = "sha256/YOUR_CERTIFICATE_HASH_HERE";
private static final String AWS_CERT_HASH = "sha256/YOUR_AWS_CERTIFICATE_HASH_HERE";
```

## How to Extract Certificate Hashes

### Method 1: Using the Extraction Script (Recommended)

Run the provided script:

```bash
./scripts/extract-certificate-hashes.sh
```

This will:
- Connect to your servers
- Extract the SHA-256 certificate hashes
- Show you exactly what to paste into the Java file

### Method 2: Manual Extraction

#### For `api.ttmkonnect.com`:

```bash
echo | openssl s_client -connect api.ttmkonnect.com:443 -servername api.ttmkonnect.com 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

#### For AWS API Gateway (`oy47qb63f3.execute-api.us-east-1.amazonaws.com`):

```bash
echo | openssl s_client -connect oy47qb63f3.execute-api.us-east-1.amazonaws.com:443 \
  -servername oy47qb63f3.execute-api.us-east-1.amazonaws.com 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

The output will be a base64 string. Prepend `sha256/` to it.

### Method 3: Using Online Tools

1. Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.ttmkonnect.com
2. Look for "Certificate #1" → "SHA256 Fingerprint"
3. Convert the hex fingerprint to base64, or use the pin-sha256 value if shown

## Updating the File

1. Extract the certificate hashes using one of the methods above
2. Open `android/app/src/main/java/com/ttmkonnect/eld/CertificatePinningModule.java`
3. Replace lines 31-32 with the actual hashes:

```java
// Replace this:
private static final String API_CERT_HASH = "sha256/YOUR_CERTIFICATE_HASH_HERE";
private static final String AWS_CERT_HASH = "sha256/YOUR_AWS_CERTIFICATE_HASH_HERE";

// With actual hashes (example format):
private static final String API_CERT_HASH = "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
private static final String AWS_CERT_HASH = "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
```

## Pinning Multiple Certificates (Recommended)

For better reliability, pin multiple certificates (including backup/intermediate certificates):

```java
CertificatePinner certificatePinner = new CertificatePinner.Builder()
    .add(API_DOMAIN, API_CERT_HASH)
    .add(API_DOMAIN, API_BACKUP_CERT_HASH)  // Add backup certificate
    .add(AWS_DOMAIN, AWS_CERT_HASH)
    .add(AWS_DOMAIN, AWS_BACKUP_CERT_HASH)  // Add backup certificate
    .build();
```

To get all certificates in the chain:

```bash
# Get all certificates in chain
echo | openssl s_client -connect api.ttmkonnect.com:443 -showcerts 2>/dev/null | \
  awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/ {print}' | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

## Verification

After updating, rebuild the app and test:

```bash
npm run build:android:prod
```

The app should:
- ✅ Connect successfully to your APIs
- ✅ Reject connections with invalid certificates
- ✅ Prevent MITM attacks

## Troubleshooting

### Certificate Pinning Fails

If the app fails to connect after adding certificate pinning:

1. **Verify the hash is correct**: Re-extract and double-check
2. **Check certificate chain**: Your server might be using a different certificate
3. **Test connection**: Use `openssl s_client` to verify the domain is accessible
4. **Check logs**: Look for `CERT_PINNING_ERROR` in Android logs

### Certificate Expiration

Certificates expire and rotate. When they do:

1. Extract the new certificate hash
2. Update `CertificatePinningModule.java`
3. Release an app update

**Best Practice**: Pin multiple certificates (current + backup) to avoid breaking when certificates rotate.

## Security Notes

- Certificate pinning prevents MITM attacks
- If a certificate changes, the app will reject the connection
- Always pin multiple certificates for redundancy
- Test thoroughly before releasing to production










