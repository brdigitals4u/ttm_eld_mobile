// services/EldTestConfig.ts

import { Platform } from 'react-native';
import TTMBLEManager from '../src/utils/TTMBLEManager';
import { eldSimulator, SimulationScenario, EldDeviceType } from './EldSimulator';

export enum TestMode {
  PRODUCTION = 'PRODUCTION',        // Use real TTM BLE Manager
  SIMULATOR = 'SIMULATOR',          // Use ELD Simulator
  HYBRID = 'HYBRID'                 // Use simulator on web, real on native
}

export interface TestConfiguration {
  mode: TestMode;
  scenario: SimulationScenario;
  enableDebugLogs: boolean;
  simulatedDeviceTypes: EldDeviceType[];
  connectionTimeout: number;
  dataStreamInterval: number;
}

class EldTestConfigService {
  private currentConfig: TestConfiguration;
  private isInitialized: boolean = false;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): TestConfiguration {
    // Auto-detect best mode based on environment
    let defaultMode = TestMode.PRODUCTION;
    
    if (__DEV__) {
      // In development, use hybrid approach
      defaultMode = TestMode.HYBRID;
    }
    
    if (Platform.OS === 'web') {
      // Always use simulator on web since BLE is not available
      defaultMode = TestMode.SIMULATOR;
    }

    return {
      mode: defaultMode,
      scenario: SimulationScenario.NORMAL_OPERATION,
      enableDebugLogs: __DEV__,
      simulatedDeviceTypes: [
        EldDeviceType.TTM_PREMIUM,
        EldDeviceType.TTM_STANDARD,
        EldDeviceType.GENERIC_ELD
      ],
      connectionTimeout: 30000,
      dataStreamInterval: 5000
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.shouldUseSimulator()) {
        await eldSimulator.initSDK();
        if (this.currentConfig.enableDebugLogs) {
          console.log('[ELD Test Config] Initialized with simulator');
        }
      } else {
        await TTMBLEManager.initSDK();
        if (this.currentConfig.enableDebugLogs) {
          console.log('[ELD Test Config] Initialized with real TTM BLE Manager');
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('[ELD Test Config] Initialization failed:', error);
      throw error;
    }
  }

  public setTestMode(mode: TestMode): void {
    this.currentConfig.mode = mode;
    this.isInitialized = false; // Force re-initialization
    
    if (this.currentConfig.enableDebugLogs) {
      console.log(`[ELD Test Config] Test mode changed to: ${mode}`);
    }
  }

  public setSimulationScenario(scenario: SimulationScenario): void {
    this.currentConfig.scenario = scenario;
    eldSimulator.setSimulationScenario(scenario);
    
    if (this.currentConfig.enableDebugLogs) {
      console.log(`[ELD Test Config] Simulation scenario changed to: ${scenario}`);
    }
  }

  public updateConfiguration(config: Partial<TestConfiguration>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    
    if (config.scenario) {
      eldSimulator.setSimulationScenario(config.scenario);
    }
    
    if (this.currentConfig.enableDebugLogs) {
      console.log('[ELD Test Config] Configuration updated:', this.currentConfig);
    }
  }

  public getConfiguration(): TestConfiguration {
    return { ...this.currentConfig };
  }

  public shouldUseSimulator(): boolean {
    switch (this.currentConfig.mode) {
      case TestMode.SIMULATOR:
        return true;
      case TestMode.PRODUCTION:
        return false;
      case TestMode.HYBRID:
        return Platform.OS === 'web';
      default:
        return false;
    }
  }

  public getBLEManager() {
    if (this.shouldUseSimulator()) {
      return eldSimulator;
    } else {
      return TTMBLEManager;
    }
  }

  // Test scenario helpers
  public async runTestScenario(scenario: SimulationScenario, duration: number = 30000): Promise<void> {
    if (!this.shouldUseSimulator()) {
      console.warn('[ELD Test Config] Test scenarios only work in simulator mode');
      return;
    }

    const originalScenario = this.currentConfig.scenario;
    
    try {
      console.log(`[ELD Test Config] Running test scenario: ${scenario} for ${duration}ms`);
      this.setSimulationScenario(scenario);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          this.setSimulationScenario(originalScenario);
          console.log(`[ELD Test Config] Test scenario complete, restored to: ${originalScenario}`);
          resolve();
        }, duration);
      });
    } catch (error) {
      // Restore original scenario on error
      this.setSimulationScenario(originalScenario);
      throw error;
    }
  }

  public async simulateConnectionIssues(): Promise<void> {
    return this.runTestScenario(SimulationScenario.CONNECTION_ISSUES, 15000);
  }

  public async simulateAuthenticationFailure(): Promise<void> {
    return this.runTestScenario(SimulationScenario.AUTHENTICATION_FAILURE, 10000);
  }

  public async simulateDeviceMalfunction(): Promise<void> {
    return this.runTestScenario(SimulationScenario.DEVICE_MALFUNCTION, 20000);
  }

  public async simulateLowBattery(): Promise<void> {
    return this.runTestScenario(SimulationScenario.LOW_BATTERY, 25000);
  }

  public async simulateDataCorruption(): Promise<void> {
    return this.runTestScenario(SimulationScenario.DATA_CORRUPTION, 15000);
  }

  // Debugging and monitoring methods
  public getSimulatorStatus() {
    if (!this.shouldUseSimulator()) {
      return null;
    }

    return {
      isScanning: eldSimulator.isCurrentlyScanning(),
      connectedDevice: eldSimulator.getConnectedDevice(),
      availableDevices: eldSimulator.getAvailableDevices(),
      currentScenario: this.currentConfig.scenario,
      testMode: this.currentConfig.mode
    };
  }

  public enableDebugMode(enabled: boolean = true): void {
    this.currentConfig.enableDebugLogs = enabled;
    console.log(`[ELD Test Config] Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  public reset(): void {
    if (this.shouldUseSimulator()) {
      eldSimulator.reset();
    }
    
    this.currentConfig = this.getDefaultConfig();
    this.isInitialized = false;
    
    console.log('[ELD Test Config] Reset complete');
  }

  // Device-specific test methods
  public async testDeviceType(deviceType: EldDeviceType): Promise<void> {
    if (!this.shouldUseSimulator()) {
      console.warn('[ELD Test Config] Device type testing only works in simulator mode');
      return;
    }

    const devices = eldSimulator.getAvailableDevices();
    const targetDevice = devices.find(d => d.deviceType === deviceType);
    
    if (!targetDevice) {
      throw new Error(`No simulated device of type ${deviceType} available`);
    }

    console.log(`[ELD Test Config] Testing device type: ${deviceType}`);
    console.log(`[ELD Test Config] Target device: ${targetDevice.name} (${targetDevice.address})`);
    
    // You could add specific testing logic here
    return Promise.resolve();
  }

  public async runConnectivityTest(): Promise<{ success: boolean; details: string }> {
    if (!this.shouldUseSimulator()) {
      return {
        success: false,
        details: 'Connectivity test only available in simulator mode'
      };
    }

    try {
      console.log('[ELD Test Config] Running connectivity test...');
      
      // Test scanning
      await eldSimulator.startScan(5000);
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const devices = eldSimulator.getAvailableDevices();
      if (devices.length === 0) {
        return {
          success: false,
          details: 'No devices discovered during scan'
        };
      }

      // Test connection to first device
      const testDevice = devices[0];
      await eldSimulator.connect(testDevice.address, testDevice.imei);
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const connectedDevice = eldSimulator.getConnectedDevice();
      if (!connectedDevice) {
        return {
          success: false,
          details: 'Failed to establish connection'
        };
      }

      // Test data streaming
      await eldSimulator.startReportEldData();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Cleanup
      await eldSimulator.disconnect();
      
      return {
        success: true,
        details: `Successfully tested with ${testDevice.name}`
      };
      
    } catch (error) {
      return {
        success: false,
        details: `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const eldTestConfig = new EldTestConfigService();

// Export convenience functions
export const useSimulator = () => eldTestConfig.shouldUseSimulator();
export const getBLEManager = () => eldTestConfig.getBLEManager();
export const initializeEldTesting = () => eldTestConfig.initialize();
