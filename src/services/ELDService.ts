import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, Alert, DeviceEventEmitter } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { useGlobalContext } from '../contexts/GlobalContext';
import { FirebaseLogger } from './FirebaseService';
import { SentryLogger } from './SentryService';
import TTMBLEManager from '../utils/TTMBLEManager';

export class ELDService {
  private isInitialized = false;
  private subscriptions: any[] = [];
  private reconnectAttempts = 0;

  private config = {
    autoReconnect: true,
    maxReconnectAttempts: 3,
    reconnectDelay: 5000,
  };

  initialize(): void {
    if (this.isInitialized) return;

    BleManager.start({ showAlert: false });
    this.subscribeToEvents();

    this.isInitialized = true;
    console.log('ELD Service initialized');

    SentryLogger.logELDEvent('service_initialized');
    FirebaseLogger.logELDEvent('service_initialized');
  }

  private subscribeToEvents(): void {
    this.clearSubscriptions();

    const deviceScannedSub = DeviceEventEmitter.addListener('BleManagerDiscoverPeripheral', (device: any) => {
      SentryLogger.logBluetoothEvent('device_scanned', { device });
      FirebaseLogger.logBluetoothEvent('device_scanned', { device });
    });

    const connectedSub = DeviceEventEmitter.addListener('BleManagerConnectPeripheral', () => {
      this.reconnectAttempts = 0;
      SentryLogger.logELDEvent('connected');
      FirebaseLogger.logELDEvent('connected');
    });

    const disconnectedSub = DeviceEventEmitter.addListener('BleManagerDisconnectPeripheral', () => {
      SentryLogger.logELDEvent('disconnected');
      FirebaseLogger.logELDEvent('disconnected');

      if (this.config.autoReconnect) this.attemptReconnect();
    });

    this.subscriptions = [deviceScannedSub, connectedSub, disconnectedSub];
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) return;

    setTimeout(() => {
      console.log('Trying to reconnect...');
      FirebaseLogger.logELDEvent('reconnect_attempt');
      SentryLogger.logELDEvent('reconnect_attempt');

      this.initialize();
    }, this.config.reconnectDelay);
  }

  private clearSubscriptions(): void {
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const requiredPermissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    const granted = await PermissionsAndroid.requestMultiple(requiredPermissions);

    return Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
  }

  async connect(macAddress: string, credentials: any): Promise<void> {
    // This method defers to pairWithDevice - which handles UI prompts etc.
    await this.pairWithDevice(macAddress, credentials);
  }

  async pairWithDevice(device: string, credentials?: any): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS supports Alert.prompt
      Alert.prompt(
        'Machine Number',
        'Enter the machine number for the ELD device:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('Pairing cancelled'),
          },
          {
            text: 'Next',
            onPress: (machineNumber) => {
              if (!machineNumber) return;

              Alert.prompt(
                'Passcode',
                'Enter the passcode for the ELD device:',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => console.log('Cancelled passcode'),
                  },
                  {
                    text: 'Connect',
                    onPress: async (passcode) => {
                      if (!passcode) return;

                      try {
                        // Initialize TTM SDK first
                        await TTMBLEManager.initSDK();
                        
                        // Use TTMBLEManager.connect with correct parameters:
                        // macAddress, imei (machine number), needPair (true for pairing)
                        await TTMBLEManager.connect(device, machineNumber, true);
                        
                        // After connection, validate the passcode
                        await TTMBLEManager.validatePassword(passcode);
                        
                        console.log('Connected to ELD device:', device, 'Machine Number:', machineNumber);
                        SentryLogger.logELDEvent('device_connected', { device, machineNumber });
                        FirebaseLogger.logELDEvent('device_connected', { device, machineNumber });
                      } catch (error) {
                        console.error('Connection failed:', error);
                        SentryLogger.captureException(error, { context: 'pairWithDevice' });
                        FirebaseLogger.recordError(error as Error, { context: 'pairWithDevice' });
                      }
                    },
                  },
                ],
                'secure-text'
              );
            },
          },
        ],
        'plain-text'
      );
    } else {
      // Android does not support Alert.prompt - fallback or implement custom modal
      console.log('pairWithDevice: UI prompt not supported on Android. Please implement a custom modal.');
      // Here you would open a modal or other UI to collect machineNumber and passcode
      // For now, just log
    }
  }
}

export const useELDService = () => {
  const { state, actions } = useGlobalContext();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    BleManager.start({ showAlert: false });
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]).then(result => {
        if (result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Bluetooth scan permission granted');
        } else {
          console.log('Bluetooth scan permission denied');
        }
      }).catch(error => {
        console.error('Permission error:', error);
      });
    }
  }, []);

  const pairWithDevice = (device: string) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Pair with ELD?',
        'Enter machine number and passcode separated by comma (e.g. 12345,67890)',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('Cancel pairing'),
          },
          {
            text: 'Pair',
            onPress: (value) => {
              if (!value) return;
              const [machineNumber, passcode] = value.split(',');
              console.log('Pairing with:', machineNumber, passcode);
              // Call SDK function to connect here
              actions.addEldEvent('Pairing initiated', { machineNumber });
              FirebaseLogger.logELDEvent('PAIR_INITIATED', { machineNumber });
              // You can trigger actual connection using ELDService here
            },
          },
        ],
        'plain-text'
      );
    } else {
      // Android fallback
      console.log('pairWithDevice: UI prompt not supported on Android. Implement custom modal.');
    }
  };

  const startScan = () => {
    setScanning(true);
    BleManager.scan([], 5, true)
      .then(() => {
        console.log('Scanning started');
        actions.addEldEvent('Scanning started');
        FirebaseLogger.logBluetoothEvent('SCAN_STARTED');
      })
      .catch(error => {
        console.error('Scan error:', error);
        SentryLogger.captureException(error, { context: 'startScan' });
      });
  };

  const stopScan = () => {
    setScanning(false);
    BleManager.stopScan()
      .then(() => {
        console.log('Scanning stopped');
        actions.addEldEvent('Scanning stopped');
        FirebaseLogger.logBluetoothEvent('SCAN_STOPPED');
      })
      .catch(error => {
        console.error('Stop scan error:', error);
        SentryLogger.captureException(error, { context: 'stopScan' });
      });
  };

  return {
    scanning,
    pairWithDevice,
    startScan,
    stopScan,
    device: state.eldDevice,
    setDevice: actions.setEldDevice, // assuming it exists in actions
    connect: actions.updateEldConnectionStatus, // assuming you want to update connection status
  };
};
