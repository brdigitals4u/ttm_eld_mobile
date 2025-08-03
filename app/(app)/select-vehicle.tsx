// app/(app)/select-vehicle.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown, ZoomIn, ZoomOut } from 'react-native-reanimated';
import Modal from 'react-native-modal';
import { useVehicleSetup, VehicleSetupProvider, SetupStep, ConnectionStage } from '@/context/vehicle-setup-context';
import { TTMBLEManager, BLEDevice, ConnectionFailure, NotifyData, TTMEventSubscription } from "@/src/utils/TTMBLEManager";
import { router } from "expo-router";
import { PermissionsAndroid } from 'react-native';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useNavigationAnalytics } from '@/src/hooks/useNavigationAnalytics';
// import { useTheme } from '@/context/theme-context'; // Uncomment if you have theme context
import { Search, Bluetooth, Truck } from 'lucide-react-native'; // Add these icons
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ELDDeviceService } from '@/src/services/ELDDeviceService';
import { safeRemoveListener } from '@/components/vehicle-setup/ListenerCleanup';
import {
  ScanDevicesStep,
  DeviceSelectedStep,
  ConnectingStep,
  SuccessStep,
  ErrorStep,
  DataCollectionStep
} from '@/src/components/vehicle-setup-steps';
import KD032Simulator from '@/components/KD032Simulator';

// Theme colors (replace with your theme context if available)
const colors = {
  background: '#FFFFFF',
  card: '#F9FAFB',
  text: '#111827',
  inactive: '#6B7280',
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
};

type TTMDevice = BLEDevice;

