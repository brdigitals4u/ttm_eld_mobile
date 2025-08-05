import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { jimiBridgeRemoteLogger } from '../../src/services/JimiBridgeRemoteLogger';


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
          eventEmitterRef.current = new NativeEventEmitter(NativeModules.JimiBridge);
          
          // Setup event listeners
          setupJimiBridgeListeners(eventEmitterRef.current, {
            onDeviceDiscovered: handleDeviceDiscovered,
            onDeviceConnected: handleDeviceConnected,
            onDeviceDisconnected: handleDeviceDisconnected,
            onDataReceived: handleDataReceived,
            onProtocolUpdated: handleProtocolUpdated,
            onSupabaseLog: handleSupabaseLog, // Add Supabase log handler
            onJimiBridgeRemoteLog: handleJimiBridgeRemoteLog, // Add remote log handler
          });
          
          // Add event listeners
          eventEmitterRef.current?.addListener('onDeviceDiscovered', handleDeviceDiscovered);
          eventEmitterRef.current?.addListener('onDeviceConnected', handleDeviceConnected);
          eventEmitterRef.current?.addListener('onDeviceDisconnected', handleDeviceDisconnected);
          eventEmitterRef.current?.addListener('onDataReceived', handleDataReceived);
          eventEmitterRef.current?.addListener('onProtocolUpdated', handleProtocolUpdated);
          eventEmitterRef.current?.addListener('onSupabaseLog', handleSupabaseLog);
          eventEmitterRef.current?.addListener('onJimiBridgeRemoteLog', handleJimiBridgeRemoteLog);
          
          console.log('✅ JimiBridge listeners setup completed');
          
          // Log successful initialization
          FirebaseLogger.logELDEvent('jimi_bridge_initialization_completed');
          SentryLogger.logELDEvent('jimi_bridge_initialization_completed');
          SupabaseLogger.logSDKEvent('jimi_bridge_initialization_completed', undefined, {
            module: 'JimiBridge',
            platform: Platform.OS
          });
        } else {
          console.error('❌ JimiBridge module not found');
         
        }
      } catch (error: any) {
        console.error('❌ Failed to initialize JimiBridge:', error);
        
        // Log initialization error
        FirebaseLogger.logELDEvent('jimi_bridge_initialization_error', { error: error?.message });
        SentryLogger.logELDEvent('jimi_bridge_initialization_error', { error: error?.message });
        SupabaseLogger.logError(error?.message || 'Unknown error', {
          eventType: 'jimi_bridge_initialization_error',
          additionalData: { module: 'JimiBridge', platform: Platform.OS }
        });
        
        setState(prev => ({ ...prev, error: error?.message || 'Failed to initialize Bluetooth module' }));
      }
    };

    initializeJimiBridge();

    return () => {
      if (eventEmitterRef.current) {
        removeJimiBridgeListeners(eventEmitterRef.current);
      }
    };
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
        status: isConnected ? 'connected' : 'connecting',
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
      const characteristicUuid = data?.characteristicUuid || 'unknown';
      
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
        const platformId = eldDataObj?.platformId || null;
        const platformName = eldDataObj?.platformName || null;
        
        // Check if platformId indicates ELD device (108 = PLATFORM_IH009 = ELD platform)
        if (platformId === 108) {
          console.log('✅ Platform ID 108 (PLATFORM_IH009) detected - This is an ELD device!');
          console.log('📋 Platform Name:', platformName);
        }
        
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
            platformId,
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
      
      // Handle OBD protocol data for ELD devices
      if (dataType === 'OBD_PROTOCOL' && data?.obdData) {
        console.log('📊 OBD Protocol Data Received:', data.obdData);
        
        // Extract OBD data with null checks
        const obdDataObj = data.obdData || {};
        const rpm = obdDataObj?.rpm || null;
        const speed = obdDataObj?.speed || null;
        const engineTemp = obdDataObj?.engineTemp || null;
        const throttle = obdDataObj?.throttle || null;
        const fuelLevel = obdDataObj?.fuelLevel || null;
        const voltage = obdDataObj?.voltage || null;
        
        // Store OBD data in device data for sensor cards
        const obdSensorData = {
          deviceId,
          timestamp,
          dataType: 'OBD_PROTOCOL',
          protocol: 'ELD_DEVICE',
          characteristicUuid,
          isRealData: true,
          rawData,
          // OBD specific values
          rpm,
          speed,
          engineTemp,
          throttle,
          fuelLevel,
          voltage,
        };
        
        // Add to device data for sensor cards
        setState((prevState) => ({
          ...prevState,
          deviceData: [...prevState.deviceData, obdSensorData],
        }));
        
        // Log OBD data to analytics
        FirebaseLogger.logELDEvent('obd_data_processed', {
          deviceId,
          hasRpm: !!rpm,
          hasSpeed: !!speed,
          hasEngineTemp: !!engineTemp,
          hasThrottle: !!throttle,
          hasFuelLevel: !!fuelLevel,
          hasVoltage: !!voltage,
        });
        SentryLogger.logELDEvent('obd_data_processed', {
          deviceId,
          hasRpm: !!rpm,
          hasSpeed: !!speed,
          hasEngineTemp: !!engineTemp,
          hasThrottle: !!throttle,
          hasFuelLevel: !!fuelLevel,
          hasVoltage: !!voltage,
        });
      }
      
      // Handle regular sensor data (for both ELD and non-ELD devices)
      if (dataType === 'sensor') {
        console.log('📊 Regular Sensor Data Received:', data);
        
        // Extract sensor data with null checks
        const sensorValue = data?.value || 0;
        const sensorProtocol = data?.protocol || 'unknown';
        
        // Create sensor data object
        const sensorData = {
          deviceId,
          timestamp,
          dataType: 'sensor',
          protocol: sensorProtocol,
          characteristicUuid,
          value: sensorValue,
          isRealData: true,
          rawData,
        };
        
        // Add to device data for sensor cards
        setState((prevState) => ({
          ...prevState,
          deviceData: [...prevState.deviceData, sensorData],
        }));
        
        // Log sensor data to analytics
        FirebaseLogger.logELDEvent('sensor_data_processed', {
          deviceId,
          sensorValue,
          sensorProtocol,
          characteristicUuid,
        });
        SentryLogger.logELDEvent('sensor_data_processed', {
          deviceId,
          sensorValue,
          sensorProtocol,
          characteristicUuid,
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

  // Handle remote logging from JimiBridgeModule.kt
  const handleJimiBridgeRemoteLog = useCallback((event: any) => {
      try {
          const { eventType, logData } = event;
          
          if (eventType === 'jimi_bridge_remote_log') {
              const parsedLogData = JSON.parse(logData);
              console.log('📊 JimiBridge Remote Log received:', parsedLogData);
              
              // Log to Supabase
              jimiBridgeRemoteLogger.logEvent(parsedLogData);
              
              // Log to Firebase and Sentry for critical errors
              if (!parsedLogData.success && parsedLogData.error) {
                  console.log('📊 JimiBridge Error:', {
                      event_type: parsedLogData.event_type,
                      device_id: parsedLogData.device_id,
                      error: parsedLogData.error,
                      error_code: parsedLogData.error_code
                  });
                  
                  console.error('❌ JimiBridge Native Error:', parsedLogData.error);
              }
              
              // Show toast for critical errors
              if (parsedLogData.error_code === 'PROTOCOL_DETECTION_FAILED' || 
                  parsedLogData.error_code === 'CONNECTION_FAILED') {
                  showToast('error', parsedLogData.error || 'Unknown error occurred');
              }
          }
      } catch (error: any) {
          console.error('❌ Error handling JimiBridge remote log:', error);
      }
  }, []);

  // Helper functions for device type and category mapping
  const getDeviceTypeFromProtocol = (protocol: string): string => {
    switch (protocol) {
      case 'ELD_DEVICE':
        return '181';
      case 'CAMERA_DEVICE':
        return '168';
      case 'TRACKING_DEVICE':
        return '165';
      case 'DOORBELL_DEVICE':
        return '106';
      case 'PANORAMIC_DEVICE':
        return '360';
      default:
        return 'unknown';
    }
  };

  const getDeviceCategory = (deviceType: string): string => {
    switch (deviceType) {
      case '181':
        return 'eld';
      case '168':
        return 'camera';
      case '165':
        return 'tracking';
      case '106':
        return 'doorbell';
      case '360':
        return 'panoramic';
      default:
        return 'unknown';
    }
  };

  const handleProtocolUpdated = (protocolData: any) => {
    try {
      console.log('🔄 Protocol updated:', protocolData);
      
      const { deviceId, protocol, timestamp } = protocolData;
      
      // Update device list with new protocol
      setState(prev => ({
        ...prev,
        devices: prev.devices.map(device => 
          device.id === deviceId 
            ? { ...device, protocol, deviceType: getDeviceTypeFromProtocol(protocol), deviceCategory: getDeviceCategory(getDeviceTypeFromProtocol(protocol)) }
            : device
        )
      }));
      
      // Log protocol update
      FirebaseLogger.logELDEvent('protocol_updated', { deviceId, protocol, timestamp });
      SentryLogger.logELDEvent('protocol_updated', { deviceId, protocol, timestamp });
      SupabaseLogger.logEvent('protocol_updated', {
        deviceId,
        deviceAddress: deviceId,
        status: 'connected',
        dataType: 'protocol_detection',
        rawData: protocolData,
        eventData: { protocol, timestamp }
      });
      
      showToast(`Protocol updated: ${protocol}`, 'success');
    } catch (error: any) {
      console.error('❌ Error handling protocol update:', error);
      FirebaseLogger.logELDEvent('protocol_update_error', { error: error?.message });
      SentryLogger.logELDEvent('protocol_update_error', { error: error?.message });
    }
  };

  const handleSupabaseLog = (logData: any) => {
    try {
      console.log('📊 Supabase Log from Native Module:', logData);
      
      // Parse the log data from the native module
      const { eventType, logData: logDataString } = logData;
      const parsedLogData = JSON.parse(logDataString);
      
      console.log('📊 Parsed Supabase Log:', {
        eventType: parsedLogData.event_type,
        deviceId: parsedLogData.device_id,
        deviceName: parsedLogData.device_name,
        protocol: parsedLogData.protocol,
        detectionMethod: parsedLogData.detection_method,
        isKD032: parsedLogData.device_id?.includes('43:15:81') || parsedLogData.device_name?.includes('KD032')
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('supabase_log_from_native', { 
        eventType: parsedLogData.event_type,
        deviceId: parsedLogData.device_id,
        protocol: parsedLogData.protocol,
        detectionMethod: parsedLogData.detection_method
      });
      
      SentryLogger.logELDEvent('supabase_log_from_native', { 
        eventType: parsedLogData.event_type,
        deviceId: parsedLogData.device_id,
        protocol: parsedLogData.protocol
      });
      
      // Specific handling for KD032-431581 protocol detection issue
      if (parsedLogData.device_id?.includes('43:15:81') || parsedLogData.device_name?.includes('KD032')) {
        console.warn('⚠️ KD032 device detected in Supabase logs:', {
          deviceId: parsedLogData.device_id,
          deviceName: parsedLogData.device_name,
          protocol: parsedLogData.protocol,
          detectionMethod: parsedLogData.detection_method,
          eventType: parsedLogData.event_type
        });
        
        // Show toast for protocol unknown issues
        if (parsedLogData.protocol === 'UNKNOWN' && parsedLogData.event_type === 'protocol_unknown') {
          showToast('KD032 device protocol detection failed. Check logs for details.', 'warning');
        }
      }
      
      // Log to Supabase for persistence
      SupabaseLogger.logEvent('native_module_log', {
        deviceId: parsedLogData.device_id,
        deviceName: parsedLogData.device_name,
        deviceAddress: parsedLogData.device_address,
        status: 'connected',
        dataType: parsedLogData.data_type,
        rawData: parsedLogData,
        eventData: {
          protocol: parsedLogData.protocol,
          detectionMethod: parsedLogData.detection_method,
          platformId: parsedLogData.platform_id,
          serviceUuids: parsedLogData.service_uuids,
          manufacturerData: parsedLogData.manufacturer_data,
          deviceClass: parsedLogData.device_class,
          deviceType: parsedLogData.device_type,
          error: parsedLogData.error,
          metadata: parsedLogData.metadata
        }
      });
      
    } catch (error: any) {
      console.error('❌ Error handling Supabase log from native module:', error);
      FirebaseLogger.logELDEvent('supabase_log_parsing_error', { error: error?.message });
      SentryLogger.logELDEvent('supabase_log_parsing_error', { error: error?.message });
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

