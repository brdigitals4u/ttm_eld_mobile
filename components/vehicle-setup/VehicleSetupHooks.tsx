import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { router } from 'expo-router';
import { useVehicleSetup } from '@/context/vehicle-setup-context';
import { TTMBLEManager, BLEDevice, ConnectionFailure, NotifyData } from '@/src/utils/TTMBLEManager';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useNavigationAnalytics } from '@/src/hooks/useNavigationAnalytics';
import { ELDDeviceService } from '@/src/services/ELDDeviceService';
import { SetupStep, ConnectionStage } from '@/context/vehicle-setup-context';

export function useVehicleSetupLogic() {
  // Local state
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTimeRemaining, setScanTimeRemaining] = useState(0);
  const [scanAttempt, setScanAttempt] = useState(0);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [selectedDeviceForPasscode, setSelectedDeviceForPasscode] = useState<BLEDevice | null>(null);
  const [receivedData, setReceivedData] = useState<NotifyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Keep a live ref of scannedDevices to avoid closure issues
  const scannedDevicesRef = useRef<BLEDevice[]>([]);

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

  // Keep scannedDevicesRef in sync with context
  useEffect(() => {
    scannedDevicesRef.current = scannedDevices;
  }, [scannedDevices]);

  // Analytics hooks
  const { trackEvent, trackScreenView, trackUserAction } = useAnalytics();
  const { currentPath } = useNavigationAnalytics();


  // Request Bluetooth permissions
  const requestAppPermissions = useCallback(async () => {
    console.log("🔐 Requesting Bluetooth and Location permissions...");

    try {
      if (Platform.OS === 'android') {
        const apiLevel = parseInt(Platform.Version.toString(), 10);
        let permissions = [];
        
        if (apiLevel >= 31) {
          // Android 12+ (API 31+)
          permissions = [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
        } else {
          // Android 11 and below
          permissions = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ];
        }

        const results = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );

        if (allGranted) {
          console.log("✅ All permissions granted");
          addLog("All permissions granted");
        } else {
          console.log("❌ Some permissions denied:", results);
          addLog(`Some permissions denied: ${JSON.stringify(results)}`);

          // Show specific permission guidance
          const deniedPermissions = Object.entries(results)
            .filter(([_, status]) => status !== PermissionsAndroid.RESULTS.GRANTED)
            .map(([permission, _]) => permission);
          
          if (deniedPermissions.length > 0) {
            Alert.alert(
              'Permissions Required',
              `The following permissions are required: ${deniedPermissions.join(', ')}. Please grant them in Settings.`,
              [{ text: 'OK' }]
            );
          }
        }

        return allGranted;
      } else {
        // For iOS, we'll assume permissions are granted for now
        // You can implement iOS-specific permission handling here
        console.log("✅ iOS permissions assumed granted");
        addLog("iOS permissions assumed granted");
        return true;
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      addLog(`Permission request error: ${error}`);
      Alert.alert(
        'Permission Error',
        'Failed to request permissions. Please grant Bluetooth and Location permissions manually in Settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }, [addLog]);

  // Initialize SDK and set up listeners
  useEffect(() => {
    let scanSubscription: any, connectFailureSubscription: any;
    const initializeSDK = async () => {
      try {
        await TTMBLEManager.initSDK();
        console.log('TTM SDK initialized successfully');
        addLog('TTM SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize TTM SDK:', error);
        addLog(`SDK initialization failed: ${error}`);
        Alert.alert('SDK Error', 'Failed to initialize Bluetooth SDK. Some features may not work.');
      }
    };

    // initializeSDK();

    // scanSubscription = TTMBLEManager.onDeviceScanned((device: BLEDevice) => {
    //   console.log('🔍 Device found:', device);
    //   addScannedDevice(device); // should update scannedDevices context and in turn, the ref.
    //   addLog(`Device found: ${device.name || 'Unknown'} (${device.id})`);
    // });

    // connectFailureSubscription = TTMBLEManager.onConnectFailure((error: ConnectionFailure) => {
    //   console.error("Connection failed:", error);
    //   setIsConnecting(false);
    //   setConnectingDeviceId(null);

    //   setError({
    //     type: 'connection_failed',
    //     message: error.message || 'Connection failed',
    //     details: `Status: ${error.status || 'unknown'}`,
    //     code: error.status
    //   });
    //   setStep(SetupStep.ERROR);

    //   // Log connection failure to Supabase
    //   if (selectedDeviceForPasscode) {
    //     ELDDeviceService.logConnectionFailure(selectedDeviceForPasscode, error);
    //   }

    //   setShowPasscodeModal(false);
    //   setPasscode('');
    //   setDeviceId('');
    //   setSelectedDeviceForPasscode(null);

    //   trackEvent('connection_failure_handled', {
    //     screen: 'select_vehicle',
    //     error_status: error.status || 'unknown',
    //     error_message: error.message || 'unknown',
    //   });
    // });

    return () => {
      scanSubscription?.remove && scanSubscription.remove();
      connectFailureSubscription?.remove && connectFailureSubscription.remove();
    };
  }, [addScannedDevice, setIsConnecting, setConnectingDeviceId, setError, setStep, selectedDeviceForPasscode, trackEvent, addLog]);

  // Start scanning
  const startScan = useCallback(async () => {
    let progressInterval: any;
    try {
      const permissionsGranted = await requestAppPermissions();
      if (!permissionsGranted) {
        return;
      }

      console.log("🔍 Starting device scan...");
      addLog("Starting device scan");
      trackEvent('scan_started', { screen: 'select_vehicle' });

      setIsScanning(true);
      setScanAttempt(prev => prev + 1);
      setScanProgress(0);
      setScanTimeRemaining(120);

      setScannedDevices([]);
      scannedDevicesRef.current = [];

      await TTMBLEManager.startScan(120000); // 2 minutes

      let scanEnd = false;
      progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + (100 / 120), 100));
        setScanTimeRemaining(prev => {
          const next = prev - 1;
          if (next <= 0 && !scanEnd) {
            scanEnd = true;
            clearInterval(progressInterval);
            setIsScanning(false);
            addLog("Scan completed");
            trackEvent('scan_completed', {
              screen: 'select_vehicle',
              devices_found: scannedDevicesRef.current.length
            });
          }
          return next;
        });
      }, 1000);
    } catch (error: any) {
      console.error("Scan failed:", error);
      addLog(`Scan failed: ${error}`);
      setIsScanning(false);
      setError({
        type: 'scan_failed',
        message: 'Failed to start scanning',
        details: error.message || 'Unknown error',
        code: 'SCAN_ERROR'
      });
    }
    // If the hook is unmounted or scan is cancelled, clean interval
    return () => progressInterval && clearInterval(progressInterval);
  }, [requestAppPermissions, setIsScanning, setScanAttempt, setScanProgress, setScanTimeRemaining, setScannedDevices, addLog, trackEvent, setError]);

  // Handle device connection initiation
  const handleConnectInitiation = useCallback((device: BLEDevice) => {
    console.log("🔗 Initiating connection to device:", device);
    addLog(`Initiating connection to ${device.name || device.id}`);

    setSelectedDevice(device);
    setSelectedDeviceForPasscode(device);
    setShowPasscodeModal(true);

    trackEvent('device_selected', {
      screen: 'select_vehicle',
      device_name: device.name || 'Unknown',
      device_id: device.id.substring(device.id.length - 8)
    });
  }, [setSelectedDevice, trackEvent, addLog]);

  // Handle device connection
  const handleDeviceConnect = useCallback(async (device: BLEDevice) => {
    const connectionDeviceId = device.id;
    try {
      console.log("🔗 Connecting to device:", device);
      addLog(`Connecting to ${device.name || device.id}`);

      setIsConnecting(true);
      setConnectingDeviceId(connectionDeviceId);
      setStep(SetupStep.CONNECTING);
      setConnectionStage(ConnectionStage.CONNECTING);

      // Log connection attempt
      await ELDDeviceService.logConnectionAttempt(device, 8, {});

      trackEvent('connection_started', {
        screen: 'select_vehicle',
        device_name: device.name || 'Unknown',
        device_id: connectionDeviceId.substring(connectionDeviceId.length - 8)
      });

      // Connect to device
      await TTMBLEManager.connect(connectionDeviceId, passcode, false);

      console.log("✅ Device connected successfully");
      addLog(`Device ${device.name || device.id} connected successfully`);

      // Log successful connection
      await ELDDeviceService.logConnectionSuccess(device);

      setStep(SetupStep.SUCCESS);
      setConnectionStage(ConnectionStage.CONNECTED);
      setIsConnected(true);

      trackEvent('connection_successful', {
        screen: 'select_vehicle',
        device_name: device.name || 'Unknown',
        device_id: connectionDeviceId.substring(connectionDeviceId.length - 8)
      });

      setTimeout(() => router.replace('/(app)/(tabs)'), 4000);

    } catch (error: any) {
      console.error("Connection or data reporting failed:", error);

      let errorType = 'connection_failed';
      let errorMessage = 'Could not connect to the device.';
      let errorDetails = error.message || `Failed to connect to ${device.name || connectionDeviceId}`;
      let errorCode = error.code || 'UNKNOWN_ERROR';

      if (error.message && error.message.includes('No ELD data received')) {
        errorType = 'eld_data_timeout';
        errorMessage = 'Device is not a compatible ELD';
        errorDetails = `Connected device "${device.name || connectionDeviceId}" does not transmit ELD data. Please connect to a certified Electronic Logging Device (ELD).`;
        errorCode = 'NON_ELD_DEVICE';
      } else if (error.message && (error.message.includes('not supported') || error.message.includes('incompatible'))) {
        errorType = 'eld_reporting_failed';
        errorMessage = 'Device does not support ELD data reporting';
        errorDetails = `The connected device "${device.name || connectionDeviceId}" is not compatible with ELD data reporting.`;
        errorCode = 'DEVICE_INCOMPATIBLE';
      }

      setError({ type: errorType, message: errorMessage, details: errorDetails, code: errorCode });
      setStep(SetupStep.ERROR);
      addLog(`Error: ${errorMessage}`);

      // Log error to Supabase
      const supabaseErrorDetails = {
        errorType: 'ELD_DATA_TIMEOUT',
        errorCode: 'NON_ELD_DEVICE',
        ttmSdkMessage: errorMessage,
        message: 'Unable to collect ELD data from this device because it did not send any ELD data within timeout period',
        reason: errorMessage
      };
      try {
        await ELDDeviceService.logConnectionError(device, supabaseErrorDetails);
      } catch (logError) {
        console.warn('Failed to log connection error:', logError);
      }
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setPasscode('');
      setDeviceId('');
      setSelectedDeviceForPasscode(null);
      setShowPasscodeModal(false);
    }
  }, [passcode, setIsConnecting, setConnectingDeviceId, setStep, setConnectionStage, setIsConnected, setError, addLog, trackEvent]);

  // Handle passcode submission
  const handlePasscodeSubmit = useCallback(async () => {
    if (!selectedDeviceForPasscode) {
      console.error("No device selected for passcode");
      return;
    }

    try {
      console.log("🔐 Submitting passcode for device:", selectedDeviceForPasscode);
      addLog(`Submitting passcode for ${selectedDeviceForPasscode.name || selectedDeviceForPasscode.id}`);

      await handleDeviceConnect(selectedDeviceForPasscode);

    } catch (error: any) {
      console.error("Connection failed:", error);
      trackEvent('connection_failed', {
        screen: 'select_vehicle',
        device_id: selectedDeviceForPasscode.id.substring(selectedDeviceForPasscode.id.length - 4),
        error_message: error.message || 'unknown_error'
      });

      let errorMessage = "Could not connect to the device.";
      let errorDetails = error.message || 'Unknown error occurred';

      if (error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('password') || msg.includes('passcode') || msg.includes('authentication')) {
          errorMessage = "Invalid Passcode";
          errorDetails = "Please check the 8-digit passcode and try again.";
        } else if (msg.includes('timeout')) {
          errorMessage = "Connection Timeout";
          errorDetails = "Ensure the device is powered on and in pairing mode.";
        } else {
          errorMessage = error.message;
        }
      }

      setError({ type: 'connection_failed', message: errorMessage, details: errorDetails, code: error.code });
      setStep(SetupStep.ERROR);
      addLog(`Connection failed: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setPasscode('');
      setDeviceId('');
      setSelectedDeviceForPasscode(null);
      setShowPasscodeModal(false);
    }
  }, [selectedDeviceForPasscode, handleDeviceConnect, trackEvent, setError, setStep, addLog, setIsConnecting, setConnectingDeviceId]);

  return {
    // State
    scanProgress,
    scanTimeRemaining,
    scanAttempt,
    connectingDeviceId,
    showPasscodeModal,
    passcode,
    deviceId,
    selectedDeviceForPasscode,
    receivedData,
    isConnected,
    currentStep,
    connectionStage,
    selectedDevice,
    scannedDevices,
    isScanning,
    isConnecting,
    progress,
    error,

    // Actions
    startScan,
    handleConnectInitiation,
    handleDeviceConnect,
    handlePasscodeSubmit,
    setShowPasscodeModal,
    setPasscode,
    setDeviceId,
    setSelectedDeviceForPasscode,
    setReceivedData,
    setIsConnected,

    // Colors
    colors: {
      background: '#FFFFFF',
      card: '#F9FAFB',
      text: '#111827',
      inactive: '#6B7280',
      primary: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      border: '#E5E7EB',
    }
  };
}
