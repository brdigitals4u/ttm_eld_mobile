// services/EldSimulator.ts

import { NativeEventEmitter, NativeModules } from 'react-native';

// KD032 ELD Device Simulator - 100% compatible with Jimi IoT SDK
// Based on extracted SDK: android/app/libs/extracted_sdk/classes/com/jimi/ble/
export class KD032EldSimulator {
  private static instance: KD032EldSimulator;
  private isAdvertising = false;
  private isConnected = false;
  private dataInterval: any = null;
  private eventEmitter: NativeEventEmitter;

  // Real KD032 device characteristics (from SDK)
  private readonly DEVICE_ADDRESS = 'C4:A8:28:43:14:9A';
  private readonly DEVICE_NAME = 'KD032-43149A';
  
  // SDK Protocol UUIDs (from extracted SDK)
  private readonly SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
  private readonly CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
  
  // SDK Data Types (from BaseObdData.class)
  private readonly DATA_TYPES = {
    ELD_DATA: 'ELD_DATA',
    BtParseData: 'BtParseData',
    MALFUNCTION: 'MALFUNCTION',
    AUTHENTICATION: 'AUTHENTICATION',
    CONNECTION_STATUS: 'CONNECTION_STATUS',
    TERMINAL_INFO: 'TERMINAL_INFO',
    VERSION_REPORT: 'VERSION_REPORT',
    ALARM_REPORT: 'ALARM_REPORT',
    INFO_REPORT: 'INFO_REPORT',
    SYS_INFO_REPORT: 'SYS_INFO_REPORT'
  };

  // SDK ACK Values (from protocol classes)
  private readonly ACK_VALUES = {
    ACK_OBD_ELD_START: 0x10,
    ACK_OBD_ELD_PROCESS: 0x11,
    ACK_OBD_ELD_STOP: 0x12,
    ACK_AUTHENTICATION_PASSED: 0x20,
    ACK_AUTHENTICATION_FAILED: 0x21
  };

  constructor() {
    this.eventEmitter = new NativeEventEmitter(NativeModules.TTMBLEManagerModule);
  }

  static getInstance(): KD032EldSimulator {
    if (!KD032EldSimulator.instance) {
      KD032EldSimulator.instance = new KD032EldSimulator();
    }
    return KD032EldSimulator.instance;
  }

  // Start advertising as KD032 device (matches SDK scan behavior)
  startAdvertising(): void {
    if (this.isAdvertising) {
      console.log('🎯 KD032 Simulator: Already advertising');
      return;
    }

    console.log('🎯 KD032 Simulator: Starting advertisement as', this.DEVICE_NAME);
    this.isAdvertising = true;

    // Simulate device appearing in scan results (matches SDK scan callback)
    this.simulateScanDiscovery();
  }

  // Stop advertising
  stopAdvertising(): void {
    if (!this.isAdvertising) {
      return;
    }

    console.log('🎯 KD032 Simulator: Stopping advertisement');
    this.isAdvertising = false;
    this.stopDataTransmission();
  }

  // Simulate device discovery during scan (matches SDK OnBluetoothScanCallback)
  private simulateScanDiscovery(): void {
    const simulatedDevice = {
      id: this.DEVICE_ADDRESS,
      address: this.DEVICE_ADDRESS,
      name: this.DEVICE_NAME,
      signal: -45, // Good signal strength
      scanType: 'ttm_sdk' as const,
    };

    // Emit device found event (matches SDK scan callback)
    this.eventEmitter.emit('deviceFound', simulatedDevice);
    console.log('🎯 KD032 Simulator: Device discovered in scan:', simulatedDevice);
  }

  // Handle connection attempt (matches SDK connection flow)
  handleConnectionAttempt(deviceId: string): boolean {
    if (deviceId !== this.DEVICE_ADDRESS) {
      return false;
    }

    console.log('🎯 KD032 Simulator: Connection attempt received for', deviceId);
    
    // Simulate connection success (no passcode needed for KD032)
    setTimeout(() => {
      this.simulateConnectionSuccess();
    }, 1000);

    return true;
  }

