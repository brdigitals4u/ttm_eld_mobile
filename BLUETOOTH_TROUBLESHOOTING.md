# Bluetooth ELD Device Troubleshooting Guide

## Issue: Bluetooth device connects to Android but doesn't show in select_vehicle screen

Based on the codebase analysis, here are the main troubleshooting steps:

### 1. Check Android Logs
Run the following command to see native Android logs:
```bash
npx react-native log-android
```

Look for these specific log tags:
- `TTMBLEManagerModule` - Native module logs
- `onScan - Device found` - Device discovery logs
- `BLE scan started successfully` - Scan initialization logs

### 2. Verify Permissions
The app requires different permissions based on Android version:
- **Android 12+**: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`
- **Android <12**: `ACCESS_FINE_LOCATION`

Check permissions in the Debug Info button in the app (development mode only).

### 3. Test Native Module
1. Use the "🧪 Test Devices" button to inject mock devices - if these appear, the UI is working
2. Use the "🔍 Debug Info" button to check:
   - Platform info
   - TTMBLEManager availability
   - Permission status

### 4. Common Issues & Solutions

#### Issue: Device filtering is too strict
**Solution**: The native module has `setNeedFilterDevice(false)` which should show ALL BLE devices, not just ELD devices.

#### Issue: Permissions not granted properly
**Solution**: 
1. Go to Android Settings > Apps > TruckLogELD > Permissions
2. Enable Location and "Nearby devices"/"Bluetooth" permissions
3. Or run the Debug Info button to re-request permissions

#### Issue: Bluetooth is off or not supported
**Solution**: Check logs for:
- "Device does not support BLE"
- "Bluetooth is not enabled"

#### Issue: SDK initialization failed
**Solution**: Check logs for "Failed to initialize TTM SDK" errors

### 5. Device-Specific Checks

#### Your ELD Device Should:
1. Be in discoverable/pairing mode
2. Be within range (typically 10 meters)
3. Not be connected to another phone
4. Have sufficient battery

#### Android Device Should:
1. Have Bluetooth enabled
2. Have Location services enabled (required for BLE scanning)
3. Not have other apps interfering with Bluetooth

### 6. Enhanced Logging

With the recent changes, you should see detailed logs including:
- "🔐 Requesting Bluetooth and Location permissions..."
- "Platform: android API Level: XX"
- "Permission android.permission.BLUETOOTH_SCAN: granted"
- "🔍 Device found via onDeviceScanned:"

### 7. Debug Steps

1. **Test with Mock Devices First**
   - Tap "🧪 Test Devices" button
   - If mock devices appear, the UI is working correctly

2. **Check Permissions**
   - Tap "🔍 Debug Info" button
   - Look for permission status in logs

3. **Real Device Scan**
   - Ensure your ELD device is in pairing mode
   - Tap "Scan Devices"
   - Check Android logs for "onScan - Device found" messages

4. **Cross-Reference with System Bluetooth**
   - Go to Android Settings > Bluetooth
   - See if the ELD device appears in available devices
   - If it appears there but not in the app, it's a filtering issue

### 8. Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `NO_BLE_SUPPORT` | Device doesn't support Bluetooth Low Energy | Use a different Android device |
| `BLUETOOTH_OFF` | Bluetooth is disabled | Enable Bluetooth in system settings |
| `permission_denied` | Required permissions not granted | Grant Location and Bluetooth permissions |
| `Device with address X was not found` | Device not in range or not discoverable | Check device is on and in pairing mode |

### 9. Advanced Debugging

If basic steps don't work:

1. **Check TTM SDK Integration**
   ```javascript
   console.log('TTMBLEManager available:', !!TTMBLEManager);
   ```

2. **Verify Event Listeners**
   The app should log: "Device found via onDeviceScanned" when devices are discovered

3. **Test with Generic BLE Scanner**
   Install a generic BLE scanner app (like "BLE Scanner") to verify your ELD device is actually broadcasting

### 10. Next Steps

After running through these steps:
1. Note which step fails
2. Check the specific error messages in logs
3. Compare with mock device behavior (which should always work)

The enhanced logging will help identify exactly where the process is failing.
