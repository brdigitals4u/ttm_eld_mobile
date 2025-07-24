import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { EldDevice, EldEvent, EldState } from '@/types/eld';
import { useAuth } from './auth-context';

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

    // Initialize BLE Manager
    const initBleManager = async () => {
      try {
        // In a real implementation, you would initialize react-native-ble-manager here
        console.log('BleManager would be initialized here');
        
        // Load previously connected device
        const savedDeviceJson = await AsyncStorage.getItem('connectedEldDevice');
        if (savedDeviceJson && vehicleInfo?.eldConnected) {
          const savedDevice = JSON.parse(savedDeviceJson);
          setState(prev => ({
            ...prev,
            connectedDevice: savedDevice,
          }));
          
          console.log('Would try to reconnect to device:', savedDevice.name);
        }
      } catch (error) {
        console.error('Error initializing BleManager:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize Bluetooth',
        }));
      }
    };

    // Setup listeners for BLE events
    const setupListeners = () => {
      // In a real implementation, you would set up BLE event listeners here
      console.log('BLE event listeners would be set up here');
      
      return () => {
        // Cleanup listeners
        console.log('BLE event listeners would be cleaned up here');
      };
    };

    if (!isWeb) {
      initBleManager();
      const cleanupListeners = setupListeners();
      
      return () => {
        cleanupListeners();
      };
    }
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
      
      // In a real implementation, you would start BLE scanning here
      console.log('Would start BLE scanning here');
      
      // Simulate finding devices after a delay
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          isScanning: false,
        }));
      }, 3000);
    } catch (error) {
      console.error('Error scanning for devices:', error);
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: 'Failed to scan for devices',
      }));
    }
  };

  const stopScan = async () => {
    if (isWeb) return;
    
    try {
      // In a real implementation, you would stop BLE scanning here
      console.log('Would stop BLE scanning here');
      setState(prev => ({
        ...prev,
        isScanning: false,
      }));
    } catch (error) {
      console.error('Error stopping scan:', error);
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