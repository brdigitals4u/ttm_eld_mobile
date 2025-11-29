# Step-by-Step Guide: Fix 16 KB Page Size Support (Local Build)

## Overview
This guide will walk you through fixing the "Your app does not support 16 KB memory page sizes" error from Google Play Console using **local builds only**.

## Prerequisites
- ✅ All code changes have been made (AndroidManifest.xml, app.json, build.gradle)
- ✅ Python 3 installed (for the alignment script)
- ✅ Android build environment set up (Android SDK, Gradle)
- ✅ Java JDK installed
- ✅ Android Studio or command-line tools configured

---

## Step 1: Verify Configuration Files

### 1.1 Check AndroidManifest.xml
Verify that `android:pageSizeCompat="enabled"` is present:

```bash
grep -n "pageSizeCompat" android/app/src/main/AndroidManifest.xml
```

**Expected output:**
```
39:  <application ... android:pageSizeCompat="enabled">
```

### 1.2 Check app.json
Verify that `enable16KbPageSizeSupport` is set to `true`:

```bash
grep -A 5 "expo-build-properties" app.json | grep -A 3 "android"
```

**Expected output should include:**
```json
"enable16KbPageSizeSupport": true
```

### 1.3 Verify Script Exists
Check that the 16 KB alignment script exists:

```bash
ls -la android/scripts/ensure_16k_page.py
```

**Expected output:**
```
-rwxr-xr-x ... android/scripts/ensure_16k_page.py
```

---

## Step 2: Clean Previous Builds

Clean any previous build artifacts to ensure a fresh build:

```bash
cd android
./gradlew clean
cd ..
```

**What this does:**
- Removes all previous build artifacts
- Ensures the 16 KB alignment script runs on a fresh build

---

## Step 3: Verify Python 3 is Available

The alignment script requires Python 3:

```bash
python3 --version
```

**Expected output:**
```
Python 3.x.x
```

If Python 3 is not installed:
- **macOS:** `brew install python3`
- **Linux:** `sudo apt-get install python3`

---

## Step 4: Make Script Executable (if needed)

Ensure the script has execute permissions:

```bash
chmod +x android/scripts/ensure_16k_page.py
```

---

## Step 5: Build the App Locally

Build the release AAB (Android App Bundle) for Google Play:

```bash
cd android
./gradlew bundleRelease
cd ..
```

**What to watch for in build logs:**

1. **Script Found:**
   ```
   ✅ Found 16 KB alignment script at [path]
   ```

2. **Alignment Running:**
   ```
   🔧 Running 16 KB alignment after mergeNativeLibs for release...
   📁 Found merged native libs at: [path]
   ```

3. **Alignment Success:**
   ```
   📊 16 KB Alignment Summary for release:
      Total libraries: [N]
      Successfully aligned: [M]
   ✅ Aligned [M] native library(ies) to 16 KB page size
   ```

**⚠️ If you see errors:**
- `❌ 16 KB alignment script not found!` - Check Step 1.3
- `⚠️ No native libraries found` - This might be normal if libraries are already aligned
- Python errors - Check Step 3

---

## Step 6: Verify the Build Output

Check that the AAB file was created:

```bash
ls -lh android/app/build/outputs/bundle/release/*.aab
```

**Expected output:**
```
-rw-r--r--  1 user  staff  15M ... app-release.aab
```

The AAB file should be in `android/app/build/outputs/bundle/release/`

---

## Step 7: Test the Build (Optional but Recommended)

### 7.1 Convert AAB to APK for Testing

If you want to test the app before uploading to Google Play, convert the AAB to APK:

**Option 1: Build APK directly (faster for testing)**
```bash
cd android
./gradlew assembleRelease
cd ..
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

**Option 2: Convert AAB to APK (requires bundletool)**
```bash
# Download bundletool if you don't have it
# https://github.com/google/bundletool/releases

bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab \
  --output=app.apks \
  --mode=universal
```

### 7.2 Install on a Test Device

```bash
# Connect your Android device via USB
adb devices

