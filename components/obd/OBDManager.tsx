import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '@/context/theme-context';
import Button from '@/components/Button';
import DeviceCard from './components/DeviceCard';
import DataDisplayCard from './components/DataDisplayCard';
import { useOBDManager } from './hooks/useOBDManager';

const OBDManager = () => {
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
  } = useOBDManager();

  const handlePermissions = useCallback(async () => {
    await requestPermissions();
  }, [requestPermissions]);

  const handleScan = useCallback(async () => {
    await scanDevices();
  }, [scanDevices]);

  const handleConnect = useCallback(async (device: any) => {
    await connectToDevice(device);
  }, [connectToDevice]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Button title="Request Bluetooth Permissions" onPress={handlePermissions} disabled={permissionsGranted} />

        {permissionsGranted && (
          <Button title="Scan Bluetooth Devices" onPress={handleScan} loading={isScanning} />
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
            title="Bluetooth OBD Data"
            data={[
              { label: 'RPM', value: currentData.rpm, unit: 'rpm' },
              { label: 'Speed', value: currentData.speed, unit: 'km/h' },
              { label: 'Engine Temp', value: currentData.engineTemp, unit: '°C' },
              { label: 'Fuel Level', value: currentData.fuelLevel, unit: '%' },
              { label: 'Battery', value: currentData.batteryVoltage.toFixed(1), unit: 'V' },
              { label: 'Oil Pressure', value: currentData.oilPressure, unit: 'psi' },
            ]}
            timestamp={currentData.timestamp}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OBDManager;

