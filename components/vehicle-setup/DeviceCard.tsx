import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Bluetooth, Truck, Signal } from 'lucide-react-native';
import { BLEDevice } from '@/src/utils/TTMBLEManager';
import Button from '@/components/Button';

interface DeviceCardProps {
  device: BLEDevice;
  onConnect: () => void;
  isConnecting: boolean;
  colors: any;
}

export default function DeviceCard({
  device,
  onConnect,
  isConnecting,
  colors
}: DeviceCardProps) {
  const getSignalStrength = (signal: number) => {
    if (signal >= -50) return 'Excellent';
    if (signal >= -60) return 'Good';
    if (signal >= -70) return 'Fair';
    return 'Poor';
  };

  const getSignalColor = (signal: number) => {
    if (signal >= -50) return '#10B981';
    if (signal >= -60) return '#3B82F6';
    if (signal >= -70) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.deviceInfo}>
        <View style={styles.deviceHeader}>
          <Truck size={24} color={colors.primary} />
          <View style={styles.deviceNameContainer}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {device.name || "Unnamed Device"}
            </Text>
          </View>
        </View>
        
        <View style={styles.deviceDetails}>
          <View style={styles.signalContainer}>
            <Signal size={16} color={getSignalColor(device.signal)} />
            <Text style={[styles.signalText, { color: colors.inactive }]}>
              {getSignalStrength(device.signal)} ({device.signal} dBm)
            </Text>
          </View>
          
          <Text style={[styles.deviceAddress, { color: colors.inactive }]}>
            {device.address}
          </Text>
        </View>
      </View>
      
      <View style={styles.deviceActions}>
        <Button
          title={isConnecting ? "Connecting..." : "Connect"}
          onPress={onConnect}
          loading={isConnecting}
          disabled={isConnecting}
          variant="primary"
          style={styles.connectButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deviceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceNameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
  },
  deviceDetails: {
    marginBottom: 16,
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  signalText: {
    fontSize: 12,
    marginLeft: 6,
  },
  deviceAddress: {
    fontSize: 12,
  },
  deviceActions: {
    alignItems: 'flex-end',
  },
  connectButton: {
    minWidth: 100,
  },
}); 