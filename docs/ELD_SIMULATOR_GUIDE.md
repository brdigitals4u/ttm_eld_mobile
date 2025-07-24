# ELD Simulator Guide

This comprehensive ELD (Electronic Logging Device) simulator allows you to test your TruckLogELD app without physical ELD hardware. It simulates different device types, connection scenarios, and realistic data streams.

## Features

### 🔧 Multiple Device Types
- **TTM Premium**: Fast, reliable devices with premium features
- **TTM Standard**: Standard TTM devices with basic functionality  
- **Generic ELD**: Third-party ELD devices (Geotab, Omnitracs, etc.)
- **Faulty Device**: Simulates problematic hardware with connection issues
- **Slow Device**: Simulates devices with slow response times

### 📡 Realistic Connection Simulation
- Bluetooth scanning with realistic discovery delays
- Signal strength variation (-40dBm to -90dBm)
- Authentication flows (password-protected devices)
- Connection timeouts and retry logic
- IMEI validation

### 📊 Comprehensive Data Streams
- Real-time vehicle data (speed, RPM, odometer, fuel level)
- Driver status updates (driving, on-duty, off-duty, sleeping)
- Hours of Service calculations
- GPS location data
- Diagnostic trouble codes
- Device battery levels

### 🧪 Test Scenarios
- **Normal Operation**: Standard device behavior
- **Connection Issues**: Intermittent connectivity problems
- **Authentication Failure**: Invalid credentials or passwords
- **Data Corruption**: Corrupted or invalid data packets
- **Device Malfunction**: Hardware failure simulation
- **Low Battery**: Battery level affecting connectivity
- **Driver Violations**: HOS violations and alerts

## Quick Start

### 1. Basic Usage

```typescript
import { eldTestConfig, TestMode } from '../services/EldTestConfig';
import { eldSimulator, SimulationScenario } from '../services/EldSimulator';

// Initialize simulator
await eldTestConfig.initialize();
eldTestConfig.setTestMode(TestMode.SIMULATOR);

// Start scanning for devices
await eldSimulator.startScan(10000); // 10 second scan

// Connect to a device
const devices = eldSimulator.getAvailableDevices();
const device = devices[0];
await eldSimulator.connect(device.address, device.imei);

// Start receiving ELD data
await eldSimulator.startReportEldData();
```

### 2. Using the Demo Component

Add the demo component to test the simulator interactively:

```typescript
import EldSimulatorDemo from '../components/EldSimulatorDemo';

// In your app or screen component
<EldSimulatorDemo />
```

### 3. Writing Tests

```typescript
import { eldSimulator, SimulationScenario } from '../services/EldSimulator';
import { eldTestConfig } from '../services/EldTestConfig';

describe('ELD Device Tests', () => {
  beforeEach(() => {
    eldTestConfig.setTestMode(TestMode.SIMULATOR);
    eldSimulator.reset();
  });

  test('should connect to TTM device', async () => {
    const devices = eldSimulator.getAvailableDevices();
    const ttmDevice = devices.find(d => d.manufacturer === 'TTM Technologies');
    
    await eldSimulator.connect(ttmDevice.address, ttmDevice.imei);
    
    expect(eldSimulator.getConnectedDevice()).toBeTruthy();
  });
});
```

## Configuration

### Test Modes

```typescript
export enum TestMode {
  PRODUCTION = 'PRODUCTION',   // Use real TTM BLE Manager
  SIMULATOR = 'SIMULATOR',     // Use ELD Simulator only
  HYBRID = 'HYBRID'            // Simulator on web, real on native
}
```

### Test Configuration

```typescript
const config = {
  mode: TestMode.SIMULATOR,
  scenario: SimulationScenario.NORMAL_OPERATION,
  enableDebugLogs: true,
  simulatedDeviceTypes: [
    EldDeviceType.TTM_PREMIUM,
    EldDeviceType.TTM_STANDARD,
    EldDeviceType.GENERIC_ELD
  ],
  connectionTimeout: 30000,
  dataStreamInterval: 5000
};

eldTestConfig.updateConfiguration(config);
```

## API Reference

### EldSimulator Class

#### Connection Methods
```typescript
// Initialize the simulator
await eldSimulator.initSDK(): Promise<void>

// Start scanning for devices
await eldSimulator.startScan(duration?: number): Promise<void>

// Stop device scanning
await eldSimulator.stopScan(): Promise<void>

// Connect to a device
await eldSimulator.connect(macAddress: string, imei: string): Promise<void>

// Disconnect from current device
await eldSimulator.disconnect(): Promise<void>
```

