# KD032 ELD Device Simulator

A comprehensive simulator for testing your Android app with a virtual KD032 ELD device. This simulator creates a real BLE device that appears in your app's scan results, allowing you to test the smart passcode system and ELD data collection without needing a physical device.

## 🎯 Features

- **Real BLE Device**: Creates an actual BLE peripheral that appears in Android scan results
- **Exact KD032 Behavior**: Mimics the real `C4:A8:28:43:14:9A` device
- **No Passcode Required**: Like the real KD032, connects without passcode
- **Realistic ELD Data**: Transmits realistic ELD data packets
- **Easy Testing**: Simple setup and usage

## 📱 Device Details

- **Device Name**: `KD032-43149A`
- **Device Address**: `C4:A8:28:43:14:9A`
- **Service UUID**: `0000ffe0-0000-1000-8000-00805f9b34fb`
- **Characteristic UUID**: `0000ffe1-0000-1000-8000-00805f9b34fb`

## 🚀 Quick Start

### 1. Setup Dependencies

```bash
# Run the setup script
./setup_simulator.sh
```

Or manually install:
```bash
pip3 install bleak asyncio
```

### 2. Start the Simulator

```bash
python3 ble_eld_simulator.py
```

### 3. Test in Your App

1. Open your Android app
2. Go to the device scan screen
3. Start scanning for devices
4. Look for `KD032-43149A` in the results
5. Try connecting to the simulated device
6. The device should connect without passcode
7. ELD data will start transmitting automatically

## 🔧 Alternative: React Native Simulator

If the Python BLE simulator doesn't work on your system, you can use the React Native simulator:

### 1. Add to Your App

Import the simulator in your app:

```typescript
import { startKD032Simulator, stopKD032Simulator } from '../services/EldSimulator';

// Start simulator
startKD032Simulator();

// Stop simulator
stopKD032Simulator();
```

### 2. Use the Demo Component

Add the demo component to your app for easy testing:

```typescript
import EldSimulatorDemo from '../components/EldSimulatorDemo';

// In your navigation or screen
<EldSimulatorDemo />
```

## 📊 Testing Scenarios

### Scenario 1: Smart Passcode System
- **Expected**: KD032 device connects without passcode
- **Test**: Verify the app detects KD032 and skips passcode modal
- **Result**: Should show "Connect" button instead of "Connect with Passcode"

### Scenario 2: ELD Data Collection
- **Expected**: Device transmits ELD data after connection
- **Test**: Monitor Supabase logs for ELD data
- **Result**: Should see realistic ELD data in logs

### Scenario 3: Error Handling
- **Expected**: SDK errors are logged to Supabase
- **Test**: Try connecting with invalid parameters
- **Result**: Should see specific SDK error messages in logs

## 🔍 Monitoring and Debugging

### Android Logs
```bash
adb logcat | grep TTMBLEManagerModule
```

### Supabase Logs
Check your Supabase dashboard for:
- Connection attempts
- ELD data transmission
- Error messages

### Simulator Logs
The Python simulator shows real-time logs:
```
✅ KD032 ELD device now advertising!
📊 Transmitting ELD data: {...}
🔗 Connection attempt from AA:BB:CC:DD:EE:FF
✅ Connected to AA:BB:CC:DD:EE:FF
```

## 🛠️ Troubleshooting

### Python Simulator Issues

**Problem**: `ModuleNotFoundError: No module named 'bleak'`
**Solution**: Run `pip3 install bleak`

**Problem**: Permission denied for Bluetooth
**Solution**: 
```bash
# On macOS
sudo blueutil --power 1
sudo blueutil --discoverable 1
```

**Problem**: Device not appearing in scan
**Solution**: 
1. Ensure Bluetooth is enabled
2. Check if another BLE device is advertising
3. Try restarting the simulator

### React Native Simulator Issues

**Problem**: Simulator not working in app
**Solution**: 
1. Check console logs for errors
2. Ensure NativeEventEmitter is properly configured
3. Verify the simulator is imported correctly

## 📋 ELD Data Format

The simulator generates realistic ELD data:

```json
{
  "deviceId": "C4:A8:28:43:14:9A",
  "deviceName": "KD032-43149A",
  "driverId": "123456",
  "vehicleId": "78901",
  "timestamp": "2025-08-02T18:30:00.000Z",
  "odometer": 125000,
  "engineHours": 2345.5,
  "speed": 45,
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 8.5
  },
  "status": {
    "engineOn": true,
    "moving": true,
    "dutyStatus": "DRIVING"
  },
  "events": [
    {
      "type": "LOGIN",
      "timestamp": "2025-08-02T18:00:00.000Z",
      "location": {...}
    }
  ],
  "dataType": "ELD_DATA"
}
```

## 🎯 Integration with Your App

### 1. Smart Device Detection

Your app should detect KD032 devices and handle them differently:

```typescript
const isKD032Device = device.name?.toLowerCase().includes('kd032') || 
                      device.id?.toLowerCase().includes('c4:a8:28:43:14:9a');

if (isKD032Device) {
  // Connect directly without passcode
  handleDeviceConnect(device);
} else {
  // Show passcode modal for other devices
  setShowPasscodeModal(true);
}
```

### 2. ELD Data Handling

Monitor for ELD data transmission:

```typescript
eldDataListener = TTMBLEManager.onNotifyReceived((data: NotifyData) => {
  if (data.dataType === 'ELD_DATA') {
    console.log('ELD data received:', data);
    // Handle ELD data
  }
});
```

### 3. Error Logging

Ensure SDK errors are logged to Supabase:

```typescript
try {
  await TTMBLEManager.connect(deviceId, passcode, false);
} catch (error) {
  // Log specific SDK error
  ELDDeviceService.logConnectionError(deviceId, error.message);
}
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Android logs with `adb logcat`
3. Check Supabase logs for error details
4. Verify Bluetooth permissions in your app

## 🔄 Updates

The simulator is designed to be easily updated to match new device behaviors. Key files to modify:

- `ble_eld_simulator.py` - Python BLE simulator
- `services/EldSimulator.ts` - React Native simulator
- `components/EldSimulatorDemo.tsx` - Demo interface

---

**Happy Testing! 🚛📱** 