// OBD2 SDK for handling OBD2 operations
export interface OBD2Device {
  id: string;
  name: string;
  type: 'OBD2';
  connected: boolean;
}

export interface OBD2Data {
  rpm: number;
  speed: number;
  engineTemp: number;
  fuelLevel: number;
  timestamp: Date;
}

class OBD2SDK {
  private devices: OBD2Device[] = [];
  private connectedDevice: OBD2Device | null = null;

  // Mock permission request
  async requestPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('OBD2 permissions granted');
        resolve(true);
      }, 1000);
    });
  }

  // Mock device scanning
  async scanDevices(): Promise<OBD2Device[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockDevices: OBD2Device[] = [
          { id: '1', name: 'OBD2 Simulator 1', type: 'OBD2', connected: false },
          { id: '2', name: 'OBD2 Simulator 2', type: 'OBD2', connected: false },
          { id: '3', name: 'OBD2 Test Device', type: 'OBD2', connected: false },
        ];
        this.devices = mockDevices;
        resolve(mockDevices);
      }, 2000);
    });
  }

  // Mock device connection
  async connectToDevice(device: OBD2Device): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connectedDevice = { ...device, connected: true };
        console.log(`Connected to ${device.name}`);
        resolve(true);
      }, 1500);
    });
  }

  // Mock OBD2 data streaming
  startDataStream(callback: (data: OBD2Data) => void): () => void {
    const interval = setInterval(() => {
      const mockData: OBD2Data = {
        rpm: Math.floor(Math.random() * 3000) + 800,
        speed: Math.floor(Math.random() * 80) + 20,
        engineTemp: Math.floor(Math.random() * 40) + 80,
        fuelLevel: Math.floor(Math.random() * 100),
        timestamp: new Date(),
      };
      callback(mockData);
    }, 1000);

    return () => clearInterval(interval);
  }

  getConnectedDevice(): OBD2Device | null {
    return this.connectedDevice;
  }

  disconnect(): void {
    if (this.connectedDevice) {
      this.connectedDevice.connected = false;
      this.connectedDevice = null;
      console.log('Disconnected from OBD2 device');
    }
  }
}

export default new OBD2SDK();
