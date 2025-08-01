// app/(app)/select-vehicle.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Animated,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import TTMBLEManager, { BLEDevice, ConnectionFailure, NotifyData } from "@/src/utils/TTMBLEManager";
import { router } from "expo-router";
import { requestMultiple, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useNavigationAnalytics } from '@/src/hooks/useNavigationAnalytics';
// import { useTheme } from '@/context/theme-context'; // Uncomment if you have theme context
import { Search, Bluetooth, Truck } from 'lucide-react-native'; // Add these icons

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

export default function SelectVehicleScreen() {
  // State variables
  const [scannedDevices, setScannedDevices] = useState<TTMDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTimeRemaining, setScanTimeRemaining] = useState(0);
  const [scanAttempt, setScanAttempt] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [imei, setImei] = useState('');
  const [selectedDeviceForPasscode, setSelectedDeviceForPasscode] = useState<TTMDevice | null>(null);
  const [receivedData, setReceivedData] = useState<NotifyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

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
      setScannedDevices((prevDevices) => {
        if (prevDevices.find((p) => p.id === device.id)) {
          return prevDevices;
        }
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

    setSelectedDeviceForPasscode(device);
    setShowPasscodeModal(true);

    trackEvent('connection_modal_opened', {
      screen: 'select_vehicle',
      device_id: device.id.substring(device.id.length - 4),
      device_name: device.name || 'unnamed',
    });
  };

  const handlePasscodeSubmit = async () => {
    if (!selectedDeviceForPasscode || passcode.length !== 8) {
      Alert.alert("Error", "Please enter an 8-digit passcode.");
      return;
    }

    if (!imei || imei.length < 10) {
      Alert.alert("Error", "Please enter a valid IMEI (at least 10 digits).");
      return;
    }

    setShowPasscodeModal(false);
    setIsConnecting(true);
    setConnectingDeviceId(selectedDeviceForPasscode.id);

    try {
      await TTMBLEManager.stopScan();
      await TTMBLEManager.connect(selectedDeviceForPasscode.id, imei, false);

      Alert.alert("Success", `Connected to ${selectedDeviceForPasscode.name || selectedDeviceForPasscode.id}`);
      try {
        await TTMBLEManager.startReportEldData();
        console.log('Started ELD data reporting');
      } catch (dataError) {
        console.warn('Could not start ELD data reporting:', dataError);
      }
      router.replace('/(app)/(tabs)');
    } catch (error: any) {
      console.error("Connection attempt failed:", error);
      Alert.alert("Connection Failed", error.message || "Could not connect to the device. Ensure it's in pairing mode and the passcode is correct.");
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
      setPasscode('');
      setImei('');
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
    <Pressable
      style={[styles.deviceCard, isConnecting && styles.deviceCardConnecting]}
      onPress={onPress}
      disabled={isConnecting}
    >
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
        <View style={styles.deviceStatus}>
          {isConnecting ? (
            <ActivityIndicator size="small" color={colors.warning} />
          ) : (
            <Text style={[styles.connectText, { color: colors.primary }]}>
              Connect
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );

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

          {__DEV__ && (
            <View style={styles.devButtons}>
              <Button
                title="🧪 Test Devices"
                onPress={async () => {
                  try {
                    await TTMBLEManager.injectTestDevices();
                  } catch (error) {
                    console.error('Failed to inject test devices:', error);
                  }
                }}
                variant="outline"
                style={styles.devButton}
              />

              <Button
                title="📱 Show Paired Devices"
                onPress={async () => {
                  try {
                    console.log('Getting bonded devices...');
                    await TTMBLEManager.getBondedDevices();
                  } catch (error) {
                    console.error('Failed to get bonded devices:', error);
                    Alert.alert('Paired Devices Error', 'Failed to get paired devices. Please try again.');
                  }
                }}
                variant="outline"
                fullWidth
                style={styles.alternativeButton}
              />
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
          setImei('');
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
              Please enter the device IMEI and passcode to establish connection
            </Text>
            
            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Device IMEI</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.card, 
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  placeholder="Enter device IMEI (min 10 digits)"
                  placeholderTextColor={colors.inactive}
                  keyboardType="numeric"
                  maxLength={15}
                  value={imei}
                  onChangeText={setImei}
                  autoFocus
                />
              </View>
              
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
                />
              </View>
            </View>
            
            <View style={styles.modalButtonGroup}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowPasscodeModal(false);
                  setPasscode('');
                  setImei('');
                  setSelectedDeviceForPasscode(null);
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Connect"
                onPress={handlePasscodeSubmit}
                disabled={!imei.trim() || passcode.length !== 8}
                style={styles.modalButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
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
  deviceStatus: {
    alignItems: 'center',
  },
  connectText: {
    fontSize: 14,
    fontWeight: '600',
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
});