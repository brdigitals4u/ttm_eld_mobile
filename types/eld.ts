export interface EldDevice {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
}

export interface EldState {
  devices: EldDevice[];
  connectedDevice: EldDevice | null;
  isScanning: boolean;
  error: string | null;
}

export interface EldEvent {
  type: string;
  timestamp: number;
  data: any;
}