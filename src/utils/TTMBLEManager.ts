import { NativeModules, NativeEventEmitter } from 'react-native';
import { SentryLogger } from '../services/SentryService';
import { FirebaseLogger } from '../services/FirebaseService';

interface TTMBLEManagerInterface {
  // Constants
  ON_DEVICE_SCANNED: string;
  ON_SCAN_STOP: string;
  ON_SCAN_FINISH: string;
  ON_CONNECTED: string;
  ON_DISCONNECTED: string;
  ON_CONNECT_FAILURE: string;
  ON_AUTHENTICATION_PASSED: string;
  ON_NOTIFY_RECEIVED: string;
  ON_PASSWORD_STATE_CHECKED: string;
  ON_PASSWORD_VERIFY_RESULT: string;
  ON_PASSWORD_SET_RESULT: string;
  ON_HISTORY_PROGRESS: string;
  ON_HISTORY_DATA: string;
  ON_TERMINAL_INFO: string;
  ON_DATA_ITEM_CONFIG: string;
  ON_CUSTOM_COMMAND_REPLY: string;
  ON_DRIVER_AUTH_INFO: string;

  // Methods
  initSDK(): Promise<void>;
  startScan(duration: number): Promise<void>;
  stopScan(): Promise<void>;
  startDirectScan(duration: number): Promise<void>;
  stopDirectScan(): Promise<void>;
  connect(deviceId: string, passcode: string, needPair: boolean): Promise<void>;
  disconnect(): Promise<void>;
  checkPasswordEnable(): Promise<void>;
  validatePassword(password: string): Promise<void>;
  enablePassword(password: string): Promise<void>;
  disablePassword(password: string): Promise<void>;
  startReportEldData(): Promise<void>;
  replyReceivedEldData(): Promise<void>;
  sendUTCTime(): Promise<void>;
  injectTestDevices(): Promise<void>;
  getBondedDevices(): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// Device data interfaces
export interface BLEDevice {
  name: string;
  address: string;
  signal: number;
  id: string;
}

export interface ConnectionFailure {
  status: number;
  message: string;
}

export interface NotifyData {
  dataType: string;
  rawData: string;
  ack?: number;
  error?: string;
}

// Get the native module
const { TTMBLEManager } = NativeModules;

// Debug: Log native module availability in development
if (__DEV__) {
  console.log('TTMBLEManager native module loaded:', !!TTMBLEManager);
}

if (!TTMBLEManager) {
  console.error('TTMBLEManager native module is not available');
  console.error('Available modules:', Object.keys(NativeModules));
  throw new Error('TTMBLEManager native module is not available, js engine: hermes');
}

// In React Native's new architecture, methods are not enumerable but they work!
console.log('TTMBLEManager is ready for use!');

// Create event emitter
const eventEmitter = new NativeEventEmitter(TTMBLEManager);

// Typed wrapper class
class TTMBLEManagerWrapper {
  private nativeModule: TTMBLEManagerInterface;
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.nativeModule = TTMBLEManager as TTMBLEManagerInterface;
    this.eventEmitter = eventEmitter;
  }

  // Constants
  get constants() {
    return {
      ON_DEVICE_SCANNED: this.nativeModule.ON_DEVICE_SCANNED,
      ON_SCAN_STOP: this.nativeModule.ON_SCAN_STOP,
      ON_SCAN_FINISH: this.nativeModule.ON_SCAN_FINISH,
      ON_CONNECTED: this.nativeModule.ON_CONNECTED,
      ON_DISCONNECTED: this.nativeModule.ON_DISCONNECTED,
      ON_CONNECT_FAILURE: this.nativeModule.ON_CONNECT_FAILURE,
      ON_AUTHENTICATION_PASSED: this.nativeModule.ON_AUTHENTICATION_PASSED,
      ON_NOTIFY_RECEIVED: this.nativeModule.ON_NOTIFY_RECEIVED,
      ON_PASSWORD_STATE_CHECKED: this.nativeModule.ON_PASSWORD_STATE_CHECKED,
      ON_PASSWORD_VERIFY_RESULT: this.nativeModule.ON_PASSWORD_VERIFY_RESULT,
      ON_PASSWORD_SET_RESULT: this.nativeModule.ON_PASSWORD_SET_RESULT,
      ON_HISTORY_PROGRESS: this.nativeModule.ON_HISTORY_PROGRESS,
      ON_HISTORY_DATA: this.nativeModule.ON_HISTORY_DATA,
      ON_TERMINAL_INFO: this.nativeModule.ON_TERMINAL_INFO,
      ON_DATA_ITEM_CONFIG: this.nativeModule.ON_DATA_ITEM_CONFIG,
      ON_CUSTOM_COMMAND_REPLY: this.nativeModule.ON_CUSTOM_COMMAND_REPLY,
      ON_DRIVER_AUTH_INFO: this.nativeModule.ON_DRIVER_AUTH_INFO,
    };
  }