function SelectVehicleComponent() {
  const insets = useSafeAreaInsets();
  // Local state for compatibility with existing code
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTimeRemaining, setScanTimeRemaining] = useState(0);
  const [scanAttempt, setScanAttempt] = useState(0);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [receivedData, setReceivedData] = useState<NotifyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Context state
  const {
    currentStep,
    connectionStage,
    selectedDevice,
    scannedDevices,
    isScanning,
    isConnecting,
    setStep,
    setConnectionStage,
    setSelectedDevice,
    setScannedDevices,
    addScannedDevice,
    setIsScanning,
    setIsConnecting,
    setError,
    progress,
    setProgress,
    error,
    addLog
  } = useVehicleSetup();

  // Analytics hooks
  const { trackEvent, trackScreenView, trackUserAction } = useAnalytics();
  const { currentPath } = useNavigationAnalytics();



  // Request Bluetooth permissions
  const requestAppPermissions = useCallback(async () => {
    console.log("🔐 Requesting Bluetooth and Location permissions...");
    trackEvent('permission_request_started', {
      platform: Platform.OS,
      screen: 'select_vehicle',
      permission_type: 'bluetooth_location',
    });

    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      let permissionsToRequest = [];
      
      if (apiLevel >= 31) {
        permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
      } else {
        permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
      }
      
      try {
        const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (allGranted) {
          console.log("✅ All permissions granted");
          addLog("All permissions granted");
        } else {
          console.log("❌ Some permissions denied:", results);
          addLog(`Some permissions denied: ${JSON.stringify(results)}`);
        }
        
        return allGranted;
      } catch (error) {
        console.error("Error requesting permissions:", error);
        addLog(`Permission request error: ${error}`);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      // For iOS, we'll assume permissions are granted for now
      console.log("✅ iOS permissions assumed granted");
      addLog("iOS permissions assumed granted");
      return true;
    }
    
    return false;
  }, [trackEvent, addLog]);

  useEffect(() => {
    // Initialize TTM SDK
    const initializeSDK = async () => {
      try {
        await TTMBLEManager.initSDK();
        console.log('TTM SDK initialized successfully');
        
        // Configure SDK to show all devices (disable filtering) for testing
        await TTMBLEManager.configureSDK({
          filterDevices: false, // Show all BLE devices
          debugMode: true       // Enable debug logging
        });
        console.log('TTM SDK configured for testing - all devices visible');
        
        // Log SDK initialization to Supabase
        ELDDeviceService.logConnectionAttempt(
          { id: 'sdk_init', name: 'TTM SDK', address: 'N/A', signal: 0 },
          0,
          'ttm_sdk'
        );
      } catch (error: any) {
        console.error('Failed to initialize TTM SDK:', error);
        // Log SDK initialization error
        ELDDeviceService.logConnectionError(
          { id: 'sdk_init', name: 'TTM SDK', address: 'N/A', signal: 0 },
          {
            errorType: 'SDK_INIT_ERROR',
            errorCode: 'SDK_INIT_FAILED',
            ttmSdkMessage: error.message,
            message: 'TTM SDK initialization failed',
            reason: error.message
          }
        );
      }
    };

    initializeSDK();

    const scanSubscription = TTMBLEManager.onDeviceScanned((device: BLEDevice) => {
      console.log('Device scanned:', device);
      addScannedDevice(device);
    });

    const connectFailureSubscription = TTMBLEManager.onConnectFailure((error: ConnectionFailure) => {
      console.error('Connection failure:', error);
      setIsConnecting(false);
      setConnectingDeviceId(null);
      
      // Log connection failure to Supabase
      if (selectedDevice) {
        ELDDeviceService.logConnectionError(selectedDevice, {
          errorType: 'CONNECTION_FAILURE',
          errorCode: error.status.toString(),
          ttmSdkMessage: error.message,
          message: 'TTM SDK connection failed',
          reason: error.message
        });
      }
    });

    const disconnectSubscription = TTMBLEManager.onDisconnected(() => {
      console.log('Device disconnected');
      
      Alert.alert("Disconnected", "The ELD device has disconnected.");
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setIsConnected(false);
    });
    
    const connectedSubscription = TTMBLEManager.onConnected(() => {
      setIsConnected(true);
      
      // Log successful connection to Supabase
      if (selectedDevice) {
        ELDDeviceService.logConnectionSuccess(selectedDevice);
      }
    });

    const authSubscription = TTMBLEManager.onAuthenticationPassed(() => {
      console.log('Device authentication passed');
      
      // Log successful authentication to Supabase
      if (connectingDeviceId) {
        ELDDeviceService.logAuthentication(connectingDeviceId, true);
      }
    });

    // Global data listener - only active when NOT in data collection phase
    const notifySubscription = TTMBLEManager.onNotifyReceived((data: NotifyData) => {
      // Only process data if we're not in the data collection phase
      if (currentStep !== SetupStep.DATA_COLLECTION) {
        console.log('=== GLOBAL ELD DATA RECEIVED ===');
        console.log('Full data object:', JSON.stringify(data, null, 2));
        console.log('DataType:', data.dataType);
        console.log('RawData length:', data.rawData?.length || 0);
        console.log('RawData:', data.rawData);
        console.log('ACK:', data.ack);
        console.log('Error:', data.error);
        console.log('================================');
        
      setReceivedData(prev => [...prev, data]);
      
        // Log ALL ELD data to Supabase for analysis
      if (connectingDeviceId) {
        ELDDeviceService.logELDData(connectingDeviceId, data);
        }
      }
    });

    return () => {
      scanSubscription.remove();
      connectFailureSubscription.remove();
      disconnectSubscription.remove();
      connectedSubscription.remove();
      authSubscription.remove();
      notifySubscription.remove();
    };
  }, [currentStep]); // Add currentStep as dependency

  const startScan = async () => {
    const SCAN_DURATION_SECONDS = 120; // 2 minutes
    const currentAttempt = scanAttempt + 1;
    
    trackUserAction('scan_initiated', 'scan_button', {
      screen: 'select_vehicle',
      existing_devices_count: scannedDevices.length,
      scan_attempt: currentAttempt,
    });

    const granted = await requestAppPermissions();
    if (!granted) {
      trackEvent('scan_cancelled', {
        reason: 'permission_denied',
        screen: 'select_vehicle',
      });
      Alert.alert("Permission Required", "Bluetooth and Location permissions are required to scan for ELD devices.");
      return;
    }

    trackEvent('ble_scan_started', {
      screen: 'select_vehicle',
      scan_duration_seconds: SCAN_DURATION_SECONDS,
      platform: Platform.OS,
      scan_attempt: currentAttempt,
    });

    // Reset state
    setScannedDevices([]);
    setIsScanning(true);
    setScanProgress(0);
    setScanTimeRemaining(SCAN_DURATION_SECONDS);
    setScanAttempt(currentAttempt);

    // Update progress every second
    const progressInterval = setInterval(() => {
      setScanTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1);
        setScanProgress(((SCAN_DURATION_SECONDS - newTime) / SCAN_DURATION_SECONDS) * 100);
        
        if (newTime === 0) {
          clearInterval(progressInterval);
        }
        return newTime;
      });
    }, 1000);

    try {
      await TTMBLEManager.startScan(SCAN_DURATION_SECONDS);
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Error', 'Failed to start BLE scan. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
      setScanProgress(100);
      setScanTimeRemaining(0);
      
      trackEvent('ble_scan_completed', {
        screen: 'select_vehicle',
        devices_found: scannedDevices.length,
        scan_duration_seconds: SCAN_DURATION_SECONDS,
        platform: Platform.OS,
        scan_attempt: currentAttempt,
      });
    }
  };

  const handleConnectInitiation = (device: TTMDevice) => {
    trackUserAction('device_selected', 'device_button', {
      screen: 'select_vehicle',
      device_id: device.id.substring(device.id.length - 4),
      device_name: device.name || 'unnamed',
      total_devices_available: scannedDevices.length,
    });

    // Connect directly without passcode (like Jimi IoT app)
    setSelectedDevice(device);
    setStep(SetupStep.CONNECTING);
    handleDeviceConnect(device);
    
    trackEvent('connection_initiated', {
      screen: 'select_vehicle',
      device_id: device.id.substring(device.id.length - 4),
      device_name: device.name || 'unnamed',
    });
  };

    // Handle device connection with Jimi IoT app flow
    const handleDeviceConnect = async (device: BLEDevice) => {
      try {
    setSelectedDevice(device);
        setStep(SetupStep.CONNECTING);
        addLog(`Connecting to ${device.name || device.id}...`);
        
        // Connect using Jimi IoT app flow - no passcode, simple connection
        await TTMBLEManager.connect(device.id, "66666666", true);
        addLog('Connection request sent successfully');
        
        // Wait for connection and authentication
      setStep(SetupStep.CONNECTING);
        addLog('Waiting for device connection and authentication...');
        
        // Wait for authentication to complete
        await new Promise<void>((resolve, reject) => {
          const authTimeout = setTimeout(() => {
            reject(new Error('Authentication timeout'));
          }, 15000); // 15 seconds for authentication (faster like Jimi IoT app)
          
          // Listen for authentication passed event (from simulator)
          const authPassedListener = TTMBLEManager.onAuthenticationPassed(() => {
            console.log('Authentication passed event received');
            clearTimeout(authTimeout);
            resolve();
          });
          
          // Listen for any ELD data as authentication success
          const authSuccessListener = TTMBLEManager.onNotifyReceived((data: NotifyData) => {
            console.log('Auth check - received data:', data);
            
            // Accept any ELD data as authentication success
            if (data.dataType === 'ELD_DATA' || 
                data.dataType === 'BtParseData' || 
                data.dataType === 'MALFUNCTION' || 
                data.dataType === 'AUTHENTICATION' || 
                data.dataType === 'CONNECTION_STATUS') {
              clearTimeout(authTimeout);
              console.log('Authentication successful - received ELD data');
              resolve();
            }
          });
        });
        
        addLog('Device connected and authenticated successfully');
        setStep(SetupStep.DATA_COLLECTION);
        
        // Start ELD data collection immediately
        addLog('Starting ELD data collection...');
      await TTMBLEManager.startReportEldData();
        addLog('ELD data collection started - data should appear in real-time');
        
        // Log successful connection
        ELDDeviceService.logConnectionSuccess(device);
        
        // Set up real-time data listener like Jimi IoT app
        const eldDataListener = TTMBLEManager.onNotifyReceived((data: NotifyData) => {
          console.log('Real-time ELD data received:', data);
          
          // Log all data to Supabase for analysis
          ELDDeviceService.logELDData(device.id, data);
          
          // Display data in real-time like Jimi IoT app
          addLog(`Real-time data: ${data.dataType} received`);
          
          // Update UI with real-time data
          setReceivedData(prev => [...prev, data]);
          
          // Show success when we get any ELD data (more flexible)
          if (data.dataType === 'ELD_DATA' || 
              data.dataType === 'BtParseData' || 
              data.dataType === 'MALFUNCTION' || 
              data.dataType === 'AUTHENTICATION' || 
              data.dataType === 'CONNECTION_STATUS') {
            addLog('ELD data flowing in real-time');
            setStep(SetupStep.SUCCESS);
            ELDDeviceService.logDataCollectionStatus(
              device.id,
              'active',
              1,
              new Date(),
              undefined,
              `Real-time ELD data flowing: ${data.dataType}`
            );
          }
      });

        // Stay on current screen after successful connection
        // User can manually navigate when ready
        
      } catch (ttmSdkError: any) {
        console.error('TTM SDK connection error:', ttmSdkError);
        
        // Log connection error to Supabase
        ELDDeviceService.logConnectionError(device, {
          errorType: 'connection_failed',
          errorCode: ttmSdkError.code || 'UNKNOWN_ERROR',
          ttmSdkMessage: ttmSdkError.message,
          message: ttmSdkError.message || 'Connection failed',
          reason: ttmSdkError.message
        });
        
        // Enhanced error handling based on TTM SDK error codes
        let finalErrorType = 'connection_failed';
        let finalErrorMessage = ttmSdkError.code || ttmSdkError.message || 'Unknown connection error';
        let finalErrorDetails = ttmSdkError.message || `Failed to connect to ${device.name || device.id}`;
        let finalErrorCode = ttmSdkError.code || 'UNKNOWN_ERROR';

        // Handle specific TTM SDK error codes
        switch (ttmSdkError.code) {
          case 'NON_ELD_DEVICE':
            finalErrorType = 'non_eld_device';
            finalErrorMessage = 'This device is not an ELD';
            finalErrorDetails = `Device "${device.name || device.id}" is not a certified Electronic Logging Device. Please connect to a real ELD device.`;
            finalErrorCode = 'NON_ELD_DEVICE';
            break;
          case 'ELD_DATA_TIMEOUT':
            finalErrorType = 'eld_data_timeout';
            finalErrorMessage = 'No ELD data received';
            finalErrorDetails = `Device "${device.name || device.id}" connected but did not transmit ELD data within the timeout period.`;
            finalErrorCode = 'ELD_DATA_TIMEOUT';
            break;
          case 'CONNECTION_TIMEOUT':
            finalErrorType = 'connection_timeout';
            finalErrorMessage = 'Connection timed out';
            finalErrorDetails = `Failed to connect to device "${device.name || device.id}" within the timeout period.`;
            finalErrorCode = 'CONNECTION_TIMEOUT';
            break;
          case 'DEVICE_NOT_FOUND':
            finalErrorType = 'device_not_found';
            finalErrorMessage = 'Device not found';
            finalErrorDetails = `Device "${device.name || device.id}" is no longer available.`;
            finalErrorCode = 'DEVICE_NOT_FOUND';
            break;
          case 'BLUETOOTH_PERMISSION_DENIED':
            finalErrorType = 'bluetooth_permission_denied';
            finalErrorMessage = 'Bluetooth permission denied';
            finalErrorDetails = 'Please grant Bluetooth permissions to use this app.';
            finalErrorCode = 'BLUETOOTH_PERMISSION_DENIED';
            break;
          case 'BLUETOOTH_ERROR':
            finalErrorType = 'bluetooth_error';
            finalErrorMessage = 'Bluetooth error';
            finalErrorDetails = 'A Bluetooth error occurred. Please check your Bluetooth settings.';
            finalErrorCode = 'BLUETOOTH_ERROR';
            break;
          default:
            // Use the original error information
            break;
        }

        setError({ 
          type: finalErrorType, 
          message: finalErrorMessage, 
          details: finalErrorDetails, 
          code: finalErrorCode 
        });
      setStep(SetupStep.ERROR);
        addLog(`Connection failed: ${finalErrorMessage}`);
    }
  };





  const Button = ({ title, onPress, loading = false, disabled = false, variant = 'primary', fullWidth = false, style = {} }: any) => (
    <Pressable
      style={[
        styles.button,
        variant === 'outline' && styles.buttonOutline,
        fullWidth && styles.buttonFullWidth,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? colors.primary : '#FFFFFF'} />
      ) : (
        <Text style={[
          styles.buttonText,
          variant === 'outline' && styles.buttonTextOutline,
          disabled && styles.buttonTextDisabled,
        ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );

  const DeviceCard = ({ device, onConnect, isConnecting }: { device: TTMDevice, onConnect: () => void, isConnecting: boolean }) => {
    return (
      <View style={[styles.deviceCard, isConnecting && styles.deviceCardConnecting]}>
        <View style={styles.deviceCardContent}>
          <View style={styles.deviceIcon}>
            <Bluetooth size={24} color={isConnecting ? colors.warning : colors.primary} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {device.name || "Unnamed Device"}
            </Text>
            <Text style={[styles.deviceId, { color: colors.inactive }]}>
              ID: {device.id.substring(device.id.length - 8)}
            </Text>
          </View>
          <View style={styles.deviceActions}>
            {isConnecting ? (
              <ActivityIndicator size="small" color={colors.warning} />
                          ) : (
                <Button
                  title="Connect"
                  onPress={onConnect}
                  disabled={isConnecting}
                  variant="primary"
                />
              )}
          </View>
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case SetupStep.SCAN_DEVICES:
        return (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
            <ScanDevicesStep />
          </Animated.View>
        );
      case SetupStep.DEVICE_SELECTED:
        return (
          <Animated.View entering={SlideInUp} exiting={SlideOutDown} style={styles.stepContainer}>
            <DeviceSelectedStep />
          </Animated.View>
        );
      case SetupStep.CONNECTING:
        return (
          <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
            <ConnectingStep />
          </Animated.View>
        );
      case SetupStep.SUCCESS:
        return (
          <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
            <SuccessStep />
          </Animated.View>
        );
      case SetupStep.ERROR:
        return (
          <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
            <ErrorStep />
          </Animated.View>
        );
      case SetupStep.DATA_COLLECTION:
        return (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
            <DataCollectionStep />
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Truck size={48} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>ELD Device Setup</Text>
            <Text style={[styles.subtitle, { color: colors.inactive }]}>
              Scan and connect to your Electronic Logging Device
            </Text>
          </View>

          {/* KD032 Simulator for Testing */}
          {__DEV__ && <KD032Simulator />}

          {/* Render current step */}
          {renderCurrentStep()}

          {/* Show scan controls and device list only on SCAN_DEVICES step */}
          {currentStep === SetupStep.SCAN_DEVICES && (
            <>
              <View style={styles.scanSection}>
                <Button
                  title={isScanning ? `Scanning... (${Math.floor(scanTimeRemaining / 60)}:${(scanTimeRemaining % 60).toString().padStart(2, '0')})` : "Scan for Devices (2 min)"}
                  onPress={startScan}
                  loading={isScanning}
                  disabled={isConnecting}
                  fullWidth
                />
                
                {isScanning && (
                  <View style={styles.scanningContainer}>
                    <View style={styles.scanningIndicator}>
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                      <Text style={[styles.scanningText, { color: colors.inactive }]}>
                        Searching for ELD devices... (Attempt #{scanAttempt})
                      </Text>
                    </View>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBackground}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { width: `${scanProgress}%`, backgroundColor: colors.primary }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.inactive }]}>
                        {Math.floor(scanTimeRemaining / 60)}:{(scanTimeRemaining % 60).toString().padStart(2, '0')} remaining
                      </Text>
                    </View>
                    
                    {/* Scanning Tips */}
                    <View style={styles.scanningTips}>
                      <Text style={[styles.tipsTitle, { color: colors.text }]}>Scanning Tips:</Text>
                      <Text style={[styles.tipsText, { color: colors.inactive }]}>• Ensure your ELD device is powered on</Text>
                      <Text style={[styles.tipsText, { color: colors.inactive }]}>• Keep devices within 30 feet</Text>
                      <Text style={[styles.tipsText, { color: colors.inactive }]}>• Wait for the full 2-minute scan</Text>
                    </View>
                  </View>
                )}
              </View>

              {scannedDevices.length > 0 && (
                <View style={styles.devicesSection}>
                  <Text style={[styles.devicesSectionTitle, { color: colors.text }]}>
                    Available Devices ({scannedDevices.length})
                  </Text>
                  {scannedDevices.map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        onConnect={() => handleConnectInitiation(device)} // Use smart device detection
                        isConnecting={connectingDeviceId === device.id}
                      />
                  ))}
                </View>
              )}

              {scannedDevices.length === 0 && !isScanning && (
                <View style={styles.emptyState}>
                  <Search size={48} color={colors.inactive} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                    No Devices Found
                  </Text>
                  <Text style={[styles.emptyStateText, { color: colors.inactive }]}>
                    Tap "Scan for Devices" to discover nearby ELD devices
                  </Text>
                </View>
              )}

              {/* Alternative Scan Methods */}
              {(scannedDevices.length === 0 && !isScanning) && (
                <View style={styles.alternativeMethods}>
                  <Text style={[styles.alternativeTitle, { color: colors.text }]}>Alternative Scan Methods</Text>
                  <Text style={[styles.alternativeSubtitle, { color: colors.inactive }]}>
                    If no devices appear, try these alternative scanning methods:
                  </Text>
                  
                  <Button
                    title="🔍 Direct BLE Scan (2 min)"
                    onPress={async () => {
                      try {
                        console.log('Starting direct BLE scan...');
                        await TTMBLEManager.startDirectScan(120);
                      } catch (error) {
                        console.error('Failed to start direct scan:', error);
                        Alert.alert('Direct Scan Error', 'Failed to start direct BLE scan. Please try again.');
                      }
                    }}
                    variant="outline"
                    fullWidth
                    style={styles.alternativeButton}
                  />
                  
                </View>
              )}
            </>
          )}

          {/* Show ELD Data Display only on DATA_COLLECTION step */}
          {currentStep === SetupStep.DATA_COLLECTION && isConnected && receivedData.length > 0 && (
            <View style={styles.eldDataSection}>
              <Text style={[styles.eldDataTitle, { color: colors.text }]}>Live ELD Data Stream</Text>
              <Text style={[styles.eldDataSubtitle, { color: colors.inactive }]}>
                Real-time data from your ELD device ({receivedData.length} records received)
              </Text>
              
              <ScrollView style={styles.eldDataContainer} nestedScrollEnabled={true}>
                {receivedData.slice(-5).reverse().map((data, index) => {
                  // Parse ELD data based on type
                  let parsedData = null;
                  try {
                    parsedData = JSON.parse(data.rawData);
                  } catch (error) {
                    console.warn('Failed to parse ELD data:', error);
                  }

                  return (
                    <View key={index} style={[styles.eldDataItem, { borderColor: colors.border }]}>
                      <View style={styles.eldDataHeader}>
                        <View style={styles.eldDataTypeContainer}>
                          <Text style={[styles.eldDataType, { color: colors.primary }]}>
                            {data.dataType || 'Unknown'}
                          </Text>
                          {data.dataType === 'ELD_DATA' && (
                            <View style={[styles.eldDataBadge, { backgroundColor: colors.success + '20' }]}>
                              <Text style={[styles.eldDataBadgeText, { color: colors.success }]}>LIVE</Text>
                            </View>
                          )}
                          {data.dataType === 'MALFUNCTION' && (
                            <View style={[styles.eldDataBadge, { backgroundColor: colors.error + '20' }]}>
                              <Text style={[styles.eldDataBadgeText, { color: colors.error }]}>ALERT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.eldDataTime, { color: colors.inactive }]}>
                          {new Date().toLocaleTimeString()}
                        </Text>
                      </View>
                      
                      {/* ELD_DATA Display */}
                      {data.dataType === 'ELD_DATA' && parsedData && (
                        <View style={styles.eldDataContent}>
                          {/* Vehicle Metrics */}
                          {parsedData.vehicleData && (
                            <View style={styles.eldDataSection}>
                              <Text style={[styles.eldDataSectionTitle, { color: colors.text }]}>Vehicle Metrics</Text>
                              <View style={styles.eldDataGrid}>
                                <View style={styles.eldDataMetric}>
                                  <Text style={[styles.eldDataMetricValue, { color: colors.primary }]}>
                                    {parsedData.vehicleData.speed || '0'} mph
                                  </Text>
                                  <Text style={[styles.eldDataMetricLabel, { color: colors.inactive }]}>Speed</Text>
                                </View>
                                <View style={styles.eldDataMetric}>
                                  <Text style={[styles.eldDataMetricValue, { color: colors.primary }]}>
                                    {parsedData.vehicleData.rpm || '0'}
                                  </Text>
                                  <Text style={[styles.eldDataMetricLabel, { color: colors.inactive }]}>RPM</Text>
                                </View>
                                <View style={styles.eldDataMetric}>
                                  <Text style={[styles.eldDataMetricValue, { color: colors.primary }]}>
                                    {parsedData.vehicleData.fuelLevel || '0'}%
                                  </Text>
                                  <Text style={[styles.eldDataMetricLabel, { color: colors.inactive }]}>Fuel</Text>
                                </View>
                                <View style={styles.eldDataMetric}>
                                  <Text style={[styles.eldDataMetricValue, { color: colors.primary }]}>
                                    {parsedData.vehicleData.engineTemp || '0'}°F
                                  </Text>
                                  <Text style={[styles.eldDataMetricLabel, { color: colors.inactive }]}>Engine Temp</Text>
                                </View>
                              </View>
                            </View>
                          )}
                          
                          {/* Driver Status & HOS */}
                          <View style={styles.eldDataSection}>
                            <Text style={[styles.eldDataSectionTitle, { color: colors.text }]}>Driver Status</Text>
                            <View style={styles.eldDriverStatus}>
                              <View style={[styles.eldDriverStatusBadge, { 
                                backgroundColor: parsedData.driverStatus === 'driving' ? colors.warning + '20' : colors.success + '20' 
                              }]}>
                                <Text style={[styles.eldDriverStatusText, { 
                                  color: parsedData.driverStatus === 'driving' ? colors.warning : colors.success 
                                }]}>
                                  {parsedData.driverStatus || 'Unknown'}
                                </Text>
                              </View>
                            </View>
                            
                            {/* Hours of Service */}
                            {parsedData.hoursOfService && (
                              <View style={styles.eldHosGrid}>
                                <View style={styles.eldHosItem}>
                                  <Text style={[styles.eldHosValue, { color: colors.text }]}>
                                    {Math.floor((parsedData.hoursOfService.driveTimeRemaining || 0) / 60)}h {(parsedData.hoursOfService.driveTimeRemaining || 0) % 60}m
                                  </Text>
                                  <Text style={[styles.eldHosLabel, { color: colors.inactive }]}>Drive Time Left</Text>
                                </View>
                                <View style={styles.eldHosItem}>
                                  <Text style={[styles.eldHosValue, { color: colors.text }]}>
                                    {Math.floor((parsedData.hoursOfService.shiftTimeRemaining || 0) / 60)}h {(parsedData.hoursOfService.shiftTimeRemaining || 0) % 60}m
                                  </Text>
                                  <Text style={[styles.eldHosLabel, { color: colors.inactive }]}>Shift Time Left</Text>
                                </View>
                              </View>
                            )}
                          </View>
                          
                          {/* GPS Location */}
                          {parsedData.vehicleData?.location && (
                            <View style={styles.eldDataSection}>
                              <Text style={[styles.eldDataSectionTitle, { color: colors.text }]}>GPS Location</Text>
                              <Text style={[styles.eldLocationText, { color: colors.text }]}>
                                📍 {parsedData.vehicleData.location.latitude?.toFixed(6)}, {parsedData.vehicleData.location.longitude?.toFixed(6)}
                              </Text>
                              <Text style={[styles.eldLocationAccuracy, { color: colors.inactive }]}>
                                Accuracy: ±{parsedData.vehicleData.location.accuracy || 0}m
                              </Text>
                            </View>
                          )}
                          
                          {/* Diagnostic Codes */}
                          {parsedData.vehicleData?.diagnosticCodes && parsedData.vehicleData.diagnosticCodes.length > 0 && (
                            <View style={styles.eldDataSection}>
                              <Text style={[styles.eldDataSectionTitle, { color: colors.text }]}>Diagnostic Codes</Text>
                              <View style={styles.eldDiagnosticCodes}>
                                {parsedData.vehicleData.diagnosticCodes.map((code: any, codeIndex: any) => (
                                  <View key={codeIndex} style={[styles.eldDiagnosticCode, { backgroundColor: colors.warning + '20' }]}>
                                    <Text style={[styles.eldDiagnosticCodeText, { color: colors.warning }]}>{code}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                      
                      {/* MALFUNCTION Display */}
                      {data.dataType === 'MALFUNCTION' && parsedData && (
                        <View style={styles.eldDataContent}>
                          <View style={[styles.eldMalfunctionAlert, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
                            <Text style={[styles.eldMalfunctionCode, { color: colors.error }]}>
                              🚨 {parsedData.errorCode || 'UNKNOWN_ERROR'}
                            </Text>
                            <Text style={[styles.eldMalfunctionMessage, { color: colors.text }]}>
                              {parsedData.message || 'Device malfunction detected'}
                            </Text>
                          </View>
                        </View>
                      )}
                      
                      {/* Raw Data (fallback) */}
                      {!parsedData && data.rawData && (
                        <View style={styles.eldRawDataSection}>
                          <Text style={[styles.eldDataSectionTitle, { color: colors.text }]}>Raw Data</Text>
                          <Text style={[styles.eldDataRaw, { color: colors.text }]} numberOfLines={3}>
                            {data.rawData}
                          </Text>
                        </View>
                      )}
                      
                      {/* ACK & Error Status */}
                      <View style={styles.eldDataFooter}>
                        {data.ack && (
                          <Text style={[styles.eldDataAck, { color: colors.success }]}>
                            ✓ ACK: {data.ack}
                          </Text>
                        )}
                        {data.error && (
                          <Text style={[styles.eldDataError, { color: colors.error }]}>
                            ⚠ Error: {data.error}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
                
                {receivedData.length > 5 && (
                  <Text style={[styles.eldDataMore, { color: colors.inactive }]}>
                    Showing latest 5 of {receivedData.length} records
                  </Text>
                )}
                
                {/* Data Types Legend */}
                <View style={styles.eldDataLegend}>
                  <Text style={[styles.eldDataLegendTitle, { color: colors.text }]}>Data Types Available:</Text>
                  <Text style={[styles.eldDataLegendItem, { color: colors.inactive }]}>• ELD_DATA - Vehicle metrics, GPS, driver status, HOS</Text>
                  <Text style={[styles.eldDataLegendItem, { color: colors.inactive }]}>• MALFUNCTION - Error notifications and alerts</Text>
                  <Text style={[styles.eldDataLegendItem, { color: colors.inactive }]}>• AUTHENTICATION - Auth status updates</Text>
                  <Text style={[styles.eldDataLegendItem, { color: colors.inactive }]}>• CONNECTION_STATUS - Connection state changes</Text>
                </View>
              </ScrollView>
              
              <View style={styles.eldDataActions}>
                <Button
                  title="Clear Data"
                  onPress={() => {
                    setReceivedData([]);
                    trackEvent('eld_data_cleared', { screen: 'select_vehicle' });
                  }}
                  variant="outline"
                  style={styles.eldDataButton}
                />
                
                <Button
                  title="Export Data"
                  onPress={() => {
                    const dataString = JSON.stringify(receivedData, null, 2);
                    console.log('ELD Data Export:', dataString);
                    Alert.alert('Data Exported', `${receivedData.length} records logged to console`);
                    trackEvent('eld_data_exported', { 
                      screen: 'select_vehicle', 
                      record_count: receivedData.length 
                    });
                  }}
                  variant="outline"
                  style={styles.eldDataButton}
                />
              </View>
            </View>
          )}

        </View>
      </ScrollView>



    </KeyboardAvoidingView>
  );
}


// Main export with VehicleSetupProvider wrapper
export default function SelectVehicleScreen() {
  return (
    <VehicleSetupProvider>
      <SelectVehicleComponent />
    </VehicleSetupProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start', // Changed to flex-start
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20, // Added margin
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  scanSection: {
    marginBottom: 32,
  },
  scanningContainer: {
    marginTop: 16,
  },
  scanningIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanningText: {
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  scanningTips: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 12,
    marginBottom: 2,
  },
  alternativeMethods: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  alternativeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  alternativeSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  alternativeButton: {
    marginBottom: 8,
  },
  devicesSection: {
    marginBottom: 24,
  },
  devicesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deviceCardConnecting: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  deviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: '#3B82F6',
  },
  buttonTextDisabled: {
    color: '#FFFFFF',
  },
  modalKeyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalForm: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  eldDataSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  eldDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eldDataSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  eldDataContainer: {
    maxHeight: 300,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  eldDataItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eldDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // **FIXED**: Typo corrected
    alignItems: 'center',
    marginBottom: 8,
  },
  eldDataType: {
    fontSize: 14,
    fontWeight: '600',
  },
  eldDataTime: {
    fontSize: 12,
  },
  eldDataRaw: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  eldDataAck: {
    fontSize: 12,
    fontWeight: '500',
  },
  eldDataError: {
    fontSize: 12,
    fontWeight: '500',
  },
  eldDataMore: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  eldDataActions: {
    flexDirection: 'row',
    gap: 12,
  },
  eldDataButton: {
    flex: 1,
  },
  selectedDeviceInfo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedDeviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDeviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectedDeviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedDeviceId: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300, // Give step container a minimum height
  },
  eldDataTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eldDataBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eldDataBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  eldDataContent: {
    marginTop: 8,
  },
  eldDataSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    color: colors.text, // Ensure text color
  },
  eldDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  eldDataMetric: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  eldDataMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  eldDataMetricLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  eldDriverStatus: {
    alignItems: 'center',
    marginBottom: 8,
  },
  eldDriverStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eldDriverStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eldHosGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  eldHosItem: {
    flex: 1,
    alignItems: 'center',
  },
  eldHosValue: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  eldHosLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  eldLocationText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  eldLocationAccuracy: {
    fontSize: 10,
  },
  eldDiagnosticCodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  eldDiagnosticCode: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eldDiagnosticCodeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eldMalfunctionAlert: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  eldMalfunctionCode: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eldMalfunctionMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  eldRawDataSection: {
    marginTop: 8,
  },
  eldDataFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  eldDataLegend: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eldDataLegendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  eldDataLegendItem: {
    fontSize: 11,
    marginBottom: 2,
    lineHeight: 14,
  },
});