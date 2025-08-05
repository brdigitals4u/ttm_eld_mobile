# 🔍 Data Parsing Debug Guide

## 🚨 **Problem**: Unable to Parse ELD Data

Your ELD hardware is sending data, but the app can't parse it correctly. This guide will help you debug and fix the parsing issues.

## 🔧 **Enhanced Debugging Features Added**

### 1. **Comprehensive Data Logging**
The native module now logs:
- 📊 **Data size** in bytes
- 🔢 **Hex dump** of raw data
- 📋 **Decimal dump** of raw data  
- 🔤 **ASCII representation**
- 📄 **JSON parsing attempts**
- 🚗 **OBD-II PID detection**
- 🚛 **J1939 message detection**

### 2. **Multi-Format Data Detection**
The app now automatically detects:
- **JSON** - Structured ELD data
- **OBD_PID** - OBD-II protocol data
- **J1939** - Heavy truck protocol data
- **BINARY** - Raw sensor data

### 3. **Enhanced Parsing Support**
- ✅ **OBD-II PIDs**: 0x0C (RPM), 0x0D (Speed), 0x05 (Temp), etc.
- ✅ **J1939 PGNs**: Engine Speed, Vehicle Speed, Engine Hours, Fuel Consumption
- ✅ **Binary Sensors**: Temperature, humidity, pressure, etc.
- ✅ **JSON ELD Data**: VIN, CAN data, GPS, events

## 🚀 **How to Debug Your Data**

### **Step 1: Check Android Logs**
```bash
# Connect your device and run:
adb logcat | grep "JimiBridgeModule"
```

Look for these debug messages:
```
🔍 === INCOMING DATA DEBUG ===
📱 Device ID: C4:A8:28:43:15:81
🔧 Characteristic UUID: 0000FFE1-0000-1000-8000-00805F9B34FB
📊 Data size: 64 bytes
🔢 Hex dump: 7B 22 76 69 6E 22 3A 22 53 41 4C 59 4B 32 45 58
🔤 ASCII dump: {"vin":"SALYK2EX2LA257358"
🎯 Detected data format: JSON
```

### **Step 2: Test Data Format Detection**
Run the debug script:
```bash
node debug_data_parsing.js
```

This will test all data formats and show you what your hardware should send.

### **Step 3: Check React Native Console**
In your app, look for:
```javascript
📊 ELD JSON Parsed: { vin: "SALYK2EX2LA257358", can_data: {...} }
🚗 OBD Protocol Data Received: { rpm: 2200, speed: 65 }
🚛 J1939 Data Received: { engineRPM: 2200, vehicleSpeed: 65 }
🔢 Binary Sensor Data: { value: 85, type: "single_byte" }
```

## 🔍 **Common Data Format Issues**

### **Issue 1: Data is JSON but not being parsed**
**Symptoms**: 
- Logs show `🔤 ASCII dump: {"vin":"SALYK2EX2LA257358"`
- But no `📄 Processing as JSON data` message

**Solution**: Check if JSON is valid:
```kotlin
// In JimiBridgeModule.kt, the JSON parsing should work
val jsonString = String(data, Charsets.UTF_8)
val jsonObject = JSONObject(jsonString)
```

### **Issue 2: Data is OBD-II but not being parsed**
**Symptoms**:
- Logs show `🔢 Hex dump: 41 0C 08 98`
- But no `🚗 Processing as OBD-II PID data` message

**Solution**: Check OBD-II format:
```kotlin
// Should detect: data[0] == 0x41 (response)
// Should parse: data[1] == 0x0C (RPM PID)
```

### **Issue 3: Data is J1939 but not being parsed**
**Symptoms**:
- Logs show `🔢 Hex dump: 0C F0 04 00 08 98 00 00`
- But no `🚛 Processing as J1939 data` message

**Solution**: Check J1939 format:
```kotlin
// Should detect: data[0] == 0x0C (PGN format)
// Should parse: PGN 0x0CF00400 (Engine Speed)
```

### **Issue 4: Data is binary but not being parsed**
**Symptoms**:
- Logs show `🔢 Hex dump: 55` (single byte)
- But no `🔢 Processing as binary sensor data` message

**Solution**: Check binary format:
```kotlin
// Should detect: data.size <= 8
// Should parse: single byte, two byte, or four byte float
```

## 🧪 **Test Your Hardware Data**

### **Test 1: JSON ELD Data**
Your hardware should send:
```json
{
  "vin": "SALYK2EX2LA257358",
  "can_data": {
    "engine_rpm": 2200,
    "speed": 65.0,
    "engine_temp": 85.0,
    "fuel_level": 75.0
  },
  "gps_data": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

### **Test 2: OBD-II Data**
Your hardware should send:
```
41 0C 08 98  // RPM = 2200
41 0D 41     // Speed = 65 km/h
41 05 7D     // Temp = 85°C
```

### **Test 3: J1939 Data**
Your hardware should send:
```
0C F0 04 00 08 98 00 00  // Engine RPM = 2200
0C F0 04 01 19 04 00 00  // Vehicle Speed = 65 km/h
```

### **Test 4: Binary Sensor Data**
Your hardware should send:
```
55        // Single byte temperature = 85°C
08 98     // Two byte RPM = 2200
42 28 00 00 // Four byte float = 42.5
```

## 🔧 **Quick Fixes**

### **If JSON parsing fails**:
1. Check if data is UTF-8 encoded
2. Verify JSON syntax is valid
3. Add null checks in parsing

### **If OBD-II parsing fails**:
1. Verify data starts with `0x41` (response)
2. Check PID values are correct
3. Ensure data length matches PID requirements

### **If J1939 parsing fails**:
1. Verify PGN format (0x0C, 0x0D)
2. Check data length is 8 bytes
3. Validate PGN values

### **If binary parsing fails**:
1. Check data size (1, 2, or 4 bytes)
2. Verify byte order (big-endian)
3. Validate data ranges

## 📊 **Expected Log Output**

When data parsing works correctly, you should see:

```
🔍 === INCOMING DATA DEBUG ===
📱 Device ID: C4:A8:28:43:15:81
📊 Data size: 64 bytes
🔢 Hex dump: 7B 22 76 69 6E 22 3A 22 53 41 4C 59 4B 32 45 58
📄 JSON attempt: {"vin":"SALYK2EX2LA257358","can_data":{"engine_rpm":2200}}
✅ Valid JSON detected!
📋 JSON keys: vin, can_data, gps_data
🎯 Detected data format: JSON
📄 Processing as JSON data
📊 ELD JSON Parsed: { vin: "SALYK2EX2LA257358", can_data: {...} }
```

## 🚀 **Next Steps**

1. **Run the app** and connect your ELD device
2. **Check Android logs** for debug output
3. **Identify the data format** your hardware is sending
4. **Verify parsing** is working correctly
5. **Test the UI** shows the parsed data

## 📞 **Need Help?**

If you're still having issues:
1. Share the **Android logcat output** showing the debug messages
2. Share the **raw data hex dump** from your hardware
3. Share the **React Native console output**

The enhanced debugging will show exactly what data format your hardware is sending and help identify the parsing issue! 🚛 