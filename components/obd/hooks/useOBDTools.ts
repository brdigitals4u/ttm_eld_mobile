import { useState, useEffect, useCallback } from 'react';
import OBDToolsSDK, { OBDToolDevice, DiagnosticData } from '../sdk/OBDToolsSDK';

export const useOBDTools = () => {
  const [devices, setDevices] = useState<OBDToolDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<OBDToolDevice | null>(null);
  const [currentData, setCurrentData] = useState<DiagnosticData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [dataStreamCleanup, setDataStreamCleanup] = useState<(() => void) | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const granted = await OBDToolsSDK.requestAdvancedPermissions();
      setPermissionsGranted(granted);
      return granted;
    } catch (error) {
      console.error('Advanced permission request failed:', error);
      return false;
    }
  }, []);

  const scanDevices = useCallback(async () => {
    if (!permissionsGranted) {
      await requestPermissions();
    }
    
    setIsScanning(true);
    try {
      const foundDevices = await OBDToolsSDK.scanAdvancedDevices();
      setDevices(foundDevices);
      return foundDevices;
    } catch (error) {
      console.error('Advanced device scan failed:', error);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [permissionsGranted, requestPermissions]);

  const connectToDevice = useCallback(async (device: OBDToolDevice) => {
    setIsConnecting(true);
    try {
      const connected = await OBDToolsSDK.connectToAdvancedDevice(device);
      if (connected) {
        setConnectedDevice(device);
        
        // Start diagnostic data streaming
        const cleanup = OBDToolsSDK.startDiagnosticStream((data) => {
          setCurrentData(data);
        });
        setDataStreamCleanup(() => cleanup);
      }
      return connected;
    } catch (error) {
      console.error('Advanced connection failed:', error);
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
    OBDToolsSDK.disconnect();
    setConnectedDevice(null);
    setCurrentData(null);
  }, [dataStreamCleanup]);

  const readDTCCodes = useCallback(async () => {
    try {
      return await OBDToolsSDK.readDTCCodes();
    } catch (error) {
      console.error('Failed to read DTC codes:', error);
      return [];
    }
  }, []);

  const clearDTCCodes = useCallback(async () => {
    try {
      return await OBDToolsSDK.clearDTCCodes();
    } catch (error) {
      console.error('Failed to clear DTC codes:', error);
      return false;
    }
  }, []);

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
    readDTCCodes,
    clearDTCCodes,
  };
};
