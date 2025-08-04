import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { useTheme } from '@/context/theme-context';
import DeviceListView from './components/DeviceListView';
import ConnectionScreen from './components/ConnectionScreen';
import SuccessScreen from './components/SuccessScreen';
import DataEmitScreen from './components/DataEmitScreen';
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
  
  // Separate state for ELD data
  const [eldData, setEldData] = useState<{
    vin?: string;
    canData?: {
      // Engine Performance Metrics
      engine_throttle?: number;
      engine_throttle_valve_1_position_1?: number;
      engine_intake_air_mass_flow_rate?: number;
      engine_percent_load_at_current_speed?: number;
      engine_speed?: number;
      engine_runtime?: number;
      engine_running_time?: number;
      time_since_engine_start?: number;
      accelerator_pedal_position_1?: number;
      
      // Vehicle Status
      wheel_based_vehicle_speed?: number;
      total_vehicle_distance?: number;
      acc_out_status?: string;
      malfunction_indicator_lamp?: string;
      
      // Environmental Data
      engine_inlet_air_temperature?: number;
      engine_coolant_temperature?: number;
      intake_manifold_absolute_pressure?: number;
      barometric_pressure?: number;
      
      // Fuel System
      fuel_level?: number;
      fuel_level_1?: number;
      
      // Electrical System
      voltage?: number;
      
      // Legacy fields for backward compatibility
      air_flow?: number;
      engine_load?: number;
      coolant_temp?: number;
      vehicle_distance?: number;
      speed?: number;
      engine_rpm?: number;
    };
    gpsData?: any;
    eventData?: any;
    status?: any;
    timestamp?: string;
  } | null>(null);

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

  const handleDeviceDisconnected = (disconnectionData: any) => {
    // Extract device and reason from SDK data
    const device = disconnectionData.device || disconnectionData;
    const reason = disconnectionData.reason || disconnectionData.disconnectionReason || 'Unknown reason';
    
    console.log('disconnectionData', disconnectionData)

    console.log('📱 Device Disconnected:', {
      deviceName: device.name,
      deviceId: device.id,
      address: device.address,
      reason: reason,
      timestamp: new Date().toISOString(),
    });
    
    setState((prevState) => ({
      ...prevState,
      connectedDevice: null,
      connectionState: 'idle',
    }));
    
    showToast(`Device ${device.name} disconnected: ${reason}`, 'info');
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
      hasEldData: !!data?.eldData,
    };
    
    console.log('📊 Data Received:', logData);
    
    // Log detailed data if needed for debugging
    if (data?.rawData) {
      console.log('📊 Raw Data Details:', {
        rawData: data.rawData,
        parsedData: data.rawData.length > 100 ? 
          `${data.rawData.substring(0, 100)}... (truncated)` : 
          data.rawData,
      });
    }
    
    // Handle structured ELD data from native module
    if (data.dataType === 'ELD_DATA' && data.eldData) {
      console.log('📊 ELD Structured Data Received:', data.eldData);
      
      // Extract structured ELD components
      const { vin, can, gps, events, status } = data.eldData;
      
      // Store parsed ELD data in dedicated ELD state
      setEldData({
        vin: vin || null,
        canData: can || null,
        gpsData: gps || null,
        eventData: events || null,
        status: status || null,
        timestamp,
      });
      
      // Update connected device with ELD data
      setState((prevState) => ({
        ...prevState,
        connectedDevice: prevState.connectedDevice ? {
          ...prevState.connectedDevice,
          vin: vin || null,
          canData: can || null,
          gpsData: gps || null,
          eventData: events || null,
          status: status || null,
        } : null,
      }));
    }
    
    // Handle ELD errors
    if (data.dataType === 'ELD_ERROR') {
      console.error('❌ ELD Error:', data.error);
      showToast(`ELD Error: ${data.error}`, 'error');
    }
    
    // Fallback: try to parse raw JSON data for compatibility
    if (data.protocol === 'ELD_DEVICE' && data.rawData && !data.eldData) {
      try {
        const eldJson = JSON.parse(data.rawData);
        const { vin, can_data, gps_data, event_data } = eldJson;
        console.log('📊 ELD JSON Parsed (fallback):', { vin, can_data, gps_data, event_data });
        
        // Store parsed ELD data in dedicated ELD state
        setEldData({
          vin,
          canData: can_data,
          gpsData: gps_data,
          eventData: event_data,
          timestamp,
        });
        
        // Update connected device with ELD data
        setState((prevState) => ({
          ...prevState,
          connectedDevice: prevState.connectedDevice ? {
            ...prevState.connectedDevice,
            vin,
            canData: can_data,
            gpsData: gps_data,
            eventData: event_data,
          } : null,
        }));
      } catch (e: any) {
        console.error('❌ Failed to parse ELD JSON:', e.message);
      }
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
        console.log('⚠️ JimiBridge not available - no fallback scan available');
        console.log('❌ Real device scanning requires JimiBridge module');
        
        setState((prevState) => ({
          ...prevState,
          error: 'JimiBridge module not available - cannot scan for real devices',
          isScanning: false,
        }));
        
        showToast('JimiBridge module not available - real device scanning disabled', 'error');
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
      console.log(error)
      
      setState((prevState) => ({ ...prevState }));
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
            onContinue={() => setState((prevState) => ({ ...prevState, connectionState: 'dataEmit' }))}
          />
        );
      case 'dataEmit':
        return (
          <DataEmitScreen
            device={state.connectedDevice}
            deviceData={state.deviceData}
            onDisconnect={handleDisconnect}
            onBack={() => setState((prevState) => ({ ...prevState, connectionState: 'idle' }))}
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

