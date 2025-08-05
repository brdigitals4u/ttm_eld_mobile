import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, Text, View, StyleSheet } from 'react-native';
import Button from '@/components/Button';
import { useTheme } from '@/context/theme-context';
import OBD2SDK, { OBD2Device, OBD2Data } from './sdk/OBD2SDK';

export default function OBD2() {
  const { colors } = useTheme();
  const [devices, setDevices] = useState<OBD2Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<OBD2Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [data, setData] = useState<OBD2Data | null>(null);

  const requestPermissions = useCallback(async () => {
    const granted = await OBD2SDK.requestPermissions();
    if (granted) {
      console.log('Permissions granted.');
    }
  }, []);

  const scanDevices = useCallback(async () => {
    setIsScanning(true);
    const foundDevices = await OBD2SDK.scanDevices();
    setDevices(foundDevices);
    setIsScanning(false);
  }, []);

  const connectToDevice = useCallback(async (device: OBD2Device) => {
    setIsConnecting(true);
    const success = await OBD2SDK.connectToDevice(device);
    setIsConnecting(false);
    if (success) {
      setConnectedDevice(device);
      // Start data stream
      const cleanup = OBD2SDK.startDataStream(setData);
      return () => cleanup();
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (connectedDevice) {
      await OBD2SDK.disconnect();
      setConnectedDevice(null);
      setData(null);
    }
  }, [connectedDevice]);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>

        <Button title="Scan for Devices" onPress={scanDevices} loading={isScanning} />

        {devices.map((device) => (
          <View key={device.id} style={styles.deviceRow}>
            <Text style={{ color: colors.text }}>{device.name}</Text>
            <Button
              title="Connect"
              onPress={() => connectToDevice(device)}
              loading={isConnecting && connectedDevice?.id === device.id}
            />
          </View>
        ))}

        {connectedDevice && data && (
          <View style={styles.dataContainer}>
            <Text style={[styles.dataTitle, { color: colors.text }]}>Connected to {connectedDevice.name}</Text>
            <Text style={{ color: colors.text }}>RPM: {data.rpm}</Text>
            <Text style={{ color: colors.text }}>Speed: {data.speed} km/h</Text>
            <Text style={{ color: colors.text }}>Engine Temperature: {data.engineTemp} °C</Text>
            <Text style={{ color: colors.text }}>Fuel Level: {data.fuelLevel}%</Text>
            <Button title="Disconnect" onPress={disconnect} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  dataContainer: {
    marginTop: 20,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

