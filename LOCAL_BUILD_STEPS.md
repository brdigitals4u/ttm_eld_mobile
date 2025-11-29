# Local Build Steps - Fix 16 KB Page Size Issue

## Complete Step-by-Step Instructions

### Step 0: Auto-Fix Build Issues (NEW!) 🔧
```bash
npm run prebuild
```
**What this does:** Automatically fixes common build issues before building
- Removes problematic packages
- Fixes script permissions
- Validates configuration
- Cleans build artifacts

### Step 1: Verify Configuration ✅
```bash
npm run verify:16kb
```
**Expected:** All checks should pass with ✅

---

### Step 2: Clean Previous Builds 🧹
```bash
cd android
./gradlew clean
cd ..
```
**What this does:** Removes old build files to ensure fresh build

---

### Step 3: Build Release AAB 📦
```bash
cd android
./gradlew bundleRelease
cd ..
```
**What to watch for:**
- Look for: `✅ Found 16 KB alignment script at...`
- Look for: `✅ Aligned X native library(ies) to 16 KB page size`
- Build should complete successfully

**Time:** Usually 5-15 minutes (first build takes longer)

---

### Step 4: Verify Build Output 📁
```bash
ls -lh android/app/build/outputs/bundle/release/*.aab
```
**Expected:** You should see `app-release.aab` file (usually 10-30 MB)

---

### Step 5: Upload to Google Play Console 🚀

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Production** (or **Internal Testing**)
4. Click **"Create new release"**
5. Upload the file: `android/app/build/outputs/bundle/release/app-release.aab`
6. Fill in version name and release notes
7. Click **"Save"** then **"Review release"**
8. The 16 KB error should be **GONE** ✅

---

## That's It! 🎉

Your app should now pass Google Play's 16 KB page size requirement.

---

## Optional: Test Before Uploading

If you want to test the app first:

### Build APK for Testing
```bash
cd android
./gradlew assembleRelease
cd ..
```

### Install on Device
```bash
# Connect device via USB
adb devices

# Install APK
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## Troubleshooting

### Build Fails?
- Check that you have Android SDK installed
- Check Java version: `java -version` (need JDK 17+)
- Make gradlew executable: `chmod +x android/gradlew`

### Still Getting 16 KB Error?
- Wait a few minutes after upload (Google validation can be delayed)
- Check build logs to ensure alignment script ran
- Verify Step 1 passed all checks

---

## Quick Reference

```bash
# All steps in sequence:
npm run verify:16kb                    # Step 1
cd android && ./gradlew clean && cd .. # Step 2
cd android && ./gradlew bundleRelease && cd .. # Step 3
ls -lh android/app/build/outputs/bundle/release/*.aab # Step 4
# Step 5: Upload to Google Play Console
```

---

## Need More Details?

- Full guide: `docs/16KB_FIX_STEPS.md`
- Local build guide: `docs/LOCAL_BUILD_GUIDE.md`

