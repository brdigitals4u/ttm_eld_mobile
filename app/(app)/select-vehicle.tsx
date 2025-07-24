// app/(app)/select-vehicle.tsx

import React, { useState, useEffect } from "react";
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
  Dimensions,
} from "react-native";
import { Peripheral } from "react-native-ble-manager";
import { bluetoothService } from "@/services/BluetoothService";
import { router } from "expo-router";

const { width, height } = Dimensions.get('window');

export default function SelectVehicleScreen() {
  const [scannedDevices, setScannedDevices] = useState<Peripheral[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [scanAnimation] = useState(new Animated.Value(0));
  const [deviceAnimations, setDeviceAnimations] = useState<{[key: string]: Animated.Value}>({});

  useEffect(() => {
    const handleDiscoveredPeripheral = (peripheral: Peripheral) => {
      setScannedDevices((prevDevices) => {
        // Avoid duplicates in the list
        if (prevDevices.find((p) => p.id === peripheral.id)) {
          return prevDevices;
        }
        
        // Add animation for new device
        setDeviceAnimations(prev => ({
          ...prev,
          [peripheral.id]: new Animated.Value(0)
        }));
        
        // Animate the new device in
        setTimeout(() => {
          Animated.spring(deviceAnimations[peripheral.id] || new Animated.Value(0), {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }, 100);
        
        return [...prevDevices, peripheral];
      });
    };

    bluetoothService.addScanListener(handleDiscoveredPeripheral);

    return () => {
      bluetoothService.removeListeners();
    };
  }, [deviceAnimations]);

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
    // On Android, we need to request permissions at runtime
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        if (
          granted["android.permission.BLUETOOTH_SCAN"] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted["android.permission.BLUETOOTH_CONNECT"] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert("Permission Required", "Bluetooth permissions are required to scan for ELD devices.");
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    setScannedDevices([]);
    setDeviceAnimations({});
    setIsScanning(true);
    startScanAnimation();
    
    bluetoothService.scan(10).finally(() => {
      setIsScanning(false);
      stopScanAnimation();
    });
  };

  const handleConnect = async (peripheral: Peripheral) => {
    setIsConnecting(true);
    setConnectingDeviceId(peripheral.id);
    
    try {
      await bluetoothService.stopScan();
      await bluetoothService.connect(peripheral.id);
      Alert.alert("Success", `Connected to ${peripheral.name}`);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      Alert.alert("Connection Failed", "Could not connect to the device.");
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  // Generate random positions for devices
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

  const renderDeviceCircle = (device: Peripheral, index: number) => {
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
          onPress={() => handleConnect(device)}
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
      </View>
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
});