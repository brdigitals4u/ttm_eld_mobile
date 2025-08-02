import { NativeModules, NativeEventEmitter } from 'react-native';
import { SentryLogger } from '../services/SentryService';
import { FirebaseLogger } from '../services/FirebaseService';
import { ELDDeviceService } from '../services/ELDDeviceService';

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
    configureSDK: (options: any) => Promise.resolve(),
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
    stopReportEldData: () => Promise.resolve(),
    replyReceivedEldData: () => Promise.resolve(),
    sendUTCTime: () => Promise.resolve(),
    startReportObdData: () => Promise.resolve(),
    stopReportObdData: () => Promise.resolve(),
    queryHistoryData: () => Promise.resolve(),
    stopReportHistoryData: () => Promise.resolve(),
    queryTerminalInfo: () => Promise.resolve(),
    queryDataItemConfig: () => Promise.resolve(),
    sendCustomCommand: () => Promise.resolve(),
    saveDriverAuthInfo: () => Promise.resolve(),
    readDriverAuthInfo: () => Promise.resolve(),
    clearFaultCode: () => Promise.resolve(),
    checkDpfRegenerationState: () => Promise.resolve(),
    setDpfRegeneration: () => Promise.resolve(),
    injectTestDevices: () => Promise.resolve(),
    getBondedDevices: () => Promise.resolve(),
    addListener: () => {},
    removeListeners: () => {}
  };
  
  return mockModule as TTMBLEManagerInterface;
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
} catch (error: any) {
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
} catch (error: any) {
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
  private isSimulatorConnected: boolean = false;

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
      console.log('🔧 TTMBLEManager: Initializing SDK');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'initializing', {
        method: 'initSDK',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.initSDK();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'initialized', {
        method: 'initSDK',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      console.log('✅ TTMBLEManager: SDK initialized successfully');
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager initSDK error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'failed', {
        method: 'initSDK',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async configureSDK(options: { filterDevices?: boolean; debugMode?: boolean } = {}): Promise<void> {
    try {
      console.log('🔧 TTMBLEManager: Configuring SDK with options:', options);
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'configuring', {
        method: 'configureSDK',
        options: options,
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.configureSDK(options);
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'configured', {
        method: 'configureSDK',
        options: options,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      console.log('✅ TTMBLEManager: SDK configured successfully');
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager configureSDK error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'failed', {
        method: 'configureSDK',
        options: options,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  // Scanning methods
  async startScan(duration: number = 10000): Promise<void> {
    try {
      console.log('🔍 TTMBLEManager: Starting scan for', duration, 'ms');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'scanning', {
        method: 'startScan',
        duration: duration,
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.startScan(duration);
      
      // Check if KD032 simulator is running and inject it into scan results
      try {
        const { getKD032SimulatorStatus } = await import('../../services/EldSimulator');
        const status = getKD032SimulatorStatus();
        
        if (status.isAdvertising) {
          console.log('🎯 KD032 Simulator detected - injecting into scan results');
          
          // Simulate device discovery after a short delay
          setTimeout(() => {
            const simulatedDevice: BLEDevice = {
              id: 'C4:A8:28:43:14:9A',
              address: 'C4:A8:28:43:14:9A',
              name: 'KD032-43149A',
              signal: -45,
            };
            
            // Emit the simulated device through the same channel as real devices
            this.eventEmitter.emit(this.nativeModule.ON_DEVICE_SCANNED, simulatedDevice);
            console.log('✅ KD032 Simulator device injected into scan results:', simulatedDevice);
          }, 2000); // Delay to simulate real device discovery
        }
      } catch (simulatorError) {
        console.log('ℹ️ KD032 Simulator not available or not running');
      }
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'scan_started', {
        method: 'startScan',
        duration: duration,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager startScan error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'scan_failed', {
        method: 'startScan',
        duration: duration,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    try {
      console.log('🛑 TTMBLEManager: Stopping scan');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'scan_stopping', {
        method: 'stopScan',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.stopScan();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'scan_stopped', {
        method: 'stopScan',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager stopScan error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'scan_stop_failed', {
        method: 'stopScan',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  // Direct Android BLE scanning (fallback method)
  async startDirectScan(duration: number = 10): Promise<void> {
    try {
      console.log('🔍 TTMBLEManager: Starting direct scan for', duration, 's');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'direct_scanning', {
        method: 'startDirectScan',
        duration: duration,
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.startDirectScan(duration);
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'direct_scan_started', {
        method: 'startDirectScan',
        duration: duration,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager startDirectScan error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'direct_scan_failed', {
        method: 'startDirectScan',
        duration: duration,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async stopDirectScan(): Promise<void> {
    try {
      console.log('🛑 TTMBLEManager: Stopping direct scan');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'direct_scan_stopping', {
        method: 'stopDirectScan',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.stopDirectScan();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'direct_scan_stopped', {
        method: 'stopDirectScan',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager stopDirectScan error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('sdk_init', 'direct_scan_stop_failed', {
        method: 'stopDirectScan',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  // Connection methods
  async connect(deviceId: string, passcode: string = '', needPair: boolean = false): Promise<void> {
    try {
      console.log('🔗 TTMBLEManager: Connecting to device:', deviceId, 'passcode:', passcode ? '***' : 'none');
      
      // Log to Supabase

      
      // Check if this is a KD032 simulator device
      if (deviceId === 'C4:A8:28:43:14:9A' || deviceId.toLowerCase().includes('kd032')) {
        console.log('🎯 KD032 Simulator connection detected');
        this.isSimulatorConnected = true;
        
        try {
          const { kd032Simulator } = await import('../../services/EldSimulator');
          
          // Simulate successful connection after a delay
          setTimeout(() => {
            this.eventEmitter.emit(this.nativeModule.ON_CONNECTED, {
              deviceId: deviceId,
              deviceName: 'KD032-43149A',
            });
            console.log('✅ KD032 Simulator connected successfully');
            
            // Send authentication passed event immediately (KD032 doesn't need passcode)
            setTimeout(() => {
              this.eventEmitter.emit(this.nativeModule.ON_AUTHENTICATION_PASSED, {
                deviceId: deviceId,
                timestamp: new Date().toISOString(),
              });
              console.log('✅ KD032 Simulator authentication passed');
              
              // Start ELD data transmission after authentication
              setTimeout(() => {
                // Send initial ELD data with SDK-compatible format
                this.eventEmitter.emit(this.nativeModule.ON_NOTIFY_RECEIVED, {
                  dataType: 'ELD_DATA',
                  rawData: JSON.stringify({
                    deviceId: deviceId,
                    timestamp: new Date().toISOString(),
                    speed: Math.floor(Math.random() * 75),
                    engineRPM: Math.floor(Math.random() * 2000) + 800,
                    status: 'DRIVING',
                    location: {
                      latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
                      longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
                    },
                    odometer: Math.floor(Math.random() * 500000) + 100000,
                    engineHours: Math.floor(Math.random() * 10000),
                    driverId: Math.floor(Math.random() * 1000000).toString(),
                    vehicleId: Math.floor(Math.random() * 100000).toString(),
                    vin: this.generateVIN(),
                    ecuInfo: this.generateEcuInfo(),
                    terminalInfo: this.generateTerminalInfo(deviceId),
                    versionInfo: this.generateVersionInfo(),
                    alarmInfo: this.generateAlarmInfo(),
                    sysInfo: this.generateSysInfo(),
                    events: this.generateSdkCompatibleEvents(),
                  }),
                  ack: 0x11, // ACK_OBD_ELD_PROCESS
                });
                
                // Start continuous ELD data transmission every 3 seconds
                const dataInterval = setInterval(() => {
                  this.eventEmitter.emit(this.nativeModule.ON_NOTIFY_RECEIVED, {
                    dataType: 'ELD_DATA',
                    rawData: JSON.stringify({
                      deviceId: deviceId,
                      timestamp: new Date().toISOString(),
                      speed: Math.floor(Math.random() * 75),
                      engineRPM: Math.floor(Math.random() * 2000) + 800,
                      status: ['DRIVING', 'ON_DUTY_NOT_DRIVING', 'OFF_DUTY', 'SLEEPER_BERTH'][Math.floor(Math.random() * 4)],
                      location: {
                        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
                        longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
                      },
                      odometer: Math.floor(Math.random() * 500000) + 100000,
                      engineHours: Math.floor(Math.random() * 10000),
                      driverId: Math.floor(Math.random() * 1000000).toString(),
                      vehicleId: Math.floor(Math.random() * 100000).toString(),
                      vin: this.generateVIN(),
                      ecuInfo: this.generateEcuInfo(),
                      terminalInfo: this.generateTerminalInfo(deviceId),
                      versionInfo: this.generateVersionInfo(),
                      alarmInfo: this.generateAlarmInfo(),
                      sysInfo: this.generateSysInfo(),
                      events: this.generateSdkCompatibleEvents(),
                    }),
                    ack: 0x11, // ACK_OBD_ELD_PROCESS
                  });
                  console.log('📊 KD032 Simulator: Continuous ELD data transmitted');
                }, 3000);
                
                // Store interval for cleanup
                (this as any).kd032DataInterval = dataInterval;
              }, 1000);
            }, 1000);
          }, 1500);
          
          // Log simulator connection success
          await ELDDeviceService.logConnectionAttempt(deviceId, 'connected', {
            method: 'connect',
            deviceId: deviceId,
            isSimulator: true,
            timestamp: new Date().toISOString(),
            status: 'success'
          });
          
          return;
        } catch (simulatorError) {
          console.log('ℹ️ KD032 Simulator not available, proceeding with normal connection');
        }
      }
      
      const result = await this.nativeModule.connect(deviceId, passcode, needPair);
      
      // Log success for real device
      await ELDDeviceService.logConnectionAttempt(deviceId, 'connected', {
        method: 'connect',
        deviceId: deviceId,
        passcodeLength: passcode.length,
        needPair: needPair,
        isSimulator: false,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager connect error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt(deviceId, 'failed', {
        method: 'connect',
        deviceId: deviceId,
        passcodeLength: passcode.length,
        needPair: needPair,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('🔌 TTMBLEManager: Disconnecting');
      
      // Reset simulator flag
      this.isSimulatorConnected = false;
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'disconnecting', {
        method: 'disconnect',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.disconnect();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'disconnected', {
        method: 'disconnect',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager disconnect error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'disconnect_failed', {
        method: 'disconnect',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  // Password methods
  async checkPasswordEnable(): Promise<void> {
    try {
      console.log('🔐 TTMBLEManager: Checking password enable');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'checking_password', {
        method: 'checkPasswordEnable',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.checkPasswordEnable();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_checked', {
        method: 'checkPasswordEnable',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager checkPasswordEnable error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_check_failed', {
        method: 'checkPasswordEnable',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async validatePassword(password: string): Promise<void> {
    try {
      console.log('🔐 TTMBLEManager: Validating password');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'validating_password', {
        method: 'validatePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.validatePassword(password);
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_validated', {
        method: 'validatePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager validatePassword error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_validation_failed', {
        method: 'validatePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async enablePassword(password: string): Promise<void> {
    try {
      console.log('🔐 TTMBLEManager: Enabling password');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'enabling_password', {
        method: 'enablePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.enablePassword(password);
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_enabled', {
        method: 'enablePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager enablePassword error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_enable_failed', {
        method: 'enablePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async disablePassword(password: string): Promise<void> {
    try {
      console.log('🔐 TTMBLEManager: Disabling password');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'disabling_password', {
        method: 'disablePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.disablePassword(password);
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_disabled', {
        method: 'disablePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager disablePassword error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'password_disable_failed', {
        method: 'disablePassword',
        passcodeLength: password.length,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  // ELD data methods
  async startReportEldData(): Promise<void> {
    try {
      console.log('📊 TTMBLEManager: Starting ELD data report');
      
      // For KD032 simulator, skip the native SDK call since data is already flowing
      if (this.isSimulatorConnected) {
        console.log('🎯 KD032 Simulator detected - skipping startReportEldData (data already flowing)');
        
        // Log simulator skip
        await ELDDeviceService.logConnectionAttempt('C4:A8:28:43:14:9A', 'eld_data_started', {
          method: 'startReportEldData',
          isSimulator: true,
          timestamp: new Date().toISOString(),
          status: 'skipped_simulator'
        });
        
        return;
      }
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'starting_eld_data', {
        method: 'startReportEldData',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.startReportEldData();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'eld_data_started', {
        method: 'startReportEldData',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager startReportEldData error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'eld_data_start_failed', {
        method: 'startReportEldData',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async stopReportEldData(): Promise<void> {
    try {
      console.log('🛑 TTMBLEManager: Stopping ELD data report');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'stopping_eld_data', {
        method: 'stopReportEldData',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.stopReportEldData();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'eld_data_stopped', {
        method: 'stopReportEldData',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager stopReportEldData error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'eld_data_stop_failed', {
        method: 'stopReportEldData',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async replyReceivedEldData(): Promise<void> {
    try {
      console.log('📤 TTMBLEManager: Replying to received ELD data');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'replying_eld_data', {
        method: 'replyReceivedEldData',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.replyReceivedEldData();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'eld_data_replied', {
        method: 'replyReceivedEldData',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager replyReceivedEldData error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'eld_data_reply_failed', {
        method: 'replyReceivedEldData',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async sendUTCTime(): Promise<void> {
    try {
      console.log('⏰ TTMBLEManager: Sending UTC time');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'sending_utc_time', {
        method: 'sendUTCTime',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.sendUTCTime();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'utc_time_sent', {
        method: 'sendUTCTime',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager sendUTCTime error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'utc_time_send_failed', {
        method: 'sendUTCTime',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  // Test and utility methods
  async injectTestDevices(): Promise<void> {
    try {
      console.log('🧪 TTMBLEManager: Injecting test devices');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'injecting_test_devices', {
        method: 'injectTestDevices',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.injectTestDevices();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'test_devices_injected', {
        method: 'injectTestDevices',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager injectTestDevices error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'test_devices_inject_failed', {
        method: 'injectTestDevices',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }

  async getBondedDevices(): Promise<void> {
    try {
      console.log('📱 TTMBLEManager: Getting bonded devices');
      
      // Log to Supabase
      await ELDDeviceService.logConnectionAttempt('unknown', 'getting_bonded_devices', {
        method: 'getBondedDevices',
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      const result = await this.nativeModule.getBondedDevices();
      
      // Log success
      await ELDDeviceService.logConnectionAttempt('unknown', 'bonded_devices_retrieved', {
        method: 'getBondedDevices',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ TTMBLEManager getBondedDevices error:', error);
      
      // Log error
      await ELDDeviceService.logConnectionAttempt('unknown', 'bonded_devices_retrieve_failed', {
        method: 'getBondedDevices',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      });
      
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
    } catch (error: any) {
      console.error('TTMBLEManager addListener error:', error);
      return { remove: () => {} };
    }
  }

  removeAllListeners(eventName: string) {
    try {
      this.eventEmitter.removeAllListeners(eventName);
    } catch (error: any) {
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

  // SDK-compatible data generation methods for simulator
  private generateVIN(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let vin = '';
    for (let i = 0; i < 17; i++) {
      vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
  }

  private generateEcuInfo(): any {
    return {
      ecuId: Math.floor(Math.random() * 1000000).toString(),
      ecuType: 'ENGINE_ECU',
      ecuVersion: '1.2.3',
      ecuStatus: 'ACTIVE',
      lastUpdate: new Date().toISOString(),
    };
  }

  private generateTerminalInfo(deviceId: string): any {
    return {
      terminalId: deviceId,
      terminalType: 'KD032',
      terminalVersion: '2.1.0',
      terminalStatus: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
    };
  }

  private generateVersionInfo(): any {
    return {
      firmwareVersion: '2.1.0',
      hardwareVersion: '1.0.0',
      protocolVersion: '1.2',
      buildDate: '2025-01-15',
    };
  }

  private generateAlarmInfo(): any {
    return {
      alarmType: 'ENGINE_FAULT',
      alarmLevel: 'WARNING',
      alarmCode: 'E001',
      alarmMessage: 'Engine temperature high',
      alarmTimestamp: new Date().toISOString(),
    };
  }

  private generateSysInfo(): any {
    return {
      batteryLevel: Math.floor(Math.random() * 100),
      signalStrength: -45 + Math.floor(Math.random() * 20),
      memoryUsage: Math.floor(Math.random() * 100),
      cpuUsage: Math.floor(Math.random() * 100),
      uptime: Math.floor(Math.random() * 86400), // seconds
    };
  }

  private generateSdkCompatibleEvents(): any[] {
    const events = [];
    const eventTypes = ['LOGIN', 'LOGOUT', 'DRIVING', 'ON_DUTY', 'OFF_DUTY', 'SLEEPER'];
    
    // Generate 1-3 events
    const numEvents = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numEvents; i++) {
      const eventTime = new Date(Date.now() - Math.random() * 3600000); // Within last hour
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
}

// Export the singleton instance
export const TTMBLEManager = new TTMBLEManagerWrapper();
