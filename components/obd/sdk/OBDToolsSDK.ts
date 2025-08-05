// Create a new OBD Tools SDK
import OBDTools from 'react-native-obd-tools';

export interface OBDTool {
  id: string;
  name: string;
  address: string;
  connected: boolean;
}

export interface DiagnosticData {
  dtcCodes: string[];
  systemStatus: string;
  liveData: {
    rpm: number;
    speed: number;
    engineTemp: number;
    fuelLevel: number;
    o2Sensor: number;
    maf: number;
  };
  timestamp: Date;
}

class OBDToolsSDK {
  // Request permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const granted = await OBDTools.requestPermissions();
      return granted;
    } catch (error) {
      console.error('OBD Tools permission request failed:', error);
      return false;
    }
  }

  // Scan for tools
  async scanTools(): Promise<OBDTool[]> {
    try {
      const tools = await OBDTools.scanTools();
      return tools.map((tool: any, index: number) => ({
        id: tool.id || tool.address || `tool_${index}`,
        name: tool.name || `OBD Tool ${index + 1}`,
        address: tool.address || tool.id,
        connected: false,
      }));
    } catch (error) {
      console.error('OBD Tools scan failed:', error);
      return [];
    }
  }

  // Connect to tool
  async connectToTool(tool: OBDTool): Promise<boolean> {
    try {
      const success = await OBDTools.connect(tool.address);
      return success;
    } catch (error) {
      console.error('OBD Tool connection failed:', error);
      return false;
    }
  }

  // Disconnect from tool
  async disconnect(): Promise<void> {
    try {
      await OBDTools.disconnect();
    } catch (error) {
      console.error('OBD Tool disconnect failed:', error);
    }
  }

  // Stream diagnostic data
  startDataStream(callback: (data: DiagnosticData) => void): () => void {
    const subscription = OBDTools.onDataReceived((data: any) => {
      const diagnosticData: DiagnosticData = {
        dtcCodes: data.dtcCodes || [],
        systemStatus: data.systemStatus || 'OK',
        liveData: {
          rpm: data.rpm || 0,
          speed: data.speed || 0,
          engineTemp: data.engineTemp || 0,
          fuelLevel: data.fuelLevel || 0,
          o2Sensor: data.o2Sensor || 0,
          maf: data.maf || 0,
        },
        timestamp: new Date(),
      };
      callback(diagnosticData);
    });

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }
}

export default new OBDToolsSDK();

