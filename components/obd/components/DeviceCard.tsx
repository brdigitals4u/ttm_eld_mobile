import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Bluetooth, Wifi, Zap } from 'lucide-react-native';
import { useTheme } from '@/context/theme-context';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface DeviceCardProps {
  device: {
    id: string;
    name: string;
    address?: string;
    connected?: boolean;
    rssi?: number;
  };
  onConnect: () => void;
  isConnecting: boolean;
}

export default function DeviceCard({ device, onConnect, isConnecting }: DeviceCardProps) {
  const { colors, isDark } = useTheme();
  const scaleValue = new Animated.Value(1);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getDeviceIcon = () => {
    if (device.address?.includes('bluetooth') || device.rssi) {
      return <Bluetooth size={24} color={colors.primary} />;
    }
    return <Zap size={24} color={colors.primary} />;
  };

  const getSignalStrengthColor = (rssi?: number) => {
    if (!rssi) return colors.inactive;
    if (rssi > -50) return '#10B981'; // Green
    if (rssi > -70) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            {getDeviceIcon()}
          </View>
          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {device.name}
            </Text>
            {device.address && (
              <Text style={[styles.deviceAddress, { color: colors.inactive }]}>
                {device.address}
              </Text>
            )}
            {device.rssi && (
              <Text style={[
                styles.signalText,
                { color: getSignalStrengthColor(device.rssi) }
              ]}>
                Signal: {device.rssi} dBm
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actionContainer}>
          <Button
            title={device.connected ? 'Connected' : 'Connect'}
            onPress={() => {
              animatePress();
              onConnect();
            }}
            loading={isConnecting}
            disabled={device.connected || isConnecting}
            variant={device.connected ? 'secondary' : 'primary'}
            style={styles.connectButton}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  connectButton: {
    minWidth: 100,
  },
});
