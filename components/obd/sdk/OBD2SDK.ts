import OBD2 from '@furkanom/react-native-obd2';

export interface OBD2Device {
  id: string;
  name: string;
  address: string;
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
  private mockupMode: boolean = false;

  // Enable/Disable mockup mode
  setMockUpMode(enabled: boolean) {
    this.mockupMode = enabled;
    OBD2.setMockUpMode(enabled);
  }

  // Request permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const granted = await OBD2.requestPermissions();
      return granted;
    } catch (error) {
      console.error('OBD2 Permission request failed:', error);
      return false;
    }
  }

  // Scan for devices
  async scanDevices(): Promise<OBD2Device[]> {
    try {
      const devices = await OBD2.scanDevices();
      return devices.map((device: any, index: number) => ({
        id: device.id || `device_${index}`,
        name: device.name || `OBD2 Device ${index + 1}`,
        address: device.address || device.id,
        connected: false,
      }));
    } catch (error) {
      console.error('OBD2 Scan failed:', error);
      return [];
    }
  }

  // Connect to device
  async connectToDevice(device: OBD2Device): Promise<boolean> {
    try {
      const success = await OBD2.connect(device.address);
      return success;
    } catch (error) {
      console.error('OBD2 Connection failed:', error);
      return false;
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    try {
      await OBD2.disconnect();
    } catch (error) {
      console.error('OBD2 Disconnect failed:', error);
    }
  }

  // Start data streaming
  startDataStream(callback: (data: OBD2Data) => void): () => void {
    const subscription = OBD2.onDataReceived((data: any) => {
      const obdData: OBD2Data = {
        rpm: data.rpm || 0,
        speed: data.speed || 0,
        engineTemp: data.engineTemp || data.coolantTemp || 0,
        fuelLevel: data.fuelLevel || 0,
        timestamp: new Date(),
      };
      callback(obdData);
    });

    // Return cleanup function
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }

  // Get connection status
  async isConnected(): Promise<boolean> {
    try {
      return await OBD2.isConnected();
    } catch (error) {
      return false;
    }
  }
}

export default new OBD2SDK();
