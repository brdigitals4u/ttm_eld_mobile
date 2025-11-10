import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';
import {
  JMBluetoothEvents,
} from '../types/JMBluetooth';

const { JMBluetoothModule } = NativeModules as any;

// Enhanced logging utility
class BluetoothLogger {
  private static instance: BluetoothLogger;
  private logs: Array<{timestamp: string; level: string; message: string; data?: any}> = [];
  private maxLogs = 1000;

  static getInstance(): BluetoothLogger {
    if (!BluetoothLogger.instance) {
      BluetoothLogger.instance = new BluetoothLogger();
    }
    return BluetoothLogger.instance;
  }

  log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    
    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Also log to console for immediate visibility
    const consoleMessage = `[${timestamp}] [${level}] ${message}`;
    if (data) {
      console.log(consoleMessage, data);
    } else {
      console.log(consoleMessage);
    }
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  getLogs(): Array<{timestamp: string; level: string; message: string; data?: any}> {
    return [...this.logs];
  }

  getRecentLogs(count: number = 50): Array<{timestamp: string; level: string; message: string; data?: any}> {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
  }
}

const logger = BluetoothLogger.getInstance();

class JMBluetoothService {
  private eventEmitter: NativeEventEmitter;
  private listeners: EmitterSubscription[] = [];
  private connectionAttempts = 0;
  private lastConnectionTime: number | null = null;
  private lastDisconnectionTime: number | null = null;
  private disconnectionReasons: string[] = [];
  private lastConnectedDeviceAddress: string | null = null;
  private lastKnownDeviceId: string | null = null;
  private lastPermissionRequestTime: number | null = null;
  private lastPermissionResult: { granted: boolean; message?: string } | null = null;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(JMBluetoothModule);
    logger.info('JMBluetoothService initialized');
  }

  // Initialize the SDK
  async initializeSDK(): Promise<boolean> {
    try {
      logger.info('Initializing Bluetooth SDK...');
      const result = await JMBluetoothModule.initializeSDK();
      logger.info('SDK initialization result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to initialize SDK:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Request permissions with improved response handling
  async requestPermissions(): Promise<{ granted: boolean; message?: string }> {
    try {
      const now = Date.now();
      if (this.lastPermissionRequestTime && this.lastPermissionResult) {
        const elapsed = now - this.lastPermissionRequestTime;
        if (elapsed < 30000) {
          logger.info('Returning cached Bluetooth permission result', {
            elapsedMs: elapsed,
            granted: this.lastPermissionResult.granted,
          });
          return this.lastPermissionResult;
        }
      }

      logger.info('Requesting Bluetooth permissions...');
      const result = await JMBluetoothModule.requestPermissions();
      // Handle both old boolean response and new object response
      if (typeof result === 'boolean') {
        logger.info('Permission request result (boolean):', { granted: result });
        this.lastPermissionRequestTime = now;
        this.lastPermissionResult = { granted: result };
        return this.lastPermissionResult;
      }
      logger.info('Permission request result (object):', result);
      const normalizedResult = {
        granted: !!result?.granted,
        message: result?.message,
      };
      this.lastPermissionRequestTime = now;
      this.lastPermissionResult = normalizedResult;
      return this.lastPermissionResult;
    } catch (error: any) {
      logger.error('Failed to request permissions:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Start scanning for devices
  async startScan(): Promise<boolean> {
    try {
      logger.info('Starting device scan...');
      const result = await JMBluetoothModule.startScan();
      logger.info('Scan start result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to start scan:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Stop scanning
  async stopScan(): Promise<boolean> {
    try {
      logger.info('Stopping device scan...');
      const result = await JMBluetoothModule.stopScan();
      logger.info('Scan stop result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to stop scan:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Connect to device
  async connect(deviceAddress: string): Promise<boolean> {
    try {
      this.connectionAttempts++;
      this.lastConnectionTime = Date.now();
      this.lastConnectedDeviceAddress = deviceAddress;
      
      logger.info('Attempting to connect to device:', { 
        deviceAddress, 
        attemptNumber: this.connectionAttempts,
        timestamp: new Date().toISOString()
      });
      
      const result = await JMBluetoothModule.connect(deviceAddress);
      logger.info('Connect result:', { result, deviceAddress });
      return result;
    } catch (error: any) {
      logger.error('Failed to connect:', { 
        error: error?.message, 
        stack: error?.stack,
        deviceAddress,
        attemptNumber: this.connectionAttempts
      });
      throw error;
    }
  }

  // Connect to device with automatic retry using different parameters
  async connectWithRetry(deviceAddress: string): Promise<boolean> {
    try {
      this.connectionAttempts++;
      this.lastConnectionTime = Date.now();
      
      logger.info('Attempting to connect with retry to device:', { 
        deviceAddress, 
        attemptNumber: this.connectionAttempts,
        timestamp: new Date().toISOString()
      });
      
      // For now, just use the regular connect method
      // The retry logic is handled in the native module
      const result = await JMBluetoothModule.connect(deviceAddress);
      logger.info('Connect with retry result:', { result, deviceAddress });
      return result;
    } catch (error: any) {
      logger.error('Failed to connect with retry:', { 
        error: error?.message, 
        stack: error?.stack,
        deviceAddress,
        attemptNumber: this.connectionAttempts
      });
      throw error;
    }
  }

  // Disconnect from device
  async disconnect(): Promise<boolean> {
    try {
      this.lastDisconnectionTime = Date.now();
      const reason = 'Manual disconnect';
      this.disconnectionReasons.push(reason);
      
      logger.info('Manually disconnecting from device:', { 
        reason,
        timestamp: new Date().toISOString(),
        connectionDuration: this.lastConnectionTime ? Date.now() - this.lastConnectionTime : null
      });
      
      const result = await JMBluetoothModule.disconnect();
      logger.info('Manual disconnect result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to disconnect:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Send UTC time to device
  async sendUtcTime(): Promise<boolean> {
    try {
      logger.info('Sending UTC time to ELD');
      const result = await JMBluetoothModule.sendUtcTime();
      logger.info('UTC sync command sent', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to send UTC time', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Check if password is enabled
  async checkPasswordEnable(): Promise<boolean> {
    try {
      logger.info('Checking if password is enabled...');
      const result = await JMBluetoothModule.checkPasswordEnable();
      logger.info('Password enable check result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to check password enable:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Validate password
  async validatePassword(password: string): Promise<boolean> {
    try {
      logger.info('Validating password...');
      const result = await JMBluetoothModule.validatePassword(password);
      logger.info('Password validation result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to validate password:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Enable password
  async enablePassword(password: string): Promise<boolean> {
    try {
      logger.info('Enabling password...');
      const result = await JMBluetoothModule.enablePassword(password);
      logger.info('Password enable result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to enable password:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Disable password
  async disablePassword(password: string): Promise<boolean> {
    try {
      logger.info('Disabling password...');
      const result = await JMBluetoothModule.disablePassword(password);
      logger.info('Password disable result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to disable password:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Start ELD data reporting
  async startReportEldData(): Promise<boolean> {
    try {
      logger.info('Starting ELD data reporting...');
      const result = await JMBluetoothModule.startReportEldData();
      logger.info('ELD data reporting start result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to start ELD data reporting:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Stop ELD data reporting
  async stopReportEldData(): Promise<boolean> {
    try {
      logger.info('Stopping ELD data reporting...');
      const result = await JMBluetoothModule.stopReportEldData();
      logger.info('ELD data reporting stop result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to stop ELD data reporting:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Start OBD data reporting
  async startReportObdData(): Promise<boolean> {
    try {
      logger.info('Starting OBD data reporting...');
      const result = await JMBluetoothModule.startReportObdData();
      logger.info('OBD data reporting start result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to start OBD data reporting:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Stop OBD data reporting
  async stopReportObdData(): Promise<boolean> {
    try {
      logger.info('Stopping OBD data reporting...');
      const result = await JMBluetoothModule.stopReportObdData();
      logger.info('OBD data reporting stop result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to stop OBD data reporting:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Query history data
  async queryHistoryData(type: number, startTime: string, endTime: string): Promise<boolean> {
    try {
      logger.info('Querying history data:', { type, startTime, endTime });
      const result = await JMBluetoothModule.queryHistoryData(type, startTime, endTime);
      logger.info('History data query result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to query history data:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Stop history data reporting
  async stopReportHistoryData(): Promise<boolean> {
    try {
      logger.info('Stopping history data reporting...');
      const result = await JMBluetoothModule.stopReportHistoryData();
      logger.info('History data reporting stop result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to stop history data reporting:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Query terminal info
  async queryTerminalInfo(): Promise<boolean> {
    try {
      logger.info('Querying terminal info...');
      const result = await JMBluetoothModule.queryTerminalInfo();
      logger.info('Terminal info query result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to query terminal info:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Clear fault codes
  async clearFaultCode(): Promise<boolean> {
    try {
      logger.info('Clearing fault codes...');
      const result = await JMBluetoothModule.clearFaultCode();
      logger.info('Clear fault codes result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to clear fault codes:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Query data item configuration
  async queryDataItemConfig(): Promise<boolean> {
    try {
      logger.info('Querying data item configuration...');
      const result = await JMBluetoothModule.queryDataItemConfig();
      logger.info('Data item config query result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to query data item config:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Set data item configuration with all available PIDs
  async setDataItemConfig(config: string): Promise<boolean> {
    try {
      logger.info('Setting data item configuration:', { config });
      const result = await JMBluetoothModule.setDataItemConfig(config);
      logger.info('Data item config set result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to set data item config:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Set data item configuration batch with PIDs array
  async setDataItemConfigBatch(pids: number[]): Promise<boolean> {
    try {
      logger.info('Setting data item configuration batch:', { pidsCount: pids.length });
      const result = await JMBluetoothModule.setDataItemConfigBatch(pids);
      logger.info('Data item config batch set result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to set data item config batch:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Configure 10 specific OBD PIDs for your requirements
  async configureAllPIDs(): Promise<boolean> {
    try {
      logger.info('Configuring 10 specific OBD PIDs...');
      
      // Use the 10 specific PIDs you requested
      const specificPIDs = [
        0x0D, // Vehicle Speed sensor
        0x05, // Engine coolant temperature
        0x0F, // Intake Air Temperature
        0x10, // Air flow rate from mass air flow sensor
        0x11, // Absolute throttle position
        0x0E, // Ignition timing advance
        0x04, // Calculated load value
        0x2F, // Fuel level input
        0x44, // Air fuel commanded equivalent ratio
        0x74, // Turbocharger RPM
      ];

      // Create compact JSON for 10 PIDs
      const compactConfig = {
        r: 1, // reportErrorCode
        c: specificPIDs.length, // itemCount
        l: specificPIDs.map((id: number) => ({ d: id, s: 1 })) // itemList with short keys
      };
      
      const configJson = JSON.stringify(compactConfig);
      logger.info(`Config JSON length: ${configJson.length} characters`);
      
      const result = await this.setDataItemConfig(configJson);
      if (result) {
        logger.info('10 specific PIDs configured successfully');
      } else {
        logger.warn('PID configuration failed');
      }
      
      return result;
    } catch (error: any) {
      logger.error('Failed to configure PIDs:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Send custom command
  async sendCustomCommand(command: string): Promise<boolean> {
    try {
      logger.info('Sending custom command:', { command });
      const result = await JMBluetoothModule.sendCustomCommand(command);
      logger.info('Custom command result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to send custom command:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Acknowledge custom command reply
  async acknowledgeCustomCommand(): Promise<boolean> {
    try {
      logger.info('Acknowledging custom command reply');
      const result = await JMBluetoothModule.acknowledgeCustomCommand();
      logger.info('Custom command acknowledgement result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to acknowledge custom command reply:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Save driver authentication info
  async saveDriverAuthInfo(info: string): Promise<boolean> {
    try {
      logger.info('Saving driver authentication info...');
      const result = await JMBluetoothModule.saveDriverAuthInfo(info);
      logger.info('Save driver auth info result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to save driver auth info:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Read driver authentication info
  async readDriverAuthInfo(): Promise<boolean> {
    try {
      logger.info('Reading driver authentication info...');
      const result = await JMBluetoothModule.readDriverAuthInfo();
      logger.info('Read driver auth info result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to read driver auth info:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Set DPF regeneration mode
  async setDpfRegeneration(mode: number, enable: boolean): Promise<boolean> {
    try {
      logger.info('Configuring DPF regeneration', { mode, enable });
      const result = await JMBluetoothModule.setDpfRegeneration(mode, enable);
      logger.info('DPF regeneration command result', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to set DPF regeneration', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Acknowledge DPF regeneration upload state
  async replyDpfRegenerationUploadState(): Promise<boolean> {
    try {
      logger.info('Acknowledging DPF regeneration upload state');
      const result = await JMBluetoothModule.replyDpfRegenerationUploadState();
      logger.info('DPF upload acknowledgement result', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to acknowledge DPF upload state', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Check the DPF regeneration state
  async checkDpfRegenerationState(): Promise<boolean> {
    try {
      logger.info('Checking DPF regeneration state');
      const result = await JMBluetoothModule.checkDpfRegenerationState();
      logger.info('DPF regeneration state command result', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to check DPF regeneration state', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Start OTA upgrade
  async startOtaUpgrade(): Promise<boolean> {
    try {
      logger.info('Starting OTA upgrade...');
      const result = await JMBluetoothModule.startOtaUpgrade('');
      logger.info('OTA upgrade start result:', { result });
      return result;
    } catch (error: any) {
      logger.error('Failed to start OTA upgrade:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Event listeners with enhanced logging
  addEventListener<K extends keyof JMBluetoothEvents>(
    event: K,
    listener: JMBluetoothEvents[K]
  ): EmitterSubscription {
    logger.info('Adding event listener:', { event });
    
    const wrappedListener = (data: any) => {
      logger.info(`Event received: ${event}`, { data, timestamp: new Date().toISOString() });
      
      if (event === 'onObdEldDataReceived' && data?.dataFlowList) {
        const extractedId = data.dataFlowList
          .map((item: any) => item?.deviceId || item?.device_id)
          .find((value: any) => typeof value === 'string' && value.trim().length > 0)
        if (typeof extractedId === 'string') {
          this.lastKnownDeviceId = extractedId.trim()
        }
      }

      if (event === 'onEldDeviceIdDetected' && data?.deviceId) {
        if (typeof data.deviceId === 'string' && data.deviceId.trim().length > 0) {
          this.lastKnownDeviceId = data.deviceId.trim()
        }
      }

      if (event === 'onAuthenticationPassed' && (data as any)?.deviceId) {
        const authDeviceId = (data as any).deviceId
        if (typeof authDeviceId === 'string' && authDeviceId.trim().length > 0) {
          this.lastKnownDeviceId = authDeviceId.trim()
        }
      }
      
      // Special handling for disconnection events
      if (event === 'onDisconnected') {
        this.lastDisconnectionTime = Date.now();
        const reason = 'Event-based disconnect';
        this.disconnectionReasons.push(reason);
        
        logger.warn('Device disconnected via event:', {
          reason,
          timestamp: new Date().toISOString(),
          connectionDuration: this.lastConnectionTime ? Date.now() - this.lastConnectionTime : null,
          totalConnectionAttempts: this.connectionAttempts
        });
      }
      
      // Special handling for connection failure events
      if (event === 'onConnectFailure') {
        logger.error('Connection failed:', {
          data,
          timestamp: new Date().toISOString(),
          attemptNumber: this.connectionAttempts
        });
      }
      
      // Special handling for successful connection events
      if (event === 'onConnected') {
        logger.info('Device connected successfully:', {
          timestamp: new Date().toISOString(),
          attemptNumber: this.connectionAttempts,
          timeSinceLastDisconnect: this.lastDisconnectionTime ? Date.now() - this.lastDisconnectionTime : null
        });
      }
      
      listener(data);
    };
    
    const subscription = this.eventEmitter.addListener(event, wrappedListener);
    this.listeners.push(subscription);
    return subscription;
  }

  // Remove specific event listener
  removeEventListener(subscription: EmitterSubscription): void {
    logger.info('Removing event listener');
    subscription.remove();
    const index = this.listeners.indexOf(subscription);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Remove all event listeners
  removeAllEventListeners(): void {
    logger.info('Removing all event listeners');
    this.listeners.forEach(subscription => subscription.remove());
    this.listeners = [];
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      connectionAttempts: this.connectionAttempts,
      lastConnectionTime: this.lastConnectionTime,
      lastDisconnectionTime: this.lastDisconnectionTime,
      disconnectionReasons: [...this.disconnectionReasons],
      currentConnectionDuration: this.lastConnectionTime && !this.lastDisconnectionTime ? 
        Date.now() - this.lastConnectionTime : null,
      lastConnectedDeviceAddress: this.lastConnectedDeviceAddress,
      lastKnownDeviceId: this.lastKnownDeviceId,
    };
  }

  // Reconnect to the last known device
  async reconnectToLastDevice(): Promise<boolean> {
    if (!this.lastConnectedDeviceAddress) {
      throw new Error('No previous device address available for reconnection');
    }
    
    logger.info('Attempting to reconnect to last known device:', { 
      deviceAddress: this.lastConnectedDeviceAddress 
    });
    
    // Add a delay to allow device to prepare for connection
    logger.info('Waiting 2 seconds before attempting connection...');
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    
    return await this.connect(this.lastConnectedDeviceAddress);
  }

  // Get native connection status
  async getConnectionStatus(): Promise<any> {
    try {
      logger.info('Getting native connection status...');
      const result = await JMBluetoothModule.getConnectionStatus();
      logger.info('Native connection status:', result);
      return result;
    } catch (error: any) {
      logger.error('Failed to get connection status:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Test different connection parameters
  async testConnection(deviceAddress: string): Promise<any> {
    try {
      logger.info('Testing connection parameters for device:', { deviceAddress });
      const result = await JMBluetoothModule.testConnection(deviceAddress);
      logger.info('Connection test result:', result);
      return result;
    } catch (error: any) {
      logger.error('Failed to test connection:', { error: error?.message, stack: error?.stack });
      throw error;
    }
  }

  // Get recent logs
  getRecentLogs(count: number = 50) {
    return logger.getRecentLogs(count);
  }

  // Get all logs
  getAllLogs() {
    return logger.getLogs();
  }

  // Clear logs
  clearLogs() {
    logger.clearLogs();
  }

  // Helper method to format time for history queries
  formatTimeForHistory(date: Date): string {
    const year = date.getFullYear().toString().slice(-2); // Last 2 digits
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // Helper method to get current time formatted for history
  getCurrentTimeFormatted(): string {
    return this.formatTimeForHistory(new Date());
  }

  // Helper method to get time range for history (last 24 hours)
  getLast24HoursRange(): { startTime: string; endTime: string } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      startTime: this.formatTimeForHistory(yesterday),
      endTime: this.formatTimeForHistory(now)
    };
  }

  async getCurrentDeviceId(): Promise<string | null> {
    try {
      const response = await JMBluetoothModule.getCurrentDeviceId();
      const deviceId =
        typeof response === 'string'
          ? response
          : response?.deviceId ??
            response?.device_id ??
            response?.address ??
            response?.macAddress;

      if (typeof deviceId === 'string' && deviceId.trim().length > 0) {
        const normalized = deviceId.trim();
        this.lastKnownDeviceId = normalized;
        return normalized;
      }
    } catch (error: any) {
      logger.warn('Failed to get current device ID', { error: error?.message });
    }

    return this.lastKnownDeviceId || this.lastConnectedDeviceAddress;
  }
}

export default new JMBluetoothService();
