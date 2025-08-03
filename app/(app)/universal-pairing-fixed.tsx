import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Simple fallback icons if lucide doesn't work
const SimpleArrowLeft = () => <Text style={{ fontSize: 20, color: '#1F2937' }}>←</Text>;
const SimpleBluetooth = ({ color = '#3B82F6', size = 24 }) => (
  <Text style={{ fontSize: size, color }}>📶</Text>
);
const SimpleRefresh = ({ color = 'white', size = 16 }) => (
  <Text style={{ fontSize: size, color }}>🔄</Text>
);
const SimpleTruck = ({ color = '#3B82F6' }) => <Text style={{ fontSize: 24, color }}>🚛</Text>;
const SimpleCamera = ({ color = '#3B82F6' }) => <Text style={{ fontSize: 24, color }}>📷</Text>;
const SimpleTracker = ({ color = '#3B82F6' }) => <Text style={{ fontSize: 24, color }}>📍</Text>;
const SimpleCheck = ({ color = '#10B981' }) => <Text style={{ fontSize: 16, color }}>✓</Text>;
const SimpleAlert = ({ color = '#EF4444' }) => <Text style={{ fontSize: 20, color }}>⚠️</Text>;

// Enhanced Device interface with Jimi ELD specific fields
interface Device {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
  signalStrength?: number;
  deviceType: 'ELD' | 'Camera' | 'Tracker' | 'Unknown';
  eldType?: 'JIMI_PT30' | 'JIMI_KD' | 'OTHER';
  firmwareVersion?: string;
  batteryLevel?: number;
  scanType?: 'ttm_sdk' | 'direct' | 'connected' | 'bonded';
}

// Color scheme
const colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  primary: '#3B82F6',
  secondary: '#10B981',
  danger: '#EF4444',
  inactive: '#9CA3AF',
  card: '#F3F4F6',
  border: '#E5E7EB',
};

