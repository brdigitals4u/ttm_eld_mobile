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

// Import logging services
import { FirebaseLogger } from '../../src/utils/FirebaseLogger';
import { SentryLogger } from '../../src/utils/SentryLogger';
import { SupabaseLogger } from '@/src/services/ELDDeviceService';


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
        
        // Log to analytics
        FirebaseLogger.logELDEvent('jimi_bridge_initialization_started');
        SentryLogger.logELDEvent('jimi_bridge_initialization_started');
        SupabaseLogger.logSDKEvent('jimi_bridge_initialization_started', undefined, {
          module: 'JimiBridge',
          platform: Platform.OS
        });
        
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
            
            // Log permission status
            FirebaseLogger.logELDEvent('permissions_requested', { permissions: granted });
            SentryLogger.logELDEvent('permissions_requested', { permissions: granted });
            SupabaseLogger.logPermissionRequest('bluetooth', Object.values(granted).every(p => p === 'granted'), 
              Object.entries(granted).filter(([_, status]) => status !== 'granted').map(([perm]) => perm));
          } else {
            console.log('🔐 Using default permissions for iOS');
          }
          console.log('Jimi IoT Bridge initialized successfully');
          
          // Log successful initialization
          FirebaseLogger.logELDEvent('jimi_bridge_initialization_success');
          SentryLogger.logELDEvent('jimi_bridge_initialization_success');
          SupabaseLogger.logSDKEvent('jimi_bridge_initialization_success', undefined, {
            module: 'JimiBridge',
            platform: Platform.OS
          });
        } else {
          console.log('Jimi IoT Bridge not available, using fallback');
          
          // Log fallback scenario
          FirebaseLogger.logELDEvent('jimi_bridge_not_available');
          SentryLogger.logELDEvent('jimi_bridge_not_available');
          SupabaseLogger.logSDKEvent('jimi_bridge_not_available', undefined, {
            module: 'JimiBridge',
            platform: Platform.OS
          });
        }
      } catch (error: any) {
        console.error('Failed to initialize Jimi Bridge:', error);
        
        // Log initialization error
        FirebaseLogger.logELDEvent('jimi_bridge_initialization_error', { error: error?.message || 'Unknown error' });
        SentryLogger.logELDEvent('jimi_bridge_initialization_error', { error: error?.message || 'Unknown error' });
        SupabaseLogger.logError(error, {
          eventType: 'jimi_bridge_initialization_error',
          additionalData: { platform: Platform.OS }
        });
      }
    };

    initializeJimiBridge();

    setupJimiBridgeListeners(
      handleDeviceDiscovered,
      handleDeviceConnected,
      handleDeviceDisconnected,
      handleDataReceived,
      handleConnectionError,
      handlePermissionError,
      handleProtocolUpdated
    );
    return () => removeJimiBridgeListeners();
  }, []);

  const handleDeviceDiscovered = (device: UniversalDevice) => {
    try {
      // Null checks and fallbacks
      const deviceName = device?.name || 'Unknown Device';
      const deviceId = device?.id || 'unknown';
      const deviceAddress = device?.address || 'unknown';
      const deviceType = device?.deviceType || 'unknown';
      const deviceCategory = device?.deviceCategory || 'unknown';
      const signalStrength = device?.signalStrength || -1;
      const batteryLevel = device?.batteryLevel || -1;
      const isConnected = device?.isConnected || false;
      const timestamp = new Date().toISOString();
      
      console.log('🔍 Device Discovered:', {
        deviceName,
        deviceId,
        address: deviceAddress,
        deviceType,
        deviceCategory,
        signalStrength,
        batteryLevel,
        isConnected,
        timestamp,
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('device_discovered', {
        deviceName,
        deviceId,
        deviceType,
        deviceCategory,
        signalStrength,
        batteryLevel,
      });
      SentryLogger.logELDEvent('device_discovered', {
        deviceName,
        deviceId,
        deviceType,
        deviceCategory,
      });

      SentryLogger.logELDEvent('device_discovered', {
        deviceName,
        deviceId,
        deviceType,
        deviceCategory,
      })
      
      SupabaseLogger.logEvent('device_discovered', {
        deviceId,
        deviceName,
        deviceAddress,
        status: isConnected ? 'connected' : 'in_progress',
        eventData: {
          deviceType,
          deviceCategory,
          signalStrength,
          batteryLevel,
          isConnected,
          timestamp,
        }
      });
      
      setState((prevState) => {
        // Check if device already exists to prevent duplicates
        const existingDeviceIndex = prevState.devices.findIndex(
          (existingDevice) => {
            const existingId = existingDevice?.id || '';
            const existingAddress = existingDevice?.address || '';
            const newId = deviceId || '';
            const newAddress = deviceAddress || '';
            return existingId === newId || existingAddress === newAddress;
          }
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
          }];
        }
        
        return {
          ...prevState,
          devices: updatedDevices,
        };
      });
    } catch (error: any) {
      console.error('Error in handleDeviceDiscovered:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('device_discovery_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('device_discovery_error', { error: error?.message || 'Unknown error' });
      SupabaseLogger.logError(error, {
        eventType: 'device_discovery_error',
        additionalData: { platform: Platform.OS }
      });
    }
  };

  const handleDeviceConnected = (device: UniversalDevice) => {
    try {
      // Null checks and fallbacks
      const deviceName = device?.name || 'Unknown Device';
      const deviceId = device?.id || 'unknown';
      const deviceAddress = device?.address || 'unknown';
      const deviceType = device?.deviceType || 'unknown';
      const deviceCategory = device?.deviceCategory || 'unknown';
      const timestamp = new Date().toISOString();
      
      console.log('📱 Device Connected:', {
        deviceName,
        deviceId,
        address: deviceAddress,
        deviceType,
        deviceCategory,
        timestamp,
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('device_connected', {
        deviceName,
        deviceId,
        deviceType,
        deviceCategory,
      });
      SentryLogger.logELDEvent('device_connected', {
        deviceName,
        deviceId,
        deviceType,
        deviceCategory,
      });
      
      SupabaseLogger.logEvent('device_connected', {
        deviceId,
        deviceName,
        deviceAddress,
        status: 'connected',
        eventData: {
          deviceType,
          deviceCategory,
          isConnected: true,
          timestamp,
        }
      });

      setState((prevState) => ({
        ...prevState,
        connectedDevice: device,
        connectionState: 'connected',
      }));
      
      showToast(`Device ${deviceName} connected successfully`, 'success');
    } catch (error: any) {
      console.error('Error in handleDeviceConnected:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('device_connection_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('device_connection_error', { error: error?.message || 'Unknown error' });

      SupabaseLogger.logError(error, {
        eventType: 'device_connection_error',
        additionalData: { platform: Platform.OS }
      });

    }
  };

  const handleDeviceDisconnected = (disconnectionData: any) => {
    try {
      // Extract device and reason from SDK data with null checks
      const device = disconnectionData?.device || disconnectionData || {};
      const reason = disconnectionData?.reason || disconnectionData?.disconnectionReason || 'Unknown reason';
      
      // Null checks and fallbacks
      const deviceName = device?.name || 'Unknown Device';
      const deviceId = device?.id || 'unknown';
      const deviceAddress = device?.address || 'unknown';
      const timestamp = new Date().toISOString();
      
      console.log('disconnectionData', disconnectionData);
      console.log('📱 Device Disconnected:', {
        deviceName,
        deviceId,
        address: deviceAddress,
        reason,
        timestamp,
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('device_disconnected', {
        deviceName,
        deviceId,
        reason,
      });
      SentryLogger.logELDEvent('device_disconnected', {
        deviceName,
        deviceId,
        reason,
      });
      

      SupabaseLogger.logEvent('device_disconnected', {
        deviceId,
        deviceName,
        deviceAddress,
        status: 'disconnected',
        eventData: {
          reason,
          timestamp: new Date().toISOString()
        }
      });


      setState((prevState) => ({
        ...prevState,
        connectedDevice: null,
        connectionState: 'idle',
      }));
      
      showToast(`Device ${deviceName} disconnected: ${reason}`, 'info');
    } catch (error: any) {
      console.error('Error in handleDeviceDisconnected:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('device_disconnection_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('device_disconnection_error', { error: error?.message || 'Unknown error' });
      SupabaseLogger.logError(error, {
        eventType: 'device_disconnection_error',
        additionalData: { platform: Platform.OS }
      });
      
    }
  };

  const handleDataReceived = (data: any) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Null checks and fallbacks
      const dataType = data?.dataType || 'unknown';
      const deviceId = data?.deviceId || 'unknown';
      const rawData = data?.rawData || '';
      const batteryLevel = data?.batteryLevel || -1;
      const signalStrength = data?.signalStrength || -1;
      const isRealData = data?.isRealData || false;
      const hasEldData = !!data?.eldData;
      
      const logData = {
        timestamp,
        dataType,
        deviceId,
        rawDataSize: rawData.length,
        batteryLevel,
        signalStrength,
        isRealData,
        hasEldData,
      };
      
      console.log('📊 Data Received:', logData);
      
      // Log to analytics
      FirebaseLogger.logELDEvent('data_received', {
        dataType,
        deviceId,
        rawDataSize: rawData.length,
        isRealData,
        hasEldData,
      });
      SentryLogger.logELDEvent('data_received', {
        dataType,
        deviceId,
        rawDataSize: rawData.length,
        isRealData,
        hasEldData,
      });
      
      
      // Log detailed data if needed for debugging
      if (rawData) {
        console.log('📊 Raw Data Details:', {
          rawData,
          parsedData: rawData.length > 100 ? 
            `${rawData.substring(0, 100)}... (truncated)` : 
            rawData,
        });
      }
      
      // Handle structured ELD data from native module
      if (dataType === 'ELD_DATA' && data?.eldData) {
        console.log('📊 ELD Structured Data Received:', data.eldData);
        
        // Extract structured ELD components with null checks
        const eldDataObj = data.eldData || {};
        const vin = eldDataObj?.vin || null;
        const can = eldDataObj?.can || null;
        const gps = eldDataObj?.gps || null;
        const events = eldDataObj?.events || null;
        const status = eldDataObj?.status || null;
        
        // Store parsed ELD data in dedicated ELD state
        setEldData({
          vin,
          canData: can,
          gpsData: gps,
          eventData: events,
          status,
          timestamp,
        });
        
        // Update connected device with ELD data
        setState((prevState) => ({
          ...prevState,
          connectedDevice: prevState.connectedDevice ? {
            ...prevState.connectedDevice,
            vin,
            canData: can,
            gpsData: gps,
            eventData: events,
            status,
          } : null,
        }));
        
        // Log ELD data to analytics
        FirebaseLogger.logELDEvent('eld_data_processed', {
          deviceId,
          hasVin: !!vin,
          hasCanData: !!can,
          hasGpsData: !!gps,
          hasEventData: !!events,
          hasStatus: !!status,
        });
        SentryLogger.logELDEvent('eld_data_processed', {
          deviceId,
          hasVin: !!vin,
          hasCanData: !!can,
          hasGpsData: !!gps,
          hasEventData: !!events,
          hasStatus: !!status,
        });
      }
      
      // Handle ELD errors
      if (dataType === 'ELD_ERROR') {
        const errorMessage = data?.error || 'Unknown ELD error';
        console.error('❌ ELD Error:', errorMessage);
        
        // Log error to analytics
        FirebaseLogger.logELDEvent('eld_error', { error: errorMessage });
        SentryLogger.logELDEvent('eld_error', { error: errorMessage });
        
        showToast(`ELD Error: ${errorMessage}`, 'error');
      }
      
      // Fallback: try to parse raw JSON data for compatibility
      if (data?.protocol === 'ELD_DEVICE' && rawData && !data?.eldData) {
        try {
          const eldJson = JSON.parse(rawData);
          const { vin, can_data, gps_data, event_data } = eldJson;
          console.log('📊 ELD JSON Parsed (fallback):', { vin, can_data, gps_data, event_data });
          
          // Store parsed ELD data in dedicated ELD state
          setEldData({
            vin: vin || null,
            canData: can_data || null,
            gpsData: gps_data || null,
            eventData: event_data || null,
            timestamp,
          });
          
          // Update connected device with ELD data
          setState((prevState) => ({
            ...prevState,
            connectedDevice: prevState.connectedDevice ? {
              ...prevState.connectedDevice,
              vin: vin || null,
              canData: can_data || null,
              gpsData: gps_data || null,
              eventData: event_data || null,
            } : null,
          }));
        } catch (e: any) {
          console.error('❌ Failed to parse ELD JSON:', e?.message);
          
          // Log parsing error to analytics
          FirebaseLogger.logELDEvent('eld_json_parsing_error', { error: e?.message });
          SentryLogger.logELDEvent('eld_json_parsing_error', { error: e?.message });
        }
      }

      // Update state with received data
      setState((prevState) => ({
        ...prevState,
        deviceData: [...prevState.deviceData, {
          deviceId,
          timestamp,
          dataType,
          value: data?.value || null,
          sensorValue: data?.sensorValue || null,
          protocol: data?.protocol || null,
          characteristicUuid: data?.characteristicUuid || null,
          rawData,
          batteryLevel,
          signalStrength,
          deviceName: data?.deviceName || null,
          isConnected: data?.isConnected || false,
          isRealData,
        }],
      }));
    } catch (error: any) {
      console.error('Error in handleDataReceived:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('data_processing_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('data_processing_error', { error: error?.message || 'Unknown error' });
    }
  };

  const handleConnectionError = async (error: any) => {
    try {
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
        error: error?.message || 'Unknown error',
      }));
      
      showToast(`Connection failed: ${error?.message || 'Unknown error'}`, 'error');
      
      // Log connection error to analytics
      FirebaseLogger.logELDEvent('connection_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('connection_error', { error: error?.message || 'Unknown error' });
    } catch (error: any) {
      console.error('Error in handleConnectionError:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('connection_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('connection_error', { error: error?.message || 'Unknown error' });
    }
  };

  const handlePermissionError = (error: any) => {
    try {
      console.error('❌ Permission Error:', {
        errorCode: error?.errorCode,
        message: error?.message,
        permissions: error?.permissions,
        timestamp: error?.timestamp,
      });
      
      setState((prevState) => ({
        ...prevState,
        error: `Permission Error: ${error?.message || 'Unknown error'}`,
        isScanning: false,
      }));
      
      showToast(`Permission Error: ${error?.message || 'Unknown error'}`, 'error');
      
      // Log permission error to analytics
      FirebaseLogger.logELDEvent('permission_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('permission_error', { error: error?.message || 'Unknown error' });
    } catch (error: any) {
      console.error('Error in handlePermissionError:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('permission_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('permission_error', { error: error?.message || 'Unknown error' });
    }
  };

  const handleProtocolUpdated = (protocolData: any) => {
    try {
      // Null checks and fallbacks
      const deviceId = protocolData?.deviceId || 'unknown';
      const previousProtocol = protocolData?.previousProtocol || 'UNKNOWN';
      const newProtocol = protocolData?.newProtocol || 'UNKNOWN';
      const timestamp = new Date().toISOString();
      
      console.log('🔄 Protocol Updated:', {
        deviceId,
        previousProtocol,
        newProtocol,
        timestamp,
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('protocol_updated', {
        deviceId,
        previousProtocol,
        newProtocol,
      });
      SentryLogger.logELDEvent('protocol_updated', {
        deviceId,
        previousProtocol,
        newProtocol,
      });
      
      // Update the connected device with the new protocol
      setState((prevState) => ({
        ...prevState,
        connectedDevice: prevState.connectedDevice ? {
          ...prevState.connectedDevice,
          protocol: newProtocol,
        } : null,
      }));
      
      // Show toast notification for protocol update
      if (newProtocol === 'ELD_DEVICE') {
        showToast(`Device identified as ELD! Protocol: ${newProtocol}`, 'success');
      } else if (previousProtocol === 'UNKNOWN' && newProtocol !== 'UNKNOWN') {
        showToast(`Device protocol detected: ${newProtocol}`, 'info');
      }
      
    } catch (error: any) {
      console.error('Error in handleProtocolUpdated:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('protocol_update_error', { error: error?.message || 'Unknown error' });
      SentryLogger.logELDEvent('protocol_update_error', { error: error?.message || 'Unknown error' });
    }
  };

  const handleStartScan = async () => {
    try {
      console.log('🔍 Starting device scan...', {
        scanFilter: 'all',
        scanDuration: 30000,
        enableBackgroundScan: false,
        enableRSSI: true,
        enableDeviceTypeDetection: true,
        timestamp: new Date().toISOString(),
      });
      
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

