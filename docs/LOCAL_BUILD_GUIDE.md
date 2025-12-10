# Local Android Build Guide

## Quick Start

### 1. Verify Configuration
```bash
npm run verify:16kb
```

### 2. Clean Previous Builds
```bash
cd android
./gradlew clean
cd ..
```

### 3. Build Release AAB (for Google Play)
```bash
cd android
./gradlew bundleRelease
cd ..
```

### 4. Find Your AAB
```bash
ls -lh android/app/build/outputs/bundle/release/*.aab
```

The AAB file is ready to upload to Google Play Console!

---

## Build Types

### Release AAB (for Google Play)
```bash
cd android
./gradlew bundleRelease
cd ..
```
**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

### Release APK (for direct installation/testing)
```bash
cd android
./gradlew assembleRelease
cd ..
```
**Output:** `android/app/build/outputs/apk/release/app-release.apk`

### Debug APK (for development)
```bash
cd android
./gradlew assembleDebug
cd ..
```
**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Installing APK on Device

### Method 1: Using ADB
```bash
# Connect device via USB
adb devices

# Install APK
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Method 2: Direct Transfer
1. Copy APK to device (USB, email, cloud storage)
2. Enable "Install from Unknown Sources" in device settings
3. Open APK file on device and install

---

## Troubleshooting

### Build Fails with "Gradle not found"
```bash
# Make gradlew executable
chmod +x android/gradlew
```

### Build Fails with "SDK not found"
- Open Android Studio
- Go to Tools → SDK Manager
- Install required SDK components
- Set `ANDROID_HOME` environment variable

### Build Fails with "Java not found"
```bash
# Check Java version (need JDK 17+)
java -version

# Install if needed (macOS)
brew install openjdk@17
```

### Build is Slow
- First build is always slow (downloads dependencies)
- Subsequent builds are faster
- Use `--offline` flag if you have all dependencies cached

---

## Build Output Locations

| Build Type | Output Location |
|------------|----------------|
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` |
| Release APK | `android/app/build/outputs/apk/release/app-release.apk` |
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Signed APK | `android/app/build/outputs/apk/release/app-release-signed.apk` |

---

## Signing the APK

If you need to sign the APK manually:

```bash
# Generate keystore (first time only)
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  my-key-alias

# Verify signature
jarsigner -verify -verbose -certs \
  android/app/build/outputs/apk/release/app-release-unsigned.apk
```

**Note:** For Google Play, you should use AAB format (bundleRelease) which handles signing automatically if configured in `android/app/build.gradle`.

---

## Environment Setup

### Required Environment Variables

```bash
# Add to ~/.zshrc or ~/.bash_profile

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Java (if needed)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

---

## Build Performance Tips

1. **Enable Gradle Daemon** (already enabled by default)
2. **Increase Gradle Memory:**
   ```bash
   # In android/gradle.properties
   org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
   ```
3. **Use Build Cache:**
   ```bash
   # In android/gradle.properties
   org.gradle.caching=true
   ```
4. **Parallel Builds:**
   ```bash
   # In android/gradle.properties
   org.gradle.parallel=true
   ```

---

## Common Commands

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Build release AAB
cd android && ./gradlew bundleRelease && cd ..

# Build release APK
cd android && ./gradlew assembleRelease && cd ..

# Build debug APK
cd android && ./gradlew assembleDebug && cd ..

# Check build output
ls -lh android/app/build/outputs/bundle/release/*.aab
ls -lh android/app/build/outputs/apk/release/*.apk

# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk

# View build logs
cd android && ./gradlew bundleRelease --info | tee build.log && cd ..
```













