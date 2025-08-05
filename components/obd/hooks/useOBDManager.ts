import { useState, useEffect, useCallback } from 'react';
import OBDManagerSDK, { BluetoothOBDDevice, BluetoothOBDData } from '../sdk/OBDManagerSDK';

export const useOBDManager = () => {
  const [devices, setDevices] = useState<BluetoothOBDDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothOBDDevice | null>(null);
  const [currentData, setCurrentData] = useState<BluetoothOBDData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [dataStreamCleanup, setDataStreamCleanup] = useState<(() => void) | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const granted = await OBDManagerSDK.requestBluetoothPermissions();
      setPermissionsGranted(granted);
      return granted;
    } catch (error) {
      console.error('Bluetooth permission request failed:', error);
      return false;
    }
  }, []);

  const scanDevices = useCallback(async () => {
    if (!permissionsGranted) {
      await requestPermissions();
    }
    
    setIsScanning(true);
    try {
      const foundDevices = await OBDManagerSDK.scanBluetoothDevices();
      setDevices(foundDevices);
      return foundDevices;
    } catch (error) {
      console.error('Bluetooth device scan failed:', error);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [permissionsGranted, requestPermissions]);

  const connectToDevice = useCallback(async (device: BluetoothOBDDevice) => {
    setIsConnecting(true);
    try {
      const connected = await OBDManagerSDK.connectToBluetoothDevice(device);
      if (connected) {
        setConnectedDevice(device);
        
        // Start Bluetooth data streaming
        const cleanup = OBDManagerSDK.startBluetoothDataStream((data) => {
          setCurrentData(data);
        });
        setDataStreamCleanup(() => cleanup);
      }
      return connected;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
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
    OBDManagerSDK.disconnect();
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
