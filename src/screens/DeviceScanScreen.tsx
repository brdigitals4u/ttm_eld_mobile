import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Bluetooth,
  Radio,
  Signal,
  CheckCircle,
  X,
  Search,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import JMBluetoothService from '../services/JMBluetoothService';
import { useConnectionState } from '../services/ConnectionStateService';
import { BleDevice } from '../types/JMBluetooth';
import { saveEldDevice } from '../utils/eldStorage';
import { toast } from '@/components/Toast';
import { translate } from '@/i18n/translate';
import { colors } from '@/theme/colors';
import { Text } from '@/components/Text';

const __DEV__ = process.env.NODE_ENV === 'development';

interface DeviceScanScreenProps {
  navigation?: any;
}

// Signal strength helper function
const getSignalStrength = (dBm: number): { bars: number; color: string } => {
  if (dBm >= -50) return { bars: 4, color: colors.success };
  if (dBm >= -60) return { bars: 3, color: colors.success };
  if (dBm >= -70) return { bars: 2, color: colors.warning };
  if (dBm >= -80) return { bars: 1, color: colors.warning };
  return { bars: 1, color: colors.error };
};

// Signal strength bars component
const SignalStrengthBars: React.FC<{ signal: number }> = ({ signal }) => {
  const { bars, color } = getSignalStrength(signal);
  
  return (
    <View style={styles.signalBarsContainer}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={[
            styles.signalBar,
            {
              height: bar * 4 + 4,
              backgroundColor: bar <= bars ? color : colors.border,
              opacity: bar <= bars ? 1 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );
};

// Device card component
const DeviceCard: React.FC<{
  device: BleDevice;
  isConnecting: boolean;
  onPress: () => void;
}> = React.memo(({ device, isConnecting, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isConnecting}
        activeOpacity={0.8}
      >
        <View style={styles.deviceCardLeft}>
          <View style={styles.deviceIconContainer}>
            <Bluetooth size={24} color={colors.buttonPrimary} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName} weight="semiBold">
              {device.name || 'Unknown Device'}
            </Text>
            <Text style={styles.deviceAddress} size="xs" preset="formHelper">
              {device.address}
            </Text>
            <View style={styles.deviceSignalRow}>
              <Signal size={12} color={colors.textDim} />
              <Text style={styles.deviceSignal} size="xs" preset="formHelper">
                {device.signal} dBm
              </Text>
              <SignalStrengthBars signal={device.signal} />
            </View>
          </View>
        </View>
        <View style={styles.deviceCardRight}>
          {isConnecting ? (
            <View style={styles.connectingContainer}>
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
            </View>
          ) : (
            <View style={styles.connectButton}>
              <Text style={styles.connectButtonText} weight="semiBold">
                {translate("deviceScan.connect" as any)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

DeviceCard.displayName = 'DeviceCard';

const DeviceScanScreen: React.FC<DeviceScanScreenProps> = ({ navigation: _navigation }) => {
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);

  const [_selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);
  const { isConnecting, setConnecting } = useConnectionState();

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeBluetooth();
    setupEventListeners();

    return () => {
      JMBluetoothService.removeAllEventListeners();
    };
  }, []);

  // Pulse animation for scanning
  useEffect(() => {
    if (isScanning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Wave animation
      const wave = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      wave.start();

      return () => {
        pulse.stop();
        wave.stop();
      };
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
      return undefined;
    }
  }, [isScanning, pulseAnim, waveAnim]);

  // Rotation animation for Bluetooth icon
  useEffect(() => {
    if (isScanning) {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotate.start();
      return () => rotate.stop();
    } else {
      rotateAnim.setValue(0);
      return undefined;
    }
  }, [isScanning, rotateAnim]);

  const initializeBluetooth = async () => {
    try {
      await JMBluetoothService.initializeSDK();
      const permissionResult = await JMBluetoothService.requestPermissions();
      
      if (permissionResult.granted) {
        setIsInitialized(true);
        const status = await JMBluetoothService.getConnectionStatus();
        setBluetoothEnabled(status.isBluetoothEnabled);
      } else {
        toast.error(permissionResult.message || translate("deviceScan.bluetoothPermissionsRequired" as any));
      }
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      toast.error(`${translate("deviceScan.failedToInitializeBluetooth" as any)}: ${error}`);
    }
  };

  const setupEventListeners = () => {
    JMBluetoothService.addEventListener('onDeviceFound', (device: BleDevice) => {
      setDevices(prevDevices => {
        // Check if device already exists
        const exists = prevDevices.find(d => d.address === device.address);
        if (!exists) {
          return [...prevDevices, device];
        }
        return prevDevices;
      });
    });

    JMBluetoothService.addEventListener('onScanStopped', () => {
      setIsScanning(false);
    });

    JMBluetoothService.addEventListener('onScanFinished', () => {
      setIsScanning(false);
    });

    JMBluetoothService.addEventListener('onConnected', () => {
      setConnecting(false);
      console.log('Device connected - waiting for authentication');
    });

    JMBluetoothService.addEventListener('onConnectFailure', (error) => {
      setConnecting(false);
      toast.error(`Failed to connect: ${error.status}`);
    });

    JMBluetoothService.addEventListener('onAuthenticationPassed', async (data: any) => {
      console.log('Device authentication passed:', data);
      
      // Save ELD device info to storage
      if (_selectedDevice) {
        await saveEldDevice({
          address: _selectedDevice.address || '',
          name: _selectedDevice.name,
          connectedAt: new Date().toISOString(),
        });
      }
      
      try {
        // Step 1: Check connection status
        console.log('📡 Step 1: Checking connection status...');
        const status = await JMBluetoothService.getConnectionStatus();
        console.log('📡 Connection status:', status);
        
      if (!status.isConnected) {
        console.warn('⚠️ Device not connected after authentication');
        toast.error(translate("deviceScan.deviceNotConnected" as any));
        setConnecting(false);
        return;
      }
        
        // Step 2: Wait for stable connection (2 seconds)
        console.log('⏳ Waiting for stable connection...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Re-check connection before transmitting
        const recheckStatus = await JMBluetoothService.getConnectionStatus();
        if (!recheckStatus.isConnected) {
          console.warn('⚠️ Connection lost during wait period');
          toast.error(translate("deviceScan.connectionLost" as any));
          setConnecting(false);
          return;
        }
        
        // Step 4: Start ELD reporting (transmit)
        console.log('📤 Step 2: Starting ELD data transmission...');
        const transmitResult = await JMBluetoothService.startReportEldData();
        console.log('📤 ELD transmission start result:', transmitResult);
        
        if (!transmitResult) {
          console.warn('⚠️ ELD transmission start returned false');
          toast.error(translate("deviceScan.failedToStartEldTransmission" as any));
        } else {
          console.log('✅ ELD data transmission started successfully');
        }
        
        // Step 5: Wait a moment for transmission to initialize
        console.log('⏳ Waiting for transmission to initialize...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Step 6: Navigate to dashboard
        console.log('✅ Step 3: Navigating to dashboard...');
        setConnecting(false);
        router.replace('/(tabs)/dashboard');
        
      } catch (error) {
        console.error('❌ Error during connection check and transmission:', error);
        toast.error(`${translate("deviceScan.failedToCompleteSetup" as any)}: ${error}`);
        setConnecting(false);
        router.replace('/(tabs)/dashboard');
      }
    });

    JMBluetoothService.addEventListener('onDisconnected', () => {
      setConnecting(false);
      toast.warning(translate("deviceScan.deviceDisconnected" as any));
    });
  };

  const startScan = async () => {
    if (!isInitialized) {
      toast.error(translate("deviceScan.bluetoothNotInitialized" as any));
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDevices([]);
      setIsScanning(true);
      await JMBluetoothService.startScan();
    } catch (error) {
      setIsScanning(false);
      toast.error(`${translate("deviceScan.failedToStartScan" as any)}: ${error}`);
    }
  };

  const stopScan = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await JMBluetoothService.stopScan();
      setIsScanning(false);
    } catch (error) {
      toast.error(`${translate("deviceScan.failedToStopScan" as any)}: ${error}`);
    }
  };

  const connectToDevice = async (device: BleDevice) => {
    if (!device.address) {
      toast.error(translate("deviceScan.invalidDeviceAddress" as any));
      return;
    }

    try {
      setSelectedDevice(device);
      setConnecting(true);
      
      // Use the regular connect method - the native module now handles proper connection
      await JMBluetoothService.connect(device.address);
    } catch (error) {
      setConnecting(false);
      toast.error(`${translate("deviceScan.failedToConnect" as any)}: ${error}`);
    }
  };

  const renderDevice = useCallback(
    ({ item }: { item: BleDevice }) => (
      <DeviceCard
        device={item}
        isConnecting={isConnecting}
        onPress={() => connectToDevice(item)}
      />
    ),
    [isConnecting]
  );

  const keyExtractor = useCallback((item: BleDevice) => item.address || `device-${item.name}`, []);

  // Estimate item height for getItemLayout optimization
  const DEVICE_ITEM_HEIGHT = 100;
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: DEVICE_ITEM_HEIGHT,
      offset: DEVICE_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const EmptyState = () => {
    if (!isInitialized) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIconContainer}>
            <AlertCircle size={64} color={colors.textDim} />
          </View>
          <Text style={styles.emptyStateTitle} weight="bold" size="lg">
            {translate("deviceScan.bluetoothNotInitialized" as any)}
          </Text>
          <Text style={styles.emptyStateText} preset="formHelper" size="sm">
            {translate("deviceScan.bluetoothPermissionsRequired" as any)}
          </Text>
        </View>
      );
    }

    if (!bluetoothEnabled) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIconContainer}>
            <X size={64} color={colors.error} />
          </View>
          <Text style={styles.emptyStateTitle} weight="bold" size="lg">
            Bluetooth Disabled
          </Text>
          <Text style={styles.emptyStateText} preset="formHelper" size="sm">
            Please enable Bluetooth in your device settings
          </Text>
        </View>
      );
    }

    if (isScanning) {
      return (
        <View style={styles.emptyState}>
          <Animated.View
            style={[
              styles.emptyStateIconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.waveRing,
                {
                  opacity: waveOpacity,
                  transform: [{ scale: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
                },
              ]}
            />
            <Search size={64} color={colors.buttonPrimary} />
          </Animated.View>
          <Text style={styles.emptyStateTitle} weight="bold" size="lg">
            {translate("deviceScan.scanning" as any)}
          </Text>
          <Text style={styles.emptyStateText} preset="formHelper" size="sm">
            Searching for nearby ELD devices...
          </Text>
          <ActivityIndicator
            style={styles.scanningIndicator}
            size="large"
            color={colors.buttonPrimary}
          />
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIconContainer}>
          <Bluetooth size={64} color={colors.textDim} />
        </View>
        <Text style={styles.emptyStateTitle} weight="bold" size="lg">
          {translate("deviceScan.noDevices" as any)}
        </Text>
        <Text style={styles.emptyStateText} preset="formHelper" size="sm">
          Tap the scan button to search for ELD devices
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Animated.View
            style={[
              styles.headerIconContainer,
              {
                transform: [
                  { scale: pulseAnim },
                  { rotate: isScanning ? rotateInterpolate : '0deg' },
                ],
              },
            ]}
          >
            <Bluetooth
              size={32}
              color={isScanning ? colors.buttonPrimary : colors.textDim}
            />
          </Animated.View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title} weight="bold" size="xl">
              {translate("deviceScan.title" as any)}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isInitialized
                      ? isScanning
                        ? colors.warning
                        : colors.success
                      : colors.error,
                  },
                ]}
              />
              <Text style={styles.statusText} size="xs" preset="formHelper">
                {isInitialized
                  ? isScanning
                    ? 'Scanning...'
                    : 'Ready'
                  : 'Initializing...'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.scanButton,
            isScanning && styles.scanningButton,
            !isInitialized && styles.scanButtonDisabled,
          ]}
          onPress={isScanning ? stopScan : startScan}
          disabled={!isInitialized}
          activeOpacity={0.8}
        >
          {isScanning ? (
            <View style={styles.scanButtonContent}>
              <ActivityIndicator color={colors.buttonPrimaryText} size="small" />
              <Text style={styles.scanButtonText} weight="semiBold">
                {translate("deviceScan.stopScan" as any) || 'Stop Scan'}
              </Text>
            </View>
          ) : (
            <View style={styles.scanButtonContent}>
              <Search size={20} color={colors.buttonPrimaryText} />
              <Text style={styles.scanButtonText} weight="semiBold">
                {isInitialized
                  ? translate("deviceScan.startScan" as any)
                  : translate("common.loading" as any)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Device List */}
      <View style={styles.deviceList}>
        {devices.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.deviceListContent}
            // Performance optimizations
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={11}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            getItemLayout={getItemLayout}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.palette.light.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.infoBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    color: colors.text,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: colors.textDim,
  },
  scanButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.buttonPrimary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanningButton: {
    backgroundColor: colors.error,
  },
  scanButtonDisabled: {
    backgroundColor: colors.textDim,
    opacity: 0.5,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 16,
  },
  deviceList: {
    flex: 1,
    padding: 20,
  },
  deviceListContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.sectionBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  waveRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.buttonPrimary,
  },
  emptyStateTitle: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 24,
  },
  scanningIndicator: {
    marginTop: 16,
  },
  deviceCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.palette.light.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.infoBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 12,
    color: colors.textDim,
    marginBottom: 6,
  },
  deviceSignalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceSignal: {
    fontSize: 12,
    color: colors.textDim,
  },
  signalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: 4,
  },
  signalBar: {
    width: 3,
    borderRadius: 1.5,
  },
  deviceCardRight: {
    marginLeft: 12,
  },
  connectButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  connectButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 14,
  },
  connectingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});

export default DeviceScanScreen;
