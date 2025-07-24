// services/EldSimulator.ts

import { EldDevice } from '../types/eld';
import { BLEDevice, NotifyData, ConnectionFailure } from '../src/utils/TTMBLEManager';
import { DriverStatus, StatusUpdate, HoursOfService, LogEntry } from '../types/status';

// Define ELD device types and manufacturers
export enum EldDeviceType {
  TTM_STANDARD = 'TTM_STANDARD',
  TTM_PREMIUM = 'TTM_PREMIUM',
  GENERIC_ELD = 'GENERIC_ELD',
  FAULTY_DEVICE = 'FAULTY_DEVICE',
  SLOW_DEVICE = 'SLOW_DEVICE'
}

export enum EldManufacturer {
  TTM = 'TTM Technologies',
  GEOTAB = 'Geotab Inc.',
  OMNITRACS = 'Omnitracs',
  FLEET_COMPLETE = 'Fleet Complete',
  SAMSARA = 'Samsara'
}

// Extended ELD device interface for simulation
export interface SimulatedEldDevice extends EldDevice {
  deviceType: EldDeviceType;
  manufacturer: EldManufacturer;
  firmwareVersion: string;
  serialNumber: string;
  imei: string;
  signal: number; // RSSI signal strength
  batteryLevel: number;
  isPasswordProtected: boolean;
  lastSeen: number;
  connectionAttempts: number;
  maxConnectionAttempts: number;
}

// ELD data structures
export interface VehicleData {
  speed: number; // mph
  rpm: number;
  engineHours: number;
  odometer: number; // miles
  fuelLevel: number; // percentage
  engineTemp: number; // fahrenheit
  diagnosticCodes: string[];
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: number;
}

export interface EldDataStream {
  vehicleData: VehicleData;
  driverStatus: DriverStatus;
  hoursOfService: HoursOfService;
  logEntries: LogEntry[];
  malfunction: boolean;
  dataIntegrity: boolean;
  timestamp: number;
}

// Simulation scenarios
export enum SimulationScenario {
  NORMAL_OPERATION = 'NORMAL_OPERATION',
  CONNECTION_ISSUES = 'CONNECTION_ISSUES',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  DEVICE_MALFUNCTION = 'DEVICE_MALFUNCTION',
  LOW_BATTERY = 'LOW_BATTERY',
  FIRMWARE_UPDATE = 'FIRMWARE_UPDATE',
  DRIVER_VIOLATION = 'DRIVER_VIOLATION'
}

class EldSimulator {
  private devices: Map<string, SimulatedEldDevice> = new Map();
  private connectedDevice: SimulatedEldDevice | null = null;
  private isScanning: boolean = false;
  private dataStreamInterval: NodeJS.Timeout | null = null;
  private currentScenario: SimulationScenario = SimulationScenario.NORMAL_OPERATION;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  
  constructor() {
    this.generateMockDevices();
  }

