# ELD Simulator Demo - Android Usage Guide

## 🚀 **Quick Start**

### **Option 1: From Dashboard (Recommended)**
1. Open your TTMKonnect app on Android
2. In development mode (`__DEV__ = true`), you'll see a **"🧪 Developer Tools"** card on the dashboard
3. Tap **"🔧 ELD Simulator Demo"** to launch the simulator

### **Option 2: Direct Navigation**
You can also navigate directly to the demo pages:
- `/select-demo-vehicle` - Vehicle-like selection interface
- `/eld-demo` - Full interactive demo

## 📱 **Pages Created**

### 1. **Select Demo Vehicle** (`select-demo-vehicle.tsx`)
A beautiful interface that mimics your existing `select-vehicle` page:
- **🔄 Interactive scanning** with radar animations
- **🎛️ Test scenario selector** (Normal, Connection Issues, Auth Failure, etc.)
- **📊 Device type indicators** with color coding:
  - 🟢 TTM Premium (fast, reliable)
  - 🔵 TTM Standard (basic functionality)
  - ⚪ Generic ELD (third-party devices)
  - 🔴 Faulty Device (connection problems)
  - 🟠 Slow Device (delayed responses)
- **🐛 Debug panel** with real-time simulator status
- **➡️ Full Demo button** to access comprehensive testing

### 2. **ELD Demo** (`eld-demo.tsx`)
Complete simulator interface with all controls:
- **📱 Full device simulation** controls
- **📊 Real-time data streaming** 
- **🧪 Test scenario management**
- **📈 Data visualization**
- **🔧 Developer debugging tools**

## 🎮 **Features**

### **Realistic Device Simulation**
- **5 device types** with unique behaviors
- **Signal strength variation** (-40dBm to -90dBm)
- **Connection delays** based on device type
- **Battery level simulation**
- **Authentication flows**

### **Test Scenarios**
Switch between different scenarios to test edge cases:
- ✅ **Normal Operation** - Standard device behavior
- 🔄 **Connection Issues** - Intermittent connectivity
- 🔐 **Authentication Failure** - Invalid credentials
- 📊 **Data Corruption** - Invalid data packets
- ⚠️ **Device Malfunction** - Hardware failure simulation
- 🔋 **Low Battery** - Battery affecting connectivity
- 🚨 **Driver Violations** - HOS violations

### **Real ELD Data**
The simulator generates realistic:
- **Vehicle data** (speed, RPM, odometer, fuel)
- **Driver status** (driving, on-duty, off-duty, sleeping)
- **Hours of Service** calculations
- **GPS location** data
- **Diagnostic codes**
- **Device information**

## 🛠️ **How It Works**

The simulator **seamlessly replaces** your real TTM BLE Manager during testing:

```typescript
// Automatically detects environment and switches
import { eldTestConfig } from '@/services/EldTestConfig';

// In development - uses simulator
// In production - uses real BLE manager
const bleManager = eldTestConfig.getBLEManager();
```

## 📋 **Testing Workflow**

1. **Launch Demo** from dashboard or navigate to `/select-demo-vehicle`
2. **Select Scenario** using the horizontal scroll selector
3. **Scan for Devices** using the central scan button
4. **Connect to Device** by tapping any discovered device circle
5. **View Real-time Data** in the debug panel
6. **Test Different Scenarios** by switching scenarios
7. **Access Full Demo** for comprehensive testing

## 🎯 **Use Cases**

### **Development**
- Test ELD functionality without physical hardware
- Simulate different device types and manufacturers
- Test error scenarios and edge cases
- Develop offline without real devices

### **QA Testing**
- Automated test scenarios
- Reproducible test conditions  
- Performance testing with different device types
- Integration testing

### **Demo & Training**
- Show ELD functionality to stakeholders
- Train new developers on ELD concepts
- Demonstrate app capabilities
- Sales presentations

## 🔧 **Configuration**

The simulator automatically detects your environment:
- **Web**: Always uses simulator (BLE not available)
- **Android/iOS Dev**: Hybrid mode (simulator available, real BLE optional)
- **Production**: Real BLE manager only

## 🎨 **UI Features**

### **Visual Indicators**
- **Device border colors** indicate device types
- **Signal strength icons** show connection quality
- **Connection status** with real-time updates
- **Data packet counters** show activity

### **Animations**
- **Radar scanning** animation during device discovery
- **Device appearance** with spring animations
- **Connection state** transitions
- **Progress indicators** for operations

### **Debug Tools**
- **Real-time status** display
- **Device information** tooltips
- **Data stream monitoring**
- **Scenario switching**
- **Performance metrics**

## 🚀 **Next Steps**

1. **Test the demo** on your Android device
2. **Explore different scenarios** to understand capabilities
3. **Integrate with your existing tests** using the simulator API
4. **Customize device types** if needed for specific testing
5. **Use in development** to speed up ELD feature development

The ELD simulator provides a complete testing environment that lets you develop and test ELD functionality without requiring physical hardware! 🎉
