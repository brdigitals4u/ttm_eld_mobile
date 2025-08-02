import { router } from 'expo-router';
import { ArrowLeft, Bluetooth, RefreshCw, Truck, Wifi, Signal, Battery, Settings, X } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View, NativeModules, NativeEventEmitter, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseLogger } from '@/src/services/FirebaseService';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useAuth } from '@/context/auth-context';
import { useEld } from '@/context/eld-context';
import { useTheme } from '@/context/theme-context';
import { EldDevice } from '@/types/eld';

// Check if running on web
const isWeb = false;

// Jimi IoT Universal Device Types
const DEVICE_TYPES = {
  ELD_DEVICE: '181',
  CAMERA_DEVICE: '168',
  TRACKING_DEVICE: '165',
  DOORBELL_DEVICE: '106',
  PANORAMIC_DEVICE: '360',
  UNKNOWN_DEVICE: '0'
};

// Jimi IoT Device Categories
const DEVICE_CATEGORIES = {
  CAMERA: 'camera',
  ELD: 'eld',
  TRACKING: 'tracking',
  DOORBELL: 'doorbell',
  PANORAMIC: 'panoramic'
};

interface UniversalDevice extends EldDevice {
  deviceType?: string;
  deviceCategory?: string;
  signalStrength?: number;
  batteryLevel?: number;
  isConnected?: boolean;
  lastSeen?: Date;
  firmwareVersion?: string;
  uid?: string;
  imei?: string;
}

