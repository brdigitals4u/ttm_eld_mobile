import React, { useEffect, useState } from 'react';
import { BluetoothProvider, useBluetooth } from 'react-native-bluetooth-obd-manager';
import BluetoothOBDManagerSDK, { BluetoothOBDBridge, BluetoothOBDDevice, BluetoothOBDData } from './sdk/BluetoothOBDManagerSDK';

const App = () => {
  return (
    <BluetoothProvider>
      <BluetoothOBDBridge />
      <OBDApp />
    </BluetoothProvider>
  );
};

const OBDApp = () => {
  const {
    scanForPeripherals,
    availableDevices,
    connectToPeripheral,
    disconnectFromPeripheral,
  } = useBluetooth() as any;

  const [devices, setDevices] = useState<BluetoothOBDDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothOBDDevice | null>(null);
  const [streamData, setStreamData] = useState<BluetoothOBDData | null>(null);

  useEffect(() => {
    // Map availableDevices from hook to BluetoothOBDDevice type
    const mapped = availableDevices.map((dev: any) => ({
      id: dev.id,
      name: dev.name ?? 'Unknown',
      address: dev.id,
      connected: false,
      rssi: dev.rssi ?? undefined,
    }));
    setDevices(mapped);
  }, [availableDevices]);

  // Start scanning
  const scanDevices = () => {
    scanForPeripherals();
  };

  // Connect to device
  const connectDevice = async (device: BluetoothOBDDevice) => {
    const success = await connectToPeripheral(device.address);
    if (success) setConnectedDevice(device);
  };

  const disconnectDevice = async () => {
    await disconnectFromPeripheral();
    setConnectedDevice(null);
  };

  useEffect(() => {
    // Subscribe to data
    const unsubscribe = BluetoothOBDManagerSDK.startDataStream(data => {
      setStreamData(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <button onClick={scanDevices}>Scan Devices</button>
      <ul>
        {devices.map(d => (
          <li key={d.id}>
            {d.name} ({d.address}) <button onClick={() => connectDevice(d)}>Connect</button>
          </li>
        ))}
      </ul>
      {connectedDevice && (
        <div>
          <p>Connected to: {connectedDevice.name}</p>
          <button onClick={disconnectDevice}>Disconnect</button>
        </div>
      )}
      {streamData && (
        <div>
          <h3>Live Data</h3>
          <p>RPM: {streamData.rpm}</p>
          <p>Speed: {streamData.speed}</p>
          <p>Engine Temp: {streamData.engineTemp}</p>
          <p>Fuel Level: {streamData.fuelLevel}</p>
          <p>Battery Voltage: {streamData.batteryVoltage}</p>
          <p>Oil Pressure: {streamData.oilPressure}</p>
        </div>
      )}
    </>
  );
};

export default App;