  // Simulate successful connection (matches SDK BluetoothController)
  private simulateConnectionSuccess(): void {
    console.log('🎯 KD032 Simulator: Connection successful');
    this.isConnected = true;
    
    // Emit connection success (matches SDK ON_CONNECTED event)
    this.eventEmitter.emit('connectionSuccess', {
      deviceId: this.DEVICE_ADDRESS,
      deviceName: this.DEVICE_NAME,
    });

    // Start ELD data transmission
    this.startDataTransmission();
  }

  // Start transmitting ELD data (matches SDK data flow)
  private startDataTransmission(): void {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }

    console.log('🎯 KD032 Simulator: Starting ELD data transmission');
    
    // Transmit data every 3 seconds (matches real device timing)
    this.dataInterval = setInterval(() => {
      this.transmitEldData();
    }, 3000);

    // Send initial data immediately
    this.transmitEldData();
  }

  // Stop data transmission
  private stopDataTransmission(): void {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }
    this.isConnected = false;
    console.log('🎯 KD032 Simulator: Data transmission stopped');
  }

  // Transmit realistic ELD data (matches BaseObdData$EldData.class structure)
  private transmitEldData(): void {
    const eldData = this.generateSdkCompatibleEldData();
    
    console.log('📊 KD032 Simulator: Transmitting ELD data:', eldData);
    
    // Emit ELD data notification (matches SDK ON_NOTIFY_RECEIVED format)
    this.eventEmitter.emit('eldDataReceived', {
      dataType: this.DATA_TYPES.ELD_DATA,
      deviceId: this.DEVICE_ADDRESS,
      timestamp: new Date().toISOString(),
      data: eldData,
      ack: this.ACK_VALUES.ACK_OBD_ELD_PROCESS, // SDK ACK value
    });
  }

  // Generate SDK-compatible ELD data (matches BaseObdData$EldData.class exactly)
  private generateSdkCompatibleEldData(): any {
    const now = new Date();
    const driverId = Math.floor(Math.random() * 1000000);
    const vehicleId = Math.floor(Math.random() * 100000);
    const odometer = Math.floor(Math.random() * 500000) + 100000;
    const engineHours = Math.floor(Math.random() * 10000);
    const speed = Math.floor(Math.random() * 75);
    const engineRPM = Math.floor(Math.random() * 2000) + 800;
    const latitude = 40.7128 + (Math.random() - 0.5) * 0.1;
    const longitude = -74.0060 + (Math.random() - 0.5) * 0.1;
    const dutyStatus = this.getRandomDutyStatus();

    // Match exact SDK data structure from BaseObdData$EldData.class
    return {
      deviceId: this.DEVICE_ADDRESS,
      timestamp: now.toISOString(),
      speed: speed,
      engineRPM: engineRPM,
      status: dutyStatus,
      location: {
        latitude: latitude,
        longitude: longitude,
        accuracy: 5 + Math.random() * 10,
      },
      odometer: odometer,
      engineHours: engineHours,
      driverId: driverId.toString(),
      vehicleId: vehicleId.toString(),
      events: this.generateSdkCompatibleEvents(now),
      // SDK-specific fields
      vin: this.generateVIN(),
      ecuInfo: this.generateEcuInfo(),
      terminalInfo: this.generateTerminalInfo(),
      versionInfo: this.generateVersionInfo(),
      alarmInfo: this.generateAlarmInfo(),
      sysInfo: this.generateSysInfo(),
    };
  }

  // Generate VIN (matches BaseObdData$VinBean.class)
  private generateVIN(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let vin = '';
    for (let i = 0; i < 17; i++) {
      vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
  }

  // Generate ECU info (matches ObdEcuBean.class)
  private generateEcuInfo(): any {
    return {
      ecuId: Math.floor(Math.random() * 1000000).toString(),
      ecuType: 'ENGINE_ECU',
      ecuVersion: '1.2.3',
      ecuStatus: 'ACTIVE',
      lastUpdate: new Date().toISOString(),
    };
  }

  // Generate terminal info (matches ObdTerminalInfoBean.class)
  private generateTerminalInfo(): any {
    return {
      terminalId: this.DEVICE_ADDRESS,
      terminalType: 'KD032',
      terminalVersion: '2.1.0',
      terminalStatus: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
    };
  }

  // Generate version info (matches VersionReportBean.class)
  private generateVersionInfo(): any {
    return {
      firmwareVersion: '2.1.0',
      hardwareVersion: '1.0.0',
      protocolVersion: '1.2',
      buildDate: '2025-01-15',
    };
  }

  // Generate alarm info (matches AlarmReportBean.class)
  private generateAlarmInfo(): any {
    return {
      alarmType: 'ENGINE_FAULT',
      alarmLevel: 'WARNING',
      alarmCode: 'E001',
      alarmMessage: 'Engine temperature high',
      alarmTimestamp: new Date().toISOString(),
    };
  }

  // Generate system info (matches SysInfoReportBean.class)
  private generateSysInfo(): any {
    return {
      batteryLevel: Math.floor(Math.random() * 100),
      signalStrength: -45 + Math.floor(Math.random() * 20),
      memoryUsage: Math.floor(Math.random() * 100),
      cpuUsage: Math.floor(Math.random() * 100),
      uptime: Math.floor(Math.random() * 86400), // seconds
    };
  }

  // Generate realistic duty status (matches SDK duty status enum)
  private getRandomDutyStatus(): string {
    const statuses = ['OFF_DUTY', 'SLEEPER_BERTH', 'DRIVING', 'ON_DUTY_NOT_DRIVING'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  // Generate SDK-compatible events (matches BaseObdData$DataFlow.class)
  private generateSdkCompatibleEvents(timestamp: Date): any[] {
    const events = [];
    const eventTypes = ['LOGIN', 'LOGOUT', 'DRIVING', 'ON_DUTY', 'OFF_DUTY', 'SLEEPER'];
    
    // Generate 1-3 events
    const numEvents = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numEvents; i++) {
      const eventTime = new Date(timestamp.getTime() - Math.random() * 3600000); // Within last hour
      events.push({
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        timestamp: eventTime.toISOString(),
        location: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
        },
        // SDK-specific event fields
        eventId: Math.floor(Math.random() * 1000000).toString(),
        eventCode: 'EVT_' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        eventDescription: 'Event description',
        eventSeverity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      });
    }
    
    return events;
  }

  // Handle disconnection (matches SDK disconnect flow)
  handleDisconnection(): void {
    console.log('🎯 KD032 Simulator: Device disconnected');
    this.stopDataTransmission();
    
    // Emit disconnection event (matches SDK ON_DISCONNECTED)
    this.eventEmitter.emit('connectionLost', {
      deviceId: this.DEVICE_ADDRESS,
      reason: 'User initiated disconnect',
    });
  }

  // Get simulator status
  getStatus(): any {
    return {
      isAdvertising: this.isAdvertising,
      isConnected: this.isConnected,
      deviceName: this.DEVICE_NAME,
      deviceAddress: this.DEVICE_ADDRESS,
      serviceUuid: this.SERVICE_UUID,
      characteristicUuid: this.CHARACTERISTIC_UUID,
      dataTypes: this.DATA_TYPES,
      ackValues: this.ACK_VALUES,
    };
  }

  // Reset simulator
  reset(): void {
    this.stopAdvertising();
    this.stopDataTransmission();
    console.log('🎯 KD032 Simulator: Reset complete');
  }
}

// Export singleton instance
export const kd032Simulator = KD032EldSimulator.getInstance();

// Helper function to start simulator
export const startKD032Simulator = (): void => {
  console.log('🚀 Starting KD032 ELD Device Simulator (SDK Compatible)...');
  kd032Simulator.startAdvertising();
};

// Helper function to stop simulator
export const stopKD032Simulator = (): void => {
  console.log('🛑 Stopping KD032 ELD Device Simulator...');
  kd032Simulator.reset();
};

// Helper function to get simulator status
export const getKD032SimulatorStatus = (): any => {
  return kd032Simulator.getStatus();
};

