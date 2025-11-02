# Splash Screen Plugin Documentation

**File:** `plugins/withSplashScreen.ts`

## Overview

Expo Config Plugin that addresses the double splash screen issue on Android by modifying native Android configuration files. Ensures smooth splash screen transition without flickering or double displays.

## Purpose

Fixes the known issue where Android apps show two splash screens:
1. Native Android splash screen
2. Expo splash screen

This plugin ensures only one smooth splash screen appears.

## How It Works

### Step 1: Transparent Splash Screen

Modifies `styles.xml` to make the splash screen transparent:
```xml
<item name="android:windowIsTranslucent">true</item>
```

### Step 2: Translucent Status Bar

Modifies `strings.xml` to set status bar as translucent:
```xml
<string name="expo_splash_screen_status_bar_translucent" translatable="false">true</string>
```

## Implementation

### Main Plugin Function

```typescript
export const withSplashScreen: ConfigPlugin = (config) => {
  config = withAndroidSplashScreen(config)
  return config
}
```

### Android Implementation

```typescript
const withAndroidSplashScreen: ConfigPlugin = (config) => {
  config = withCustomStylesXml(config)
  config = withCustomStringsXml(config)
  return config
}
```

## File Modifications

### strings.xml

**Location**: `android/app/src/main/res/values/strings.xml`

**Adds**:
```xml
<string name="expo_splash_screen_status_bar_translucent" translatable="false">true</string>
```

**Purpose**: Makes status bar translucent during splash

### styles.xml

**Location**: `android/app/src/main/res/values/styles.xml`

**Modifies**: `Theme.App.SplashScreen`

**Adds**:
```xml
<item name="android:windowIsTranslucent">true</item>
```

**Purpose**: Makes splash screen window translucent

## Plugin Registration

### In app.json / app.config.ts

```json
{
  "plugins": [
    "./plugins/withSplashScreen"
  ]
}
```

Or in TypeScript config:
```typescript
{
  plugins: [
    require('./plugins/withSplashScreen')
  ]
}
```

## Benefits

1. **Single Splash Screen**: No double display
2. **Smooth Transition**: Seamless app launch
3. **Better UX**: Professional appearance
4. **Native Integration**: Works with Expo splash

## Technical Details

### Config Plugin API

Uses Expo Config Plugins:
- `withStringsXml` - Modify strings.xml
- `withAndroidStyles` - Modify styles.xml
- `AndroidConfig.Strings` - String manipulation
- `AndroidConfig.Styles` - Style manipulation

### Modification Process

1. Reads existing XML files
2. Adds/updates required entries
3. Preserves existing content
4. Writes back modified files

## Platform Support

### Android

- Fully supported
- Only platform needed for this fix

### iOS

- Not needed (iOS handles splash differently)
- Can be added if required

## Usage

### Automatic

Plugin runs automatically during:
- `expo prebuild`
- `npx expo run:android`
- EAS builds

### Manual

```bash
npx expo prebuild --clean
```

## Related Issues

### GitHub Issue

Referenced in code comments:
- https://github.com/expo/expo/issues/16084

### Solution Source

Based on community solutions for double splash screen issue.

## Configuration

No additional configuration needed beyond plugin registration.

## Testing

### Verify Fix

1. Build Android app
2. Launch app
3. Observe splash screen
4. Should see single smooth transition

### Check Files

Verify modifications in:
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values/styles.xml`

## Dependencies

- `expo/config-plugins` - Config plugin utilities
- Expo Config Plugin API

## Notes

1. **Android Only**: iOS doesn't need this fix
2. **Prebuild Required**: Runs during prebuild
3. **Native Files**: Modifies native Android files
4. **One-Time Setup**: Once configured, persists

## Future Enhancements

- iOS implementation (if needed)
- Custom splash screen options
- Animation configuration
- Theme-based splash screens

