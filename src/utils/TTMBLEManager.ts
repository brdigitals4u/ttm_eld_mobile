import { NativeModules, NativeEventEmitter } from 'react-native';
import { SentryLogger } from '../services/SentryService';
import { FirebaseLogger } from '../services/FirebaseService';

// Interface for the native module
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

// Types for BLE operations
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

export interface TTMEventSubscription {
  remove(): void;
}

// Create a proper mock module that doesn't interfere with the bridge
const createMockTTMBLEManager = (): TTMBLEManagerInterface => {
  const mockModule = {
    ON_DEVICE_SCANNED: 'onDeviceScanned',
    ON_SCAN_STOP: 'onScanStop',
    ON_SCAN_FINISH: 'onScanFinish',
    ON_CONNECTED: 'onConnected',
    ON_DISCONNECTED: 'onDisconnected',
    ON_CONNECT_FAILURE: 'onConnectFailure',
    ON_AUTHENTICATION_PASSED: 'onAuthenticationPassed',
    ON_NOTIFY_RECEIVED: 'onNotifyReceived',
    ON_PASSWORD_STATE_CHECKED: 'onPasswordStateChecked',
    ON_PASSWORD_VERIFY_RESULT: 'onPasswordVerifyResult',
    ON_PASSWORD_SET_RESULT: 'onPasswordSetResult',
    ON_HISTORY_PROGRESS: 'onHistoryProgress',
    ON_HISTORY_DATA: 'onHistoryData',
    ON_TERMINAL_INFO: 'onTerminalInfo',
    ON_DATA_ITEM_CONFIG: 'onDataItemConfig',
    ON_CUSTOM_COMMAND_REPLY: 'onCustomCommandReply',
    ON_DRIVER_AUTH_INFO: 'onDriverAuthInfo',
    
    // Mock methods that return resolved promises
    initSDK: () => Promise.resolve(),
    startScan: () => Promise.resolve(),
    stopScan: () => Promise.resolve(),
    startDirectScan: () => Promise.resolve(),
    stopDirectScan: () => Promise.resolve(),
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    checkPasswordEnable: () => Promise.resolve(),
    validatePassword: () => Promise.resolve(),
    enablePassword: () => Promise.resolve(),
    disablePassword: () => Promise.resolve(),
    startReportEldData: () => Promise.resolve(),
    replyReceivedEldData: () => Promise.resolve(),
    sendUTCTime: () => Promise.resolve(),
    injectTestDevices: () => Promise.resolve(),
    getBondedDevices: () => Promise.resolve(),
    addListener: () => {},
    removeListeners: () => {},
  };
  
  return mockModule;
};

// Get the native module or create mock
let nativeTTMBLEManager: TTMBLEManagerInterface;

try {
  const nativeModule = NativeModules.TTMBLEManager;
  if (nativeModule) {
    nativeTTMBLEManager = nativeModule as TTMBLEManagerInterface;
    console.log('TTMBLEManager native module loaded: true');
  } else {
    throw new Error('Native module not available');
  }
} catch (error) {
  console.log('TTMBLEManager native module loaded: false');
  console.error('TTMBLEManager native module is not available');
  console.error('Available modules:', Object.keys(NativeModules));
  
  // Use mock module in development
  if (__DEV__) {
    console.log('Using mock TTMBLEManager for development');
    nativeTTMBLEManager = createMockTTMBLEManager();
  } else {
    throw new Error('TTMBLEManager is required in production');
  }
}

// Create event emitter only if native module exists
let eventEmitter: NativeEventEmitter;
try {
  eventEmitter = new NativeEventEmitter(nativeTTMBLEManager);
} catch (error) {
  // Create a mock event emitter for development
  eventEmitter = {
    addListener: () => ({ remove: () => {} }),
    removeAllListeners: () => {},
  } as any;
}

