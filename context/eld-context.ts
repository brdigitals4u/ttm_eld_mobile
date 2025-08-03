import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { EldDevice, EldEvent, EldState } from '@/types/eld';
import { useAuth } from './auth-context';
import { TTMBLEManager, BLEDevice } from '@/src/utils/TTMBLEManager';
import { ELDDeviceService } from '@/src/services/ELDDeviceService';

interface EldContextType extends EldState {
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
}

const initialState: EldState = {
  devices: [],
  connectedDevice: null,
  isScanning: false,
  error: null,
};

// Check if running on web
const isWeb = Platform.OS === ('web' as any);

// Mock BLE Manager for web compatibility
const BleManagerModule = !isWeb 
  ? null // We'll handle this properly in a real implementation
  : { 
      start: () => Promise.resolve(),
      scan: () => Promise.resolve(),
      stopScan: () => Promise.resolve(),
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
      retrieveServices: () => Promise.resolve(),
      startNotification: () => Promise.resolve(),
    };

const bleManagerEmitter = !isWeb 
  ? null // We'll handle this properly in a real implementation
  : { 
      addListener: () => ({ remove: () => {} }),
      removeAllListeners: () => {},
    };

export const [EldProvider, useEld] = createContextHook(() => {
  const [state, setState] = useState<EldState>(initialState);
  const { vehicleInfo } = useAuth();

  useEffect(() => {
    if (isWeb) {
      console.log('BLE functionality is not available on web');
      return;
    }

    // Initialize TTMBLEManager
    const initBleManager = async () => {
      try {
        console.log('Initializing TTMBLEManager...');
        await TTMBLEManager.initSDK();
        console.log('TTMBLEManager initialized successfully');
        
        // Load previously connected device
        const savedDeviceJson = await AsyncStorage.getItem('connectedEldDevice');
        if (savedDeviceJson && vehicleInfo?.eldConnected) {
          const savedDevice = JSON.parse(savedDeviceJson);
          setState(prev => ({
            ...prev,
            connectedDevice: savedDevice,
          }));
          
          console.log('Loaded saved device:', savedDevice.name);
        }
      } catch (error) {
        console.error('Error initializing TTMBLEManager:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize Bluetooth SDK',
        }));
      }
    };

    // Setup listeners for BLE events
    const setupListeners = () => {
      console.log('Setting up TTMBLEManager event listeners...');
      
      // Listen for scanned devices
      const deviceScannedListener = TTMBLEManager.onDeviceScanned(async (device: BLEDevice) => {
        console.log('Device found:', device);
        console.log('🔍 Device found:', device);
        
        // Convert BLEDevice to EldDevice format
        const eldDevice: EldDevice = {
          id: device.address,
          name: device.name || 'Unknown Device',
          address: device.address,
          isConnected: false,
          signal: device.signal,
        };
        
        setState(prev => {
          // Check if device already exists in the list
          const existingDeviceIndex = prev.devices.findIndex(d => d.id === eldDevice.id);
          
          if (existingDeviceIndex !== -1) {
            // Update existing device
            const updatedDevices = [...prev.devices];
            updatedDevices[existingDeviceIndex] = eldDevice;
            return {
              ...prev,
              devices: updatedDevices,
            };
          } else {
            // Add new device
            return {
              ...prev,
              devices: [...prev.devices, eldDevice],
            };
          }
        });
      });
      
      // Listen for scan completion
      const scanFinishListener = TTMBLEManager.onScanFinish(() => {
        console.log('Scan finished');
        setState(prev => ({
          ...prev,
          isScanning: false,
        }));
      });
      
      // Listen for scan stop
      const scanStopListener = TTMBLEManager.onScanStop(() => {
        console.log('Scan stopped');
        setState(prev => ({
          ...prev,
          isScanning: false,
        }));
      });
      
      return () => {
        // Cleanup listeners
        console.log('Cleaning up TTMBLEManager event listeners...');
        deviceScannedListener.remove();
        scanFinishListener.remove();
        scanStopListener.remove();
      };
    };

    // if (!isWeb) {
    //   initBleManager();
    //   const cleanupListeners = setupListeners();
      
    //   return () => {
    //     cleanupListeners();
    //   };
    // }
  }, [vehicleInfo]);

  const startScan = async () => {
    if (isWeb) {
      setState(prev => ({
        ...prev,
        error: 'Bluetooth scanning is not available on web',
      }));
      return;
    }
    
    try {
      setState(prev => ({
        ...prev,
        isScanning: true,
        devices: [],
        error: null,
      }));
      
      console.log('Starting BLE scan with TTMBLEManager...');
      // Start scanning for 2 minutes (120 seconds)
      await TTMBLEManager.startScan(120);
      console.log('BLE scan started successfully');
    } catch (error) {
      console.error('Error scanning for devices:', error);
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: `Failed to scan for devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  const stopScan = async () => {
    if (isWeb) return;
    
    try {
      console.log('Stopping BLE scan with TTMBLEManager...');
      await TTMBLEManager.stopScan();
      console.log('BLE scan stopped successfully');
      setState(prev => ({
        ...prev,
        isScanning: false,
      }));
    } catch (error) {
      console.error('Error stopping scan:', error);
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: `Failed to stop scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  const connectToDevice = async (deviceId: string) => {
    if (isWeb) {
      setState(prev => ({
        ...prev,
        error: 'Bluetooth connection is not available on web',
      }));
      return;
    }
    
    try {
      setState(prev => ({
        ...prev,
        error: null,
      }));
      
      // In a real implementation, you would connect to the BLE device here
      console.log('Would connect to BLE device:', deviceId);
      
      // Find the device in our list
      const device = state.devices.find(d => d.id === deviceId);
      if (!device) throw new Error('Device not found');
      
      // Update device connection status
      const updatedDevice = { ...device, isConnected: true };
      
      // Save the connected device
      await AsyncStorage.setItem('connectedEldDevice', JSON.stringify(updatedDevice));
      
      setState(prev => ({
        ...prev,
        connectedDevice: updatedDevice,
        devices: prev.devices.map(d => 
          d.id === deviceId ? updatedDevice : d
        ),
      }));
      
      Alert.alert(
        'Device Connected',
        `Successfully connected to ELD device: ${updatedDevice.name}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error connecting to device:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to connect to device',
      }));
    }
  };

  const disconnectDevice = async () => {
    if (isWeb || !state.connectedDevice) return;
    
    try {
      // In a real implementation, you would disconnect from the BLE device here
      console.log('Would disconnect from BLE device:', state.connectedDevice.id);
      await AsyncStorage.removeItem('connectedEldDevice');
      
      setState(prev => ({
        ...prev,
        connectedDevice: null,
        devices: prev.devices.map(d => 
          d.id === prev.connectedDevice?.id 
            ? { ...d, isConnected: false } 
            : d
        ),
      }));
    } catch (error) {
      console.error('Error disconnecting from device:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to disconnect from device',
      }));
    }
  };

  return {
    ...state,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
  };
});