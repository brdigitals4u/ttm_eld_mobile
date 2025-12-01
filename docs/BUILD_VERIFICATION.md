# Build Verification Guide

## Version Code and 16 KB Support Fixes

This document describes the fixes applied to resolve Google Play Console errors for version code conflicts and 16 KB page size support.

## Changes Made

### 1. Version Code Verification

**Location**: `android/app/build.gradle`

**Changes**:
- Added version code verification logging that prints before build tasks
- Ensures versionCode 11 is used (or whatever is set in defaultConfig)
- Logs version code, version name, and application ID before building

**Verification**:
When running `./gradlew bundleRelease` or `./gradlew assembleRelease`, you should see:
```
🔍 Building with versionCode: 11
🔍 Building with versionName: 1.0.0
🔍 Application ID: com.ttmkonnect.eld
```

### 2. 16 KB Page Size Support

**Location**: `android/app/build.gradle`

**Changes**:
- Enhanced script path resolution with multiple fallback paths
- Added comprehensive logging for alignment process
- Added AAB build support (bundleRelease task)
- Improved error handling and reporting

**Script Path Resolution**:
The build script now tries multiple paths to find `ensure_16k_page.py`:
1. `project.rootDir/scripts/ensure_16k_page.py` (primary)
2. `rootProject.projectDir/scripts/ensure_16k_page.py` (fallback)
3. `rootProject.projectDir/android/scripts/ensure_16k_page.py` (fallback)

**Alignment Process**:
- Runs during `mergeNativeLibs` and `package` tasks (for APK builds)
- Also runs during `bundleRelease` task (for AAB builds)
- Processes all `.so` files in native library directories
- Provides detailed summary of alignment results

**Verification**:
When building, you should see:
```
✅ Found 16 KB alignment script at [path]
🔧 Running 16 KB alignment for AAB build (release)...
📊 16 KB Alignment Summary for release:
   Total libraries: [N]
   Successfully aligned: [M]
✅ Aligned [M] native library(ies) to 16 KB page size
```

## Build Instructions

### Clean Build (Recommended)

```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

### Verify Build Output

1. **Check Version Code**:
   - Look for: `🔍 Building with versionCode: 11`
   - Verify the version code matches what you expect

2. **Check 16 KB Alignment**:
   - Look for: `✅ Found 16 KB alignment script`
   - Look for: `✅ Aligned [N] native library(ies) to 16 KB page size`
   - Check the alignment summary for any failures

3. **Check for Errors**:
   - No errors about script not found
   - No errors about alignment failures (unless libraries are already aligned)

## Troubleshooting

### Version Code Still Shows as 2

**Possible Causes**:
1. Old AAB/APK being uploaded (built before changes)
2. Build cache issue
3. Version code override somewhere else

**Solutions**:
1. Clean build: `./gradlew clean`
2. Verify version code in build output
3. Check if version code is overridden in build variants or flavors
4. Rebuild and upload new AAB

### 16 KB Script Not Found

**Check**:
1. Script exists: `ls -la android/scripts/ensure_16k_page.py`
2. Script is executable: Should show `-rwxr-xr-x`
3. Python 3 available: `python3 --version`

**If Script Missing**:
- The build will show error messages with all attempted paths
- Verify the script exists at one of the paths shown

### No Libraries Aligned

**Possible Causes**:
1. Libraries already aligned (script exits with code 0 but no changes)
2. Libraries in unexpected location
3. Build variant issue

**Solutions**:
1. Check build logs for alignment summary
2. Verify native library directories exist
3. Check if libraries are in AAB bundle (may need extraction)

### AAB Build Not Aligning

**Note**: For AAB builds, alignment should happen during `mergeNativeLibs` and `package` tasks, which run before bundling. The bundle task alignment is a safety check.

**If Issues Persist**:
1. Check that `mergeReleaseNativeLibs` task runs before `bundleRelease`
2. Verify alignment happens during merge/package phase
3. Check build logs for alignment messages

## Expected Results

After implementing these fixes:

1. **Version Code**: AAB will have versionCode 11 (or higher)
2. **16 KB Support**: All native libraries aligned to 16 KB page size
3. **Google Play**: Upload should be accepted without errors

## Verification Commands

### Check AAB Version Code (requires bundletool)

```bash
# Extract version code from AAB
bundletool dump manifest --bundle=app-release.aab | grep versionCode
```

### Verify 16 KB Alignment (requires Python)

```bash
# Check a specific library
python3 android/scripts/ensure_16k_page.py path/to/library.so
```

## Next Steps

1. **Clean Build**: Run `./gradlew clean bundleRelease`
2. **Verify Output**: Check build logs for version code and alignment messages
3. **Upload to Google Play**: Upload the new AAB
4. **Monitor**: Check Google Play Console for acceptance

## Notes

- Version code must always increase for each upload
- 16 KB alignment is required for Android 15+ devices
- Both fixes are now automated in the build process
- Build logs provide detailed information for troubleshooting









