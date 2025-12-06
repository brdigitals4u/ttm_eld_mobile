# Final 16 KB Page Size Fix

## Critical Issues Found

From APK Analyzer:
1. **Libraries are COMPRESSED** - Should be uncompressed
2. **Libraries have 4 KB alignment** - Need 16 KB alignment
3. **Alignment script may not run during EAS builds**

## Fixes Applied

### 1. Force Uncompressed Libraries

**File**: `android/app/build.gradle`
```gradle
packagingOptions {
    jniLibs {
        // CRITICAL: Must be false to ensure uncompressed native libraries
        useLegacyPackaging false
    }
}
```

**File**: `android/gradle.properties`
```properties
# Force uncompressed native libraries (required for 16 KB page size)
android.bundle.enableUncompressedNativeLibs=false
```

**File**: `app.json`
```json
"packagingOptions": {
  "jniLibs": {
    "useLegacyPackaging": false
  }
}
```

### 2. Ensure Alignment Script Runs

The alignment script MUST run during `mergeNativeLibs` task (before packaging).

**File**: `android/app/build.gradle`
- Script runs after `mergeNativeLibs` task
- This ensures libraries are aligned BEFORE being packaged into AAB

### 3. EAS Build Configuration

**File**: `eas.json`
```json
"production": {
  "android": {
    "gradleCommand": ":app:bundleRelease"
  }
}
```

## Verification Steps

After building, check the build logs for:

1. **Script Found**:
   ```
   ✅ Found 16 KB alignment script at [path]
   ```

2. **Alignment Running**:
   ```
   🔧 Running 16 KB alignment after mergeNativeLibs for release...
   📁 Found merged native libs at: [path]
   ```

3. **Alignment Success**:
   ```
   📊 16 KB Alignment Summary for release:
      Total libraries: [N]
      Successfully aligned: [M]
   ✅ Aligned [M] native library(ies) to 16 KB page size
   ```

4. **Check APK Analyzer**:
   - Libraries should show "No" under Compressed column
   - Alignment should show "16 KB" or "16384" for all libraries

## If Still Failing

### Check Build Logs
Look for alignment messages. If missing, the script isn't running.

### Verify Script is Included
The script must be in `android/scripts/ensure_16k_page.py` and be executable.

### Test Alignment Script Manually
```bash
python3 android/scripts/ensure_16k_page.py [path-to-so-file]
```

### Check Library Compression
After build, extract AAB and check:
```bash
unzip app-release.aab -d /tmp/aab
file /tmp/aab/base/lib/arm64-v8a/libble-native-lib.so
# Should show "ELF" not "gzip compressed"
```

## Next Build

Run:
```bash
npm run build:prod
```

Then verify in APK Analyzer that:
- ✅ Libraries are NOT compressed
- ✅ All libraries show 16 KB alignment











