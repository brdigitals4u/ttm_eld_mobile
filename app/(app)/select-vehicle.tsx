// app/(app)/select-vehicle.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  PermissionsAndroid, // For Android runtime permissions
  Platform,
  Animated,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import TTMBLEManager, { BLEDevice, ConnectionFailure, NotifyData } from "@/src/utils/TTMBLEManager"; // Direct TTM integration
import { router } from "expo-router";
import { requestMultiple, PERMISSIONS, RESULTS } from 'react-native-permissions'; // Recommended package for permissions
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useNavigationAnalytics } from '@/src/hooks/useNavigationAnalytics';
import { FirebaseAnalyticsDebug } from '@/src/components/FirebaseAnalyticsDebug';
import { ReleaseAnalyticsTest } from '@/src/components/ReleaseAnalyticsTest';

const { width, height } = Dimensions.get('window');

// Use the BLEDevice type from TTMBLEManager
type TTMDevice = BLEDevice;

export default function SelectVehicleScreen() {
  // State variables
  const [scannedDevices, setScannedDevices] = useState<TTMDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [scanAnimation] = useState(new Animated.Value(0));
  const [deviceAnimations, setDeviceAnimations] = useState<{[key: string]: Animated.Value}>({});
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [imei, setImei] = useState('');
  const [selectedDeviceForPasscode, setSelectedDeviceForPasscode] = useState<TTMDevice | null>(null);
  const [receivedData, setReceivedData] = useState<NotifyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

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

  // Request Bluetooth permissions using react-native-permissions
  const requestAppPermissions = useCallback(async () => {
    // Track permission request start
    trackEvent('permission_request_started', {
      platform: Platform.OS,
      screen: 'select_vehicle',
      permission_type: 'bluetooth_location',
    });

    let permissionsToRequest = [] as any;
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel >= 31) { // Android 12+
        permissionsToRequest = [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, // Still needed for some devices/scenarios
          // PERMISSIONS.ANDROID.FOREGROUND_SERVICE, // Consider adding if app needs to run continuously in background
        ];
      } else { // Android < 12 (but >= 8.0 for location)
        permissionsToRequest = [
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];
      }
    } else if (Platform.OS === 'ios') {
      // iOS permissions are primarily handled by Info.plist, but `react-native-permissions`
      // can help check and request status.
      permissionsToRequest = [
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE, // Often needed for BLE scanning on iOS
        PERMISSIONS.IOS.LOCATION_ALWAYS, // Use if background scanning is required
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

    // Track permission result
    trackEvent('permission_request_completed', {
      platform: Platform.OS,
      screen: 'select_vehicle',
      granted: allGranted,
      denied_permissions: deniedPermissions.join(','),
      requested_permissions: permissionsToRequest.join(','),
    });

    return allGranted;
  }, [trackEvent]);

  useEffect(() => {
    // Initialize TTM SDK when component mounts
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

    // Set up listeners for TTM SDK events
    const scanSubscription = TTMBLEManager.onDeviceScanned((device: BLEDevice) => {
      console.log('Device found:', device);
      setScannedDevices((prevDevices) => {
        // Avoid duplicates in the list
        if (prevDevices.find((p) => p.id === device.id)) {
          return prevDevices;
        }

        // Add animation for new device
        setDeviceAnimations(prev => ({
          ...prev,
          [device.id]: new Animated.Value(0)
        }));

        // Animate the new device in
        setTimeout(() => {
          const anim = deviceAnimations[device.id] || new Animated.Value(0);
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }, 100);

        return [...prevDevices, device];
      });
    });

    const connectFailureSubscription = TTMBLEManager.onConnectFailure((error: ConnectionFailure) => {
      console.error("Connection failed:", error);
      Alert.alert("Connection Failed", error.message || "Could not connect to the device. Please try again.");
      setIsConnecting(false);
      setConnectingDeviceId(null);
    });

    const disconnectSubscription = TTMBLEManager.onDisconnected(() => {
      console.log('Device disconnected');
      Alert.alert("Disconnected", "The ELD device has disconnected.");
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setIsConnected(false);
    });

    const connectedSubscription = TTMBLEManager.onConnected(() => {
      console.log('Device connected successfully');
      setIsConnected(true);
    });

    const authSubscription = TTMBLEManager.onAuthenticationPassed(() => {
      console.log('Device authentication passed');
    });

    const notifySubscription = TTMBLEManager.onNotifyReceived((data: NotifyData) => {
      console.log('Received ELD data:', data);
      setReceivedData(prev => [...prev, data]);
    });

    // Cleanup listeners when component unmounts
    return () => {
      scanSubscription.remove();
      connectFailureSubscription.remove();
      disconnectSubscription.remove();
      connectedSubscription.remove();
      authSubscription.remove();
      notifySubscription.remove();
    };
  }, []);

  // Start scanning animation
  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  // Stop scanning animation
  const stopScanAnimation = () => {
    scanAnimation.stopAnimation();
    scanAnimation.setValue(0);
  };

  const startScan = async () => {
    // Track scan initiation
    trackUserAction('scan_initiated', 'scan_button', {
      screen: 'select_vehicle',
      existing_devices_count: scannedDevices.length,
    });

    // Request app-level permissions first
    const granted = await requestAppPermissions();
    if (!granted) {
      // Track permission denial
      trackEvent('scan_cancelled', {
        reason: 'permission_denied',
        screen: 'select_vehicle',
      });
      Alert.alert("Permission Required", "Bluetooth and Location permissions are required to scan for ELD devices.");
      return;
    }

    // Track scan start
    trackEvent('ble_scan_started', {
      screen: 'select_vehicle',
      scan_duration_seconds: 10,
      platform: Platform.OS,
    });

    setScannedDevices([]);
    setDeviceAnimations({});
    setIsScanning(true);
    startScanAnimation();

    // The scan duration is now handled by the TTM SDK's startScan method directly
    TTMBLEManager.startScan(10) // Scan for 10 seconds
      .finally(() => {
        setIsScanning(false);
        stopScanAnimation();
        
        // Track scan completion
        trackEvent('ble_scan_completed', {
          screen: 'select_vehicle',
          devices_found: scannedDevices.length,
          scan_duration_seconds: 10,
          platform: Platform.OS,
        });
      });
  };

  const handleConnectInitiation = (device: TTMDevice) => {
    // Track device selection
    trackUserAction('device_selected', 'device_button', {
      screen: 'select_vehicle',
      device_id: device.id.substring(device.id.length - 4), // Last 4 chars for privacy
      device_name: device.name || 'unnamed',
      total_devices_available: scannedDevices.length,
    });

    setSelectedDeviceForPasscode(device);
    setShowPasscodeModal(true); // Always prompt for passcode first, as per ELD standard security practices

    // Track modal opened
    trackEvent('connection_modal_opened', {
      screen: 'select_vehicle',
      device_id: device.id.substring(device.id.length - 4),
      device_name: device.name || 'unnamed',
    });
  };

  const handlePasscodeSubmit = async () => {
    if (!selectedDeviceForPasscode || passcode.length !== 8) { // Assuming 8-digit passcode
      Alert.alert("Error", "Please enter an 8-digit passcode.");
      return;
    }

    if (!imei || imei.length < 10) { // IMEI should be at least 10 digits
      Alert.alert("Error", "Please enter a valid IMEI (at least 10 digits).");
      return;
    }

    setShowPasscodeModal(false); // Hide modal while connection attempt is in progress
    setIsConnecting(true);
    setConnectingDeviceId(selectedDeviceForPasscode.id);

    try {
      await TTMBLEManager.stopScan(); // Stop scanning before connecting
      // Connect using the TTM SDK bridge, including user-provided IMEI and passcode
      await TTMBLEManager.connect(selectedDeviceForPasscode.id, imei, false);

      // If connection and authentication (including passcode) are successful:
      Alert.alert("Success", `Connected to ${selectedDeviceForPasscode.name || selectedDeviceForPasscode.id}`);
      // Start ELD data collection after successful connection/authentication
      try {
        await TTMBLEManager.startReportEldData();
        console.log('Started ELD data reporting');
      } catch (dataError) {
        console.warn('Could not start ELD data reporting:', dataError);
        // Continue anyway as this method might not be fully implemented yet
      }
      router.replace('/(app)/(tabs)'); // Navigate to main app screen after successful connection and data start
    } catch (error: any) {
      console.error("Connection attempt failed:", error);
      Alert.alert("Connection Failed", error.message || "Could not connect to the device. Ensure it's in pairing mode and the passcode is correct.");
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setPasscode(''); // Clear passcode field
      setSelectedDeviceForPasscode(null);
    }
  };

  // Generate random positions for devices on the UI
  const getDevicePosition = (index: number) => {
    const angle = (index * 137.5) % 360; // Golden angle for better distribution
    const radius = Math.min(width, height) * 0.25 + (index % 3) * 40;
    const centerX = width / 2;
    const centerY = height / 2 - 50;

    return {
      x: centerX + Math.cos(angle * Math.PI / 180) * radius - 40,
      y: centerY + Math.sin(angle * Math.PI / 180) * radius - 40,
    };
  };

  const renderDeviceCircle = (device: TTMDevice, index: number) => {
    const position = getDevicePosition(index);
    const deviceAnim = deviceAnimations[device.id] || new Animated.Value(0);
    const isConnectingThis = connectingDeviceId === device.id;

    return (
      <Animated.View
        key={device.id}
        style={[
          styles.deviceCircle,
          {
            left: position.x,
            top: position.y,
            transform: [
              {
                scale: deviceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          style={[
            styles.deviceButton,
            isConnectingThis && styles.connectingDevice,
          ]}
          onPress={() => handleConnectInitiation(device)} // Trigger passcode modal
          disabled={isConnecting}
        >
          {isConnectingThis ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.deviceInitial}>
                {(device.name || "U").charAt(0).toUpperCase()}
              </Text>
              <Text style={styles.deviceSignal}>📡</Text>
            </>
          )}
        </Pressable>
        <View style={styles.deviceTooltip}>
          <Text style={styles.deviceTooltipText}>
            {device.name || "Unnamed Device"}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Vehicle ELD</Text>
        <Text style={styles.subtitle}>Scan and connect to nearby devices</Text>
      </View>

      {/* Central Scan Area */}
      <View style={styles.scanArea}>
        {/* Scanning radar effect */}
        {isScanning && (
          <Animated.View
            style={[
              styles.scanRadar,
              {
                transform: [
                  {
                    rotate: scanAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        )}

        {/* Central scan button */}
        <Pressable
          style={[styles.centralScanButton, isScanning && styles.scanningButton]}
          onPress={startScan}
          disabled={isScanning || isConnecting}
        >
          <Text style={styles.scanIcon}>🔍</Text>
          <Text style={styles.scanText}>
            {isScanning ? "Scanning..." : "Scan Devices"}
          </Text>
        </Pressable>

        {/* Device circles */}
        {scannedDevices.map((device, index) => renderDeviceCircle(device, index))}
      </View>

      {/* Status */}
      <View style={styles.statusArea}>
        {scannedDevices.length === 0 && !isScanning && (
          <Text style={styles.emptyText}>
            Tap the scan button to discover ELD devices
          </Text>
        )}
        {isScanning && (
          <Text style={styles.scanningText}>
            Searching for devices... {scannedDevices.length} found
          </Text>
        )}
        {scannedDevices.length > 0 && !isScanning && (
          <Text style={styles.foundText}>
            Found {scannedDevices.length} device{scannedDevices.length > 1 ? 's' : ''}. Tap to connect.
          </Text>
        )}
        {isConnecting && (
          <Text style={styles.connectingText}>
            Connecting to {connectingDeviceId ? `device ${connectingDeviceId.substring(connectingDeviceId.length - 4)}` : 'ELD'}...
          </Text>
        )}
      </View>

      {/* Passcode Input Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasscodeModal}
        onRequestClose={() => {
          setShowPasscodeModal(false);
          setPasscode('');
          setSelectedDeviceForPasscode(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackground}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Connect to ELD Device</Text>
            <Text style={styles.modalSubtitle}>
              Please enter the device IMEI and 8-digit passcode:
            </Text>
            
            <Text style={styles.inputLabel}>IMEI (at least 10 digits)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Device IMEI"
              placeholderTextColor="#8B949E"
              keyboardType="numeric"
              maxLength={15}
              value={imei}
              onChangeText={setImei}
              autoFocus
            />
            
            <Text style={styles.inputLabel}>Passcode (8 digits)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor="#8B949E"
              keyboardType="numeric"
              maxLength={8}
              value={passcode}
              onChangeText={setPasscode}
              secureTextEntry={true}
            />
            <View style={styles.modalButtonContainer}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowPasscodeModal(false);
                  setPasscode('');
                  setSelectedDeviceForPasscode(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonSubmit} onPress={handlePasscodeSubmit}>
                <Text style={styles.modalButtonText}>Connect</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Firebase Analytics Debug Panel - Only shows in development */}
      <FirebaseAnalyticsDebug visible={__DEV__} />
      
      {/* Release Analytics Test - Shows in both debug and release */}
      <ReleaseAnalyticsTest visible={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B949E',
    textAlign: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanRadar: {
    position: 'absolute',
    width: Math.min(width, height) * 0.8,
    height: Math.min(width, height) * 0.8,
    borderRadius: Math.min(width, height) * 0.4,
    borderWidth: 2,
    borderColor: '#2F81F7',
    opacity: 0.3,
  },
  centralScanButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2F81F7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2F81F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#1F5582',
  },
  scanningButton: {
    backgroundColor: '#0969DA',
    shadowColor: '#0969DA',
  },
  scanIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  deviceCircle: {
    position: 'absolute',
  },
  deviceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#21262D',
    borderWidth: 2,
    borderColor: '#30363D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  connectingDevice: {
    backgroundColor: '#FD7E14',
    borderColor: '#E85D04',
  },
  deviceInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F0F6FC',
    marginBottom: 2,
  },
  deviceSignal: {
    fontSize: 12,
  },
  deviceTooltip: {
    position: 'absolute',
    top: -35,
    left: -20,
    right: -20,
    backgroundColor: '#161B22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  deviceTooltipText: {
    color: '#F0F6FC',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  statusArea: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8B949E',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scanningText: {
    color: '#2F81F7',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  foundText: {
    color: '#56D364',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  connectingText: {
    color: '#FD7E14',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 10,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#161B22',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0F6FC',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 20,
  },
  passcodeTextInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#0D1117',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363D',
    color: '#F0F6FC',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButtonCancel: {
    backgroundColor: '#6A737D',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  modalButtonSubmit: {
    backgroundColor: '#2F81F7',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#0D1117',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363D',
    color: '#F0F6FC',
    fontSize: 16,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
});
