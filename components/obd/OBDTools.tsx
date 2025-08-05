import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '@/context/theme-context';
import Button from '@/components/Button';
import DeviceCard from './components/DeviceCard';
import DataDisplayCard from './components/DataDisplayCard';
import { useOBDTools } from './hooks/useOBDTools';

const OBDTools = () => {
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
    readDTCCodes,
    clearDTCCodes,
  } = useOBDTools();

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

  const handleReadDTCCodes = useCallback(async () => {
    const codes = await readDTCCodes();
    console.log('DTC Codes:', codes);
  }, [readDTCCodes]);

  const handleClearDTCCodes = useCallback(async () => {
    const success = await clearDTCCodes();
    if (success) {
      console.log('DTC Codes cleared');
    }
  }, [clearDTCCodes]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Button title="Request Advanced Permissions" onPress={handlePermissions} disabled={permissionsGranted} />

        {permissionsGranted && (
          <Button title="Scan Advanced Devices" onPress={handleScan} loading={isScanning} />
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
          <React.Fragment>
            <DataDisplayCard
              title="OBD Diagnostic Data"
              data={[
                { label: 'RPM', value: currentData.liveData.rpm, unit: 'rpm' },
                { label: 'Speed', value: currentData.liveData.speed, unit: 'km/h' },
                { label: 'Engine Temp', value: currentData.liveData.engineTemp, unit: '°C' },
                { label: 'Fuel Level', value: currentData.liveData.fuelLevel, unit: '%' },
                { label: 'O2 Sensor', value: currentData.liveData.o2Sensor, unit: 'V' },
                { label: 'MAF', value: currentData.liveData.maf, unit: 'g/s' },
              ]}
              timestamp={currentData.timestamp}
            />
            <Button title="Read DTC Codes" onPress={handleReadDTCCodes} />
            <Button title="Clear DTC Codes" onPress={handleClearDTCCodes} />
          </React.Fragment>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OBDTools;

