import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bluetooth, Wifi, Zap } from 'lucide-react-native';
import { useTheme } from '@/context/theme-context';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface DeviceCardProps {
  device: {
    id: string;
    name: string;
    type: string;
    connected?: boolean;
    macAddress?: string;
    signalStrength?: number;
    protocol?: string;
    capabilities?: string[];
  };
  onConnect: () => void;
  isConnecting: boolean;
}

export default function DeviceCard({ device, onConnect, isConnecting }: DeviceCardProps) {
  const { colors, isDark } = useTheme();

  const getDeviceIcon = () => {
    switch (device.type) {
      case 'Bluetooth':
        return <Bluetooth size={24} color={colors.primary} />;
      case 'OBD2':
        return <Zap size={24} color={colors.primary} />;
      default:
        return <Wifi size={24} color={colors.primary} />;
    }
  };

  const getSignalStrengthColor = (strength?: number) => {
    if (!strength) return colors.inactive;
    if (strength > -50) return '#10B981'; // Green
    if (strength > -70) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {getDeviceIcon()}
        </View>
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, { color: colors.text }]}>
            {device.name}
          </Text>
          <Text style={[styles.deviceType, { color: colors.inactive }]}>
            {device.type} Device
          </Text>
          {device.macAddress && (
            <Text style={[styles.macAddress, { color: colors.inactive }]}>
              {device.macAddress}
            </Text>
          )}
          {device.protocol && (
            <Text style={[styles.protocol, { color: colors.inactive }]}>
              Protocol: {device.protocol}
            </Text>
          )}
        </View>
        {device.signalStrength && (
          <View style={styles.signalContainer}>
            <Text style={[
              styles.signalText,
              { color: getSignalStrengthColor(device.signalStrength) }
            ]}>
              {device.signalStrength} dBm
            </Text>
          </View>
        )}
      </View>

      {device.capabilities && device.capabilities.length > 0 && (
        <View style={styles.capabilitiesContainer}>
          <Text style={[styles.capabilitiesTitle, { color: colors.text }]}>
            Capabilities:
          </Text>
          <View style={styles.capabilitiesList}>
            {device.capabilities.map((capability, index) => (
              <View
                key={index}
                style={[
                  styles.capabilityTag,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                ]}
              >
                <Text style={[styles.capabilityText, { color: colors.inactive }]}>
                  {capability}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionContainer}>
        <Button
          title={device.connected ? 'Connected' : 'Connect'}
          onPress={onConnect}
          loading={isConnecting}
          disabled={device.connected || isConnecting}
          variant={device.connected ? 'secondary' : 'primary'}
          style={styles.connectButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 14,
    marginBottom: 2,
  },
  macAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  protocol: {
    fontSize: 12,
    marginBottom: 2,
  },
  signalContainer: {
    alignItems: 'flex-end',
  },
  signalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  capabilitiesContainer: {
    marginBottom: 12,
  },
  capabilitiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  capabilitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  capabilityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capabilityText: {
    fontSize: 12,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  connectButton: {
    minWidth: 100,
  },
});
