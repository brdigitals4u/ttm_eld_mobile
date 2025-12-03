# Version Code Management

## Current Status

- **Last Google Play version code**: 2
- **Current build.gradle version code**: 11
- **Auto-increment**: Enabled for production builds

## How It Works

### Auto-Increment Script

The `build:android:prod` command automatically increments the version code before building:

```bash
pnpm run build:android:prod
```

This runs:
1. `node scripts/increment-version-code.js` - Increments version code in build.gradle
2. `eas build --profile production --platform android --local` - Builds the AAB

### Version Code Flow

- **Initial**: versionCode 11 (set in build.gradle)
- **First build**: Increments to 12 → Upload to Google Play ✅
- **Second build**: Increments to 13 → Upload to Google Play ✅
- **Third build**: Increments to 14 → Upload to Google Play ✅
- And so on...

## Why This Setup?

Google Play requires that each new upload has a **higher version code** than all previous uploads. Since your last upload was version code 2, starting at 11 ensures:

1. ✅ First build (12) is higher than 2
2. ✅ Each subsequent build is automatically higher
3. ✅ No manual version code management needed

## Manual Version Code Management

If you need to set a specific version code (e.g., to match a release version):

1. **Edit `android/app/build.gradle`**:
   ```gradle
   versionCode 11  // Set to desired number
   ```

2. **Build without increment**:
   ```bash
   pnpm run build:android:prod:no-increment
   ```

3. **Or increment manually**:
   ```bash
   pnpm run increment:version
   ```

## Troubleshooting

### Issue: "Version code conflict" in Google Play

**Cause**: Uploading an AAB with a version code that's already in Google Play.

**Solution**:
1. Check Google Play Console for the highest version code
2. Set `versionCode` in build.gradle to be **higher** than that number
3. Build and upload

### Issue: Version code increments too much

**Cause**: Running `build:android:prod` multiple times without uploading.

**Solution**:
- Only run `build:android:prod` when you're ready to upload
- Or use `build:android:prod:no-increment` for testing builds

### Issue: Need to reset version code

**Solution**:
1. Edit `android/app/build.gradle` and set `versionCode` to desired number
2. The next build will increment from that number

## Best Practices

1. **Always check Google Play Console** before setting a new base version code
2. **Use auto-increment for production builds** to avoid conflicts
3. **Don't manually edit version code** unless you know what you're doing
4. **Keep version code higher** than any existing uploads in Google Play

## Commands Reference

- `pnpm run build:android:prod` - Build with auto-increment (recommended)
- `pnpm run build:android:prod:no-increment` - Build without increment (for testing)
- `pnpm run increment:version` - Manually increment version code only












