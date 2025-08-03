// Web-specific implementation of TTMBLEManager
// This file is used when building for web to avoid native module errors

import { SentryLogger } from '../services/SentryService';
import { FirebaseLogger } from '../services/FirebaseService';
import { ELDDeviceService } from '../services/ELDDeviceService';

// Interface for the native module (same as main file)
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
  configureSDK(options: { filterDevices?: boolean; debugMode?: boolean }): Promise<void>;
  startScan(duration: number): Promise<void>;
  stopScan(): Promise<void>;
  startDirectScan(duration: number): Promise<void>;
  stopDirectScan(): Promise<void>;
  connect(deviceId: string, passcode: string, needPair?: boolean): Promise<void>;
  disconnect(): Promise<void>;
  checkPasswordEnable(): Promise<void>;
  validatePassword(password: string): Promise<void>;
  enablePassword(password: string): Promise<void>;
  disablePassword(password: string): Promise<void>;
  startReportEldData(): Promise<void>;
  stopReportEldData(): Promise<void>;
  replyReceivedEldData(): Promise<void>;
  sendUTCTime(): Promise<void>;
  // injectTestDevices method removed - app now only uses real device data
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

// Web-friendly mock event emitter
class WebEventEmitter {
  private listeners: { [key: string]: Array<(data: any) => void> } = {};

  addListener(eventName: string, callback: (data: any) => void): TTMEventSubscription {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);

    return {
      remove: () => {
        const index = this.listeners[eventName]?.indexOf(callback);
        if (index !== undefined && index > -1) {
          this.listeners[eventName].splice(index, 1);
        }
      }
    };
  }

  emit(eventName: string, data: any) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('Error in event listener:', error);
        }
      });
    }
  }

  removeAllListeners(eventName: string) {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  }
}

// Create a web-compatible mock module
const createWebTTMBLEManager = (): TTMBLEManagerInterface => {
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
    initSDK: () => {
      console.log('🌐 Web TTMBLEManager: initSDK (mock)');
      return Promise.resolve();
    },
    configureSDK: (options: any) => {
      console.log('🌐 Web TTMBLEManager: configureSDK (mock)', options);
      return Promise.resolve();
    },
    startScan: () => {
      console.log('🌐 Web TTMBLEManager: startScan (mock)');
      return Promise.resolve();
    },
    stopScan: () => {
      console.log('🌐 Web TTMBLEManager: stopScan (mock)');
      return Promise.resolve();
    },
    startDirectScan: () => {
      console.log('🌐 Web TTMBLEManager: startDirectScan (mock)');
      return Promise.resolve();
    },
    stopDirectScan: () => {
      console.log('🌐 Web TTMBLEManager: stopDirectScan (mock)');
      return Promise.resolve();
    },
    connect: () => {
      console.log('🌐 Web TTMBLEManager: connect (mock)');
      return Promise.resolve();
    },
    disconnect: () => {
      console.log('🌐 Web TTMBLEManager: disconnect (mock)');
      return Promise.resolve();
    },
    checkPasswordEnable: () => {
      console.log('🌐 Web TTMBLEManager: checkPasswordEnable (mock)');
      return Promise.resolve();
    },
    validatePassword: () => {
      console.log('🌐 Web TTMBLEManager: validatePassword (mock)');
      return Promise.resolve();
    },
    enablePassword: () => {
      console.log('🌐 Web TTMBLEManager: enablePassword (mock)');
      return Promise.resolve();
    },
    disablePassword: () => {
      console.log('🌐 Web TTMBLEManager: disablePassword (mock)');
      return Promise.resolve();
    },
    startReportEldData: () => {
      console.log('🌐 Web TTMBLEManager: startReportEldData (mock)');
      return Promise.resolve();
    },
    stopReportEldData: () => {
      console.log('🌐 Web TTMBLEManager: stopReportEldData (mock)');
      return Promise.resolve();
    },
    replyReceivedEldData: () => {
      console.log('🌐 Web TTMBLEManager: replyReceivedEldData (mock)');
      return Promise.resolve();
    },
    sendUTCTime: () => {
      console.log('🌐 Web TTMBLEManager: sendUTCTime (mock)');
      return Promise.resolve();
    },
    // injectTestDevices removed - app now only uses real device data
    getBondedDevices: () => {
      console.log('🌐 Web TTMBLEManager: getBondedDevices (mock)');
      return Promise.resolve();
    },
    addListener: () => {},
    removeListeners: () => {}
  };
  
  return mockModule as TTMBLEManagerInterface;
};