#### Data Methods
```typescript
// Start ELD data streaming
await eldSimulator.startReportEldData(): Promise<void>

// Acknowledge received data
await eldSimulator.replyReceivedEldData(): Promise<void>

// Send UTC time to device
await eldSimulator.sendUTCTime(): Promise<void>
```

#### Event Listeners
```typescript
// Device discovery
eldSimulator.onDeviceScanned((device: BLEDevice) => {
  console.log('Found device:', device.name);
});

// Connection events
eldSimulator.onConnected(() => {
  console.log('Device connected');
});

eldSimulator.onDisconnected(() => {
  console.log('Device disconnected');
});

eldSimulator.onConnectFailure((error: ConnectionFailure) => {
  console.log('Connection failed:', error.message);
});

// Data events
eldSimulator.onNotifyReceived((data: NotifyData) => {
  const eldData = JSON.parse(data.rawData);
  console.log('Received ELD data:', eldData);
});
```

#### Utility Methods
```typescript
// Get simulator status
const devices = eldSimulator.getAvailableDevices();
const connected = eldSimulator.getConnectedDevice();
const isScanning = eldSimulator.isCurrentlyScanning();

// Control simulation
eldSimulator.setSimulationScenario(SimulationScenario.CONNECTION_ISSUES);
eldSimulator.updateDeviceBattery('device-id', 25);
eldSimulator.triggerDeviceMalfunction('device-id');
eldSimulator.reset();
```

### EldTestConfig Class

#### Configuration Methods
```typescript
// Set test mode
eldTestConfig.setTestMode(TestMode.SIMULATOR);

// Change simulation scenario
eldTestConfig.setSimulationScenario(SimulationScenario.DEVICE_MALFUNCTION);

// Update configuration
eldTestConfig.updateConfiguration({
  enableDebugLogs: true,
  connectionTimeout: 15000
});
```

#### Test Scenario Helpers
```typescript
// Run specific test scenarios
await eldTestConfig.simulateConnectionIssues();
await eldTestConfig.simulateAuthenticationFailure();
await eldTestConfig.simulateDeviceMalfunction();
await eldTestConfig.simulateLowBattery();
await eldTestConfig.simulateDataCorruption();

// Run comprehensive connectivity test
const result = await eldTestConfig.runConnectivityTest();
console.log('Test result:', result.success, result.details);
```

## Testing Scenarios

### 1. Connection Testing

```typescript
// Test connection reliability
eldTestConfig.setSimulationScenario(SimulationScenario.CONNECTION_ISSUES);

let connectionAttempts = 0;
let successfulConnections = 0;

for (let i = 0; i < 10; i++) {
  try {
    connectionAttempts++;
    await eldSimulator.connect(device.address, device.imei);
    successfulConnections++;
    await eldSimulator.disconnect();
  } catch (error) {
    console.log(`Connection ${i + 1} failed:`, error.message);
  }
}

const successRate = (successfulConnections / connectionAttempts) * 100;
console.log(`Connection success rate: ${successRate}%`);
```

### 2. Data Integrity Testing

```typescript
// Test data corruption handling
eldTestConfig.setSimulationScenario(SimulationScenario.DATA_CORRUPTION);

let corruptedPackets = 0;
let totalPackets = 0;

eldSimulator.onNotifyReceived((data: NotifyData) => {
  totalPackets++;
  
  try {
    const eldData = JSON.parse(data.rawData);
    if (!eldData.dataIntegrity) {
      corruptedPackets++;
    }
  } catch (error) {
    corruptedPackets++;
  }
});

await eldSimulator.startReportEldData();
```

### 3. Device Performance Testing

```typescript
// Test different device types
const deviceTypes = [
  EldDeviceType.TTM_PREMIUM,
  EldDeviceType.TTM_STANDARD,
  EldDeviceType.FAULTY_DEVICE,
  EldDeviceType.SLOW_DEVICE
];

for (const deviceType of deviceTypes) {
  const testDevice = eldSimulator.getAvailableDevices()
    .find(d => d.deviceType === deviceType);
  
  const startTime = Date.now();
  
  try {
    await eldSimulator.connect(testDevice.address, testDevice.imei);
    const connectionTime = Date.now() - startTime;
    
    console.log(`${deviceType} connection time: ${connectionTime}ms`);
    
    await eldSimulator.disconnect();
  } catch (error) {
    console.log(`${deviceType} connection failed:`, error.message);
  }
}
```

## Integration with Your App

### 1. Replace Real BLE Manager

```typescript
// In your existing service files
import { eldTestConfig } from '../services/EldTestConfig';

// Instead of directly importing TTMBLEManager
const bleManager = eldTestConfig.getBLEManager();

// Use bleManager instead of TTMBLEManager
await bleManager.initSDK();
await bleManager.startScan(10000);
```

