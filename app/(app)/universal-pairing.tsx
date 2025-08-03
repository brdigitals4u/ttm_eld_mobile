import { router } from 'expo-router';
import { ArrowLeft, Bluetooth, RefreshCw, Truck, Wifi, Signal, Battery, Settings, X, Search, Filter, Zap, ShieldCheck, Circle } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View, NativeModules, NativeEventEmitter, PermissionsAndroid, Animated, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
// Firebase removed - import { FirebaseLogger } from '@/src/services/FirebaseService';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useAuth } from '@/context/auth-context';
import { useEld } from '@/context/eld-context';
import { useTheme } from '@/context/theme-context';
import { EldDevice } from '@/types/eld';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  PANORAMIC: 'panoramic',
  BLUETOOTH: 'bluetooth',
  SENSOR: 'sensor',
  IOT: 'iot'
};

interface UniversalDevice extends EldDevice {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
  deviceType?: string;
  deviceCategory?: string;
  signalStrength?: number;
  batteryLevel?: number;
  lastSeen?: Date;
  firmwareVersion?: string;
  uid?: string;
  imei?: string;
  sensorData?: number;
  dataType?: string;
}

export default function UniversalPairingScreen() {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanningRotation = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  
  // Add error boundary and debugging
  const [screenError, setScreenError] = useState<string | null>(null);
  
  // Initialize contexts with safe defaults
  let colors: any, isDark: boolean, startScan: any, stopScan: any, devices: any, isScanning: boolean, connectToDevice: any, error: any, vehicleInfo: any, setVehicleInfo: any;
  
  try {
    const themeContext = useTheme();
    colors = themeContext?.colors || {
      background: '#0F0F10',
      surface: '#1A1A1D',
      surfaceVariant: '#2A2A2F',
      text: '#FFFFFF',
      textSecondary: '#B0B0B8',
      primary: '#6366F1',
      primaryLight: '#8B5CF6',
      secondary: '#8B5CF6',
      accent: '#F59E0B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      white: '#FFFFFF',
      black: '#000000',
      inactive: '#6B7280',
      border: '#2A2A2F',
      overlay: 'rgba(0, 0, 0, 0.7)',
      gradient: ['#6366F1', '#8B5CF6', '#EC4899'],
      cardGradient: ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)'],
      surfaceGradient: ['#1A1A1D', '#2A2A2F'],
    };
    isDark = themeContext?.isDark ?? true;
    
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
    // Set modern dark theme fallback
    colors = {
      background: '#0F0F10',
      surface: '#1A1A1D',
      surfaceVariant: '#2A2A2F',
      text: '#FFFFFF',
      textSecondary: '#B0B0B8',
      primary: '#6366F1',
      primaryLight: '#8B5CF6',
      secondary: '#8B5CF6',
      accent: '#F59E0B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      white: '#FFFFFF',
      black: '#000000',
      inactive: '#6B7280',
      border: '#2A2A2F',
      overlay: 'rgba(0, 0, 0, 0.7)',
      gradient: ['#6366F1', '#8B5CF6', '#EC4899'],
      cardGradient: ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)'],
      surfaceGradient: ['#1A1A1D', '#2A2A2F'],
    };
    isDark = true;
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

  // Animation effects
  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for connected devices
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    if (isScanning) {
      pulseAnimation.start();
      
      // Rotation animation for scanning icon
      const rotationAnimation = Animated.loop(
        Animated.timing(scanningRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotationAnimation.start();
    } else {
      pulseAnimation.stop();
      scanningRotation.setValue(0);
    }

    return () => {
      pulseAnimation.stop();
    };
  }, [isScanning]);

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
        // Check Android API level for proper permission handling
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
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          console.warn('Some permissions denied:', granted);
          Alert.alert('Permission Denied', 'Some permissions are required for universal device pairing.');
          return false;
        }
        
        console.log('All permissions granted successfully');
        return true;
      } catch (error) {
        console.error('Permission request failed:', error);
        Alert.alert('Permission Error', 'Failed to request permissions. Please grant them manually in Settings.');
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
          scanDuration: 30000,
          enableBackgroundScan: true,
          enableRSSI: true,
          enableDeviceTypeDetection: true,
          enableBluetoothLE: true,
          enableBluetoothClassic: false,
          enableLegacyScan: false,
          enableDuplicateFilter: true,
          scanFilter: "all",
          maxResults: 100,
          scanMode: "LOW_LATENCY"
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

    // Check if it's a Bluetooth device
    if (device.address && device.address.includes(':')) {
      if (device.sensorData !== undefined || device.dataType === 'sensor') {
        deviceCategory = DEVICE_CATEGORIES.SENSOR;
        deviceType = 'BLUETOOTH_SENSOR';
      } else if (device.name && device.name.toLowerCase().includes('bluetooth')) {
        deviceCategory = DEVICE_CATEGORIES.BLUETOOTH;
        deviceType = 'BLUETOOTH_DEVICE';
      } else {
        deviceCategory = DEVICE_CATEGORIES.IOT;
        deviceType = 'BLUETOOTH_IOT';
      }
    } else if (device.uid && device.uid.length >= 18) {
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
      signalStrength: device.signalStrength || Math.floor(Math.random() * 100),
      batteryLevel: device.batteryLevel || Math.floor(Math.random() * 100),
      lastSeen: new Date(),
      firmwareVersion: device.firmwareVersion || '1.0.0'
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
        eldConnected: false
      });
    }
  };

  // Handle Data Received (Jimi IoT Style)
  const handleDataReceived = (data: any) => {
    console.log('🔍 === JIMI IOT DATA RECEIVED ===');
    console.log('📊 Raw data:', JSON.stringify(data, null, 2));
    
    if (data.dataType === 'sensor') {
      setUniversalDevices(prev => 
        prev.map(device => 
          device.id === data.deviceId 
            ? { 
                ...device, 
                lastSeen: new Date(data.timestamp),
                sensorData: data.value,
                dataType: data.dataType
              }
            : device
        )
      );
    }
  };

  // Test function to send real Bluetooth data
  const testRealBluetoothData = async (deviceId: string, sensorValue: number) => {
    try {
      console.log('🧪 Testing real Bluetooth data for device:', deviceId, 'value:', sensorValue);
      await jimiBridgeRef.current?.sendRealBluetoothData(deviceId, sensorValue, 'sensor');
      console.log('✅ Real Bluetooth data sent successfully');
    } catch (error) {
      console.error('❌ Error sending real Bluetooth data:', error);
    }
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
        await connectToDevice(device as any);
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

  // Add devices to universal devices state
  const addDevicesToState = (devices: any[]) => {
    const universalDevices = devices.map(device => ({
      ...device,
      id: device.id || device.address,
      name: device.name || 'Unknown Device',
      address: device.address,
      isConnected: device.isConnected || false,
      deviceType: device.deviceType || DEVICE_TYPES.UNKNOWN_DEVICE,
      deviceCategory: device.deviceCategory || DEVICE_CATEGORIES.CAMERA,
      signalStrength: device.signalStrength || device.rssi || 0,
      batteryLevel: device.batteryLevel || 0,
      firmwareVersion: device.firmwareVersion || '1.0.0',
      lastSeen: device.lastSeen ? new Date(device.lastSeen) : new Date(),
    }));
    
    console.log('📱 Adding devices to state:', universalDevices.length);
    setUniversalDevices(universalDevices);
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
    // Firebase removed - analytics logging disabled
    
    if (!isWeb) {
      startUniversalScan();
    } else {
      Alert.alert('Web Limitation', 'Universal device scanning is not available on web.');
    }
  };

  // Handle Back Press
  const handleBackPress = async () => {
    // Firebase removed - analytics logging disabled
    router.back();
  };

  // Handle Skip
  const handleSkip = () => {
    router.replace('/(app)/(tabs)');
  };

  // Filter devices based on category
  const getFilteredDevices = () => {
    return scanFilter === 'all' ? universalDevices : universalDevices.filter(device => device.deviceCategory === scanFilter);
  };

  // Get device icon with modern styling
  const getDeviceIcon = (device: UniversalDevice) => {
    const iconProps = { size: 20, color: colors.primary };
    
    switch (device.deviceCategory) {
      case DEVICE_CATEGORIES.ELD:
        return <Truck {...iconProps} />;
      case DEVICE_CATEGORIES.CAMERA:
        return <Bluetooth {...iconProps} />;
      case DEVICE_CATEGORIES.TRACKING:
        return <Signal {...iconProps} />;
      case DEVICE_CATEGORIES.DOORBELL:
        return <Wifi {...iconProps} />;
      case DEVICE_CATEGORIES.PANORAMIC:
        return <Settings {...iconProps} />;
      case DEVICE_CATEGORIES.BLUETOOTH:
        return <Bluetooth {...iconProps} />;
      case DEVICE_CATEGORIES.SENSOR:
        return <Zap size={20} color={colors.success} />;
      case DEVICE_CATEGORIES.IOT:
        return <Wifi {...iconProps} />;
      default:
        return <Bluetooth {...iconProps} />;
    }
  };

  // Get signal strength color and bars
  const getSignalStrength = (strength: number) => {
    const bars = Math.ceil((strength / 100) * 4);
    const color = strength >= 70 ? colors.success : strength >= 40 ? colors.warning : colors.error;
    return { bars, color };
  };

  // Get battery color
  const getBatteryColor = (level: number) => {
    if (level >= 60) return colors.success;
    if (level >= 30) return colors.warning;
    return colors.error;
  };

  // Render modern device item
  const renderDeviceItem = ({ item, index }: { item: UniversalDevice; index: number }) => {
    const isSelected = selectedDevice?.id === item.id;
    const signal = getSignalStrength(item.signalStrength || 0);
    
    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [
              { 
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 50 + index * 5],
                })
              }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.modernDeviceCard,
            isSelected && [styles.selectedDeviceCard, { borderColor: colors.primary }],
          ]}
          onPress={() => handleDeviceSelect(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isSelected ? [colors.primary + '20', colors.primaryLight + '10'] : [colors.surface, colors.surfaceVariant]}
            style={styles.deviceCardGradient}
          >
            {/* Device Header */}
            <View style={styles.deviceHeader}>
              <View style={styles.deviceIconContainer}>
                <View style={[styles.deviceIconWrapper, { backgroundColor: colors.primary + '20' }]}>
                  {getDeviceIcon(item)}
                </View>
                {item.isConnected && (
                  <Animated.View 
                    style={[
                      styles.connectedIndicator,
                      {
                        backgroundColor: colors.success,
                        transform: [{ scale: pulseAnim }]
                      }
                    ]}
                  >
                    <Circle size={8} color={colors.white} fill={colors.white} />
                  </Animated.View>
                )}
              </View>
              
              <View style={styles.deviceMainInfo}>
                <View style={styles.deviceTitleRow}>
                  <Text style={[styles.modernDeviceName, { color: colors.text }]} numberOfLines={1}>
                    {item.name || 'Unknown Device'}
                  </Text>
                  {item.deviceCategory ? (
                    <View style={[styles.deviceCategoryBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.deviceCategoryText, { color: colors.primary }]}>
                        {item.deviceCategory.charAt(0).toUpperCase() + item.deviceCategory.slice(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.modernDeviceAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.address}
                </Text>
                
                {/* Device Metrics Row */}
                <View style={styles.deviceMetricsRow}>
                  {/* Signal Strength */}
                  <View style={styles.metricItem}>
                    <View style={styles.signalBars}>
                      {[...Array(4)].map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.signalBar,
                            {
                              height: 4 + (i * 2),
                              backgroundColor: i < signal.bars ? signal.color : colors.inactive,
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.metricText, { color: signal.color }]}>
                      {item.signalStrength}%
                    </Text>
                  </View>
                  
                  {/* Battery Level */}
                  {item.batteryLevel !== undefined && (
                    <View style={styles.metricItem}>
                      <Battery size={12} color={getBatteryColor(item.batteryLevel)} />
                      <Text style={[styles.metricText, { color: getBatteryColor(item.batteryLevel) }]}>
                        {item.batteryLevel}%
                      </Text>
                    </View>
                  )}
                  
                  {/* Sensor Data */}
                  {item.sensorData !== undefined && (
                    <View style={styles.metricItem}>
                      <Zap size={12} color={colors.success} />
                      <Text style={[styles.metricText, { color: colors.success }]}>
                        {item.sensorData}
                      </Text>
                    </View>
                  )}
                  
                  {/* Firmware Version */}
                  <Text style={[styles.firmwareText, { color: colors.inactive }]}>
                    v{item.firmwareVersion}
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.deviceActionArea}>
                {item.isConnected ? (
                  <TouchableOpacity
                    style={[styles.modernActionButton, styles.disconnectButton, { backgroundColor: colors.error + '20' }]}
                    onPress={() => handleDisconnectDevice(item)}
                  >
                    <X size={16} color={colors.error} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.modernActionButton, styles.connectButton, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => handleConnectDevice(item)}
                    disabled={isConnecting}
                  >
                    <Bluetooth size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render connected device chip
  const renderConnectedDeviceItem = ({ item }: { item: UniversalDevice }) => (
    <View style={styles.connectedDeviceChip}>
      <LinearGradient
        colors={[colors.success + '30', colors.success + '15']}
        style={styles.connectedDeviceGradient}
      >
        <View style={styles.connectedDeviceContent}>
          <View style={[styles.smallIconWrapper, { backgroundColor: colors.success + '20' }]}>
            {getDeviceIcon(item)}
          </View>
          <Text style={[styles.connectedDeviceName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity
            style={styles.disconnectChipButton}
            onPress={() => handleDisconnectDevice(item)}
          >
            <X size={12} color={colors.error} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  // Handle screen errors
  if (screenError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={colors.gradient} style={styles.errorContainer}>
          <BlurView intensity={20} style={styles.errorBlur}>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorMessage}>{screenError}</Text>
            <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </BlurView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const rotateInterpolate = scanningRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, colors.surface]} style={styles.backgroundGradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Modern Header */}
          <Animated.View 
            style={[
              styles.modernHeader,
              {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })}]
              }
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <View style={[styles.backButtonWrapper, { backgroundColor: colors.surface }]}>
                <ArrowLeft size={20} color={colors.text} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Device Pairing
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Discover & connect IoT devices nearby
              </Text>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Filter Pills Container */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Filter Devices</Text>
                <View style={styles.scanningIndicator}>
                  <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                    <RefreshCw size={16} color={isScanning ? colors.primary : colors.inactive} />
                  </Animated.View>
                  <Text style={[styles.scanningText, { color: isScanning ? colors.primary : colors.inactive }]}>
                    {isScanning ? 'Scanning...' : 'Idle'}
                  </Text>
                </View>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    scanFilter === 'all' && [styles.activeFilterPill, { backgroundColor: colors.primary }],
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setScanFilter('all')}
                >
                  <Text style={[
                    styles.filterPillText,
                    { color: scanFilter === 'all' ? colors.white : colors.textSecondary }
                  ]}>
                    All ({universalDevices.length})
                  </Text>
                </TouchableOpacity>
                
                {Object.entries(DEVICE_CATEGORIES).slice(0, 6).map(([key, value]) => {
                  const count = universalDevices.filter(d => d.deviceCategory === value).length;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filterPill,
                        scanFilter === value && [styles.activeFilterPill, { backgroundColor: colors.primary }],
                        { borderColor: colors.border }
                      ]}
                      onPress={() => setScanFilter(value)}
                    >
                      <Text style={[
                        styles.filterPillText,
                        { color: scanFilter === value ? colors.white : colors.textSecondary }
                      ]}>
                        {key} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Connected Devices Section */}
            {connectedDevices.length > 0 && (
              <View style={styles.connectedSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Connected ({connectedDevices.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.connectedDevicesList}>
                  {connectedDevices.map((device) => (
                    <View key={device.id}>
                      {renderConnectedDeviceItem({ item: device })}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Action Bar */}
            <View style={styles.actionBar}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Available Devices ({getFilteredDevices().length})
              </Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.refreshButton, { backgroundColor: colors.surface }]}
                  onPress={handleRefreshScan}
                  disabled={isScanning}
                >
                  <RefreshCw size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.accent + '20' }]}
                  onPress={() => {
                    const testDevices = [
                      {
                        "firmwareVersion": "1.0.0",
                        "deviceType": "0",
                        "batteryLevel": 42,
                        "signalStrength": 85,
                        "isConnected": false,
                        "address": "6C:27:9C:61:56:A6",
                        "rssi": -45,
                        "name": "Smart Sensor Pro",
                        "deviceCategory": "sensor",
                        "id": "6C:27:9C:61:56:A6",
                        "lastSeen": new Date().toISOString(),
                        "sensorData": 42,
                        "dataType": "sensor"
                      },
                      {
                        "firmwareVersion": "2.1.0",
                        "deviceType": "181",
                        "batteryLevel": 76,
                        "signalStrength": 92,
                        "isConnected": false,
                        "address": "44:FA:66:FE:62:D7",
                        "rssi": -35,
                        "name": "ELD Tracker V2",
                        "deviceCategory": "eld",
                        "id": "44:FA:66:FE:62:D7",
                        "lastSeen": new Date().toISOString()
                      },
                      {
                        "firmwareVersion": "1.5.2",
                        "deviceType": "BLUETOOTH_SENSOR",
                        "batteryLevel": 95,
                        "signalStrength": 78,
                        "isConnected": false,
                        "address": "80:8A:BD:80:D0:9D",
                        "rssi": -40,
                        "name": "Temperature Sensor",
                        "deviceCategory": "sensor",
                        "id": "80:8A:BD:80:D0:9D",
                        "lastSeen": new Date().toISOString(),
                        "sensorData": 23.5,
                        "dataType": "sensor"
                      }
                    ];
                    addDevicesToState(testDevices);
                  }}
                >
                  <Text style={[styles.testButtonText, { color: colors.accent }]}>Test</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Device List */}
            {getFilteredDevices().length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <LinearGradient
                  colors={[colors.surface, colors.surfaceVariant]}
                  style={styles.emptyStateGradient}
                >
                  <Search size={48} color={colors.inactive} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                    No devices found
                  </Text>
                  <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
                    Make sure your devices are powered on and in pairing mode, then tap refresh to scan again.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                    onPress={handleRefreshScan}
                  >
                    <Text style={[styles.emptyStateButtonText, { color: colors.white }]}>
                      Scan Again
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              <FlatList
                data={getFilteredDevices()}
                keyExtractor={item => item.id}
                renderItem={renderDeviceItem}
                style={styles.deviceList}
                contentContainerStyle={styles.deviceListContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.deviceSeparator} />}
              />
            )}

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  { 
                    backgroundColor: selectedDevice ? colors.primary : colors.inactive,
                    opacity: selectedDevice && !isConnecting ? 1 : 0.6
                  }
                ]}
                onPress={() => selectedDevice && handleConnectDevice(selectedDevice)}
                disabled={!selectedDevice || isConnecting}
              >
                <Text style={[styles.primaryActionButtonText, { color: colors.white }]}>
                  {isConnecting ? 'Connecting...' : 'Connect Selected Device'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryActionButton, { borderColor: colors.border }]}
                onPress={handleSkip}
              >
                <Text style={[styles.secondaryActionButtonText, { color: colors.textSecondary }]}>
                  Skip for Now
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterPillsContainer: {
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  activeFilterPill: {
    borderColor: 'transparent',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectedSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  connectedDevicesList: {
    flexDirection: 'row',
  },
  connectedDeviceChip: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  connectedDeviceGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  connectedDeviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 150,
  },
  smallIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedDeviceName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  disconnectChipButton: {
    padding: 2,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    paddingBottom: 20,
  },
  deviceSeparator: {
    height: 12,
  },
  modernDeviceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  selectedDeviceCard: {
    borderWidth: 2,
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  deviceCardGradient: {
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  deviceIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1D',
  },
  deviceMainInfo: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modernDeviceName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  deviceCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deviceCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modernDeviceAddress: {
    fontSize: 12,
    marginBottom: 8,
  },
  deviceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  signalBar: {
    width: 3,
    backgroundColor: '#666',
    borderRadius: 1,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
  },
  firmwareText: {
    fontSize: 10,
    fontWeight: '400',
    marginLeft: 'auto',
  },
  deviceActionArea: {
    marginLeft: 12,
  },
  modernActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButton: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  disconnectButton: {
    // No additional styles needed
  },
  emptyState: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyStateGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomActions: {
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
  },
  primaryActionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorBlur: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#FFF',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 20,
    color: '#CCC',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
