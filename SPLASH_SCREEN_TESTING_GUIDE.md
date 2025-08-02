# Splash Screen and App Icon Testing Guide

## Current Issue
Your splash screen and app icon are showing as white because **development builds and Expo Go don't properly display custom splash screens**. This is a known limitation.

## Solution: Test with Preview/Production Build

According to the [Expo documentation](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/), you need to use a **preview build or production build** to properly test splash screens.

### Option 1: Create a Preview Build (Recommended)

```bash
# Create a preview build for Android
npx eas build --profile preview --platform android

# Create a preview build for iOS  
npx eas build --profile preview --platform ios
```

### Option 2: Create a Production Build

```bash
# Create a production build for Android
npx eas build --profile production --platform android

# Create a production build for iOS
npx eas build --profile production --platform ios
```

## Your Current Configuration

Your `app.json` is correctly configured:

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1E293B"
    },
    "android": {
      "icon": "./assets/images/icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#1E293B"
      }
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "ios": {
            "backgroundColor": "#1E293B",
            "image": "./assets/images/splash-icon.png",
            "resizeMode": "contain"
          },
          "android": {
            "backgroundColor": "#1E293B",
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 200
          }
        }
      ]
    ]
  }
}
```

## Your Assets Are Ready

✅ You have all the required assets:
- `icon.png` - App icon
- `adaptive-icon.png` - Android adaptive icon
- `splash.png` - Splash screen image
- `splash-icon.png` - Splash screen icon
- `favicon.png` - Web favicon

## Why Development Builds Show White

1. **Development builds** use a different splash screen mechanism
2. **Expo Go** has its own splash screen that overrides yours
3. **Custom splash screens** only work in preview/production builds

## Testing Steps

1. **Create a preview build:**
   ```bash
   npx eas build --profile preview --platform android
   ```

2. **Download and install the APK/IPA**

3. **Test the splash screen** - You should see your custom splash screen with the dark background (#1E293B) and your logo

## Troubleshooting

If the splash screen is still white after creating a preview build:

1. **Check asset dimensions:**
   - Icon: 1024x1024px
   - Splash icon: 1024x1024px
   - All images should be PNG format

2. **Verify asset paths** in `app.json`

3. **Clear build cache:**
   ```bash
   npx expo prebuild --clean
   ```

4. **Rebuild the app:**
   ```bash
   npx eas build --profile preview --platform android --clear-cache
   ```

## Expected Result

After creating a preview build, you should see:
- ✅ Dark background (#1E293B)
- ✅ Your custom logo/icon
- ✅ Professional splash screen like Samsara

## Note

The white splash screen you're seeing in development is **normal and expected**. Only preview/production builds will show your custom splash screen properly. 