// Typed wrapper class
class TTMBLEManagerWrapper {
  private nativeModule: TTMBLEManagerInterface;
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.nativeModule = nativeTTMBLEManager;
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
      return result;
    } catch (error) {
      console.error('TTMBLEManager initSDK error:', error);
      throw error;
    }
  }

  // Scanning methods
  async startScan(duration: number = 10000): Promise<void> {
    try {
      const result = await this.nativeModule.startScan(duration);
      return result;
    } catch (error) {
      console.error('TTMBLEManager startScan error:', error);
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    try {
      const result = await this.nativeModule.stopScan();
      return result;
    } catch (error) {
      console.error('TTMBLEManager stopScan error:', error);
      throw error;
    }
  }

  // Direct Android BLE scanning (fallback method)
  async startDirectScan(duration: number = 10): Promise<void> {
    try {
      const result = await this.nativeModule.startDirectScan(duration);
      return result;
    } catch (error) {
      console.error('TTMBLEManager startDirectScan error:', error);
      throw error;
    }
  }

  async stopDirectScan(): Promise<void> {
    try {
      const result = await this.nativeModule.stopDirectScan();
      return result;
    } catch (error) {
      console.error('TTMBLEManager stopDirectScan error:', error);
      throw error;
    }
  }

  // Connection methods
  async connect(deviceId: string, passcode: string): Promise<void> {
    try {
      const result = await this.nativeModule.connect(deviceId, passcode, false);
      return result;
    } catch (error) {
      console.error('TTMBLEManager connect error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      const result = await this.nativeModule.disconnect();
      return result;
    } catch (error) {
      console.error('TTMBLEManager disconnect error:', error);
      throw error;
    }
  }

  // Password methods
  async checkPasswordEnable(): Promise<void> {
    try {
      const result = await this.nativeModule.checkPasswordEnable();
      return result;
    } catch (error) {
      console.error('TTMBLEManager checkPasswordEnable error:', error);
      throw error;
    }
  }

  async validatePassword(password: string): Promise<void> {
    try {
      const result = await this.nativeModule.validatePassword(password);
      return result;
    } catch (error) {
      console.error('TTMBLEManager validatePassword error:', error);
      throw error;
    }
  }

  async enablePassword(password: string): Promise<void> {
    try {
      const result = await this.nativeModule.enablePassword(password);
      return result;
    } catch (error) {
      console.error('TTMBLEManager enablePassword error:', error);
      throw error;
    }
  }

  async disablePassword(password: string): Promise<void> {
    try {
      const result = await this.nativeModule.disablePassword(password);
      return result;
    } catch (error) {
      console.error('TTMBLEManager disablePassword error:', error);
      throw error;
    }
  }

  // ELD data methods
  async startReportEldData(): Promise<void> {
    try {
      const result = await this.nativeModule.startReportEldData();
      return result;
    } catch (error) {
      console.error('TTMBLEManager startReportEldData error:', error);
      throw error;
    }
  }

  async replyReceivedEldData(): Promise<void> {
    try {
      const result = await this.nativeModule.replyReceivedEldData();
      return result;
    } catch (error) {
      console.error('TTMBLEManager replyReceivedEldData error:', error);
      throw error;
    }
  }

  async sendUTCTime(): Promise<void> {
    try {
      const result = await this.nativeModule.sendUTCTime();
      return result;
    } catch (error) {
      console.error('TTMBLEManager sendUTCTime error:', error);
      throw error;
    }
  }

  // Test and utility methods
  async injectTestDevices(): Promise<void> {
    try {
      const result = await this.nativeModule.injectTestDevices();
      return result;
    } catch (error) {
      console.error('TTMBLEManager injectTestDevices error:', error);
      throw error;
    }
  }

  async getBondedDevices(): Promise<void> {
    try {
      const result = await this.nativeModule.getBondedDevices();
      return result;
    } catch (error) {
      console.error('TTMBLEManager getBondedDevices error:', error);
      throw error;
    }
  }

  // Event listener methods
  addListener(eventName: string, callback: (data: any) => void): TTMEventSubscription {
    try {
      const subscription = this.eventEmitter.addListener(eventName, callback);
      return {
        remove: () => subscription.remove()
      };
    } catch (error) {
      console.error('TTMBLEManager addListener error:', error);
      return { remove: () => {} };
    }
  }

  removeAllListeners(eventName: string) {
    try {
      this.eventEmitter.removeAllListeners(eventName);
    } catch (error) {
      console.error('TTMBLEManager removeAllListeners error:', error);
    }
  }

  // Convenience methods for specific events
  onDeviceScanned(callback: (device: BLEDevice) => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_DEVICE_SCANNED, callback);
  }

  onScanStop(callback: () => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_SCAN_STOP, callback);
  }

  onScanFinish(callback: () => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_SCAN_FINISH, callback);
  }

  onConnected(callback: () => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_CONNECTED, callback);
  }

  onDisconnected(callback: () => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_DISCONNECTED, callback);
  }

  onConnectFailure(callback: (failure: ConnectionFailure) => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_CONNECT_FAILURE, callback);
  }

  onAuthenticationPassed(callback: () => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_AUTHENTICATION_PASSED, callback);
  }

  onNotifyReceived(callback: (data: NotifyData) => void): TTMEventSubscription {
    return this.addListener(this.constants.ON_NOTIFY_RECEIVED, callback);
  }

  // Legacy methods for backward compatibility
  addScanListener(callback: (device: BLEDevice) => void): TTMEventSubscription {
    return this.onDeviceScanned(callback);
  }

  removeScanListener(callback: (device: BLEDevice) => void) {
    // This is a no-op in the new implementation
    // Event listeners are managed by the subscription object
  }

  addConnectFailureListener(callback: (failure: ConnectionFailure) => void): TTMEventSubscription {
    return this.onConnectFailure(callback);
  }

  removeConnectFailureListener(callback: (failure: ConnectionFailure) => void) {
    // This is a no-op in the new implementation
    // Event listeners are managed by the subscription object
  }

  addDisconnectListener(callback: () => void): TTMEventSubscription {
    return this.onDisconnected(callback);
  }

  removeDisconnectListener(callback: () => void) {
    // This is a no-op in the new implementation
    // Event listeners are managed by the subscription object
  }
}

// Export the singleton instance
export const TTMBLEManager = new TTMBLEManagerWrapper();