  // SDK Initialization
  async initSDK(): Promise<void> {
    try {
      const result = await this.nativeModule.initSDK();
      SentryLogger.logELDEvent('sdk_initialized');
      FirebaseLogger.logELDEvent('sdk_initialized');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'initSDK' });
      FirebaseLogger.recordError(error as Error, { method: 'initSDK' });
      throw error;
    }
  }

  // Scanning methods
  async startScan(duration: number = 10000): Promise<void> {
    try {
      const result = await this.nativeModule.startScan(duration);
      SentryLogger.logBluetoothEvent('scan_started', { duration });
      FirebaseLogger.logBluetoothEvent('scan_started', { duration });
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'startScan', duration });
      FirebaseLogger.recordError(error as Error, { method: 'startScan', duration });
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    try {
      const result = await this.nativeModule.stopScan();
      SentryLogger.logBluetoothEvent('scan_stopped');
      FirebaseLogger.logBluetoothEvent('scan_stopped');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'stopScan' });
      FirebaseLogger.recordError(error as Error, { method: 'stopScan' });
      throw error;
    }
  }

  // Direct Android BLE scanning (fallback method)
  async startDirectScan(duration: number = 10): Promise<void> {
    try {
      const result = await this.nativeModule.startDirectScan(duration);
      SentryLogger.logBluetoothEvent('direct_scan_started', { duration });
      FirebaseLogger.logBluetoothEvent('direct_scan_started', { duration });
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'startDirectScan', duration });
      FirebaseLogger.recordError(error as Error, { method: 'startDirectScan', duration });
      throw error;
    }
  }

  async stopDirectScan(): Promise<void> {
    try {
      const result = await this.nativeModule.stopDirectScan();
      SentryLogger.logBluetoothEvent('direct_scan_stopped');
      FirebaseLogger.logBluetoothEvent('direct_scan_stopped');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'stopDirectScan' });
      FirebaseLogger.recordError(error as Error, { method: 'stopDirectScan' });
      throw error;
    }
  }

  // Connection methods
  async connect(deviceId: string, passcode: string): Promise<void> {
    try {
      // For TTM BLE SDK: 
      // - If passcode is empty, use needPair = false (no authentication required)
      // - If passcode is provided, use needPair = true (authentication required)
      const needPair = passcode.length > 0;
      console.log(`[TTMBLEManager] Connecting to ${deviceId} with passcode: ${passcode ? '[REDACTED]' : 'NONE'}, needPair: ${needPair}`);
      
      // For devices without passcode, use the overloaded connect method that doesn't require pairing
      let result;
      if (passcode.length === 0) {
        // Use the single-parameter connect method for devices that don't require authentication
        console.log(`[TTMBLEManager] Using simple connect method for device without passcode`);
        result = await this.nativeModule.connect(deviceId, "", false);
      } else {
        // Use the full connect method for devices that require authentication
        console.log(`[TTMBLEManager] Using authenticated connect method for device with passcode`);
        result = await this.nativeModule.connect(deviceId, passcode, true);
      }
      
      SentryLogger.logELDEvent('connection_initiated', { deviceId, hasPasscode: passcode.length > 0, needPair });
      FirebaseLogger.logELDEvent('connection_initiated', { deviceId, hasPasscode: passcode.length > 0, needPair });

      return result;
    } catch (error) {
      
      SentryLogger.captureException(error, { method: 'connect', deviceId, hasPasscode: passcode.length > 0 });
      FirebaseLogger.recordError(error as Error, { method: 'connect', deviceId, hasPasscode: passcode.length > 0 });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      const result = await this.nativeModule.disconnect();
      SentryLogger.logELDEvent('disconnection_initiated');
      FirebaseLogger.logELDEvent('disconnection_initiated');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'disconnect' });
      FirebaseLogger.recordError(error as Error, { method: 'disconnect' });
      throw error;
    }
  }

  // Password methods
  async checkPasswordEnable(): Promise<void> {
    try {
      const result = await this.nativeModule.checkPasswordEnable();
      SentryLogger.logELDEvent('password_check_initiated');
      FirebaseLogger.logELDEvent('password_check_initiated');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'checkPasswordEnable' });
      FirebaseLogger.recordError(error as Error, { method: 'checkPasswordEnable' });
      throw error;
    }
  }

  async validatePassword(password: string): Promise<void> {
    try {
      const result = await this.nativeModule.validatePassword(password);
      SentryLogger.logELDEvent('password_validation_attempted');
      FirebaseLogger.logELDEvent('password_validation_attempted');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'validatePassword' });
      FirebaseLogger.recordError(error as Error, { method: 'validatePassword' });
      throw error;
    }
  }

  async enablePassword(password: string): Promise<void> {
    try {
      const result = await this.nativeModule.enablePassword(password);
      SentryLogger.logELDEvent('password_enabled');
      FirebaseLogger.logELDEvent('password_enabled');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'enablePassword' });
      FirebaseLogger.recordError(error as Error, { method: 'enablePassword' });
      throw error;
    }
  }

  async disablePassword(password: string): Promise<void> {
    try {
      const result = await this.nativeModule.disablePassword(password);
      SentryLogger.logELDEvent('password_disabled');
      FirebaseLogger.logELDEvent('password_disabled');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'disablePassword' });
      FirebaseLogger.recordError(error as Error, { method: 'disablePassword' });
      throw error;
    }
  }

  // ELD Data methods
  async startReportEldData(): Promise<void> {
    try {
      const result = await this.nativeModule.startReportEldData();
      SentryLogger.logELDEvent('eld_data_reporting_started');
      FirebaseLogger.logELDEvent('eld_data_reporting_started');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'startReportEldData' });
      FirebaseLogger.recordError(error as Error, { method: 'startReportEldData' });
      throw error;
    }
  }

  async replyReceivedEldData(): Promise<void> {
    try {
      const result = await this.nativeModule.replyReceivedEldData();
      SentryLogger.logELDEvent('eld_data_reply_sent');
      FirebaseLogger.logELDEvent('eld_data_reply_sent');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'replyReceivedEldData' });
      FirebaseLogger.recordError(error as Error, { method: 'replyReceivedEldData' });
      throw error;
    }
  }

  async sendUTCTime(): Promise<void> {
    try {
      const result = await this.nativeModule.sendUTCTime();
      SentryLogger.logELDEvent('utc_time_sent');
      FirebaseLogger.logELDEvent('utc_time_sent');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'sendUTCTime' });
      FirebaseLogger.recordError(error as Error, { method: 'sendUTCTime' });
      throw error;
    }
  }

  async injectTestDevices(): Promise<void> {
    try {
      const result = await this.nativeModule.injectTestDevices();
      SentryLogger.logELDEvent('test_devices_injected');
      FirebaseLogger.logELDEvent('test_devices_injected');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'injectTestDevices' });
      FirebaseLogger.recordError(error as Error, { method: 'injectTestDevices' });
      throw error;
    }
  }

  async getBondedDevices(): Promise<void> {
    try {
      const result = await this.nativeModule.getBondedDevices();
      SentryLogger.logBluetoothEvent('bonded_devices_retrieved');
      FirebaseLogger.logBluetoothEvent('bonded_devices_retrieved');
      return result;
    } catch (error) {
      SentryLogger.captureException(error, { method: 'getBondedDevices' });
      FirebaseLogger.recordError(error as Error, { method: 'getBondedDevices' });
      throw error;
    }
  }

  // Event listener methods
  addListener(eventName: string, callback: (data: any) => void) {
    FirebaseLogger.logELDEvent('event_listener_added', { eventName });
    return this.eventEmitter.addListener(eventName, callback);
  }

  removeAllListeners(eventName: string) {
    FirebaseLogger.logELDEvent('event_listeners_removed', { eventName });
    this.eventEmitter.removeAllListeners(eventName);
  }

  // Typed event listeners
  onDeviceScanned(callback: (device: BLEDevice) => void) {
    FirebaseLogger.logBluetoothEvent('device_scanned_listener_added');
    return this.addListener(this.constants.ON_DEVICE_SCANNED, callback);
  }

  onScanStop(callback: () => void) {
    FirebaseLogger.logBluetoothEvent('scan_stop_listener_added');
    return this.addListener(this.constants.ON_SCAN_STOP, callback);
  }

  onScanFinish(callback: () => void) {
    FirebaseLogger.logBluetoothEvent('scan_finish_listener_added');
    return this.addListener(this.constants.ON_SCAN_FINISH, callback);
  }

  onConnected(callback: () => void) {
    FirebaseLogger.logELDEvent('connected_listener_added');
    return this.addListener(this.constants.ON_CONNECTED, callback);
  }

  onDisconnected(callback: () => void) {
    FirebaseLogger.logELDEvent('disconnected_listener_added');
    return this.addListener(this.constants.ON_DISCONNECTED, callback);
  }

  onConnectFailure(callback: (failure: ConnectionFailure) => void) {
    FirebaseLogger.logELDEvent('connect_failure_listener_added');
    return this.addListener(this.constants.ON_CONNECT_FAILURE, callback);
  }

  onAuthenticationPassed(callback: () => void) {
    FirebaseLogger.logELDEvent('authentication_passed_listener_added');
    return this.addListener(this.constants.ON_AUTHENTICATION_PASSED, callback);
  }

  onNotifyReceived(callback: (data: NotifyData) => void) {
    FirebaseLogger.logELDEvent('notify_received_listener_added');
    return this.addListener(this.constants.ON_NOTIFY_RECEIVED, callback);
  }

  // Convenience methods that match the usage in the React component
  addScanListener(callback: (device: BLEDevice) => void) {
    FirebaseLogger.logBluetoothEvent('scan_listener_added_convenience');
    return this.onDeviceScanned(callback);
  }

  removeScanListener(callback: (device: BLEDevice) => void) {
    // Note: React Native EventEmitter doesn't have a direct way to remove specific callbacks
    // You would need to store the subscription and call remove() on it
    FirebaseLogger.logBluetoothEvent('scan_listener_remove_warning');
    console.warn('removeScanListener: Store the subscription returned by addScanListener and call remove() on it');
  }

  addConnectFailureListener(callback: (failure: ConnectionFailure) => void) {
    FirebaseLogger.logELDEvent('connect_failure_listener_added_convenience');
    return this.onConnectFailure(callback);
  }

  removeConnectFailureListener(callback: (failure: ConnectionFailure) => void) {
    FirebaseLogger.logELDEvent('connect_failure_listener_remove_warning');
    console.warn('removeConnectFailureListener: Store the subscription returned by addConnectFailureListener and call remove() on it');
  }

  addDisconnectListener(callback: () => void) {
    FirebaseLogger.logELDEvent('disconnect_listener_added_convenience');
    return this.onDisconnected(callback);
  }

  removeDisconnectListener(callback: () => void) {
    FirebaseLogger.logELDEvent('disconnect_listener_remove_warning');
    console.warn('removeDisconnectListener: Store the subscription returned by addDisconnectListener and call remove() on it');
  }
}

// Export singleton instance
export default new TTMBLEManagerWrapper();