# Install the APK
adb install android/app/build/outputs/apk/release/app-release.apk
# OR if using bundletool:
adb install app.apks
```

### 7.2 Verify App Runs Correctly

- Launch the app
- Test core functionality
- Check Android logs for any 16 KB warnings:

```bash
adb logcat | grep -i "16kb\|page.*size"
```

**Expected:** No warnings about page size compatibility.

---

## Step 8: Upload to Google Play Console

### 8.1 Create New Release

1. Go to Google Play Console
2. Navigate to your app → Production (or Internal Testing)
3. Click "Create new release"

### 8.2 Upload the AAB

Upload the AAB file from your local build:
- **Path:** `android/app/build/outputs/bundle/release/app-release.aab`

### 8.3 Fill Release Details

- Version name: `1.0.0` (or your version)
- Release notes: (optional)

### 8.4 Review and Rollout

1. Review the release
2. Check for any errors
3. **The 16 KB page size error should be GONE** ✅

---

## Step 9: Verify in Google Play Console

After uploading, check:

1. **Release Dashboard:**
   - No "16 KB memory page sizes" error
   - App status should be "Ready to review" or similar

2. **Pre-launch Report (if available):**
   - Should show no 16 KB compatibility issues

---

## Troubleshooting

### Issue: Script Not Found During Build

**Solution:**
```bash
# Verify script location
ls -la android/scripts/ensure_16k_page.py

# If missing, check if it's in a different location
find . -name "ensure_16k_page.py" 2>/dev/null
```

### Issue: No Libraries Aligned

**Possible causes:**
1. Libraries are already aligned (this is OK)
2. Build variant issue - check build logs for variant name
3. Script path issue - verify Step 1.3

**Solution:**
Check build logs for the actual paths being searched. The script should find libraries in:
- `build/intermediates/merged_native_libs/release/out/lib/`

### Issue: Python Errors

**Solution:**
```bash
# Test script manually
python3 android/scripts/ensure_16k_page.py --help

# Or test on a sample .so file
python3 android/scripts/ensure_16k_page.py [path-to-so-file]
```

### Issue: Still Getting 16 KB Error in Google Play

**Checklist:**
- ✅ `android:pageSizeCompat="enabled"` in AndroidManifest.xml
- ✅ `enable16KbPageSizeSupport: true` in app.json
- ✅ Script ran during build (check logs)
- ✅ Libraries were aligned (check logs)
- ✅ Using NDK 28+ (check app.json)
- ✅ Using AGP 8.5.1+ (check android/build.gradle)

**If all checked:**
1. Wait a few minutes - Google Play validation can be delayed
2. Try uploading again with a new version code
3. Check Google Play Console → Release → Issues for specific details

---

## Quick Reference Commands

```bash
# 1. Verify configuration
npm run verify:16kb
# OR manually:
grep "pageSizeCompat" android/app/src/main/AndroidManifest.xml
grep "enable16KbPageSizeSupport" app.json
ls -la android/scripts/ensure_16k_page.py

# 2. Clean previous builds
cd android && ./gradlew clean && cd ..

# 3. Build release AAB
cd android && ./gradlew bundleRelease && cd ..

# 4. Check build output
ls -lh android/app/build/outputs/bundle/release/*.aab

# 5. (Optional) Build APK for testing
cd android && ./gradlew assembleRelease && cd ..
ls -lh android/app/build/outputs/apk/release/*.apk
```

---

## Success Criteria

✅ Build completes without 16 KB script errors  
✅ Build logs show "Aligned X native library(ies) to 16 KB page size"  
✅ AAB file is created successfully  
✅ Google Play Console accepts the upload  
✅ No "16 KB memory page sizes" error in Google Play Console  

---

## Next Steps After Success

1. **Monitor:** Watch for any user reports of crashes (unlikely)
2. **Update:** When certificates rotate, update certificate hashes
3. **Maintain:** Keep NDK and AGP versions up to date

---

## Need Help?

If you encounter issues not covered here:
1. Check build logs for specific error messages
2. Verify all prerequisites are met
3. Review the troubleshooting section above
4. Check Google Play Console for specific error details

