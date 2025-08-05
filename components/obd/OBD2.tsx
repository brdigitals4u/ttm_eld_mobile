import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '@/context/theme-context';
import Button from '@/components/Button';
import DeviceCard from './components/DeviceCard';
import DataDisplayCard from './components/DataDisplayCard';
import { useOBD2 } from './hooks/useOBD2';
import { isFeatureEnabled, FeatureFlags } from '@/constants/FeatureFlags';

const OBD2 = () => {
  const { colors } = useTheme();

  const {
    devices,
    connectedDevice,
    currentData,
    isScanning,
    isConnecting,
    permissionsGranted,
    requestPermissions,
    scanDevices,
    connectToDevice,
    disconnect,
  } = useOBD2();

  const isMockupMode = isFeatureEnabled('OBD2_MOCKUP_MODE');
  const enableAnimations = isFeatureEnabled('OBD2_ENABLE_ANIMATIONS');

  console.log(`Mockup Mode: ${isMockupMode}`);

  const handlePermissions = useCallback(async () => {
    if (isMockupMode) {
      await requestPermissions();
    }
  }, [requestPermissions, isMockupMode]);

  const handleScan = useCallback(async () => {
    if (isMockupMode) {
      await scanDevices();
    }
  }, [scanDevices, isMockupMode]);

  const handleConnect = useCallback(async (device) => {
    if (isMockupMode) {
      await connectToDevice(device);
    }
  }, [connectToDevice, isMockupMode]);

  const handleDisconnect = useCallback(() => {
    if (isMockupMode) {
      disconnect();
    }
  }, [disconnect, isMockupMode]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isMockupMode ? (
          <Button title="Request Permissions" onPress={handlePermissions} disabled={permissionsGranted} />
        ) : (
          <Button title="Mockup Mode Disabled" disabled onPress={() => false}/>
        )}

        {permissionsGranted && isMockupMode && (
          <Button title="Scan Devices" onPress={handleScan} loading={isScanning} />
        )}

        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onConnect={() => handleConnect(device)}
            isConnecting={isConnecting}
          />
        ))}

        {connectedDevice && currentData && (
          <DataDisplayCard
            title="OBD2 Data"
            data={[
              { label: 'RPM', value: currentData.rpm, unit: 'rpm' },
              { label: 'Speed', value: currentData.speed, unit: 'km/h' },
              { label: 'Engine Temp', value: currentData.engineTemp, unit: '°C' },
              { label: 'Fuel Level', value: currentData.fuelLevel, unit: '%' },
            ]}
            timestamp={currentData.timestamp}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OBD2;