  // Event emitter methods
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in ELD simulator event listener for ${event}:`, error);
        }
      });
    }
  }

  private generateMockDevices(): void {
    const deviceConfigs = [
      {
        id: 'TTM-001',
        name: 'TTM ELD Pro',
        address: '00:1A:2B:3C:4D:5E',
        deviceType: EldDeviceType.TTM_PREMIUM,
        manufacturer: EldManufacturer.TTM,
        firmwareVersion: '2.1.4',
        serialNumber: 'TTM2024001',
        imei: '359496030000001',
        signal: -45,
        batteryLevel: 85,
        isPasswordProtected: false
      },
      {
        id: 'TTM-002', 
        name: 'TTM ELD Standard',
        address: '00:2B:3C:4D:5E:6F',
        deviceType: EldDeviceType.TTM_STANDARD,
        manufacturer: EldManufacturer.TTM,
        firmwareVersion: '1.8.2',
        serialNumber: 'TTM2024002',
        imei: '359496030000002',
        signal: -65,
        batteryLevel: 92,
        isPasswordProtected: true
      },
      {
        id: 'GEO-001',
        name: 'Geotab GO9',
        address: '00:3C:4D:5E:6F:7A',
        deviceType: EldDeviceType.GENERIC_ELD,
        manufacturer: EldManufacturer.GEOTAB,
        firmwareVersion: '8.0.0.1234',
        serialNumber: 'GT9000123456',
        imei: '359496030000003',
        signal: -55,
        batteryLevel: 78,
        isPasswordProtected: false
      },
      {
        id: 'FAULTY-001',
        name: 'Faulty ELD Device',
        address: '00:4D:5E:6F:7A:8B',
        deviceType: EldDeviceType.FAULTY_DEVICE,
        manufacturer: EldManufacturer.FLEET_COMPLETE,
        firmwareVersion: '1.0.1',
        serialNumber: 'FC2023ERR',
        imei: '359496030000004',
        signal: -85,
        batteryLevel: 15,
        isPasswordProtected: false
      },
      {
        id: 'SLOW-001',
        name: 'Slow Response ELD',
        address: '00:5E:6F:7A:8B:9C',
        deviceType: EldDeviceType.SLOW_DEVICE,
        manufacturer: EldManufacturer.OMNITRACS,
        firmwareVersion: '3.2.1',
        serialNumber: 'OMN2022SLOW',
        imei: '359496030000005',
        signal: -75,
        batteryLevel: 60,
        isPasswordProtected: true
      }
    ];

    deviceConfigs.forEach(config => {
      const device: SimulatedEldDevice = {
        ...config,
        isConnected: false,
        lastSeen: Date.now(),
        connectionAttempts: 0,
        maxConnectionAttempts: config.deviceType === EldDeviceType.FAULTY_DEVICE ? 2 : 5
      };
      this.devices.set(device.id, device);
    });
  }

  // TTM BLE Manager compatible methods
  async initSDK(): Promise<void> {
    console.log('[ELD Simulator] SDK initialized');
    return Promise.resolve();
  }

  async startScan(duration: number = 10000): Promise<void> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }
    
    console.log(`[ELD Simulator] Starting scan for ${duration}ms`);
    this.isScanning = true;
    
    // Simulate gradual device discovery
    const deviceArray = Array.from(this.devices.values());
    const discoveryDelay = Math.min(duration / deviceArray.length, 2000);
    
    deviceArray.forEach((device, index) => {
      setTimeout(() => {
        if (this.isScanning) {
          // Update last seen and vary signal strength
          device.lastSeen = Date.now();
          device.signal = this.getRandomSignalStrength(device.deviceType);
          
          const bleDevice: BLEDevice = {
            id: device.id,
            name: device.name,
            address: device.address,
            signal: device.signal
          };
          
          this.emit('ON_DEVICE_SCANNED', bleDevice);
          console.log(`[ELD Simulator] Device discovered: ${device.name} (${device.address})`);
        }
      }, index * discoveryDelay + Math.random() * 1000);
    });

    // Auto-stop scan after duration
    setTimeout(() => {
      if (this.isScanning) {
        this.stopScan();
      }
    }, duration);
    
    return Promise.resolve();
  }

  async stopScan(): Promise<void> {
    if (!this.isScanning) {
      return Promise.resolve();
    }
    
    console.log('[ELD Simulator] Stopping scan');
    this.isScanning = false;
    this.emit('ON_SCAN_STOP');
    this.emit('ON_SCAN_FINISH');
    return Promise.resolve();
  }

  async connect(macAddress: string, imei: string, needPair: boolean = false): Promise<void> {
    const device = Array.from(this.devices.values()).find(d => d.address === macAddress);
    
    if (!device) {
      const error: ConnectionFailure = {
        status: 404,
        message: 'Device not found'
      };
      setTimeout(() => this.emit('ON_CONNECT_FAILURE', error), 100);
      return Promise.reject(new Error('Device not found'));
    }

    if (device.imei !== imei) {
      const error: ConnectionFailure = {
        status: 401,
        message: 'IMEI mismatch - authentication failed'
      };
      setTimeout(() => this.emit('ON_CONNECT_FAILURE', error), 1000);
      return Promise.reject(new Error('IMEI mismatch'));
    }

    device.connectionAttempts++;
    console.log(`[ELD Simulator] Connecting to ${device.name} (attempt ${device.connectionAttempts})`);

    return new Promise((resolve, reject) => {
      const connectionDelay = this.getConnectionDelay(device.deviceType);
      
      setTimeout(() => {
        // Simulate connection scenarios based on device type and scenario
        if (this.shouldConnectionFail(device)) {
          const error: ConnectionFailure = {
            status: this.getConnectionFailureStatus(device),
            message: this.getConnectionFailureMessage(device)
          };
          this.emit('ON_CONNECT_FAILURE', error);
          reject(new Error(error.message));
          return;
        }

        // Successful connection
        device.isConnected = true;
        device.connectionAttempts = 0;
        this.connectedDevice = device;
        
        this.emit('ON_CONNECTED');
        console.log(`[ELD Simulator] Connected to ${device.name}`);
        
        // Simulate authentication if password protected
        if (device.isPasswordProtected) {
          setTimeout(() => {
            if (this.currentScenario === SimulationScenario.AUTHENTICATION_FAILURE) {
              this.emit('ON_CONNECT_FAILURE', {
                status: 401,
                message: 'Password authentication failed'
              });
            } else {
              this.emit('ON_AUTHENTICATION_PASSED');
              console.log(`[ELD Simulator] Authentication passed for ${device.name}`);
            }
          }, 1500);
        } else {
          // No password required
          setTimeout(() => this.emit('ON_AUTHENTICATION_PASSED'), 500);
        }
        
        resolve();
      }, connectionDelay);
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connectedDevice) {
      return Promise.resolve();
    }
    
    console.log(`[ELD Simulator] Disconnecting from ${this.connectedDevice.name}`);
    this.connectedDevice.isConnected = false;
    this.connectedDevice = null;
    
    if (this.dataStreamInterval) {
      clearInterval(this.dataStreamInterval);
      this.dataStreamInterval = null;
    }
    
    this.emit('ON_DISCONNECTED');
    return Promise.resolve();
  }

  async startReportEldData(): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }
    
    console.log(`[ELD Simulator] Starting ELD data reporting from ${this.connectedDevice.name}`);
    
    // Start continuous data stream
    this.dataStreamInterval = setInterval(() => {
      this.generateEldDataPacket();
    }, 5000); // Send data every 5 seconds
    
    // Send initial data immediately
    setTimeout(() => this.generateEldDataPacket(), 500);
    
    return Promise.resolve();
  }

  async replyReceivedEldData(): Promise<void> {
    console.log('[ELD Simulator] ELD data receipt acknowledged');
    return Promise.resolve();
  }

  async sendUTCTime(): Promise<void> {
    console.log('[ELD Simulator] UTC time sent to device');
    return Promise.resolve();
  }

  // Data generation methods
  private generateEldDataPacket(): void {
    if (!this.connectedDevice) return;
    
    const eldData: EldDataStream = {
      vehicleData: this.generateVehicleData(),
      driverStatus: this.generateDriverStatus(),
      hoursOfService: this.generateHoursOfService(),
      logEntries: [],
      malfunction: this.currentScenario === SimulationScenario.DEVICE_MALFUNCTION,
      dataIntegrity: this.currentScenario !== SimulationScenario.DATA_CORRUPTION,
      timestamp: Date.now()
    };
    
    const notifyData: NotifyData = {
      dataType: 'ELD_DATA',
      rawData: JSON.stringify(eldData)
    };
    
    this.emit('ON_NOTIFY_RECEIVED', notifyData);
    console.log(`[ELD Simulator] ELD data packet sent from ${this.connectedDevice.name}`);
  }

  private generateVehicleData(): VehicleData {
    return {
      speed: Math.floor(Math.random() * 80) + 10, // 10-90 mph
      rpm: Math.floor(Math.random() * 2000) + 800, // 800-2800 rpm
      engineHours: Math.floor(Math.random() * 10000) + 50000, // 50k-60k hours
      odometer: Math.floor(Math.random() * 100000) + 500000, // 500k-600k miles
      fuelLevel: Math.floor(Math.random() * 100), // 0-100%
      engineTemp: Math.floor(Math.random() * 50) + 180, // 180-230°F
      diagnosticCodes: this.generateDiagnosticCodes(),
      location: {
        latitude: 39.7392 + (Math.random() - 0.5) * 0.1, // Denver area
        longitude: -104.9903 + (Math.random() - 0.5) * 0.1,
        accuracy: Math.floor(Math.random() * 10) + 3 // 3-13 meters
      },
      timestamp: Date.now()
    };
  }

  private generateDriverStatus(): DriverStatus {
    const statuses: DriverStatus[] = ['driving', 'onDuty', 'offDuty', 'sleeping', 'sleeperBerth'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private generateHoursOfService(): HoursOfService {
    return {
      driveTimeRemaining: Math.floor(Math.random() * 660), // 0-11 hours in minutes
      shiftTimeRemaining: Math.floor(Math.random() * 840), // 0-14 hours in minutes
      cycleTimeRemaining: Math.floor(Math.random() * 4200), // 0-70 hours in minutes
      breakTimeRemaining: Math.floor(Math.random() * 480), // 0-8 hours in minutes
      lastCalculated: Date.now()
    };
  }

  private generateDiagnosticCodes(): string[] {
    const codes = ['P0420', 'P0171', 'P0128', 'P0442', 'P0455'];
    const numCodes = Math.floor(Math.random() * 3); // 0-2 codes
    return codes.slice(0, numCodes);
  }

  // Helper methods for realistic simulation
  private getRandomSignalStrength(deviceType: EldDeviceType): number {
    const baseSignal = {
      [EldDeviceType.TTM_PREMIUM]: -45,
      [EldDeviceType.TTM_STANDARD]: -55,
      [EldDeviceType.GENERIC_ELD]: -65,
      [EldDeviceType.FAULTY_DEVICE]: -85,
      [EldDeviceType.SLOW_DEVICE]: -75
    };
    
    return baseSignal[deviceType] + Math.floor(Math.random() * 20) - 10; // ±10 dBm variation
  }

  private getConnectionDelay(deviceType: EldDeviceType): number {
    const delays = {
      [EldDeviceType.TTM_PREMIUM]: 1000,
      [EldDeviceType.TTM_STANDARD]: 1500,
      [EldDeviceType.GENERIC_ELD]: 2000,
      [EldDeviceType.FAULTY_DEVICE]: 5000,
      [EldDeviceType.SLOW_DEVICE]: 8000
    };
    
    return delays[deviceType] + Math.floor(Math.random() * 1000);
  }

  private shouldConnectionFail(device: SimulatedEldDevice): boolean {
    // Scenario-based failures
    if (this.currentScenario === SimulationScenario.CONNECTION_ISSUES) {
      return Math.random() < 0.7; // 70% chance of failure
    }
    
    if (this.currentScenario === SimulationScenario.LOW_BATTERY && device.batteryLevel < 20) {
      return Math.random() < 0.8; // 80% chance of failure for low battery
    }
    
    // Device-specific failures
    if (device.deviceType === EldDeviceType.FAULTY_DEVICE) {
      return device.connectionAttempts >= device.maxConnectionAttempts || Math.random() < 0.6;
    }
    
    // Signal strength based failures
    if (device.signal < -80) {
      return Math.random() < 0.4; // 40% chance for weak signal
    }
    
    return false;
  }

  private getConnectionFailureStatus(device: SimulatedEldDevice): number {
    if (this.currentScenario === SimulationScenario.AUTHENTICATION_FAILURE) return 401;
    if (device.deviceType === EldDeviceType.FAULTY_DEVICE) return 500;
    if (device.signal < -80) return 408; // Timeout
    return 503; // Service unavailable
  }

  private getConnectionFailureMessage(device: SimulatedEldDevice): string {
    if (this.currentScenario === SimulationScenario.AUTHENTICATION_FAILURE) {
      return 'Authentication failed - invalid credentials';
    }
    if (device.deviceType === EldDeviceType.FAULTY_DEVICE) {
      return 'Device hardware malfunction detected';
    }
    if (device.signal < -80) {
      return 'Connection timeout - weak signal strength';
    }
    if (this.currentScenario === SimulationScenario.LOW_BATTERY) {
      return 'Device battery too low for stable connection';
    }
    return 'Connection failed - unknown error';
  }

  // Public methods for test control
  public setSimulationScenario(scenario: SimulationScenario): void {
    this.currentScenario = scenario;
    console.log(`[ELD Simulator] Scenario changed to: ${scenario}`);
  }

  public getAvailableDevices(): SimulatedEldDevice[] {
    return Array.from(this.devices.values());
  }

  public getConnectedDevice(): SimulatedEldDevice | null {
    return this.connectedDevice;
  }

  public isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  public updateDeviceBattery(deviceId: string, batteryLevel: number): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.batteryLevel = Math.max(0, Math.min(100, batteryLevel));
      console.log(`[ELD Simulator] ${device.name} battery updated to ${device.batteryLevel}%`);
    }
  }

  public triggerDeviceMalfunction(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device && device.isConnected) {
      const errorData: NotifyData = {
        dataType: 'MALFUNCTION',
        rawData: JSON.stringify({
          errorCode: 'DEVICE_MALFUNCTION',
          message: 'ELD device has encountered a hardware malfunction',
          timestamp: Date.now()
        })
      };
      this.emit('ON_NOTIFY_RECEIVED', errorData);
      console.log(`[ELD Simulator] Malfunction triggered for ${device.name}`);
    }
  }

  public reset(): void {
    if (this.dataStreamInterval) {
      clearInterval(this.dataStreamInterval);
      this.dataStreamInterval = null;
    }
    
    this.isScanning = false;
    this.connectedDevice = null;
    this.currentScenario = SimulationScenario.NORMAL_OPERATION;
    
    // Reset all devices
    this.devices.forEach(device => {
      device.isConnected = false;
      device.connectionAttempts = 0;
    });
    
    console.log('[ELD Simulator] Reset complete');
  }

  // TTM BLE Manager event listener methods (for compatibility)
  onDeviceScanned(callback: (device: BLEDevice) => void) {
    this.on('ON_DEVICE_SCANNED', callback);
    return { remove: () => this.off('ON_DEVICE_SCANNED', callback) };
  }

  onConnected(callback: () => void) {
    this.on('ON_CONNECTED', callback);
    return { remove: () => this.off('ON_CONNECTED', callback) };
  }

  onDisconnected(callback: () => void) {
    this.on('ON_DISCONNECTED', callback);
    return { remove: () => this.off('ON_DISCONNECTED', callback) };
  }

  onConnectFailure(callback: (error: ConnectionFailure) => void) {
    this.on('ON_CONNECT_FAILURE', callback);
    return { remove: () => this.off('ON_CONNECT_FAILURE', callback) };
  }

  onAuthenticationPassed(callback: () => void) {
    this.on('ON_AUTHENTICATION_PASSED', callback);
    return { remove: () => this.off('ON_AUTHENTICATION_PASSED', callback) };
  }

  onNotifyReceived(callback: (data: NotifyData) => void) {
    this.on('ON_NOTIFY_RECEIVED', callback);
    return { remove: () => this.off('ON_NOTIFY_RECEIVED', callback) };
  }
}

// Export singleton instance
export const eldSimulator = new EldSimulator();

