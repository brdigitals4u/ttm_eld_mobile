import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import JMBluetoothService from '../services/JMBluetoothService';
import { useConnectionState } from '../services/ConnectionStateService';
import { BleDevice } from '../types/JMBluetooth';

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
  
  // Timeout ref to prevent getting stuck on connection screen
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSkipButton, setShowSkipButton] = useState(false);

  useEffect(() => {
    initializeBluetooth();
    setupEventListeners();

    return () => {
      JMBluetoothService.removeAllEventListeners();
      // Clear timeout on cleanup
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  const initializeBluetooth = async () => {
    try {
      await JMBluetoothService.initializeSDK();
      const permissionResult = await JMBluetoothService.requestPermissions();
      
      if (permissionResult.granted) {
        setIsInitialized(true);
      } else {
        Alert.alert(
          'Permissions Required', 
          permissionResult.message || 'Bluetooth permissions are required to use this app. Please grant the permissions and restart the app.',
          [
            { text: 'Retry', onPress: () => initializeBluetooth() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      Alert.alert(
        'Bluetooth Error', 
        `Failed to initialize Bluetooth: ${error}`,
        [
          { text: 'Retry', onPress: () => initializeBluetooth() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
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
      console.log('✅ Device connected - waiting for authentication');
      // Don't set connecting to false here, wait for authentication
    });

    JMBluetoothService.addEventListener('onConnectFailure', (error) => {
      setConnecting(false);
      Alert.alert('Connection Failed', `Failed to connect: ${error.status}`);
    });

    JMBluetoothService.addEventListener('onAuthenticationPassed', async (data: any) => {
      console.log('🔐 Device authentication passed:', data);
      
      // Clear the connection timeout since authentication succeeded
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      try {
        // Start OBD data reporting after successful authentication
        console.log('🔧 Starting OBD data reporting...');
        const obdStartResult = await JMBluetoothService.startReportObdData();
        console.log('✅ OBD data reporting started:', obdStartResult);
        
        // Wait a moment for OBD reporting to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Configure PIDs for monitoring
        console.log('🔧 Configuring OBD PIDs...');
        const pidConfigResult = await JMBluetoothService.configureAllPIDs();
        console.log('✅ OBD PIDs configured:', pidConfigResult);
        
        // Wait another moment for PID configuration to take effect
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check connection status
        try {
          const connectionStatus = await JMBluetoothService.getConnectionStatus();
          console.log('🔍 Current connection status:', connectionStatus);
        } catch (error) {
          console.log('⚠️ Could not get connection status:', error);
        }
        
        // Check if this is a status 8 expected disconnection
        if (data.status8Expected) {
          console.log('Status 8 expected - device authenticated successfully, proceeding to dashboard');
          setConnecting(false);
          router.replace('/(tabs)/dashboard');
          return;
        }
        
        // Check if authentication is complete (new flag for password-disabled devices)
        if (data.authenticationComplete) {
          console.log('Authentication complete - proceeding to dashboard');
          setConnecting(false);
          router.replace('/(tabs)/dashboard');
          return;
        }
        
        // Fallback: assume authentication is successful and proceed
        console.log('🔐 Authentication passed - proceeding to dashboard');
        setConnecting(false);
        router.replace('/(tabs)/dashboard');
      } catch (error) {
        console.error('❌ Failed to start OBD reporting:', error);
        // Still proceed to dashboard even if OBD setup fails
        console.log('⚠️ Proceeding to dashboard despite OBD setup failure');
        setConnecting(false);
        router.replace('/(tabs)/dashboard');
      }
    });

    // Add password-related event listeners
    JMBluetoothService.addEventListener('onPasswordCheckResult', (result: any) => {
      console.log('🔑 Password check result:', result);
    });

    JMBluetoothService.addEventListener('onPasswordVerifyResult', (result: any) => {
      console.log('🔑 Password verify result:', result);
    });

    JMBluetoothService.addEventListener('onDisconnected', () => {
      setConnecting(false);
      Alert.alert('Disconnected', 'Device disconnected');
    });
  };

  const startScan = async () => {
    if (!isInitialized) {
      Alert.alert('Error', 'Bluetooth not initialized');
      return;
    }

    try {
      setDevices([]);
      setIsScanning(true);
      await JMBluetoothService.startScan();
    } catch (error) {
      setIsScanning(false);
      Alert.alert('Error', 'Failed to start scan: ' + error);
    }
  };

  const stopScan = async () => {
    try {
      await JMBluetoothService.stopScan();
      setIsScanning(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop scan: ' + error);
    }
  };

  const connectToDevice = async (device: BleDevice) => {
    if (!device.address) {
      Alert.alert('Error', 'Invalid device address');
      return;
    }

    try {
      setSelectedDevice(device);
      setConnecting(true);
      
      // Clear any existing timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      // Set a timeout to show skip button after 15 seconds
      connectionTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Connection taking too long - showing skip button');
        setShowSkipButton(true);
        
        // Auto-proceed after another 15 seconds (30 seconds total)
        setTimeout(() => {
          console.log('⏰ Connection timeout - proceeding to dashboard');
          setConnecting(false);
          router.replace('/(tabs)/dashboard');
        }, 15000);
      }, 15000); // 15 second timeout
      
      // Use the regular connect method - the native module now handles proper connection
      await JMBluetoothService.connect(device.address);
    } catch (error) {
      setConnecting(false);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      Alert.alert('Error', 'Failed to connect: ' + error);
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
          <Text style={styles.connectButtonText}>Connect</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ELD Device Scanner</Text>
        
        {/* Dev Mode Skip Button */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              console.log('🔧 DEV: Skipping ELD connection');
              router.replace('/(tabs)/dashboard');
            }}
          >
            <Text style={styles.skipButtonText}>Skip (Dev Mode)</Text>
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
              {isInitialized ? 'Start Scan' : 'Initializing...'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.deviceList}>
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {isScanning ? 'Scanning for devices...' : 'No devices found'}
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
        
        {/* Skip button when connection is taking too long */}
        {showSkipButton && isConnecting && (
          <View style={styles.skipConnectionContainer}>
            <Text style={styles.skipConnectionText}>
              Connection is taking longer than expected...
            </Text>
            <TouchableOpacity
              style={styles.skipConnectionButton}
              onPress={() => {
                console.log('🔧 User skipped connection - proceeding to dashboard');
                setConnecting(false);
                setShowSkipButton(false);
                if (connectionTimeoutRef.current) {
                  clearTimeout(connectionTimeoutRef.current);
                }
                router.replace('/(tabs)/dashboard');
              }}
            >
              <Text style={styles.skipConnectionButtonText}>Skip to Dashboard</Text>
            </TouchableOpacity>
          </View>
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
  
  // Skip connection styles
  skipConnectionContainer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  skipConnectionText: {
    color: '#B45309',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  skipConnectionButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  skipConnectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DeviceScanScreen;
