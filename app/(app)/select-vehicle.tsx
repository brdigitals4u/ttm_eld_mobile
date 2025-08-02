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
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown, ZoomIn, ZoomOut } from 'react-native-reanimated';
import Modal from 'react-native-modal';
import { useVehicleSetup, VehicleSetupProvider, SetupStep, ConnectionStage } from '@/context/vehicle-setup-context';
import TTMBLEManager, { BLEDevice, ConnectionFailure, NotifyData } from "@/src/utils/TTMBLEManager";
import { router } from "expo-router";
import { requestMultiple, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useNavigationAnalytics } from '@/src/hooks/useNavigationAnalytics';
// import { useTheme } from '@/context/theme-context'; // Uncomment if you have theme context
import { Search, Bluetooth, Truck } from 'lucide-react-native'; // Add these icons
import { ELDDeviceService } from '@/src/services/ELDDeviceService';
import {
  ScanDevicesStep,
  DeviceSelectedStep,
  ConnectingStep,
  SuccessStep,
  ErrorStep,
  DataCollectionStep
} from '@/src/components/vehicle-setup-steps';

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
  // Local state for compatibility with existing code
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTimeRemaining, setScanTimeRemaining] = useState(0);
  const [scanAttempt, setScanAttempt] = useState(0);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [selectedDeviceForPasscode, setSelectedDeviceForPasscode] = useState<TTMDevice | null>(null);
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

  // Track screen view on component mount
  useEffect(() => {
    trackScreenView('select_vehicle', 'SelectVehicleScreen', {
      screen_purpose: 'eld_device_selection',
      entry_point: 'vehicle_setup_flow',
    });
  }, [trackScreenView]);

  // Request Bluetooth permissions
  const requestAppPermissions = useCallback(async () => {
    console.log("🔐 Requesting Bluetooth and Location permissions...");
    trackEvent('permission_request_started', {
      platform: Platform.OS,
      screen: 'select_vehicle',
      permission_type: 'bluetooth_location',
    });

    let permissionsToRequest = [] as any;
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel >= 31) {
        permissionsToRequest = [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];
      } else {
        permissionsToRequest = [
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];
      }
    } else if (Platform.OS === 'ios') {
      permissionsToRequest = [
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      ] as any;
    }

    const statuses = await requestMultiple(permissionsToRequest);
    let allGranted = true;
    const deniedPermissions: string[] = [];
    
    for (const permission of permissionsToRequest) {
      if (statuses[permission] !== RESULTS.GRANTED) {
        allGranted = false;
        deniedPermissions.push(permission);
      }
    }

    trackEvent('permission_request_completed', {
      platform: Platform.OS,
      screen: 'select_vehicle',
      granted: allGranted,
      denied_permissions: deniedPermissions.join(','),
    });

    return allGranted;
  }, [trackEvent]);

  useEffect(() => {
    // Initialize TTM SDK
    const initializeSDK = async () => {
      try {
        await TTMBLEManager.initSDK();
        console.log('TTM SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize TTM SDK:', error);
        Alert.alert('SDK Error', 'Failed to initialize Bluetooth SDK. Some features may not work.');
      }
    };

    initializeSDK();

    // Set up listeners
    const scanSubscription = TTMBLEManager.onDeviceScanned((device: BLEDevice) => {
      console.log('🔍 Device found:', device);
      addScannedDevice(device);
      addLog(`Device found: ${device.name || 'Unknown'} (${device.id})`);
    });

    const connectFailureSubscription = TTMBLEManager.onConnectFailure((error: ConnectionFailure) => {
      console.error("Connection failed:", error);
      setIsConnecting(false);
      setConnectingDeviceId(null);
      
      setError({
        type: 'connection_failed',
        message: error.message || 'Connection failed',
        details: `Status: ${error.status || 'unknown'}`,
        code: error.status
      });
      setStep(SetupStep.ERROR);
      
      // Log connection failure to Supabase
      if (selectedDeviceForPasscode) {
        ELDDeviceService.logConnectionFailure(selectedDeviceForPasscode, error);
      }
      
      // Format detailed error message
      let errorTitle = "Connection Failed";
      let errorMessage = "Could not connect to the device.";
      
      if (error.status) {
        errorTitle = `Connection Failed (Code: ${error.status})`;
      }
      
      if (error.message) {
        if (error.message.toLowerCase().includes('authentication')) {
          errorTitle = "Authentication Failed";
          errorMessage = "Invalid passcode or authentication rejected by device. Please check your 8-digit passcode and try again.";
        } else if (error.message.toLowerCase().includes('timeout')) {
          errorTitle = "Connection Timeout";
          errorMessage = "Device did not respond within expected time. Ensure the device is powered on and in pairing mode.";
        } else if (error.message.toLowerCase().includes('bluetooth')) {
          errorTitle = "Bluetooth Error";
          errorMessage = "Bluetooth connection error. Please check if Bluetooth is enabled and device is in range.";
        } else if (error.message.toLowerCase().includes('password') || error.message.toLowerCase().includes('passcode')) {
          errorTitle = "Invalid Passcode";
          errorMessage = "The passcode you entered is incorrect. Please verify the 8-digit passcode and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(errorTitle, errorMessage, [
        {
          text: "OK",
          onPress: () => {
            // Reset modal state on error
            setShowPasscodeModal(false);
            setPasscode('');
            setDeviceId('');
            setSelectedDeviceForPasscode(null);
          }
        }
      ]);
      
      trackEvent('connection_failure_handled', {
        screen: 'select_vehicle',
        error_status: error.status || 'unknown',
        error_message: error.message || 'unknown',
      });
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
      if (selectedDeviceForPasscode) {
        ELDDeviceService.logConnectionSuccess(selectedDeviceForPasscode);
      }
    });

    const authSubscription = TTMBLEManager.onAuthenticationPassed(() => {
      console.log('Device authentication passed');
      
      // Log successful authentication to Supabase
      if (connectingDeviceId) {
        ELDDeviceService.logAuthentication(connectingDeviceId, true);
      }
    });

    const notifySubscription = TTMBLEManager.onNotifyReceived((data: NotifyData) => {
      console.log('Received ELD data:', data);
      setReceivedData(prev => [...prev, data]);
      
      // Log ELD data to Supabase
      if (connectingDeviceId) {
        ELDDeviceService.logELDData(connectingDeviceId, data);
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
  }, []);

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

    // Update step and context state
    setSelectedDevice(device);
    setStep(SetupStep.DEVICE_SELECTED);
    setSelectedDeviceForPasscode(device);
    setShowPasscodeModal(true);

    trackEvent('connection_modal_opened', {
      screen: 'select_vehicle',
      device_id: device.id.substring(device.id.length - 4),
      device_name: device.name || 'unnamed',
    });
  };
  const handleSmartConnect = async (device: TTMDevice) => {
    // Update context state for device selection and connection start
    setSelectedDevice(device);
    setStep(SetupStep.DEVICE_SELECTED);
    setIsConnecting(true);
    setConnectingDeviceId(device.id);
    setSelectedDeviceForPasscode(device);

    const connectionDeviceId = device.address || device.id;
    // const usePasscode = device.name.toLowerCase().includes('eld') || device.name.toLowerCase().includes('pt30');
    const usePasscode = false;

    // Small delay to show device selected step
    setTimeout(() => {
      setStep(SetupStep.CONNECTING);
      setConnectionStage(ConnectionStage.IDENTIFY_DEVICE);
      setProgress(10);
    }, 1000);

    try {
      if (usePasscode) {
        // Connect with passcode logic - show modal
        setIsConnecting(false);
        setConnectingDeviceId(null);
        handleConnectInitiation(device);
      } else {
        // Log connection attempt to Supabase (without passcode)
        await ELDDeviceService.logConnectionAttempt(device, 0);

        // Update connection progress
        setConnectionStage(ConnectionStage.GATHERING_INFO);
        setProgress(30);

        // Stop scanning before attempting connection
        await TTMBLEManager.stopScan();

        // Update connection progress
        setConnectionStage(ConnectionStage.CAPTURING_ID);
        setProgress(50);

        // Connect using device ID without passcode (empty string)
        console.log(`Connecting to device: ${connectionDeviceId} without passcode`);
        await TTMBLEManager.connect(connectionDeviceId, "");

        console.log('Connection successful without passcode');

        // Update connection progress
        setConnectionStage(ConnectionStage.PAIRING);
        setProgress(80);

        // Log successful connection to Supabase
        await ELDDeviceService.logConnectionSuccess(device);

        // Show success step instead of alert
        setProgress(100);
        setStep(SetupStep.SUCCESS);
        addLog(`Successfully connected to ${device.name || connectionDeviceId}`);

        // Start ELD data reporting after successful connection
        try {
          console.log('Starting ELD data reporting...');
          await TTMBLEManager.startReportEldData();
          console.log('ELD data reporting started successfully');

          trackEvent('eld_data_reporting_started', {
            screen: 'select_vehicle',
            device_id: connectionDeviceId.substring(connectionDeviceId.length - 4),
          });

          // Transition to data collection step
          setTimeout(() => {
            setStep(SetupStep.DATA_COLLECTION);
            addLog('Data collection started');
            
            // Add some simulated ELD data for testing
            const simulateELDData = () => {
              const mockELDData = {
                vehicleData: {
                  speed: Math.floor(Math.random() * 70) + 10,
                  rpm: Math.floor(Math.random() * 2000) + 800,
                  engineHours: 52450,
                  odometer: 567890,
                  fuelLevel: Math.floor(Math.random() * 80) + 20,
                  engineTemp: Math.floor(Math.random() * 40) + 180,
                  diagnosticCodes: Math.random() > 0.7 ? ['P0420', 'P0171'] : [],
                  location: {
                    latitude: 39.7392 + (Math.random() - 0.5) * 0.01,
                    longitude: -104.9903 + (Math.random() - 0.5) * 0.01,
                    accuracy: Math.floor(Math.random() * 10) + 3
                  },
                  timestamp: Date.now()
                },
                driverStatus: ['driving', 'onDuty', 'offDuty'][Math.floor(Math.random() * 3)],
                hoursOfService: {
                  driveTimeRemaining: Math.floor(Math.random() * 600),
                  shiftTimeRemaining: Math.floor(Math.random() * 800),
                  cycleTimeRemaining: Math.floor(Math.random() * 4000),
                  breakTimeRemaining: Math.floor(Math.random() * 400),
                  lastCalculated: Date.now()
                },
                timestamp: Date.now(),
                deviceId: device.id,
                sequenceNumber: Math.floor(Math.random() * 1000)
              };
              
              const eldDataPacket: NotifyData = {
                dataType: 'ELD_DATA',
                rawData: JSON.stringify(mockELDData),
                ack: Math.floor(Math.random() * 255),
              };
              
              setReceivedData(prev => [...prev, eldDataPacket]);
              
              // Occasionally add malfunction data
              if (Math.random() > 0.8) {
                setTimeout(() => {
                  const malfunctionData: NotifyData = {
                    dataType: 'MALFUNCTION',
                    rawData: JSON.stringify({
                      errorCode: 'ENGINE_WARNING',
                      message: 'Engine temperature above normal range',
                      timestamp: Date.now()
                    })
                  };
                  setReceivedData(prev => [...prev, malfunctionData]);
                }, Math.random() * 5000);
              }
            };
            
            // Simulate ELD data every 5 seconds
            const dataInterval = setInterval(simulateELDData, 5000);
            
            // Stop simulation after navigation
            setTimeout(() => {
              clearInterval(dataInterval);
            }, 15000);
            
            // Initial data packet
            simulateELDData();
          }, 2000);

          // Navigate to main app after showing success
          setTimeout(() => {
            router.replace('/(app)/(tabs)');
          }, 4000);
        } catch (dataError: any) {
          console.error('Could not start ELD data reporting:', dataError);
          addLog(`Warning: Could not start data reporting - ${dataError.message}`);
          
          // Still navigate to main app after delay
          setTimeout(() => {
            router.replace('/(app)/(tabs)');
          }, 3000);
        }
      }
    } catch (error: any) {
      console.error("Connection failed:", error);
      
      // Show error step instead of alert
      setError({
        type: 'connection_failed',
        message: error.message || 'Could not connect to the device',
        details: `Failed to connect to ${device.name || connectionDeviceId}`,
        code: error.code
      });
      setStep(SetupStep.ERROR);
      addLog(`Connection failed: ${error.message}`);
    } finally {
      if (!usePasscode) {
        setIsConnecting(false);
        setConnectingDeviceId(null);
      }
    }
  };

  const handlePasscodeSubmit = async () => {
    if (!selectedDeviceForPasscode) {
      setError({
        type: 'validation_error',
        message: 'Please select a device first',
        details: 'No device selected for connection',
        code: 'NO_DEVICE_SELECTED'
      });
      setStep(SetupStep.ERROR);
      return;
    }

    // Validate passcode length (SDK requires exactly 8 characters)
    if (passcode.length !== 8) {
      setError({
        type: 'validation_error', 
        message: 'Invalid passcode length',
        details: 'Passcode must be exactly 8 characters long',
        code: 'INVALID_PASSCODE_LENGTH'
      });
      setStep(SetupStep.ERROR);
      return;
    }

    // Use the selected device's address or ID for connection
    const connectionDeviceId = selectedDeviceForPasscode.address || selectedDeviceForPasscode.id;

    setShowPasscodeModal(false);
    setIsConnecting(true);
    setConnectingDeviceId(selectedDeviceForPasscode.id);
    
    // Update step to connecting
    setStep(SetupStep.CONNECTING);
    setConnectionStage(ConnectionStage.IDENTIFY_DEVICE);
    setProgress(10);

    trackEvent('connection_attempt_started', {
      screen: 'select_vehicle',
      device_id: connectionDeviceId.substring(connectionDeviceId.length - 4),
      passcode_length: passcode.length,
    });

    try {
      // Log connection attempt to Supabase
      await ELDDeviceService.logConnectionAttempt(selectedDeviceForPasscode, passcode.length);
      
      // Stop scanning before attempting connection
      await TTMBLEManager.stopScan();
      
      // Connect using device ID and passcode
      console.log(`Connecting to device: ${connectionDeviceId} with passcode length: ${passcode.length}`);
      await TTMBLEManager.connect(connectionDeviceId, passcode);
      
      console.log('Connection successful, starting authentication flow...');
      
      // Check if password authentication is enabled on the device
      let passwordEnabled = false;
      try {
        await TTMBLEManager.checkPasswordEnable();
        console.log('Password check initiated - device supports password authentication');
        passwordEnabled = true;
      } catch (passwordCheckError: any) {
        console.warn('Password check failed or not supported:', passwordCheckError);
        // If password check fails, we might still try to validate
      }
      
      // Validate the password with the device
      if (passwordEnabled) {
        try {
          await TTMBLEManager.validatePassword(passcode);
          console.log('Password validation successful');
          // Log successful password validation
          ELDDeviceService.logAuthentication(selectedDeviceForPasscode.id, true, passcode.length);
        } catch (passwordValidationError: any) {
          console.error('Password validation failed:', passwordValidationError);
          
          // Log failed password validation
          ELDDeviceService.logAuthentication(selectedDeviceForPasscode.id, false, passcode.length);
          
          // Throw specific error for password validation failure
          const errorMessage = passwordValidationError.message || 'Password validation failed';
          if (errorMessage.toLowerCase().includes('length')) {
            throw new Error('Invalid passcode length. Please enter exactly 8 digits.');
          } else if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('wrong')) {
            throw new Error('Invalid passcode. Please check your 8-digit passcode and try again.');
          } else {
            throw new Error(`Authentication failed: ${errorMessage}`);
          }
        }
      } else {
        console.log('Device does not require password authentication or check failed');
      }
      
      // Log successful connection to Supabase
      await ELDDeviceService.logConnectionSuccess(selectedDeviceForPasscode);
      
      // Show success step instead of alert
      setProgress(100);
      setStep(SetupStep.SUCCESS);
      addLog(`Connected to ${selectedDeviceForPasscode.name || connectionDeviceId}`);
      
      // Start ELD data reporting after successful connection
      try {
        console.log('Starting ELD data reporting...');
        await TTMBLEManager.startReportEldData();
        console.log('ELD data reporting started successfully');
        
        trackEvent('eld_data_reporting_started', {
          screen: 'select_vehicle',
          device_id: connectionDeviceId.substring(connectionDeviceId.length - 4),
        });
        
        // Transition to data collection step
        setTimeout(() => {
          setStep(SetupStep.DATA_COLLECTION);
          addLog('Data collection started');
        }, 2000);

        // Navigate to main app after showing success
        setTimeout(() => {
          router.replace('/(app)/(tabs)');
        }, 4000);
      } catch (dataError) {

         trackEvent('eld_data_reporting_not_started', {
          screen: 'select_vehicle',
          device_id: connectionDeviceId.substring(connectionDeviceId.length - 4),
          error_message: JSON.stringify(dataError)
        });

        console.error('Could not start ELD data reporting:', dataError);
        addLog(`Warning: Could not start data reporting - ${dataError}`);
        
        // Still navigate to main app after delay
        setTimeout(() => {
          router.replace('/(app)/(tabs)');
        }, 3000);
      }
      
    } catch (error: any) {
      console.error("Connection failed:", error);
      
      trackEvent('connection_failed', {
        screen: 'select_vehicle',
        device_id: connectionDeviceId.substring(connectionDeviceId.length - 4),
        error_message: error.message || 'unknown_error',
      });
      
      let errorMessage = "Could not connect to the device.";
      let errorDetails = error.message || 'Unknown error occurred';
      
      if (error.message) {
        if (error.message.includes('password') || error.message.includes('passcode')) {
          errorMessage = "Invalid passcode";
          errorDetails = "Please check the 8-digit passcode and try again.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Connection timeout";
          errorDetails = "Ensure the device is powered on and in pairing mode.";
        } else {
          errorMessage = error.message;
        }
      }
      
      // Show error step instead of alert
      setError({
        type: 'connection_failed',
        message: errorMessage,
        details: errorDetails,
        code: error.code
      });
      setStep(SetupStep.ERROR);
      addLog(`Connection failed: ${errorMessage}`);
      
      // Reset passcode modal state
      setShowPasscodeModal(false);
      setPasscode('');
      setDeviceId('');
      setSelectedDeviceForPasscode(null);
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setPasscode('');
      setDeviceId('');
      setSelectedDeviceForPasscode(null);
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

  const DeviceCard = ({ device, onPress, isConnecting }: { device: TTMDevice, onPress: () => void, isConnecting: boolean }) => (
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
              title={device.name.toLowerCase().includes('eld') || device.name.toLowerCase().includes('pt30') ? 'Connect' : 'Try Connect'}
              onPress={() => handleSmartConnect(device)}
              disabled={isConnecting}
              variant={device.name.toLowerCase().includes('eld') || device.name.toLowerCase().includes('pt30') ? 'primary' : 'outline'}
            />
          )}
        </View>
      </View>
    </View>
  );

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
      style={[styles.container, { backgroundColor: colors.background }]}
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
                      onPress={() => handleConnectInitiation(device)}
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
                                {parsedData.vehicleData.diagnosticCodes.map((code, codeIndex) => (
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

      {/* Passcode Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasscodeModal}
        onRequestClose={() => {
          setShowPasscodeModal(false);
          setPasscode('');
          setDeviceId('');
          setSelectedDeviceForPasscode(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackground}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Connect to ELD Device</Text>
            <Text style={[styles.modalSubtitle, { color: colors.inactive }]}>
              Enter the 8-digit passcode to connect to your ELD device
            </Text>
            
            {/* Selected Device Info */}
            {selectedDeviceForPasscode && (
              <View style={[styles.selectedDeviceInfo, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={styles.selectedDeviceHeader}>
                  <Bluetooth size={20} color={colors.primary} />
                  <Text style={[styles.selectedDeviceTitle, { color: colors.text }]}>Selected Device</Text>
                </View>
                <Text style={[styles.selectedDeviceName, { color: colors.text }]}>
                  {selectedDeviceForPasscode.name || "Unnamed Device"}
                </Text>
                <Text style={[styles.selectedDeviceId, { color: colors.inactive }]}>
                  ID: {selectedDeviceForPasscode.address || selectedDeviceForPasscode.id}
                </Text>
              </View>
            )}
            
            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Passcode</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.card, 
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  placeholder="Enter 8-digit passcode"
                  placeholderTextColor={colors.inactive}
                  keyboardType="numeric"
                  maxLength={8}
                  value={passcode}
                  onChangeText={setPasscode}
                  secureTextEntry={true}
                  autoFocus
                />
              </View>
            </View>
            
            <View style={styles.modalButtonGroup}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowPasscodeModal(false);
                  setPasscode('');
                  setDeviceId('');
                  setSelectedDeviceForPasscode(null);
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Connect"
                onPress={handlePasscodeSubmit}
                disabled={passcode.length !== 8}
                style={styles.modalButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    transition: 'width 0.3s ease',
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
  connectButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  connectButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  connectButtonTextSecondary: {
    color: '#6B7280',
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
  devButtons: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  devButton: {
    marginBottom: 8,
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
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    margin: 20,
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
  // ELD Data Display Styles
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
    justifiContent: 'space-between',
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
  // Selected Device Info Styles
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
  },
  // Enhanced ELD Data Styles
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