export default function UniversalPairingScreen() {
  // State
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jimiBridgeAvailable, setJimiBridgeAvailable] = useState(false);

  // Component mounted
  useEffect(() => {
    console.log('🚛 UniversalPairingScreen mounted');
    initializeApp();
  }, []);

  // Initialize app
  const initializeApp = async () => {
    try {
      console.log('🔧 Initializing Universal Pairing...');
      await requestPermissions();
      await initializeJimiBridge();
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setError('Failed to initialize app');
    }
  };

  // Initialize Jimi Bridge with proper error handling
  const initializeJimiBridge = async () => {
    try {
      console.log('🔌 Attempting to load Jimi Bridge...');
      
      // Try to import the native module
      const { NativeModules } = require('react-native');
      const JimiBridge = NativeModules.JimiBridge;
      
      if (JimiBridge) {
        console.log('✅ Jimi Bridge native module found');
        setJimiBridgeAvailable(true);
        
        // Initialize the bridge for universal scanning
        try {
          const scanOptions = {
            scanFilter: 'all', // ELD, camera, tracking, or all
            scanDuration: 30000, // 30 seconds
            enableBackgroundScan: false,
            enableRSSI: true,
            enableDeviceTypeDetection: true,
          };
          
          console.log('🔍 Jimi Bridge initialized with options:', scanOptions);
        } catch (initError) {
          console.warn('⚠️ Jimi Bridge init failed:', initError);
        }
      } else {
        console.log('⚠️ Jimi Bridge not available, using mock data');
        setJimiBridgeAvailable(false);
      }
    } catch (error) {
      console.warn('⚠️ Jimi Bridge module not available:', error);
      setJimiBridgeAvailable(false);
    }
  };

  // Request Bluetooth permissions
  const requestPermissions = async () => {
    console.log('🔐 Requesting Bluetooth permissions...');
    
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);
        console.log('🔐 Permission results:', results);
        
        const allGranted = Object.values(results).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );

        if (allGranted) {
          setPermissionsGranted(true);
          setError(null);
          console.log('✅ All Bluetooth permissions granted');
        } else {
          setPermissionsGranted(false);
          setError('Bluetooth permissions are required for device scanning');
          console.log('❌ Some permissions denied');
        }
      } catch (err) {
        console.error('❌ Permission request failed:', err);
        setError('Failed to request permissions');
        setPermissionsGranted(false);
      }
    } else {
      // iOS permissions are handled differently
      console.log('📱 iOS: Setting permissions granted');
      setPermissionsGranted(true);
    }
  };

  // Start scanning for devices using Jimi Bridge or mock data
  const startScan = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permissions Required', 'Please grant Bluetooth permissions first.');
      return;
    }

    console.log('🔍 Starting device scan...');
    setIsScanning(true);
    setError(null);
    setDevices([]); // Clear previous results

    try {
      if (jimiBridgeAvailable) {
        console.log('🔌 Using Jimi Bridge for scanning...');
        
        // Use real Jimi Bridge scanning
        const { NativeModules } = require('react-native');
        const JimiBridge = NativeModules.JimiBridge;
        
        const scanOptions = {
          scanFilter: 'all',
          scanDuration: 30000,
          enableBackgroundScan: false,
          enableRSSI: true,
          enableDeviceTypeDetection: true,
        };
        
        // Start universal scan
        await JimiBridge.startUniversalScan(scanOptions);
        
        // Listen for device discoveries
        // (In real implementation, you'd set up event listeners here)
        console.log('🔍 Jimi Bridge scan started');
        
        // Mock some results for now while the real scan runs
        setTimeout(() => {
          if (isScanning) {
            addMockDevices();
            setIsScanning(false);
          }
        }, 5000);
        
      } else {
        console.log('🎭 Using mock device scanning...');
        // Simulate scanning with mock devices
        setTimeout(() => {
          if (isScanning) {
            addMockDevices();
            setIsScanning(false);
          }
        }, 3000);
      }
    } catch (err) {
      console.error('❌ Scan failed:', err);
      setError('Failed to scan for devices');
      setIsScanning(false);
      
      // Fallback to mock devices even if real scan fails
      addMockDevices();
    }
  };

  // Add mock devices for testing
  const addMockDevices = () => {
    const mockDevices: Device[] = [
      {
        id: 'jimi-eld-001',
        name: 'JIMI PT30 ELD',
        address: '00:11:22:B7:4C:55',
        isConnected: false,
        signalStrength: 85,
        deviceType: 'ELD',
        eldType: 'JIMI_PT30',
        firmwareVersion: '1.2.3',
        batteryLevel: 92,
        scanType: jimiBridgeAvailable ? 'ttm_sdk' : 'direct',
      },
      {
        id: 'jimi-camera-001',
        name: 'JIMI Dashboard Camera',
        address: '55:44:33:22:11:00',
        isConnected: false,
        signalStrength: 72,
        deviceType: 'Camera',
        scanType: jimiBridgeAvailable ? 'ttm_sdk' : 'direct',
      },
      {
        id: 'jimi-tracker-001',
        name: 'JIMI GPS Tracker',
        address: '12:34:56:78:90:AB',
        isConnected: false,
        signalStrength: 95,
        deviceType: 'Tracker',
        scanType: jimiBridgeAvailable ? 'ttm_sdk' : 'direct',
      },
      {
        id: 'other-eld-001',
        name: 'Generic ELD Device',
        address: 'AA:BB:CC:DD:EE:FF',
        isConnected: false,
        signalStrength: 78,
        deviceType: 'ELD',
        eldType: 'OTHER',
        scanType: 'direct',
      },
    ];
    
    console.log('🎭 Added mock devices:', mockDevices.length);
    setDevices(mockDevices);
  };

  // Connect to device using Jimi Bridge or mock connection
  const connectToDevice = async (device: Device) => {
    console.log('🔗 Connecting to device:', device.name);
    setIsConnecting(true);
    setSelectedDevice(device);

    try {
      if (jimiBridgeAvailable && device.eldType?.startsWith('JIMI')) {
        console.log('🔌 Using Jimi Bridge for connection...');
        
        const { NativeModules } = require('react-native');
        const JimiBridge = NativeModules.JimiBridge;
        
        const connectionOptions = {
          deviceId: device.address,
          uid: device.id,
          imei: device.address,
          deviceType: device.eldType === 'JIMI_PT30' ? '181' : '168',
          deviceCategory: device.deviceType.toLowerCase(),
          connectionMethod: 'universal',
          enableAutoReconnect: true,
          enableDataStreaming: true,
        };
        
        await JimiBridge.connectToDevice(connectionOptions);
        console.log('✅ Jimi Bridge connection initiated');
        
      } else {
        console.log('🎭 Using mock connection...');
      }
      
      // Simulate connection process
      setTimeout(() => {
        // Update device connection status
        setDevices(prev =>
          prev.map(d =>
            d.id === device.id ? { ...d, isConnected: true } : d
          )
        );
        setIsConnecting(false);
        Alert.alert('Success', `Connected to ${device.name}!`);
        console.log('✅ Device connected:', device.name);
      }, 2000);
      
    } catch (err) {
      console.error('❌ Connection failed:', err);
      setIsConnecting(false);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
    }
  };

  // Get device icon
  const getDeviceIcon = (deviceType: Device['deviceType']) => {
    switch (deviceType) {
      case 'ELD':
        return <SimpleTruck color={colors.primary} />;
      case 'Camera':
        return <SimpleCamera color={colors.primary} />;
      case 'Tracker':
        return <SimpleTracker color={colors.primary} />;
      default:
        return <SimpleBluetooth color={colors.primary} size={24} />;
    }
  };

  // Render device item
  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={[
        styles.deviceCard,
        {
          borderColor: selectedDevice?.id === item.id ? colors.primary : colors.border,
          borderWidth: selectedDevice?.id === item.id ? 2 : 1,
        },
      ]}
      onPress={() => setSelectedDevice(item)}
      disabled={isConnecting}
    >
      <View style={styles.deviceRow}>
        <View style={styles.deviceIcon}>
          {getDeviceIcon(item.deviceType)}
        </View>
        
        <View style={styles.deviceDetails}>
          <View style={styles.deviceHeader}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {item.name}
            </Text>
            {item.isConnected && (
              <View style={styles.connectedBadge}>
                <SimpleCheck color={colors.secondary} />
                <Text style={[styles.connectedText, { color: colors.secondary }]}>
                  Connected
                </Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.deviceAddress, { color: colors.inactive }]}>
            {item.address}
          </Text>
          
          <View style={styles.deviceMeta}>
            <Text style={[styles.deviceType, { color: colors.inactive }]}>
              {item.deviceType} {item.eldType && `(${item.eldType})`}
            </Text>
            {item.signalStrength && (
              <Text style={[styles.signalStrength, { color: colors.inactive }]}>
                Signal: {item.signalStrength}%
              </Text>
            )}
          </View>
          
          {item.batteryLevel && (
            <Text style={[styles.batteryLevel, { color: colors.inactive }]}>
              Battery: {item.batteryLevel}%
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.connectButton,
            {
              backgroundColor: item.isConnected ? colors.secondary : colors.primary,
            },
          ]}
          onPress={() => !item.isConnected && connectToDevice(item)}
          disabled={isConnecting || item.isConnected}
        >
          {isConnecting && selectedDevice?.id === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <SimpleBluetooth color="white" size={16} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <SimpleArrowLeft />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <SimpleBluetooth color={colors.primary} size={48} />
          <Text style={[styles.title, { color: colors.text }]}>
            Universal Device Pairing
          </Text>
          <Text style={[styles.subtitle, { color: colors.inactive }]}>
            Connect JIMI ELD devices, cameras, and trackers
          </Text>
          
          {/* Bridge Status */}
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: colors.inactive }]}>
              Bridge Status: {jimiBridgeAvailable ? '🟢 Available' : '🔴 Mock Mode'}
            </Text>
          </View>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <SimpleAlert color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Permissions Check */}
        {!permissionsGranted && (
          <View style={styles.permissionContainer}>
            <Text style={[styles.permissionText, { color: colors.text }]}>
              Bluetooth permissions are required
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermissions}
            >
              <Text style={styles.permissionButtonText}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan Section */}
        {permissionsGranted && (
          <View style={styles.scanSection}>
            <View style={styles.scanHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Available Devices ({devices.length})
              </Text>
              <TouchableOpacity
                style={[
                  styles.scanButton,
                  {
                    backgroundColor: isScanning ? colors.inactive : colors.primary,
                  },
                ]}
                onPress={startScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <SimpleRefresh color="white" size={16} />
                )}
                <Text style={styles.scanButtonText}>
                  {isScanning ? 'Scanning...' : 'Scan'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Device List */}
            {devices.length === 0 && !isScanning ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.inactive }]}>
                  No devices found. Tap "Scan" to search for devices.
                </Text>
              </View>
            ) : (
              <FlatList
                data={devices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
                style={styles.deviceList}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              {
                backgroundColor: selectedDevice ? colors.primary : colors.inactive,
              },
            ]}
            onPress={() => selectedDevice && connectToDevice(selectedDevice)}
            disabled={!selectedDevice || isConnecting || selectedDevice?.isConnected}
          >
            <Text style={styles.actionButtonText}>
              {selectedDevice?.isConnected ? 'Connected' : 'Connect Selected'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => router.replace('/(app)/(tabs)')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Skip for Now
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  statusContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  deviceList: {
    maxHeight: 400,
  },
  deviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    marginRight: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  deviceAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  deviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 12,
    fontWeight: '500',
  },
  signalStrength: {
    fontSize: 12,
  },
  batteryLevel: {
    fontSize: 12,
  },
  connectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  primaryButton: {
    // backgroundColor will be set dynamically
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