export default function UniversalPairingScreen() {
  // Add error boundary and debugging
  const [screenError, setScreenError] = useState<string | null>(null);
  
  // Initialize contexts with safe defaults
  let colors, isDark, startScan, stopScan, devices, isScanning, connectToDevice, error, vehicleInfo, setVehicleInfo;
  
  try {
    const themeContext = useTheme();
    colors = themeContext?.colors || {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#3B82F6',
      inactive: '#666666',
      surface: '#F5F5F5',
      success: '#10B981',
      error: '#EF4444',
      white: '#FFFFFF'
    };
    isDark = themeContext?.isDark || false;
    
    const eldContext = useEld();
    startScan = eldContext?.startScan || (() => console.log('startScan not available'));
    stopScan = eldContext?.stopScan || (() => console.log('stopScan not available'));
    devices = eldContext?.devices || [];
    isScanning = eldContext?.isScanning || false;
    connectToDevice = eldContext?.connectToDevice || (() => Promise.resolve());
    error = eldContext?.error || null;
    
    const authContext = useAuth();
    vehicleInfo = authContext?.vehicleInfo || null;
    setVehicleInfo = authContext?.setVehicleInfo || (() => {});
    
    console.log('Universal Pairing Screen loaded successfully', {
      hasTheme: !!themeContext,
      hasEld: !!eldContext,
      hasAuth: !!authContext,
      colors: !!colors
    });
  } catch (err) {
    console.error('Error loading contexts:', err);
    // Set fallback values
    colors = {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#3B82F6',
      inactive: '#666666',
      surface: '#F5F5F5',
      success: '#10B981',
      error: '#EF4444',
      white: '#FFFFFF'
    };
    isDark = false;
    startScan = () => console.log('startScan not available');
    stopScan = () => console.log('stopScan not available');
    devices = [];
    isScanning = false;
    connectToDevice = () => Promise.resolve();
    error = null;
    vehicleInfo = null;
    setVehicleInfo = () => {};
    setScreenError(`Context error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
  
  // Universal Pairing State
  const [universalDevices, setUniversalDevices] = useState<UniversalDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<UniversalDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<UniversalDevice[]>([]);
  const [scanFilter, setScanFilter] = useState<string>('all');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Jimi IoT Bridge References
  const jimiBridgeRef = useRef<any>(null);
  const eventEmitterRef = useRef<any>(null);

  useEffect(() => {
    if (!isWeb) {
      initializeJimiBridge();
      startUniversalScan();
    }

    return () => {
      if (!isWeb) {
        stopUniversalScan();
        cleanupJimiBridge();
      }
    };
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  // Initialize Jimi IoT Bridge
  const initializeJimiBridge = async () => {
    try {
      if (NativeModules.JimiBridge) {
        jimiBridgeRef.current = NativeModules.JimiBridge;
        eventEmitterRef.current = new NativeEventEmitter(jimiBridgeRef.current);
        setupJimiEventListeners();
        await requestJimiPermissions();
        console.log('Jimi IoT Bridge initialized successfully');
      } else {
        console.log('Jimi IoT Bridge not available, using fallback');
      }
    } catch (error) {
      console.error('Failed to initialize Jimi Bridge:', error);
    }
  };

  // Setup Jimi IoT Event Listeners
  const setupJimiEventListeners = () => {
    if (!eventEmitterRef.current) return;

    eventEmitterRef.current.addListener('onDeviceDiscovered', (device: UniversalDevice) => {
      console.log('Jimi IoT Device Discovered:', device);
      handleDeviceDiscovered(device);
    });

    eventEmitterRef.current.addListener('onDeviceConnected', (device: UniversalDevice) => {
      console.log('Jimi IoT Device Connected:', device);
      handleDeviceConnected(device);
    });

    eventEmitterRef.current.addListener('onDeviceDisconnected', (device: UniversalDevice) => {
      console.log('Jimi IoT Device Disconnected:', device);
      handleDeviceDisconnected(device);
    });

    eventEmitterRef.current.addListener('onDataReceived', (data: any) => {
      console.log('Jimi IoT Data Received:', data);
      handleDataReceived(data);
    });

    eventEmitterRef.current.addListener('onConnectionError', (error: any) => {
      console.log('Jimi IoT Connection Error:', error);
      handleConnectionError(error);
    });
  };

  // Request Jimi IoT Permissions
  const requestJimiPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.INTERNET,
          PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE,
          PermissionsAndroid.PERMISSIONS.WAKE_LOCK,
          PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE,
        ];
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          Alert.alert('Permission Denied', 'Some permissions are required for universal device pairing.');
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    return true;
  };

  // Start Universal Scanning (Jimi IoT Style)
  const startUniversalScan = async () => {
    try {
      if (jimiBridgeRef.current) {
        await jimiBridgeRef.current.startUniversalScan({
          scanFilter: scanFilter,
          scanDuration: 30000,
          enableBackgroundScan: true,
          enableRSSI: true,
          enableDeviceTypeDetection: true
        });
      } else {
        startScan();
      }
    } catch (error) {
      console.error('Failed to start universal scan:', error);
      startScan();
    }
  };

  // Stop Universal Scanning
  const stopUniversalScan = async () => {
    try {
      if (jimiBridgeRef.current) {
        await jimiBridgeRef.current.stopUniversalScan();
      } else {
        stopScan();
      }
    } catch (error) {
      console.error('Failed to stop universal scan:', error);
      stopScan();
    }
  };

  // Handle Device Discovery (Jimi IoT Style)
  const handleDeviceDiscovered = (device: UniversalDevice) => {
    const categorizedDevice = categorizeDevice(device);
    
    setUniversalDevices(prev => {
      const existing = prev.find(d => d.id === categorizedDevice.id);
      if (existing) {
        return prev.map(d => d.id === categorizedDevice.id ? { ...d, ...categorizedDevice } : d);
      } else {
        return [...prev, categorizedDevice];
      }
    });
  };

  // Categorize Device (Jimi IoT Logic)
  const categorizeDevice = (device: UniversalDevice): UniversalDevice => {
    let deviceType = DEVICE_TYPES.UNKNOWN_DEVICE;
    let deviceCategory = DEVICE_CATEGORIES.CAMERA;

    if (device.uid && device.uid.length >= 18) {
      const typeCode = device.uid.substring(15, 18);
      deviceType = typeCode;
      
      switch (typeCode) {
        case DEVICE_TYPES.ELD_DEVICE:
          deviceCategory = DEVICE_CATEGORIES.ELD;
          break;
        case DEVICE_TYPES.CAMERA_DEVICE:
          deviceCategory = DEVICE_CATEGORIES.CAMERA;
          break;
        case DEVICE_TYPES.TRACKING_DEVICE:
          deviceCategory = DEVICE_CATEGORIES.TRACKING;
          break;
        case DEVICE_TYPES.DOORBELL_DEVICE:
          deviceCategory = DEVICE_CATEGORIES.DOORBELL;
          break;
        case DEVICE_TYPES.PANORAMIC_DEVICE:
          deviceCategory = DEVICE_CATEGORIES.PANORAMIC;
          break;
        default:
          deviceCategory = DEVICE_CATEGORIES.CAMERA;
      }
    }

    return {
      ...device,
      deviceType,
      deviceCategory,
      signalStrength: Math.floor(Math.random() * 100),
      batteryLevel: Math.floor(Math.random() * 100),
      lastSeen: new Date(),
      firmwareVersion: '1.0.0'
    };
  };

  // Handle Device Connection (Jimi IoT Style)
  const handleDeviceConnected = (device: UniversalDevice) => {
    setIsConnecting(false);
    setConnectedDevices(prev => [...prev, device]);
    
    if (device.deviceCategory === DEVICE_CATEGORIES.ELD && vehicleInfo) {
      setVehicleInfo({
        ...vehicleInfo,
        eldConnected: true,
        eldId: device.id,
        eldType: device.deviceType,
        eldUID: device.uid
      });
    }

    Alert.alert('Success', `${device.name} connected successfully!`);
  };

  // Handle Device Disconnection
  const handleDeviceDisconnected = (device: UniversalDevice) => {
    setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
    
    if (device.deviceCategory === DEVICE_CATEGORIES.ELD && vehicleInfo) {
      setVehicleInfo({
        ...vehicleInfo,
        eldConnected: false,
        eldId: null,
        eldType: null,
        eldUID: null
      });
    }
  };

  // Handle Data Received (Jimi IoT Style)
  const handleDataReceived = (data: any) => {
    console.log('Processing received data:', data);
  };

  // Handle Connection Error
  const handleConnectionError = (error: any) => {
    setIsConnecting(false);
    Alert.alert('Connection Error', error.message || 'Failed to connect to device');
  };

  // Connect to Device (Jimi IoT Style)
  const handleConnectDevice = async (device: UniversalDevice) => {
    if (!device) return;

    setIsConnecting(true);

    try {
      if (jimiBridgeRef.current) {
        await jimiBridgeRef.current.connectToDevice({
          deviceId: device.id,
          uid: device.uid,
          imei: device.imei,
          deviceType: device.deviceType,
          deviceCategory: device.deviceCategory,
          connectionMethod: 'universal',
          enableAutoReconnect: true,
          enableDataStreaming: true
        });
      } else {
        await connectToDevice(device);
      }
    } catch (error) {
      console.error('Failed to connect to device:', error);
      setIsConnecting(false);
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  // Disconnect Device
  const handleDisconnectDevice = async (device: UniversalDevice) => {
    try {
      if (jimiBridgeRef.current) {
        await jimiBridgeRef.current.disconnectDevice(device.id);
      } else {
        console.log('Disconnecting device:', device.id);
      }
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      Alert.alert('Disconnection Error', 'Failed to disconnect device');
    }
  };

  // Cleanup Jimi Bridge
  const cleanupJimiBridge = () => {
    if (eventEmitterRef.current) {
      eventEmitterRef.current.removeAllListeners();
    }
  };

  // Handle Device Selection
  const handleDeviceSelect = (device: UniversalDevice) => {
    setSelectedDevice(device);
  };

  // Handle Refresh Scan
  const handleRefreshScan = async () => {
    try {
      await FirebaseLogger.logEvent('universal_refresh_scan_clicked', {
        screen: 'universal_pairing',
        action: 'refresh_scan_button',
        filter: scanFilter
      });
    } catch (error) {
      FirebaseLogger.recordError(error as Error);
    }
    
    if (!isWeb) {
      startUniversalScan();
    } else {
      Alert.alert('Web Limitation', 'Universal device scanning is not available on web.');
    }
  };

  // Handle Back Press
  const handleBackPress = async () => {
    try {
      await FirebaseLogger.logEvent('universal_pairing_back_pressed', {
        screen: 'universal_pairing',
        action: 'back_button'
      });
    } catch (error) {
      FirebaseLogger.recordError(error as Error);
    }
    router.back();
  };

  // Handle Skip
  const handleSkip = () => {
    router.replace('/(app)/(tabs)');
  };

  // Filter devices based on category
  const getFilteredDevices = () => {
    if (scanFilter === 'all') return universalDevices;
    return universalDevices.filter(device => device.deviceCategory === scanFilter);
  };

  // Get device icon based on category
  const getDeviceIcon = (device: UniversalDevice) => {
    switch (device.deviceCategory) {
      case DEVICE_CATEGORIES.ELD:
        return <Truck size={24} color={colors.primary} />;
      case DEVICE_CATEGORIES.CAMERA:
        return <Bluetooth size={24} color={colors.primary} />;
      case DEVICE_CATEGORIES.TRACKING:
        return <Signal size={24} color={colors.primary} />;
      case DEVICE_CATEGORIES.DOORBELL:
        return <Wifi size={24} color={colors.primary} />;
      case DEVICE_CATEGORIES.PANORAMIC:
        return <Settings size={24} color={colors.primary} />;
      default:
        return <Bluetooth size={24} color={colors.primary} />;
    }
  };

  // Render Device Item
  const renderDeviceItem = ({ item }: { item: UniversalDevice }) => (
    <Card
      style={[
        styles.deviceCard,
        {
          borderColor: selectedDevice?.id === item.id ? colors.primary : 'transparent',
          borderWidth: selectedDevice?.id === item.id ? 2 : 0,
        },
      ]}
      onTouchEnd={() => handleDeviceSelect(item)}
    >
      <View style={styles.deviceInfo}>
        {getDeviceIcon(item)}
        <View style={styles.deviceDetails}>
          <View style={styles.deviceHeader}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {item.name || 'Unknown Device'}
            </Text>
            <View style={styles.deviceStatus}>
              {item.isConnected && (
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              )}
              <Text style={[styles.deviceType, { color: colors.inactive }]}>
                {item.deviceCategory?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.deviceAddress, { color: colors.inactive }]}>
            {item.address}
          </Text>
          <View style={styles.deviceMetrics}>
            {item.signalStrength && (
              <Text style={[styles.deviceMetric, { color: colors.inactive }]}>
                Signal: {item.signalStrength}%
              </Text>
            )}
            {item.batteryLevel && (
              <Text style={[styles.deviceMetric, { color: colors.inactive }]}>
                Battery: {item.batteryLevel}%
              </Text>
            )}
            {item.firmwareVersion && (
              <Text style={[styles.deviceMetric, { color: colors.inactive }]}>
                FW: {item.firmwareVersion}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.deviceActions}>
          {item.isConnected ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => handleDisconnectDevice(item)}
            >
              <X size={16} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleConnectDevice(item)}
              disabled={isConnecting}
            >
              <Bluetooth size={16} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  // Render Connected Device Item
  const renderConnectedDeviceItem = ({ item }: { item: UniversalDevice }) => (
    <Card style={[styles.connectedDeviceCard, { borderColor: colors?.success || '#10B981' }]}>
      <View style={styles.deviceInfo}>
        {getDeviceIcon(item)}
        <View style={styles.deviceDetails}>
          <Text style={[styles.deviceName, { color: colors?.text || '#000' }]}>
            {item.name || 'Unknown Device'}
          </Text>
          <Text style={[styles.deviceAddress, { color: colors?.inactive || '#666' }]}>
            {item.address} • Connected
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.disconnectButton, { backgroundColor: colors?.error || '#EF4444' }]}
          onPress={() => handleDisconnectDevice(item)}
        >
          <X size={16} color={colors?.white || '#FFF'} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  // Handle screen errors
  if (screenError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Screen Error</Text>
          <Text style={styles.errorMessage}>{screenError}</Text>
          <TouchableOpacity 
            style={styles.errorButton} 
            onPress={() => {
              setScreenError(null);
              router.back();
            }}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back Button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.header}>
        <Bluetooth size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Universal Pairing</Text>
        <Text style={[styles.subtitle, { color: colors.inactive }]}>
          Connect any IoT device using Jimi technology
        </Text>
      </View>

      <View style={styles.content}>
        {/* Filter Options */}
        <View style={styles.filterContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Device Filter
          </Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: scanFilter === 'all' ? colors.primary : colors.surface,
                  borderColor: colors.primary
                }
              ]}
              onPress={() => setScanFilter('all')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: scanFilter === 'all' ? colors.white : colors.primary }
              ]}>
                ALL
              </Text>
            </TouchableOpacity>
            {Object.entries(DEVICE_CATEGORIES).map(([key, value]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: scanFilter === value ? colors.primary : colors.surface,
                    borderColor: colors.primary
                  }
                ]}
                onPress={() => setScanFilter(value)}
              >
                <Text style={[
                  styles.filterButtonText,
                  { color: scanFilter === value ? colors.white : colors.primary }
                ]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Connected Devices */}
        {connectedDevices.length > 0 && (
          <View style={styles.connectedSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Connected Devices ({connectedDevices.length})
            </Text>
            <FlatList
              data={connectedDevices}
              renderItem={renderConnectedDeviceItem}
              keyExtractor={(item) => item.id}
              style={styles.connectedDeviceList}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Scan Header */}
        <View style={styles.scanHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Available Devices ({getFilteredDevices().length})
          </Text>
          <Button
            title={isScanning ? 'Scanning...' : 'Refresh'}
            onPress={handleRefreshScan}
            variant="outline"
            icon={<RefreshCw size={16} color={colors.primary} />}
            disabled={isScanning}
          />
        </View>

        {/* Device List */}
        {getFilteredDevices().length === 0 && !isScanning ? (
          <Card>
            <Text style={[styles.emptyText, { color: colors.inactive }]}>
              No {scanFilter === 'all' ? '' : scanFilter} devices found. 
              Make sure your devices are powered on and in pairing mode.
            </Text>
          </Card>
        ) : (
          <FlatList
            data={!isWeb ? getFilteredDevices() : [
              // Mock devices for web demo
              {
                id: 'eld-001',
                name: 'ELD Device 1',
                address: '00:11:22:33:44:55',
                deviceType: DEVICE_TYPES.ELD_DEVICE,
                deviceCategory: DEVICE_CATEGORIES.ELD,
                signalStrength: 85,
                batteryLevel: 90,
                isConnected: false
              },
              {
                id: 'camera-001',
                name: 'Security Camera',
                address: '55:44:33:22:11:00',
                deviceType: DEVICE_TYPES.CAMERA_DEVICE,
                deviceCategory: DEVICE_CATEGORIES.CAMERA,
                signalStrength: 72,
                batteryLevel: 65,
                isConnected: false
              },
              {
                id: 'tracking-001',
                name: 'GPS Tracker',
                address: '12:34:56:78:90:AB',
                deviceType: DEVICE_TYPES.TRACKING_DEVICE,
                deviceCategory: DEVICE_CATEGORIES.TRACKING,
                signalStrength: 95,
                batteryLevel: 45,
                isConnected: false
              },
            ]}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.id}
            style={styles.deviceList}
            contentContainerStyle={styles.deviceListContent}
          />
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Connect Selected"
            onPress={() => selectedDevice && handleConnectDevice(selectedDevice)}
            disabled={!selectedDevice || isConnecting}
            fullWidth
          />
          <Button
            title="Skip for Now"
            onPress={handleSkip}
            variant="outline"
            fullWidth
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  connectedSection: {
    marginBottom: 20,
  },
  connectedDeviceList: {
    marginTop: 8,
  },
  connectedDeviceCard: {
    marginRight: 12,
    minWidth: 200,
    borderWidth: 2,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    paddingBottom: 16,
  },
  deviceCard: {
    marginVertical: 8,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  deviceType: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  deviceAddress: {
    fontSize: 14,
    marginTop: 4,
  },
  deviceMetrics: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  deviceMetric: {
    fontSize: 12,
  },
  deviceActions: {
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
  },
  buttonContainer: {
    marginTop: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
