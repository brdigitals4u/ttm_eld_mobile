import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import JMBluetoothService from '../services/JMBluetoothService';
import { useConnectionState } from '../services/ConnectionStateService';
import { BleDevice } from '../types/JMBluetooth';
import { saveEldDevice } from '../utils/eldStorage';
import { toast } from '@/components/Toast';
import { translate } from '@/i18n/translate';

const __DEV__ = process.env.NODE_ENV === 'development';

interface DeviceScanScreenProps {
  navigation?: any;
}

const DeviceScanScreen: React.FC<DeviceScanScreenProps> = ({ navigation: _navigation }) => {
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [_selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);
  const { isConnecting, setConnecting } = useConnectionState();

  useEffect(() => {
    initializeBluetooth();
    setupEventListeners();

    return () => {
      JMBluetoothService.removeAllEventListeners();
    };
  }, []);

  const initializeBluetooth = async () => {
    try {
      await JMBluetoothService.initializeSDK();
      const permissionResult = await JMBluetoothService.requestPermissions();
      
      if (permissionResult.granted) {
        setIsInitialized(true);
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



  const renderDevice = ({ item }: { item: BleDevice }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
      disabled={isConnecting}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
        <Text style={styles.deviceSignal}>Signal: {item.signal} dBm</Text>
      </View>
      <View style={styles.connectButton}>
        {isConnecting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.connectButtonText}>{translate("deviceScan.connect" as any)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{translate("deviceScan.title" as any)}</Text>
        
        {/* Dev Mode Skip Button */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              console.log('🔧 DEV: Skipping ELD connection');
              router.replace('/(tabs)/dashboard');
            }}
          >
            <Text style={styles.skipButtonText}>{translate("deviceScan.skip" as any)}</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanningButton]}
          onPress={isScanning ? stopScan : startScan}
          disabled={!isInitialized}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scanButtonText}>
              {isInitialized ? translate("deviceScan.startScan" as any) : translate("common.loading" as any)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.deviceList}>
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {isScanning ? translate("deviceScan.scanning" as any) : translate("deviceScan.noDevices" as any)}
            </Text>
            {isScanning && <ActivityIndicator style={styles.scanningIndicator} />}
          </View>
        ) : (
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={(item) => item.address || Math.random().toString()}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FF',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E7FB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1F2430',
  },
  scanButton: {
    backgroundColor: '#5750F1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanningButton: {
    backgroundColor: '#EF4444',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#9CA3AF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  scanningIndicator: {
    marginTop: 10,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  deviceAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  deviceSignal: {
    fontSize: 12,
    color: '#999',
  },
  connectButton: {
    backgroundColor: '#5750F1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DeviceScanScreen;
