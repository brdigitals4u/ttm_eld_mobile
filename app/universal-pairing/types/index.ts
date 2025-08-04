export interface UniversalDevice {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
  deviceType?: string;
  deviceCategory?: string;
  signalStrength?: number;
  batteryLevel?: number;
  lastSeen?: Date;
  firmwareVersion?: string;
  uid?: string;
  imei?: string;
  sensorData?: number;
  dataType?: string;
  protocol?: string;
  characteristicUuid?: string;
  rawData?: string;
  isRealData?: boolean;
  vin?: string;
  canData?: {
    engine_throttle?: number;
    air_flow?: number;
    engine_runtime?: number;
    engine_load?: number;
    coolant_temp?: number;
    vehicle_distance?: number;
    speed?: number;
    fuel_level?: number;
    engine_rpm?: number;
    voltage?: number;
  };
  gpsData?: {
    latitude?: number;
    longitude?: number;
    heading?: number;
    timestamp?: string;
  };
  eventData?: {
    event_type?: string;
    trigger?: string;
    id?: number;
  };
}

export interface ScanOptions {
  scanFilter: string;
  scanDuration: number;
  enableBackgroundScan: boolean;
  enableRSSI: boolean;
  enableDeviceTypeDetection: boolean;
  enableBluetoothLE?: boolean;
  enableBluetoothClassic?: boolean;
  enableLegacyScan?: boolean;
  enableDuplicateFilter?: boolean;
  scanMode?: string;
  maxResults?: number;
}

export interface ConnectionOptions {
  deviceId: string;
  uid?: string;
  imei?: string;
  deviceType?: string;
  deviceCategory?: string;
  connectionMethod?: string;
  enableAutoReconnect?: boolean;
  enableDataStreaming?: boolean;
}

export interface DeviceData {
  deviceId: string;
  timestamp: string;
  dataType: string;
  value?: number;
  sensorValue?: number;
  protocol?: string;
  characteristicUuid?: string;
  rawData?: string;
  batteryLevel?: number;
  signalStrength?: number;
  deviceName?: string;
  isConnected?: boolean;
  isRealData?: boolean;
}

export type ConnectionState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'dataEmit' | 'disconnecting' | 'error';

export interface PairingState {
  devices: UniversalDevice[];
  selectedDevice: UniversalDevice | null;
  connectedDevice: UniversalDevice | null;
  connectionState: ConnectionState;
  isScanning: boolean;
  error: string | null;
  deviceData: DeviceData[];
}
