import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Bluetooth, Truck } from 'lucide-react-native';
import { BLEDevice } from '@/src/utils/TTMBLEManager';
import DeviceCard from './DeviceCard';

interface DeviceListProps {
  scannedDevices: BLEDevice[];
  connectingDeviceId: string | null;
  onConnect: (device: BLEDevice) => void;
  colors: {
    text: string;
    inactive: string;
    primary: string;
  };
}

export default function DeviceList({
  scannedDevices,
  connectingDeviceId,
  onConnect,
  colors
}: DeviceListProps) {
  if (scannedDevices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Bluetooth size={48} color={colors.inactive} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No devices found
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.inactive }]}>
          Start scanning to discover ELD devices nearby
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.deviceListContainer}>
      <View style={styles.deviceListHeader}>
        <Truck size={20} color={colors.primary} />
        <Text style={[styles.deviceListTitle, { color: colors.text }]}>
          Available Devices ({scannedDevices.length})
        </Text>
      </View>
      
      <ScrollView 
        style={styles.deviceList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.deviceListContent}
      >
        {scannedDevices.map((device, index) => (
          <DeviceCard
            key={`${device.id}-${index}`}
            device={device}
            onConnect={() => onConnect(device)}
            isConnecting={connectingDeviceId === device.id}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  deviceListContainer: {
    flex: 1,
  },
  deviceListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    paddingBottom: 20,
  },
}); 