// Typed wrapper class for web
class WebTTMBLEManagerWrapper {
  private nativeModule: TTMBLEManagerInterface;
  private eventEmitter: WebEventEmitter;

  constructor() {
    console.log('🌐 Initializing Web TTMBLEManager');
    this.nativeModule = createWebTTMBLEManager();
    this.eventEmitter = new WebEventEmitter();
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

  // All methods delegate to the mock native module
  async initSDK(): Promise<void> {
    return this.nativeModule.initSDK();
  }

  async configureSDK(options: { filterDevices?: boolean; debugMode?: boolean } = {}): Promise<void> {
    return this.nativeModule.configureSDK(options);
  }

  async startScan(duration: number = 10000): Promise<void> {
    const result = await this.nativeModule.startScan(duration);
    
    // Simulate some mock devices being found on web
    setTimeout(() => {
      const mockDevices: BLEDevice[] = [
        {
          id: 'web-mock-001',
          address: 'WEB:MOCK:001',
          name: 'Mock ELD Device (Web)',
          signal: -45,
        },
        {
          id: 'web-mock-002', 
          address: 'WEB:MOCK:002',
          name: 'Mock Camera Device (Web)',
          signal: -55,
        }
      ];

      mockDevices.forEach((device, index) => {
        setTimeout(() => {
          this.eventEmitter.emit(this.constants.ON_DEVICE_SCANNED, device);
        }, (index + 1) * 1000);
      });
    }, 500);

    return result;
  }

  async stopScan(): Promise<void> {
    return this.nativeModule.stopScan();
  }

  async startDirectScan(duration: number = 10): Promise<void> {
    return this.nativeModule.startDirectScan(duration);
  }

  async stopDirectScan(): Promise<void> {
    return this.nativeModule.stopDirectScan();
  }

  async connect(deviceId: string, passcode: string = '', needPair: boolean = false): Promise<void> {
    const result = await this.nativeModule.connect(deviceId, passcode, needPair);
    
    // Simulate successful connection
    setTimeout(() => {
      this.eventEmitter.emit(this.constants.ON_CONNECTED, {
        deviceId: deviceId,
        deviceName: 'Mock Connected Device',
      });
    }, 1000);

    return result;
  }

  async disconnect(): Promise<void> {
    return this.nativeModule.disconnect();
  }

  async checkPasswordEnable(): Promise<void> {
    return this.nativeModule.checkPasswordEnable();
  }

  async validatePassword(password: string): Promise<void> {
    return this.nativeModule.validatePassword(password);
  }

  async enablePassword(password: string): Promise<void> {
    return this.nativeModule.enablePassword(password);
  }

  async disablePassword(password: string): Promise<void> {
    return this.nativeModule.disablePassword(password);
  }

  async startReportEldData(): Promise<void> {
    return this.nativeModule.startReportEldData();
  }

  async stopReportEldData(): Promise<void> {
    return this.nativeModule.stopReportEldData();
  }

  async replyReceivedEldData(): Promise<void> {
    return this.nativeModule.replyReceivedEldData();
  }

  async sendUTCTime(): Promise<void> {
    return this.nativeModule.sendUTCTime();
  }

  // injectTestDevices method removed - app now only uses real device data

  async getBondedDevices(): Promise<void> {
    return this.nativeModule.getBondedDevices();
  }

  // Event listener methods
  addListener(eventName: string, callback: (data: any) => void): TTMEventSubscription {
    return this.eventEmitter.addListener(eventName, callback);
  }

  removeAllListeners(eventName: string) {
    this.eventEmitter.removeAllListeners(eventName);
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
    // No-op for web
  }

  addConnectFailureListener(callback: (failure: ConnectionFailure) => void): TTMEventSubscription {
    return this.onConnectFailure(callback);
  }

  removeConnectFailureListener(callback: (failure: ConnectionFailure) => void) {
    // No-op for web
  }

  addDisconnectListener(callback: () => void): TTMEventSubscription {
    return this.onDisconnected(callback);
  }

  removeDisconnectListener(callback: () => void) {
    // No-op for web
  }
}

// Export the singleton instance for web
export const TTMBLEManager = new WebTTMBLEManagerWrapper();
