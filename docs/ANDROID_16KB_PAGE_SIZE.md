# Android 16 KB Page Size Support

## Overview

Android 15+ and Google Play Store require apps to support 16 KB memory page sizes. This document explains how the TTM Konnect app handles this requirement.

## Implementation

The app uses an automated script (`android/scripts/ensure_16k_page.py`) that patches native libraries (`.so` files) during the build process to ensure they are aligned for 16 KB page sizes.

## How It Works

1. **Build Process**: During the Android build, the script automatically runs after native libraries are merged
2. **ELF Alignment**: The script patches ELF binaries to ensure each PT_LOAD segment has `p_align >= 16 KB`
3. **Automatic**: No manual intervention required - the script runs automatically for all build variants

## Configuration

### Script Location
- **Path**: `android/scripts/ensure_16k_page.py`
- **Executable**: Script is marked as executable and uses Python 3

### Build Configuration
- **File**: `android/app/build.gradle`
- **Integration**: Script runs automatically after `mergeNativeLibs` and `package` tasks
- **Coverage**: All build variants (debug, release, etc.)

### Gradle Properties
- **File**: `android/gradle.properties`
- **Property**: `android.bundle.enableUncompressedNativeLibs=false` (ensures proper alignment)

## Verification

### During Build
The build output will show:
```
✅ Found 16 KB alignment script at [path]
✅ Aligned [N] native library(ies) to 16 KB page size
```

### If Script Not Found
You'll see a warning:
```
⚠️ 16 KB alignment script not found at [path]; skipping ELF patch step.
⚠️ This may cause issues with Android 15+ and Google Play Store requirements.
```

## Troubleshooting

### Issue: "Your app does not support 16 KB memory page sizes"

**Possible Causes:**
1. Script not running during build
2. Script path incorrect
3. Python 3 not available
4. Native libraries not being patched

**Solutions:**

1. **Verify Script Exists:**
   ```bash
   ls -la android/scripts/ensure_16k_page.py
   ```

2. **Make Script Executable:**
   ```bash
   chmod +x android/scripts/ensure_16k_page.py
   ```

3. **Check Python 3:**
   ```bash
   python3 --version
   ```

4. **Clean and Rebuild:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

5. **Check Build Logs:**
   Look for the alignment messages in the build output. If you don't see them, the script may not be running.

### Issue: Script Runs But Libraries Not Aligned

**Check:**
1. Verify the script is finding `.so` files in the build directories
2. Check if there are any errors in the script execution
3. Ensure the script has write permissions to modify the libraries

### Issue: Google Play Still Rejects

**Additional Steps:**
1. Ensure you're building with the latest Android Gradle Plugin
2. Verify `targetSdkVersion` is set correctly
3. Check that all native dependencies are being aligned
4. Consider using `android.bundle.enableUncompressedNativeLibs=false` in gradle.properties

## Technical Details

### What the Script Does

The `ensure_16k_page.py` script:
1. Reads ELF binary files (`.so` libraries)
2. Checks each PT_LOAD segment's alignment
3. If alignment < 16 KB, updates the `p_align` field to 16384 bytes
4. Writes the modified binary back

### Why It's Needed

- **Android 15+**: Newer Android versions use 16 KB page sizes on some devices
- **Google Play**: Requires apps to support 16 KB page sizes for compatibility
- **Performance**: Proper alignment improves memory efficiency

### Native Libraries Affected

The script processes all `.so` files in:
- Merged native libs directory
- Packaged libs directory
- Build output directories

This includes:
- React Native native modules
- Third-party native libraries
- Custom native code (if any)

## Build Process

1. **Compile**: Native code is compiled to `.so` files
2. **Merge**: Native libraries are merged into build directories
3. **Align**: Script runs and aligns all `.so` files to 16 KB
4. **Package**: Aligned libraries are packaged into APK/AAB

## References

- [Android 16 KB Page Size Documentation](https://developer.android.com/guide/practices/page-sizes)
- [Google Play 16 KB Requirement](https://support.google.com/googleplay/android-developer/answer/11926878)
- [ELF Binary Format](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format)

## Maintenance

### Updating the Script
The script is based on the official Android/Expo script for 16 KB alignment. If issues arise:
1. Check for updates to the script from Expo/React Native
2. Verify compatibility with latest Android Gradle Plugin
3. Test with a clean build

### Monitoring
- Check build logs for alignment messages
- Verify Google Play acceptance after updates
- Test on devices with 16 KB page sizes (if available)


