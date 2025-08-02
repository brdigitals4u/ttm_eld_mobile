import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { FirebaseLogger } from './FirebaseService';

interface ELDDevice {
  id: string;
  name: string;
  address: string;
  deviceType?: string;
  deviceCategory?: string;
  signalStrength?: number;
  batteryLevel?: number;
  isConnected?: boolean;
  lastSeen?: Date;
  firmwareVersion?: string;
  uid?: string;
  imei?: string;
}

interface MonitoringData {
  deviceId: string;
  timestamp: string;
  dataType: string;
  value: any;
  processedData?: any;
}

interface ServiceStatus {
  isMonitoring: boolean;
  connectedDevices: number;
  serviceStatus: string;
  timestamp: string;
}

class ELDServiceManager {
  private static instance: ELDServiceManager;
  private eventEmitter: NativeEventEmitter | null = null;
  private isServiceRunning = false;
  private connectedDevices = new Map<string, ELDDevice>();
  private monitoringData = new Map<string, MonitoringData>();
  private serviceCallbacks = new Map<string, Function[]>();

  private constructor() {
    this.initializeEventEmitter();
    this.setupEventListeners();
  }

  static getInstance(): ELDServiceManager {
    if (!ELDServiceManager.instance) {
      ELDServiceManager.instance = new ELDServiceManager();
    }
    return ELDServiceManager.instance;
  }

  private initializeEventEmitter() {
    if (Platform.OS === 'android' && NativeModules.JimiBridge) {
      this.eventEmitter = new NativeEventEmitter(NativeModules.JimiBridge);
    }
  }

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    // Service lifecycle events
    this.eventEmitter.addListener('onServiceStarted', this.handleServiceStarted.bind(this));
    this.eventEmitter.addListener('onServiceStopped', this.handleServiceStopped.bind(this));
    this.eventEmitter.addListener('onServiceDestroyed', this.handleServiceDestroyed.bind(this));

    // Device events
    this.eventEmitter.addListener('onDeviceDiscovered', this.handleDeviceDiscovered.bind(this));
    this.eventEmitter.addListener('onDeviceConnected', this.handleDeviceConnected.bind(this));
    this.eventEmitter.addListener('onDeviceDisconnected', this.handleDeviceDisconnected.bind(this));

    // Data events
    this.eventEmitter.addListener('onDataReceived', this.handleDataReceived.bind(this));
    this.eventEmitter.addListener('onProcessedDataReceived', this.handleProcessedDataReceived.bind(this));
    this.eventEmitter.addListener('onMonitoringData', this.handleMonitoringData.bind(this));

    // Status events
    this.eventEmitter.addListener('onStatusUpdate', this.handleStatusUpdate.bind(this));

