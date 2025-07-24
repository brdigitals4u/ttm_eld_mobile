// app/(app)/select-demo-vehicle.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { eldTestConfig, TestMode } from "@/services/EldTestConfig";
import { eldSimulator, SimulationScenario, EldDeviceType, SimulatedEldDevice } from "@/services/EldSimulator";
import { BLEDevice, NotifyData } from "@/src/utils/TTMBLEManager";

const { width, height } = Dimensions.get('window');

export default function SelectDemoVehicleScreen() {
  const [scannedDevices, setScannedDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [scanPulse] = useState(new Animated.Value(1));
  const [deviceAnimations, setDeviceAnimations] = useState<{[key: string]: Animated.Value}>({});

  useEffect(() => {
    // Initialize ELD simulator
    const initializeSimulator = async () => {
      try {
        eldTestConfig.setTestMode(TestMode.SIMULATOR);
        await eldTestConfig.initialize();
      } catch (error) {
        console.error('Failed to initialize ELD simulator:', error);
      }
    };

    initializeSimulator();

    // Set up listeners for simulator events
    const scanSubscription = eldSimulator.onDeviceScanned((device: BLEDevice) => {
      setScannedDevices((prevDevices) => {
        if (prevDevices.find((p) => p.id === device.id)) {
          return prevDevices;
        }

        // Add animation for new device
        const deviceAnim = new Animated.Value(0);
        setDeviceAnimations(prev => ({
          ...prev,
          [device.id]: deviceAnim
        }));

        // Animate the new device in
        setTimeout(() => {
          Animated.spring(deviceAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }, 100);

        return [...prevDevices, device];
      });
    });

    const connectedSubscription = eldSimulator.onConnected(() => {
      console.log('Device connected successfully');
      setIsConnecting(false);
      setConnectingDeviceId(null);
      // Navigation will be handled in handleConnect after data reporting starts
    });

    const connectFailureSubscription = eldSimulator.onConnectFailure((error) => {
      console.error("Connection failed:", error);
      setIsConnecting(false);
      setConnectingDeviceId(null);
    });

    return () => {
      scanSubscription.remove();
      connectedSubscription.remove();
      connectFailureSubscription.remove();
    };
  }, []);

  // Start scan pulse animation
  const startScanPulse = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(scanPulse, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scanPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isScanning) pulse();
      });
    };
    pulse();
  };

  const startScan = async () => {
    setScannedDevices([]);
    setDeviceAnimations({});
    setIsScanning(true);
    startScanPulse();

    try {
      await eldSimulator.startScan(10000);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
      scanPulse.setValue(1);
    }
  };

  const handleConnect = async (device: BLEDevice) => {
    // Stop scanning immediately when connecting
    if (isScanning) {
      setIsScanning(false);
      scanPulse.setValue(1);
      try {
        await eldSimulator.stopScan();
      } catch (error) {
        console.log('Error stopping scan:', error);
      }
    }

    setIsConnecting(true);
    setConnectingDeviceId(device.id);

    try {
      // Get the full device info for IMEI
      const availableDevices = eldSimulator.getAvailableDevices();
      const fullDevice = availableDevices.find(d => d.address === device.address);
      
      if (!fullDevice) {
        throw new Error('Device details not found');
      }

      console.log('Connecting to device:', device.name || fullDevice.name);
      await eldSimulator.connect(device.address, fullDevice.imei, false);
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Connection successful, starting data reporting');
      
      // Start ELD data collection after successful connection
      try {
        await eldSimulator.startReportEldData();
        console.log('Started ELD data reporting');
      } catch (dataError) {
        console.warn('Could not start ELD data reporting:', dataError);
      }
      
      // Navigate to main app screen after successful connection
      router.replace('/(app)/(tabs)');
      
    } catch (error: any) {
      console.error("Connection attempt failed:", error);
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  const getDevicePosition = (index: number) => {
    const angle = (index * 137.5) % 360;
    const radius = Math.min(width, height) * 0.25 + (index % 3) * 40;
    const centerX = width / 2;
    const centerY = height / 2;

    return {
      x: centerX + Math.cos(angle * Math.PI / 180) * radius - 50,
      y: centerY + Math.sin(angle * Math.PI / 180) * radius - 50,
    };
  };

  const renderDevice = (device: BLEDevice, index: number) => {
    const position = getDevicePosition(index);
    const deviceAnim = deviceAnimations[device.id] || new Animated.Value(1);
    const isConnectingThis = connectingDeviceId === device.id;
    
    const availableDevices = eldSimulator.getAvailableDevices();
    const fullDevice = availableDevices.find(d => d.address === device.address);
    const deviceName = device.name || fullDevice?.name || `ELD-${device.id.slice(-4)}`;

    return (
      <Animated.View
        key={device.id}
        style={[
          styles.deviceContainer,
          {
            left: position.x,
            top: position.y,
            transform: [{ scale: deviceAnim }],
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
            <ActivityIndicator size="large" color="#FFF" />
          ) : (
            <>
              <Text style={styles.deviceName}>{deviceName}</Text>
              <Text style={styles.tapText}>Tap to Connect</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ELD Demo Vehicle</Text>
        <Text style={styles.subtitle}>Select a device to connect</Text>
      </View>

      {/* Scan Area */}
      <View style={styles.scanArea}>
        {/* Central Scan Button */}
        <Animated.View
          style={[
            styles.scanButtonContainer,
            {
              transform: [{ scale: scanPulse }],
            },
          ]}
        >
          <Pressable
            style={[styles.scanButton, isScanning && styles.scanningButton]}
            onPress={startScan}
            disabled={isScanning || isConnecting}
          >
            <Text style={styles.scanIcon}>
              {isScanning ? '📡' : '🔍'}
            </Text>
            <Text style={styles.scanText}>
              {isScanning ? 'Scanning...' : 'Scan for Devices'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Devices */}
        {scannedDevices.map((device, index) => renderDevice(device, index))}
      </View>

      {/* Status */}
      <View style={styles.statusArea}>
        {scannedDevices.length === 0 && !isScanning && (
          <Text style={styles.statusText}>
            Tap scan to discover ELD devices
          </Text>
        )}
        {isScanning && (
          <Text style={styles.statusText}>
            Searching... {scannedDevices.length} found
          </Text>
        )}
        {scannedDevices.length > 0 && !isScanning && (
          <Text style={styles.statusText}>
            Found {scannedDevices.length} device{scannedDevices.length > 1 ? 's' : ''}
          </Text>
        )}
        {isConnecting && (
          <Text style={styles.statusText}>
            Connecting...
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanButtonContainer: {
    zIndex: 1,
  },
  scanButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanningButton: {
    backgroundColor: '#6F42C1',
    shadowColor: '#6F42C1',
  },
  scanIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  deviceContainer: {
    position: 'absolute',
  },
  deviceButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#28A745',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  connectingDevice: {
    backgroundColor: '#FD7E14',
    shadowColor: '#FD7E14',
  },
  deviceName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tapText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.9,
  },
  statusArea: {
    paddingVertical: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },
});