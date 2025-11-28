# EAS Build 16 KB Page Size Fix

## Issue

Google Play Console shows error:
```
Your app does not support 16 KB memory page sizes.
```

This occurs even though the 16 KB alignment script is configured in `build.gradle`.

## Root Cause

During EAS builds, the 16 KB alignment script might not be running correctly due to:
1. Script path resolution issues in EAS build environment
2. Script not running during the correct build phase
3. Native libraries not being aligned before AAB packaging

## Solution Applied

### 1. Enhanced Script Path Resolution

**File**: `android/app/build.gradle`

Improved script path detection to work in both local and EAS build environments:
- Tries multiple path resolutions
- Better null checking
- Clearer error messages

### 2. Critical Build Phase Alignment

**File**: `android/app/build.gradle`

Changed alignment to run during `mergeNativeLibs` task (BEFORE packaging):
- This ensures libraries are aligned before they're packaged into AAB
- Runs for both APK and AAB builds
- More reliable than running only during bundle task

### 3. Expo Build Properties Configuration

**File**: `app.json`

Added `expo-build-properties` plugin configuration:
```json
[
  "expo-build-properties",
  {
    "android": {
      "enableProguardInReleaseBuilds": true,
      "enableShrinkResourcesInReleaseBuilds": true,
      "enable16KbPageSizeSupport": true
    }
  }
]
```

This ensures 16 KB support is enabled at the Expo build level.

## Verification

After building with EAS, check the build logs for:

1. **Script Found**:
   ```
   ✅ Found 16 KB alignment script at [path]
   ```

2. **Alignment Running**:
   ```
   🔧 Running 16 KB alignment after mergeNativeLibs for release...
   📁 Found merged native libs at: [path]
   ```

3. **Alignment Summary**:
   ```
   📊 16 KB Alignment Summary for release:
      Total libraries: [N]
      Successfully aligned: [M]
   ✅ Aligned [M] native library(ies) to 16 KB page size
   ```

## If Still Failing

### Check Build Logs

Look for:
- `❌ 16 KB alignment script not found!` - Script path issue
- `⚠️ No native libraries found to align` - Libraries not in expected location
- No alignment messages at all - Script not running

### Verify Script is Included

The script must be included in the EAS build. Check:
1. Script exists: `android/scripts/ensure_16k_page.py`
2. Script is executable: `chmod +x android/scripts/ensure_16k_page.py`
3. Script is not ignored by `.gitignore` or `.easignore`

### Manual Verification

After EAS build completes, you can verify alignment:
```bash
# Extract AAB (if you have bundletool)
bundletool build-apks --bundle=app-release.aab --output=app.apks --mode=universal
unzip app.apks
# Check native libraries alignment
python3 android/scripts/ensure_16k_page.py path/to/library.so
```

## Next Steps

1. **Rebuild with EAS**:
   ```bash
   pnpm run build:android:prod
   ```

2. **Check Build Logs**:
   - Look for alignment messages
   - Verify script is found and running
   - Check alignment summary

3. **Upload to Google Play**:
   - The new AAB should have 16 KB aligned libraries
   - Google Play should accept the upload

## Additional Notes

- The alignment runs during `mergeNativeLibs` which happens before AAB packaging
- This ensures all native libraries are aligned before being packaged
- The `expo-build-properties` configuration provides additional 16 KB support at the Expo level
- Both local and EAS builds should now work correctly








