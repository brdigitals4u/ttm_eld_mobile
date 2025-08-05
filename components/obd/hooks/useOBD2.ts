import { useState, useEffect, useCallback } from 'react';
import OBD2SDK, { OBD2Device, OBD2Data } from '../sdk/OBD2SDK';

export const useOBD2 = () => {
  const [devices, setDevices] = useState<OBD2Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<OBD2Device | null>(null);
  const [currentData, setCurrentData] = useState<OBD2Data | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [dataStreamCleanup, setDataStreamCleanup] = useState<(() => void) | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const granted = await OBD2SDK.requestPermissions();
      setPermissionsGranted(granted);
      return granted;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  const scanDevices = useCallback(async () => {
    if (!permissionsGranted) {
      await requestPermissions();
    }
    
    setIsScanning(true);
    try {
      const foundDevices = await OBD2SDK.scanDevices();
      setDevices(foundDevices);
      return foundDevices;
    } catch (error) {
      console.error('Device scan failed:', error);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [permissionsGranted, requestPermissions]);

  const connectToDevice = useCallback(async (device: OBD2Device) => {
    setIsConnecting(true);
    try {
      const connected = await OBD2SDK.connectToDevice(device);
      if (connected) {
        setConnectedDevice(device);
        
        // Start data streaming
        const cleanup = OBD2SDK.startDataStream((data) => {
          setCurrentData(data);
        });
        setDataStreamCleanup(() => cleanup);
      }
      return connected;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (dataStreamCleanup) {
      dataStreamCleanup();
      setDataStreamCleanup(null);
    }
    OBD2SDK.disconnect();
    setConnectedDevice(null);
    setCurrentData(null);
  }, [dataStreamCleanup]);

  useEffect(() => {
    return () => {
      if (dataStreamCleanup) {
        dataStreamCleanup();
      }
    };
  }, [dataStreamCleanup]);

  return {
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
  };
};
