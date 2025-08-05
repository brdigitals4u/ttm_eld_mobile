import React, { useEffect, useState, useCallback } from 'react';
import { BluetoothProvider, useBluetooth, Peripheral } from 'react-native-bluetooth-obd-manager';

export interface BluetoothOBDDevice {
  id: string;
  name: string;
  address: string;
  connected: boolean;
  rssi?: number;
}

export interface BluetoothOBDData {
  rpm: number;
  speed: number;
  engineTemp: number;
  fuelLevel: number;
  batteryVoltage: number;
  oilPressure: number;
  timestamp: Date;
}

type DataCallback = (data: BluetoothOBDData) => void;

class BluetoothOBDManagerSDKInternal {
  private dataCallbacks: Set<DataCallback> = new Set();

  // Method to register data callbacks internally
  registerDataCallback(cb: DataCallback) {
    this.dataCallbacks.add(cb);
  }

  unregisterDataCallback(cb: DataCallback) {
    this.dataCallbacks.delete(cb);
  }

  // Called when new data is received to notify all registered callbacks
  notifyData(data: BluetoothOBDData) {
    for (const cb of this.dataCallbacks) {
      cb(data);
    }
  }
}

// Create the SDK internal singleton instance
const sdkInternal = new BluetoothOBDManagerSDKInternal();

// React functional component that bridges hook and SDK
export const BluetoothOBDBridge: React.FC = () => {
  const {
    isBluetoothEnabled,
    availableDevices,
    connectedDevice,
    scanForPeripherals,
    connectToPeripheral,
    disconnectFromPeripheral,
    onDataReceived,
  } = useBluetooth() as any;

  const [devices, setDevices] = useState<BluetoothOBDDevice[]>([]);
  const [connected, setConnected] = useState<BluetoothOBDDevice | null>(null);

  // Update available devices in SDK wrapper format
  useEffect(() => {
    const mappedDevices = availableDevices.map((dev: Peripheral, index: number) => ({
      id: dev.id,
      name: dev.name ?? `Bluetooth OBD ${index + 1}`,
      address: dev.id,
      connected: connectedDevice?.id === dev.id,
      rssi: dev.rssi ?? undefined,
    }));
    setDevices(mappedDevices);
  }, [availableDevices, connectedDevice]);

  useEffect(() => {
    if (connectedDevice) {
      setConnected({
        id: connectedDevice.id,
        name: connectedDevice.name ?? 'Unknown Device',
        address: connectedDevice.id,
        connected: true,
        rssi: connectedDevice.rssi ?? undefined,
      });
    } else {
      setConnected(null);
    }
  }, [connectedDevice]);

  // Subscribe to incoming data and notify SDK internal callbacks
  useEffect(() => {
    const subscription = onDataReceived((data: any) => {
      const obdData: BluetoothOBDData = {
        rpm: data.rpm || 0,
        speed: data.speed || 0,
        engineTemp: data.engineTemp || data.coolantTemp || 0,
        fuelLevel: data.fuelLevel || 0,
        batteryVoltage: data.batteryVoltage || data.voltage || 12.0,
        oilPressure: data.oilPressure || 0,
        timestamp: new Date(),
      };
      sdkInternal.notifyData(obdData);
    });

    return () => {
      subscription.remove();
    };
  }, [onDataReceived]);

  return null; // This component only bridges data inside the provider tree
};

// Main SDK class to expose imperative API
class BluetoothOBDManagerSDK {
  async requestPermissions(): Promise<boolean> {
    // The hook and library generally request permissions as part of workflow,
    // You can manage permissions via a separate library or extend this if needed.
    // The package docs suggest permissions are handled by BluetoothProvider internally.
    return true;
  }

  async scanDevices(): Promise<BluetoothOBDDevice[]> {
    // throw error if called outside provider tree
    throw new Error('scanDevices must be called within BluetoothProvider and hook context. Use scanDevicesAsync instead.');
  }

  async scanDevicesAsync(scanForPeripherals: () => void, availableDevices: BluetoothOBDDevice[]): Promise<BluetoothOBDDevice[]> {
    scanForPeripherals();
    // Return latest devices list (caller responsible for awaiting data update)
    return availableDevices;
  }

  async connectToDevice(
    device: BluetoothOBDDevice, 
    connectToPeripheral: (id: string) => Promise<boolean>
  ): Promise<boolean> {
    if (!device?.address) {
      console.error('Invalid device for connect');
      return false;
    }
    return connectToPeripheral(device.address);
  }

  async disconnect(disconnectFromPeripheral: () => Promise<void>): Promise<void> {
    await disconnectFromPeripheral();
  }

  startDataStream(callback: DataCallback): () => void {
    sdkInternal.registerDataCallback(callback);

    return () => {
      sdkInternal.unregisterDataCallback(callback);
    };
  }
}

const sdkInstance = new BluetoothOBDManagerSDK();
export default sdkInstance;