### 2. Environment-Based Configuration

```typescript
// Configure based on environment
if (__DEV__) {
  eldTestConfig.setTestMode(TestMode.HYBRID);
  eldTestConfig.enableDebugMode(true);
} else {
  eldTestConfig.setTestMode(TestMode.PRODUCTION);
}
```

### 3. Testing Integration

```typescript
// In your Jest test setup
beforeAll(async () => {
  eldTestConfig.setTestMode(TestMode.SIMULATOR);
  await eldTestConfig.initialize();
});

afterEach(() => {
  eldTestConfig.reset();
});
```

## Advanced Usage

### Custom Device Configuration

```typescript
// Add custom device types or modify existing ones
const customDevice = {
  id: 'CUSTOM-001',
  name: 'Custom ELD Device',
  address: '00:AA:BB:CC:DD:EE',
  deviceType: EldDeviceType.GENERIC_ELD,
  manufacturer: 'Custom Manufacturer',
  firmwareVersion: '1.0.0',
  // ... other properties
};
```

### Custom Test Scenarios

```typescript
// Create custom test scenarios
const customScenario = async () => {
  // Set specific conditions
  eldSimulator.updateDeviceBattery('device-id', 10);
  eldSimulator.setSimulationScenario(SimulationScenario.LOW_BATTERY);
  
  // Wait and observe behavior
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Restore normal conditions
  eldSimulator.updateDeviceBattery('device-id', 80);
  eldSimulator.setSimulationScenario(SimulationScenario.NORMAL_OPERATION);
};

await customScenario();
```

### Performance Monitoring

```typescript
// Monitor simulator performance
const startMonitoring = () => {
  const stats = {
    packetsReceived: 0,
    connectionsEstablished: 0,
    connectionFailures: 0,
    dataCorruptions: 0
  };

  eldSimulator.onConnected(() => stats.connectionsEstablished++);
  eldSimulator.onConnectFailure(() => stats.connectionFailures++);
  eldSimulator.onNotifyReceived((data) => {
    stats.packetsReceived++;
    
    try {
      const eldData = JSON.parse(data.rawData);
      if (!eldData.dataIntegrity) {
        stats.dataCorruptions++;
      }
    } catch {
      stats.dataCorruptions++;
    }
  });

  return stats;
};

const stats = startMonitoring();
// ... run tests ...
console.log('Test statistics:', stats);
```

## Running Tests

```bash
# Run all ELD simulator tests
npm test -- EldSimulator.test.ts

# Run specific test suites
npm test -- --testNamePattern="Connection"
npm test -- --testNamePattern="Data Streaming"

# Run tests with coverage
npm test -- --coverage EldSimulator.test.ts
```

## Troubleshooting

### Common Issues

1. **Simulator not initializing**
   ```typescript
   // Ensure proper initialization order
   await eldTestConfig.initialize();
   ```

2. **Events not firing**
   ```typescript
   // Make sure event listeners are set up before operations
   const listener = eldSimulator.onConnected(() => {});
   await eldSimulator.connect(address, imei);
   ```

3. **Tests timing out**
   ```typescript
   // Increase timeout for slower operations
   jest.setTimeout(30000);
   ```

4. **Memory leaks in tests**
   ```typescript
   // Always clean up in afterEach
   afterEach(() => {
     eldSimulator.reset();
   });
   ```

### Debug Mode

Enable debug mode for detailed logging:

```typescript
eldTestConfig.enableDebugMode(true);
```

This will provide detailed console output for all simulator operations.

## Best Practices

1. **Always reset between tests**
   ```typescript
   beforeEach(() => {
     eldSimulator.reset();
   });
   ```

2. **Use appropriate timeouts**
   ```typescript
   // Account for device type delays
   const connectionDelay = deviceType === EldDeviceType.SLOW_DEVICE ? 10000 : 3000;
   ```

3. **Test error scenarios**
   ```typescript
   // Don't just test happy paths
   eldTestConfig.setSimulationScenario(SimulationScenario.CONNECTION_ISSUES);
   ```

4. **Monitor performance**
   ```typescript
   // Track connection times and success rates
   const startTime = Date.now();
   await eldSimulator.connect(address, imei);
   const connectionTime = Date.now() - startTime;
   ```

5. **Use proper cleanup**
   ```typescript
   // Remove event listeners to prevent memory leaks
   const listener = eldSimulator.onConnected(callback);
   // ... later ...
   listener.remove();
   ```

The ELD simulator provides a comprehensive testing environment that allows you to develop and test your ELD functionality without requiring physical hardware. It's designed to be realistic, flexible, and easy to use in both manual testing and automated test suites.
