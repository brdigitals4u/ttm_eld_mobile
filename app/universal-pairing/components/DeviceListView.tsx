import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/theme-context';
import Button from '@/components/Button';
import DeviceCard from './DeviceCard';
import { UniversalDevice } from '../types';

interface DeviceListViewProps {
  devices: UniversalDevice[];
  selectedDevice: UniversalDevice | null;
  isScanning: boolean;
  onDeviceSelect: (device: UniversalDevice) => void;
  onStartScan: () => void;
  onConnect: () => void;
  error?: string | null;
}

const DeviceListView: React.FC<DeviceListViewProps> = ({
  devices,
  selectedDevice,
  isScanning,
  onDeviceSelect,
  onStartScan,
  onConnect,
  error,
}) => {
  const { colors } = useTheme();

  const renderDeviceItem = ({ item }: { item: UniversalDevice }) => (
    <DeviceCard
      device={item}
      isSelected={selectedDevice?.id === item.id}
      onPress={() => onDeviceSelect(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: colors.inactive }]}>📡</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Devices Found
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.inactive }]}>
        Make sure your devices are powered on and in pairing mode, then tap scan to search again.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Universal Device Pairing
        </Text>
        <Text style={[styles.subtitle, { color: colors.inactive }]}>
          Connect ELD devices, cameras, and trackers
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40' }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Devices Section */}
      <View style={styles.devicesSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Available Devices ({devices.length})
          </Text>
          <Button
            title={isScanning ? "Scanning..." : "Scan"}
            onPress={onStartScan}
            disabled={isScanning}
            loading={isScanning}
            variant="secondary"
          />
        </View>

        {/* Device List */}
        {devices.length === 0 && !isScanning ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={devices}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.deviceList}
          />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Connect Selected Device"
          onPress={onConnect}
          disabled={!selectedDevice || selectedDevice.isConnected}
          fullWidth
          variant="primary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  devicesSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  deviceList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  actionButtons: {
    paddingVertical: 20,
  },
});

export default DeviceListView;
