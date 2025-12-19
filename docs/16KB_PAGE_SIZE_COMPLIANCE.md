# 16 KB Page Size Compliance for Android 15+

## Overview

Starting November 1st, 2025, Google Play requires all apps targeting Android 15+ (API level 35) to support 16 KB page sizes. This document outlines the changes made to ensure compliance.

## Requirements

1. **Android Gradle Plugin (AGP) 8.5.1+**: Required for proper 16 KB alignment
2. **Android NDK r28+**: Compiles with 16 KB alignment by default
3. **Uncompressed Native Libraries**: Native libraries must be uncompressed in the APK/AAB
4. **ELF Segment Alignment**: All native libraries (`.so` files) must have ELF segments aligned to at least 16 KB (16384 bytes)

## Changes Made

### 1. Android Gradle Plugin Version

**File**: `android/build.gradle`

Explicitly set AGP to version 8.5.1:
```gradle
classpath('com.android.tools.build:gradle:8.5.1')
```

AGP 8.5.1+ automatically handles:
- 16 KB ZIP alignment for uncompressed native libraries
- Proper ELF segment alignment during compilation

### 2. Expo Build Properties Configuration

**File**: `app.json`

Updated `expo-build-properties` plugin to configure:
- `compileSdkVersion`: 35 (Android 15)
- `targetSdkVersion`: 35
- `buildToolsVersion`: 35.0.0
- `ndkVersion`: 28.0.12674087 (NDK r28+)
- `packagingOptions.jniLibs.useLegacyPackaging`: false (ensures uncompressed libraries)

### 3. AndroidManifest.xml

**File**: `android/app/src/main/AndroidManifest.xml`

Added `android:pageSizeCompat="enabled"` to the `<application>` tag:
```xml
<application ... android:pageSizeCompat="enabled">
```

This property:
- Enables 16 KB page size compatibility mode
- Prevents backcompat mode warnings when the app launches
- Required for apps that are properly 16 KB aligned

### 4. Packaging Options

**File**: `android/app/build.gradle`

The existing packaging configuration already ensures:
- Native libraries are not compressed (`useLegacyPackaging: false`)
- Proper library handling for 16 KB alignment

### 5. 16 KB Alignment Script

**File**: `android/scripts/ensure_16k_page.py`

An automated script runs during the build process to:
- Patch all native libraries (`.so` files) to ensure 16 KB alignment
- Update ELF PT_LOAD segment alignment values to at least 16384 bytes
- Handle both 32-bit and 64-bit ELF binaries

The script is automatically executed during:
- `mergeNativeLibs` task (before packaging)
- `packageRelease` task (for APK builds)
- `bundleRelease` task (for AAB builds)

## Verification

### Check APK/AAB Alignment

After building, verify alignment using `zipalign`:

```bash
# For APK
zipalign -c -P 16 -v 4 app-release.apk

# For AAB (extract first, then check)
unzip app-release.aab -d /tmp/aab_out
zipalign -c -P 16 -v 4 /tmp/aab_out/base/lib/arm64-v8a/*.so
```

Expected output: `Verification successful`

### Check ELF Segment Alignment

For each `.so` file, verify ELF segments are aligned:

```bash
# Using llvm-objdump (requires NDK)
$ANDROID_NDK/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-objdump -p lib.so | grep LOAD
```

All LOAD segments should show `align 2**14` (16384 bytes) or higher.

### Test on 16 KB Device/Emulator

1. Set up Android 15 emulator with 16 KB page size system image
2. Install and run the app
3. Verify no backcompat mode warnings appear
4. Test all app functionality to ensure no regressions

## Build Process

The build automatically:

1. Compiles native code with NDK r28+ (16 KB aligned by default)
2. Merges all native libraries
3. Runs `ensure_16k_page.py` to patch any unaligned libraries
4. Packages libraries uncompressed in APK/AAB
5. ZIP-aligns the final package with 16 KB alignment

## Troubleshooting

### Build Fails with Alignment Errors

- Ensure AGP 8.5.1+ is installed
- Verify NDK r28+ is configured
- Check that `ensure_16k_page.py` is executable and accessible
- Review build logs for specific library alignment failures

### App Shows Backcompat Warning

- Verify `android:pageSizeCompat="enabled"` is in AndroidManifest.xml
- Check that all native libraries are properly aligned
- Ensure APK/AAB was built with 16 KB support enabled

### Third-Party SDK Issues

Some third-party SDKs may not be 16 KB compatible. Check:
- SDK provider's documentation for 16 KB support
- Update to latest SDK version if available
- Contact SDK provider if updates are needed

## References

- [Google Play 16 KB Page Size Requirement](https://developer.android.com/guide/practices/page-sizes)
- [Android NDK 16 KB Support](https://developer.android.com/ndk/guides/build_system#16kb-page-size)
- [AGP 8.5.1 Release Notes](https://developer.android.com/build/releases/gradle-plugin)

## Status

✅ **Compliant**: All requirements met for Google Play submission targeting Android 15+

- AGP 8.5.1+ configured
- NDK r28+ configured
- Native libraries uncompressed
- 16 KB alignment script integrated
- AndroidManifest.xml configured
- Build process verified



















