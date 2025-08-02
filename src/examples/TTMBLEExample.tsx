import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert, StyleSheet } from 'react-native';
import { TTMBLEManager, BLEDevice, ConnectionFailure, NotifyData } from '../utils/TTMBLEManager';

const TTMBLEExample: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(null);
  const [receivedData, setReceivedData] = useState<NotifyData[]>([]);

  useEffect(() => {
    // Initialize the SDK when component mounts
    initializeSDK();

    // Set up event listeners
    const deviceScannedListener = TTMBLEManager.onDeviceScanned((device: BLEDevice) => {
      console.log('Device scanned:', device);
      setDevices(prev => {
        // Avoid duplicates
        const exists = prev.find(d => d.address === device.address);
        if (exists) return prev;
        return [...prev, device];
      });
    });

    const scanStopListener = TTMBLEManager.onScanStop(() => {
      console.log('Scan stopped');
      setIsScanning(false);
    });

    const scanFinishListener = TTMBLEManager.onScanFinish(() => {
      console.log('Scan finished');
      setIsScanning(false);
    });

    const connectedListener = TTMBLEManager.onConnected(() => {
      console.log('Device connected');
      setIsConnected(true);
      Alert.alert('Success', 'Device connected successfully!');
    });

    const disconnectedListener = TTMBLEManager.onDisconnected(() => {
      console.log('Device disconnected');
      setIsConnected(false);
      setConnectedDevice(null);
      Alert.alert('Info', 'Device disconnected');
    });

    const connectFailureListener = TTMBLEManager.onConnectFailure((failure: ConnectionFailure) => {
      console.log('Connection failed:', failure);
      Alert.alert('Connection Failed', `${failure.message} (Status: ${failure.status})`);
    });

    const authPassedListener = TTMBLEManager.onAuthenticationPassed(() => {
      console.log('Authentication passed');
      Alert.alert('Success', 'Authentication passed!');
    });

    const notifyReceivedListener = TTMBLEManager.onNotifyReceived((data: NotifyData) => {
      console.log('Data received:', data);
      setReceivedData(prev => [...prev.slice(-9), data]); // Keep last 10 items
    });

    // Cleanup listeners on unmount
    return () => {
      deviceScannedListener.remove();
      scanStopListener.remove();
      scanFinishListener.remove();
      connectedListener.remove();
      disconnectedListener.remove();
      connectFailureListener.remove();
      authPassedListener.remove();
      notifyReceivedListener.remove();
    };
  }, []);

  const initializeSDK = async () => {
    try {
      await TTMBLEManager.initSDK();
      console.log('TTM SDK initialized successfully');
      Alert.alert('Success', 'TTM SDK initialized successfully!');
    } catch (error: any) {
      console.error('Failed to initialize SDK:', error);
      Alert.alert('Error', `Failed to initialize SDK: ${error.message}`);
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setDevices([]);
      await TTMBLEManager.startScan(30000); // Scan for 30 seconds
      console.log('Started scanning for devices');
    } catch (error: any) {
      console.error('Failed to start scan:', error);
      setIsScanning(false);
      Alert.alert('Error', `Failed to start scan: ${error.message}`);
    }
  };

  const stopScanning = async () => {
    try {
      await TTMBLEManager.stopScan();
      setIsScanning(false);
      console.log('Stopped scanning');
    } catch (error: any) {
      console.error('Failed to stop scan:', error);
      Alert.alert('Error', `Failed to stop scan: ${error.message}`);
    }
  };

  const connectToDevice = async (device: BLEDevice) => {
    try {
      // You would need to provide the actual IMEI from your app's context
      const imei = '123456789012345'; // Replace with actual IMEI
      await TTMBLEManager.connect(device.address, imei, false);
      setConnectedDevice(device);
      console.log('Attempting to connect to device:', device.address);
    } catch (error: any) {
      console.error('Failed to connect:', error);
      Alert.alert('Error', `Failed to connect: ${error.message}`);
    }
  };

  const disconnectDevice = async () => {
    try {
      await TTMBLEManager.disconnect();
      console.log('Disconnected from device');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      Alert.alert('Error', `Failed to disconnect: ${error.message}`);
    }
  };

  const startELDData = async () => {
    try {
      await TTMBLEManager.startReportEldData();
      console.log('Started ELD data reporting');
      Alert.alert('Info', 'Started ELD data reporting (if supported by SDK)');
    } catch (error: any) {
      console.error('Failed to start ELD data:', error);
      Alert.alert('Error', `Failed to start ELD data: ${error.message}`);
    }
  };

  const renderDevice = ({ item }: { item: BLEDevice }) => (
    <View style={styles.deviceItem}>
      <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
      <Text style={styles.deviceAddress}>{item.address}</Text>
      <Text style={styles.deviceSignal}>Signal: {item.signal} dBm</Text>
      <Button
        title="Connect"
        onPress={() => connectToDevice(item)}
        disabled={isConnected}
      />
    </View>
  );

  const renderReceivedData = ({ item, index }: { item: NotifyData; index: number }) => (
    <View style={styles.dataItem}>
      <Text style={styles.dataIndex}>#{index + 1}</Text>
      <Text style={styles.dataType}>Type: {item.dataType}</Text>
      {item.ack && <Text style={styles.dataAck}>ACK: {item.ack}</Text>}
      {item.error && <Text style={styles.dataError}>Error: {item.error}</Text>}
      <Text style={styles.dataRaw} numberOfLines={2}>
        Data: {item.rawData}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TTM BLE Manager Example</Text>
      
      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isConnected ? `Connected to ${connectedDevice?.name || connectedDevice?.address}` : 'Disconnected'}
        </Text>
        {isConnected && (
          <Button title="Disconnect" onPress={disconnectDevice} color="#ff6b6b" />
        )}
      </View>

      {/* Scan Controls */}
      <View style={styles.controlsContainer}>
        <Button
          title={isScanning ? "Stop Scan" : "Start Scan"}
          onPress={isScanning ? stopScanning : startScanning}
          disabled={isConnected}
        />
      </View>

      {/* Device List */}
      <Text style={styles.sectionTitle}>Discovered Devices ({devices.length})</Text>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.address}
        style={styles.deviceList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isScanning ? 'Scanning for devices...' : 'No devices found. Start scanning to discover devices.'}
          </Text>
        }
      />

      {/* ELD Data Controls */}
      {isConnected && (
        <View style={styles.controlsContainer}>
          <Button title="Start ELD Data" onPress={startELDData} />
        </View>
      )}

      {/* Received Data */}
      {receivedData.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Received Data ({receivedData.length})</Text>
          <FlatList
            data={receivedData}
            renderItem={renderReceivedData}
            keyExtractor={(_, index) => index.toString()}
            style={styles.dataList}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  controlsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  deviceList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  deviceItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceAddress: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  deviceSignal: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  dataList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dataItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataIndex: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
  },
  dataType: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  dataAck: {
    fontSize: 12,
    color: '#4caf50',
  },
  dataError: {
    fontSize: 12,
    color: '#f44336',
  },
  dataRaw: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
});

export default TTMBLEExample;