    // Error events
    this.eventEmitter.addListener('onConnectionError', this.handleConnectionError.bind(this));
    this.eventEmitter.addListener('onReconnectionAttempt', this.handleReconnectionAttempt.bind(this));
    this.eventEmitter.addListener('onReconnectionError', this.handleReconnectionError.bind(this));
    this.eventEmitter.addListener('onScanError', this.handleScanError.bind(this));
    this.eventEmitter.addListener('onBluetoothError', this.handleBluetoothError.bind(this));
  }

  // Service Management Methods
  async startMonitoring(): Promise<boolean> {
    try {
      if (this.isServiceRunning) {
        console.log('ELD monitoring service already running');
        return true;
      }

      if (Platform.OS !== 'android') {
        console.warn('ELD monitoring service only available on Android');
        return false;
      }

      // Start the background service
      const result = await this.startBackgroundService();
      
      if (result) {
        this.isServiceRunning = true;
        await this.logServiceEvent('monitoring_started', { success: true });
        console.log('ELD monitoring service started successfully');
      }

      return result;
    } catch (error) {
      console.error('Failed to start ELD monitoring service:', error);
      await this.logServiceEvent('monitoring_started', { success: false, error: error.message });
      return false;
    }
  }

  async stopMonitoring(): Promise<boolean> {
    try {
      if (!this.isServiceRunning) {
        console.log('ELD monitoring service not running');
        return true;
      }

      // Stop the background service
      const result = await this.stopBackgroundService();
      
      if (result) {
        this.isServiceRunning = false;
        this.connectedDevices.clear();
        this.monitoringData.clear();
        await this.logServiceEvent('monitoring_stopped', { success: true });
        console.log('ELD monitoring service stopped successfully');
      }

      return result;
    } catch (error) {
      console.error('Failed to stop ELD monitoring service:', error);
      await this.logServiceEvent('monitoring_stopped', { success: false, error: error.message });
      return false;
    }
  }

  private async startBackgroundService(): Promise<boolean> {
    try {
      // This would call the native service start method
      // For now, we'll simulate the service start
      console.log('Starting background ELD monitoring service...');
      
      // In real implementation, this would be:
      // return await NativeModules.ELDServiceManager.startMonitoring();
      
      return true;
    } catch (error) {
      console.error('Error starting background service:', error);
      return false;
    }
  }

  private async stopBackgroundService(): Promise<boolean> {
    try {
      // This would call the native service stop method
      console.log('Stopping background ELD monitoring service...');
      
      // In real implementation, this would be:
      // return await NativeModules.ELDServiceManager.stopMonitoring();
      
      return true;
    } catch (error) {
      console.error('Error stopping background service:', error);
      return false;
    }
  }

  // Device Management Methods
  async connectToDevice(device: ELDDevice): Promise<boolean> {
    try {
      if (Platform.OS !== 'android' || !NativeModules.JimiBridge) {
        console.warn('Device connection only available on Android with JimiBridge');
        return false;
      }

      const options = {
        deviceId: device.id,
        uid: device.uid,
        imei: device.imei,
        deviceType: device.deviceType,
        deviceCategory: device.deviceCategory,
        connectionMethod: 'universal',
        enableAutoReconnect: true,
        enableDataStreaming: true
      };

      const result = await NativeModules.JimiBridge.connectToDevice(options);
      
      if (result) {
        this.connectedDevices.set(device.id, device);
        await this.logServiceEvent('device_connected', { 
          deviceId: device.id, 
          deviceType: device.deviceType,
          success: true 
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      await this.logServiceEvent('device_connected', { 
        deviceId: device.id, 
        success: false, 
        error: error.message 
      });
      return false;
    }
  }

  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      if (Platform.OS !== 'android' || !NativeModules.JimiBridge) {
        console.warn('Device disconnection only available on Android with JimiBridge');
        return false;
      }

      const result = await NativeModules.JimiBridge.disconnectDevice(deviceId);
      
      if (result) {
        this.connectedDevices.delete(deviceId);
        await this.logServiceEvent('device_disconnected', { 
          deviceId, 
          success: true 
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      await this.logServiceEvent('device_disconnected', { 
        deviceId, 
        success: false, 
        error: error.message 
      });
      return false;
    }
  }

  // Data Management Methods
  getConnectedDevices(): ELDDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  getMonitoringData(): MonitoringData[] {
    return Array.from(this.monitoringData.values());
  }

  getDeviceById(deviceId: string): ELDDevice | undefined {
    return this.connectedDevices.get(deviceId);
  }

  // Event Handler Methods
  private handleServiceStarted(data: any) {
    console.log('ELD monitoring service started:', data);
    this.isServiceRunning = true;
    this.notifyCallbacks('onServiceStarted', data);
  }

  private handleServiceStopped(data: any) {
    console.log('ELD monitoring service stopped:', data);
    this.isServiceRunning = false;
    this.notifyCallbacks('onServiceStopped', data);
  }

  private handleServiceDestroyed(data: any) {
    console.log('ELD monitoring service destroyed:', data);
    this.isServiceRunning = false;
    this.connectedDevices.clear();
    this.monitoringData.clear();
    this.notifyCallbacks('onServiceDestroyed', data);
  }

  private handleDeviceDiscovered(data: any) {
    console.log('Device discovered:', data);
    const device: ELDDevice = {
      id: data.id,
      name: data.name,
      address: data.address,
      deviceType: data.deviceType,
      deviceCategory: data.deviceCategory,
      signalStrength: data.rssi,
      batteryLevel: data.batteryLevel,
      isConnected: data.isConnected,
      lastSeen: new Date(),
      firmwareVersion: data.firmwareVersion,
      uid: data.uid,
      imei: data.imei
    };
    this.notifyCallbacks('onDeviceDiscovered', device);
  }

  private handleDeviceConnected(data: any) {
    console.log('Device connected:', data);
    const device: ELDDevice = {
      id: data.id,
      name: data.name,
      address: data.address,
      deviceType: data.deviceType,
      deviceCategory: data.deviceCategory,
      signalStrength: data.signalStrength,
      batteryLevel: data.batteryLevel,
      isConnected: true,
      lastSeen: new Date(),
      firmwareVersion: data.firmwareVersion,
      uid: data.uid,
      imei: data.imei
    };
    this.connectedDevices.set(device.id, device);
    this.notifyCallbacks('onDeviceConnected', device);
  }

  private handleDeviceDisconnected(data: any) {
    console.log('Device disconnected:', data);
    this.connectedDevices.delete(data.id);
    this.notifyCallbacks('onDeviceDisconnected', data);
  }

  private handleDataReceived(data: any) {
    console.log('Data received:', data);
    const monitoringData: MonitoringData = {
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      dataType: data.dataType,
      value: data.data
    };
    this.monitoringData.set(`${data.deviceId}_${data.timestamp}`, monitoringData);
    this.notifyCallbacks('onDataReceived', monitoringData);
  }

  private handleProcessedDataReceived(data: any) {
    console.log('Processed data received:', data);
    const monitoringData: MonitoringData = {
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      dataType: data.deviceType,
      value: data.processedData,
      processedData: data.processedData
    };
    this.monitoringData.set(`${data.deviceId}_${data.timestamp}`, monitoringData);
    this.notifyCallbacks('onProcessedDataReceived', monitoringData);
  }

  private handleMonitoringData(data: any) {
    console.log('Monitoring data received:', data);
    this.notifyCallbacks('onMonitoringData', data);
  }

  private handleStatusUpdate(data: any) {
    console.log('Status update received:', data);
    this.notifyCallbacks('onStatusUpdate', data);
  }

  private handleConnectionError(data: any) {
    console.error('Connection error:', data);
    this.notifyCallbacks('onConnectionError', data);
  }

  private handleReconnectionAttempt(data: any) {
    console.log('Reconnection attempt:', data);
    this.notifyCallbacks('onReconnectionAttempt', data);
  }

  private handleReconnectionError(data: any) {
    console.error('Reconnection error:', data);
    this.notifyCallbacks('onReconnectionError', data);
  }

  private handleScanError(data: any) {
    console.error('Scan error:', data);
    this.notifyCallbacks('onScanError', data);
  }

  private handleBluetoothError(data: any) {
    console.error('Bluetooth error:', data);
    this.notifyCallbacks('onBluetoothError', data);
  }

  // Callback Management Methods
  addCallback(event: string, callback: Function) {
    if (!this.serviceCallbacks.has(event)) {
      this.serviceCallbacks.set(event, []);
    }
    this.serviceCallbacks.get(event)!.push(callback);
  }

  removeCallback(event: string, callback: Function) {
    const callbacks = this.serviceCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyCallbacks(event: string, data: any) {
    const callbacks = this.serviceCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  // Utility Methods
  isMonitoring(): boolean {
    return this.isServiceRunning;
  }

  getConnectedDeviceCount(): number {
    return this.connectedDevices.size;
  }

  private async logServiceEvent(event: string, data: any) {
    try {
      await FirebaseLogger.logEvent(`eld_service_${event}`, {
        service: 'ELDServiceManager',
        ...data
      });
    } catch (error) {
      console.error('Failed to log service event:', error);
    }
  }

  // Cleanup
  cleanup() {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners();
    }
    this.serviceCallbacks.clear();
    this.connectedDevices.clear();
    this.monitoringData.clear();
  }
}

export default ELDServiceManager; 