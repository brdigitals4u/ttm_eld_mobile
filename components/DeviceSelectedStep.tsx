import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVehicleSetup } from '@/context/vehicle-setup-context';

export default function DeviceSelectedStep() {
  const { selectedDevice } = useVehicleSetup();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selected Device</Text>
      <Text style={styles.deviceName}>{selectedDevice?.name || 'No device selected'}</Text>
      <Text style={styles.deviceID}>{`Device ID: ${selectedDevice?.id || '-'}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  deviceName: {
    marginTop: 10,
    fontSize: 16,
  },
  deviceID: {
    marginTop: 5,
    fontSize: 14,
  },
});
