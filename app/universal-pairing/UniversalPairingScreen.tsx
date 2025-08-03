import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { useTheme } from '@/context/theme-context';
import DeviceListView from './components/DeviceListView';
import ConnectionScreen from './components/ConnectionScreen';
import SuccessScreen from './components/SuccessScreen';
import { ToastProvider, useToast } from './components/ToastProvider';
import {
  setupJimiBridgeListeners,
  removeJimiBridgeListeners,
  startDeviceScan,
  connectToDevice,
  disconnectDevice,
} from './sdk/jimiSdk';
import { PairingState, UniversalDevice } from './types';

const UniversalPairingContent: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const jimiBridgeRef = useRef<any>(null);
  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const [state, setState] = useState<PairingState>({
    devices: [],
    selectedDevice: null,
    connectedDevice: null,
    connectionState: 'idle',
    isScanning: false,
    error: null,
    deviceData: [],
  });

  useEffect(() => {
    const initializeJimiBridge = async () => {
      try {
        console.log('🔍 === DEBUGGING NATIVE MODULES ===');
        console.log('📱 Available Native Modules:', Object.keys(NativeModules));
        console.log('📱 JimiBridge module exists:', !!NativeModules.JimiBridge);
        
        if (NativeModules.JimiBridge) {
          jimiBridgeRef.current = NativeModules.JimiBridge;
          console.log('📱 JimiBridge methods:', Object.getOwnPropertyNames(jimiBridgeRef.current));
          console.log('📱 getRealDeviceData exists:', typeof jimiBridgeRef.current.getRealDeviceData);
          console.log('📱 getRealDeviceData function:', jimiBridgeRef.current.getRealDeviceData);
          
          eventEmitterRef.current = new NativeEventEmitter(jimiBridgeRef.current);
          if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            ]);
            console.log('🔐 Permissions:', granted);
          } else {
            console.log('🔐 Using default permissions for iOS');
          }
          console.log('Jimi IoT Bridge initialized successfully');
        } else {
          console.log('Jimi IoT Bridge not available, using fallback');
        }
      } catch (error) {
        console.error('Failed to initialize Jimi Bridge:', error);
      }
    };

    initializeJimiBridge();

    setupJimiBridgeListeners(
      handleDeviceDiscovered,
      handleDeviceConnected,
      handleDeviceDisconnected,
      handleDataReceived,
      handleConnectionError,
      handlePermissionError
    );
    return () => removeJimiBridgeListeners();
  }, []);

  const handleDeviceDiscovered = (device: UniversalDevice) => {
    console.log('🔍 Device Discovered:', {
      deviceName: device.name || 'Unknown Device',
      deviceId: device.id,
      address: device.address,
      deviceType: device.deviceType,
      deviceCategory: device.deviceCategory,
      signalStrength: device.signalStrength,
      batteryLevel: device.batteryLevel,
      isConnected: device.isConnected,
      timestamp: new Date().toISOString(),
    });
    
    setState((prevState) => {
      // Check if device already exists to prevent duplicates
      const existingDeviceIndex = prevState.devices.findIndex(
        (existingDevice) => existingDevice.id === device.id || existingDevice.address === device.address
      );
      
      let updatedDevices;
      if (existingDeviceIndex !== -1) {
        // Update existing device with new information
        updatedDevices = [...prevState.devices];
        updatedDevices[existingDeviceIndex] = {
          ...updatedDevices[existingDeviceIndex],
          ...device,
        };
      } else {
        // Add new device
        updatedDevices = [...prevState.devices, {
          ...device,
          timestamp: new Date().toISOString(),
        }];
      }
      
      return {
        ...prevState,
        devices: updatedDevices,
      };
    });
  };

  const handleDeviceConnected = (device: UniversalDevice) => {
    console.log('📱 Device Connected:', {
      deviceName: device.name,
      deviceId: device.id,
      address: device.address,
      deviceType: device.deviceType,
      deviceCategory: device.deviceCategory,
      timestamp: new Date().toISOString(),
    });
    
    setState((prevState) => ({
      ...prevState,
      connectedDevice: device,
      connectionState: 'connected',
    }));
    
    showToast(`Device ${device.name} connected successfully`, 'success');
  };

  const handleDeviceDisconnected = (device: UniversalDevice) => {
    console.log('📱 Device Disconnected:', {
      deviceName: device.name,
      deviceId: device.id,
      address: device.address,
      reason: 'User initiated or connection lost',
      timestamp: new Date().toISOString(),
    });
    
    setState((prevState) => ({
      ...prevState,
      connectedDevice: null,
      connectionState: 'idle',
    }));
    
    showToast(`Device ${device.name} disconnected`, 'info');
  };

  const handleDataReceived = (data: any) => {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      dataType: data?.dataType || 'unknown',
      deviceId: data?.deviceId || 'unknown',
      rawDataSize: data?.rawData ? data.rawData.length : 0,
      batteryLevel: data?.batteryLevel,
      signalStrength: data?.signalStrength,
      isRealData: data?.isRealData || false,
    };
    
    console.log('📊 ELD Data Received:', logData);
    
    // Log detailed data if needed for debugging
    if (data?.rawData) {
      console.log('📊 Raw Data Details:', {
        rawData: data.rawData,
        parsedData: data.rawData.length > 100 ? 
          `${data.rawData.substring(0, 100)}... (truncated)` : 
          data.rawData,
      });
    }
    
    // Update state with received data
    setState((prevState) => ({
      ...prevState,
      deviceData: [...prevState.deviceData, {
        deviceId: data?.deviceId || 'unknown',
        timestamp,
        dataType: data?.dataType || 'unknown',
        value: data?.value,
        sensorValue: data?.sensorValue,
        protocol: data?.protocol,
        characteristicUuid: data?.characteristicUuid,
        rawData: data?.rawData,
        batteryLevel: data?.batteryLevel,
        signalStrength: data?.signalStrength,
        deviceName: data?.deviceName,
        isConnected: data?.isConnected,
        isRealData: data?.isRealData || false,
      }],
    }));
  };

  const handleConnectionError = async (error: any) => {
    console.error('❌ Connection Error:', {
      message: error?.message || 'Unknown error',
      code: error?.code,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      deviceId: error?.deviceId || 'unknown',
      method: 'handleConnectionError'
    });    
    setState((prevState) => ({
      ...prevState,
      connectionState: 'error',
      error: error.message,
    }));
    
    showToast(`Connection failed: ${error.message}`, 'error');
  };

  const handlePermissionError = (error: any) => {
    console.error('❌ Permission Error:', {
      errorCode: error?.errorCode,
      message: error?.message,
      permissions: error?.permissions,
      timestamp: error?.timestamp,
    });
    
    setState((prevState) => ({
      ...prevState,
      error: `Permission Error: ${error.message}`,
      isScanning: false,
    }));
    
    showToast(`Permission Error: ${error.message}`, 'error');
  };

  const handleStartScan = async () => {
    console.log('🔍 Starting device scan...', {
      scanFilter: 'all',
      scanDuration: 30000,
      enableBackgroundScan: false,
      enableRSSI: true,
      enableDeviceTypeDetection: true,
      timestamp: new Date().toISOString(),
    });
    
    try {
      setState((prevState) => ({ ...prevState, isScanning: true, devices: [] }));
      showToast('Starting device scan...', 'info');
      
      // Check if JimiBridge is available
      if (jimiBridgeRef.current && jimiBridgeRef.current.startUniversalScan) {
        console.log('🔍 Using JimiBridge for scanning...');
        await jimiBridgeRef.current.startUniversalScan({
          scanDuration: 30000,
          enableBackgroundScan: true,
          enableRSSI: true,
          enableDeviceTypeDetection: true,
          enableBluetoothLE: true,
          enableBluetoothClassic: true,
          enableBluetoothScan: true,
          enableLegacyScan: false,
          enableDuplicateFilter: true,
          scanFilter: "all",
          maxResults: 100,
          scanMode: "LOW_LATENCY"
        });
        console.log('✅ JimiBridge scan started successfully');
      } else {
        console.log('⚠️ JimiBridge not available, using fallback scan method...');
        
        // Fallback: Add test devices for demonstration
        const testDevices = [
          {
            id: "98:34:8C:92:B7:4C",
            name: "realme TechLife Buds T100",
            address: "98:34:8C:92:B7:4C",
            deviceType: "BLUETOOTH_DEVICE",
            deviceCategory: "BLUETOOTH",
            signalStrength: 85,
            batteryLevel: 75,
            isConnected: false,
            firmwareVersion: "1.0.0"
          },
          {
            id: "B4:04:8C:78:86:35",
            name: "Unnamed Device",
            address: "B4:04:8C:78:86:35",
            deviceType: "BLUETOOTH_DEVICE",
            deviceCategory: "BLUETOOTH",
            signalStrength: 92,
            batteryLevel: 45,
            isConnected: false,
            firmwareVersion: "1.0.0"
          },
          {
            id: "6C:8E:20:DA:05:0C",
            name: "Unnamed Device",
            address: "6C:8E:20:DA:05:0C",
            deviceType: "BLUETOOTH_DEVICE",
            deviceCategory: "BLUETOOTH",
            signalStrength: 78,
            batteryLevel: 60,
            isConnected: false,
            firmwareVersion: "1.0.0"
          }
        ];
        
        // Simulate device discovery with delay
        setTimeout(() => {
          console.log('🔍 Simulating device discovery...');
          testDevices.forEach((device, index) => {
            setTimeout(() => {
              handleDeviceDiscovered(device as any);
            }, index * 1000); // Stagger discovery
          });
          
          // Stop scanning after devices are added
          setTimeout(() => {
            setState((prevState) => ({ ...prevState, isScanning: false }));
            showToast('Scan completed', 'success');
          }, testDevices.length * 1000 + 1000);
        }, 1000);
        
        console.log('✅ Fallback scan method initiated');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to start device scan:', {
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      setState((prevState) => ({
        ...prevState,
        error: 'Failed to start scanning',
        isScanning: false,
      }));
      
      showToast('Failed to start scanning', 'error');
    }
  };

  const handleConnectAnimation = () => {
    setState((prevState) => ({
      ...prevState,
      connectionState: 'connecting',
    }));
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setState((prevState) => ({
        ...prevState,
        deviceData: [{...prevState.deviceData[0], progress}],
      }));
      if (progress === 100) {
        clearInterval(interval);
        setState((prevState) => ({
          ...prevState,
          connectionState: 'connected',
        }));
      }
    }, 500);
  };

  const handleConnect = async () => {
    const { selectedDevice } = state;
    if (!selectedDevice) return;

    setState((prevState) => ({
      ...prevState,
      connectionState: 'connecting',
    }));
    
    handleConnectAnimation();

    try {
      await connectToDevice({
        deviceId: selectedDevice.address,
        uid: selectedDevice.id,
        imei: selectedDevice.address, // Placeholder
        deviceType: selectedDevice.deviceType,
        deviceCategory: selectedDevice.deviceCategory,
        connectionMethod: 'universal',
        enableAutoReconnect: true,
        enableDataStreaming: true,
      });
    } catch (error) {
      setState((prevState) => ({ ...prevState, error: 'Failed to connect device' }));
    }
  };

  const handleDisconnect = async () => {
    const { connectedDevice } = state;
    if (!connectedDevice) return;

    try {
      await disconnectDevice(connectedDevice.address);
    } catch (error) {
      setState((prevState) => ({ ...prevState, error: 'Failed to disconnect' }));
    }
  };

  const renderCurrentScreen = () => {
    switch (state.connectionState) {
      case 'connecting':
        return (
          <ConnectionScreen
            device={state.selectedDevice}
            onCancel={() => setState((prevState) => ({ ...prevState, connectionState: 'idle' }))}
          />
        );
      case 'connected':
        return (
          <SuccessScreen
            device={state.connectedDevice}
            onContinue={() => setState((prevState) => ({ ...prevState, connectionState: 'idle' }))}
          />
        );
      default:
        return (
          <DeviceListView
            devices={state.devices}
            selectedDevice={state.selectedDevice}
            isScanning={state.isScanning}
            onDeviceSelect={(device) => setState((prevState) => ({ ...prevState, selectedDevice: device }))}
            onStartScan={handleStartScan}
            onConnect={handleConnect}
            error={state.error}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Main wrapper component with ToastProvider
const UniversalPairingScreenProtocol: React.FC = () => {
  return (
    <ToastProvider>
      <UniversalPairingContent />
    </ToastProvider>
  );
};

export default UniversalPairingScreenProtocol;

