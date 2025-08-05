// OBD Manager SDK for handling Bluetooth OBD operations
export interface BluetoothOBDDevice {
  id: string;
  name: string;
  type: 'Bluetooth';
  macAddress: string;
  connected: boolean;
  signalStrength: number;
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

class OBDManagerSDK {
  private devices: BluetoothOBDDevice[] = [];
  private connectedDevice: BluetoothOBDDevice | null = null;

  // Mock Bluetooth permission request
  async requestBluetoothPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Bluetooth OBD permissions granted');
        resolve(true);
      }, 1000);
    });
  }

  // Mock Bluetooth device scanning
  async scanBluetoothDevices(): Promise<BluetoothOBDDevice[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockDevices: BluetoothOBDDevice[] = [
          {
            id: '1',
            name: 'ELM327 Bluetooth',
            type: 'Bluetooth',
            macAddress: '00:11:22:33:44:55',
            connected: false,
            signalStrength: -45,
          },
          {
            id: '2',
            name: 'OBD-II Scanner',
            type: 'Bluetooth',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            connected: false,
            signalStrength: -60,
          },
        ];
        this.devices = mockDevices;
        resolve(mockDevices);
      }, 2500);
    });
  }

  // Mock Bluetooth device connection
  async connectToBluetoothDevice(device: BluetoothOBDDevice): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connectedDevice = { ...device, connected: true };
        console.log(`Connected to Bluetooth device: ${device.name}`);
        resolve(true);
      }, 2000);
    });
  }

  // Mock Bluetooth OBD data streaming
  startBluetoothDataStream(callback: (data: BluetoothOBDData) => void): () => void {
    const interval = setInterval(() => {
      const mockData: BluetoothOBDData = {
        rpm: Math.floor(Math.random() * 4000) + 600,
        speed: Math.floor(Math.random() * 120) + 10,
        engineTemp: Math.floor(Math.random() * 50) + 70,
        fuelLevel: Math.floor(Math.random() * 100),
        batteryVoltage: 12 + Math.random() * 2,
        oilPressure: Math.floor(Math.random() * 60) + 20,
        timestamp: new Date(),
      };
      callback(mockData);
    }, 800);

    return () => clearInterval(interval);
  }

  getConnectedDevice(): BluetoothOBDDevice | null {
    return this.connectedDevice;
  }

  disconnect(): void {
    if (this.connectedDevice) {
      this.connectedDevice.connected = false;
      this.connectedDevice = null;
      console.log('Disconnected from Bluetooth OBD device');
    }
  }
}

export default new OBDManagerSDK();
