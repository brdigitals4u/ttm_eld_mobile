# Android Logcat Guide

## How to Open Android Logcat

### Method 1: Android Studio (Recommended)

1. **Open Android Studio**
2. **Connect Device**: Connect your Android device via USB (enable USB debugging)
3. **Open Logcat**:
   - Menu: `View` → `Tool Windows` → `Logcat`
   - Or click the "Logcat" tab at the bottom of Android Studio
4. **Select Device**: Choose your connected device from the device dropdown
5. **Filter Logs**: Use the search box to filter by:
   - Tag: `JMBluetoothModule`
   - Text: `P0195`, `OBD`, `ErrorBean`
   - Regex: `JMBluetooth|P0195|OBD`

### Method 2: Command Line (ADB)

#### Prerequisites
- Install Android SDK Platform Tools
- Enable USB Debugging on your device
- Connect device via USB

#### Basic Commands

```bash
# View all logs
adb logcat

# Filter by tag (JMBluetoothModule)
adb logcat -s JMBluetoothModule:D *:S

# Filter for P0195 and related logs
adb logcat | grep -E "JMBluetooth|P0195|OBD|ErrorBean"

# Filter with case-insensitive search
adb logcat | grep -iE "p0195|eld|obd"

# Save logs to file
adb logcat > logcat.txt

# Clear logs and start fresh
adb logcat -c && adb logcat

# View logs with timestamps
adb logcat -v time

# View logs with process IDs
adb logcat -v process
```

#### Useful Filter Combinations

```bash
# P0195 detection only
adb logcat | grep -i "P0195"

# All ELD/OBD error codes
adb logcat | grep -E "DTC|ErrorBean|P0[0-9]{4}"

# JMBluetooth module logs only
adb logcat -s JMBluetoothModule:D

# All error-level logs
adb logcat *:E

# Warning and error logs
adb logcat *:W *:E
```

### Method 3: React Native Metro Console

**Note**: React Native console logs (from `console.log`) appear in Metro bundler console, but native Android logs (from `Log.i`, `Log.d`, etc.) do NOT appear there. You need Android Studio or ADB to see native logs.

### Method 4: Wireless ADB (Android 11+)

If you can't use USB:

```bash
# Connect wirelessly (device and computer on same network)
adb connect <device-ip>:5555

# Then use logcat normally
adb logcat | grep -E "JMBluetooth|P0195"
```

## Log Levels

Android Logcat uses these log levels (from most to least verbose):

- **V** - Verbose (most detailed)
- **D** - Debug
- **I** - Info
- **W** - Warning
- **E** - Error
- **F** - Fatal

## Filtering in Android Studio

1. **By Log Level**: Use dropdown to select level (Verbose, Debug, Info, Warning, Error)
2. **By Tag**: Enter tag name (e.g., `JMBluetoothModule`)
3. **By Text**: Enter search term (e.g., `P0195`)
4. **By Package**: Filter by app package name
5. **Regex**: Enable regex mode for complex patterns

## Finding P0195 Logs

When P0195 is detected, look for these log entries:

### Native Android Logs (Logcat)
```
⚠️ Processing ErrorBean - ECU count: 1
📋 ECU 0 - ID: 0x7E0, Codes: [P0195]
🔍 P0195 DETECTED in ECU 0 (0x7E0) - Engine Oil Temperature Sensor "A" Circuit Malfunction
⚠️ DTC Codes Found: [P0195]
✅ ErrorBean processed: 1 ECU items, 0 ELD malfunctions, 1 total DTC codes (P0195 present)
```

### React Native Console (Metro)
```
🚨 OBD Data Context: onObdErrorDataReceived event received
📋 OBD Data Context: ECU 0 - ID: 7E0, Codes: ["P0195"]
⚠️ OBD Data Context: DTC Codes Found: ["P0195"]
🔍 OBD Data Context: P0195 DETECTED - Engine Oil Temperature Sensor "A" Circuit Malfunction
```

## Quick Reference

| Task | Command |
|------|---------|
| View all logs | `adb logcat` |
| Filter by tag | `adb logcat -s TAG:D *:S` |
| Search for P0195 | `adb logcat \| grep -i "P0195"` |
| Save to file | `adb logcat > logcat.txt` |
| Clear logs | `adb logcat -c` |
| View with timestamps | `adb logcat -v time` |

## Troubleshooting

### Device Not Showing in ADB
```bash
# Check if device is connected
adb devices

# Restart ADB server
adb kill-server
adb start-server
```

### No Logs Appearing
1. Ensure USB debugging is enabled on device
2. Check device is authorized (accept USB debugging prompt)
3. Verify app is running and connected to ELD
4. Try clearing logs: `adb logcat -c`

### Logs Too Verbose
```bash
# Show only warnings and errors
adb logcat *:W *:E

# Show only specific tag at debug level
adb logcat -s JMBluetoothModule:D
```

