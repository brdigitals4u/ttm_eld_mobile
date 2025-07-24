import { NativeModules, NativeEventEmitter } from 'react-native';

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
  connect(macAddress: string, imei: string, needPair: boolean): Promise<void>;
  disconnect(): Promise<void>;
  checkPasswordEnable(): Promise<void>;
  validatePassword(password: string): Promise<void>;
  enablePassword(password: string): Promise<void>;
  disablePassword(password: string): Promise<void>;
  startReportEldData(): Promise<void>;
  replyReceivedEldData(): Promise<void>;
  sendUTCTime(): Promise<void>;
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

if (!TTMBLEManager) {
  throw new Error('TTMBLEManager native module is not available');
}

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
    return this.nativeModule.initSDK();
  }

  // Scanning methods
  async startScan(duration: number = 10000): Promise<void> {
    return this.nativeModule.startScan(duration);
  }

  async stopScan(): Promise<void> {
    return this.nativeModule.stopScan();
  }

  // Connection methods
  async connect(macAddress: string, imei: string, needPair: boolean = false): Promise<void> {
    return this.nativeModule.connect(macAddress, imei, needPair);
  }

  async disconnect(): Promise<void> {
    return this.nativeModule.disconnect();
  }

  // Password methods (not yet implemented in SDK)
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

  // ELD Data methods (not yet implemented in SDK)
  async startReportEldData(): Promise<void> {
    return this.nativeModule.startReportEldData();
  }

  async replyReceivedEldData(): Promise<void> {
    return this.nativeModule.replyReceivedEldData();
  }

  async sendUTCTime(): Promise<void> {
    return this.nativeModule.sendUTCTime();
  }

  // Event listener methods
  addListener(eventName: string, callback: (data: any) => void) {
    return this.eventEmitter.addListener(eventName, callback);
  }

  removeAllListeners(eventName: string) {
    this.eventEmitter.removeAllListeners(eventName);
  }

  // Typed event listeners
  onDeviceScanned(callback: (device: BLEDevice) => void) {
    return this.addListener(this.constants.ON_DEVICE_SCANNED, callback);
  }

  onScanStop(callback: () => void) {
    return this.addListener(this.constants.ON_SCAN_STOP, callback);
  }

  onScanFinish(callback: () => void) {
    return this.addListener(this.constants.ON_SCAN_FINISH, callback);
  }

  onConnected(callback: () => void) {
    return this.addListener(this.constants.ON_CONNECTED, callback);
  }

  onDisconnected(callback: () => void) {
    return this.addListener(this.constants.ON_DISCONNECTED, callback);
  }

  onConnectFailure(callback: (failure: ConnectionFailure) => void) {
    return this.addListener(this.constants.ON_CONNECT_FAILURE, callback);
  }

  onAuthenticationPassed(callback: () => void) {
    return this.addListener(this.constants.ON_AUTHENTICATION_PASSED, callback);
  }

  onNotifyReceived(callback: (data: NotifyData) => void) {
    return this.addListener(this.constants.ON_NOTIFY_RECEIVED, callback);
  }
}

// Export singleton instance
export default new TTMBLEManagerWrapper();
