export interface BleDevice {
  name: string | null;
  address: string | null;
  signal: number;
}

export interface PasswordCheckResult {
  isPasswordEnabled: boolean;
}

export interface PasswordVerifyResult {
  success: boolean;
}

export interface PasswordSetResult {
  success: boolean;
}

export interface HistoryProgress {
  progress: number;
  count: number;
}

export interface TerminalInfo {
  deviceName: string;
  address: string;
  bluetoothVersion: string;
  mcuVersion: string;
}

export interface ClearFaultResult {
  success: boolean;
}

export interface UpdateProgress {
  progress: number;
}

export interface OtaProgress {
  progress: number;
}

export interface OtaCompleted {
  result: number;
}

export interface OtaFailed {
  error: string;
}

export interface ConnectFailure {
  status: number;
}

export interface EldData {
  dataFlowList: any[];
}

export interface ObdData {
  type: number;
  time: string;
  dataType: number;
  vehicleType: number;
  msgSubtype: number;
  timestamp: string;
  ack: number;
  ackDescription: string;
}

export interface ObdRawData {
  rawData: string;
  ack: number;
  ackDescription: string;
  timestamp: string;
}

export interface ObdDataFlow {
  type: number;
  time: string;
  dataType: number;
  vehicleType: number;
  msgSubtype: number;
  status: number;
  latitude: number;
  longitude: number;
  dataFlowCount: number;
  timestamp: string;
}

export interface ObdErrorData {
  type: number;
  time: string;
  dataType: number;
  vehicleType: number;
  msgSubtype: number;
  ecuCount: number;
  timestamp: string;
  ecuList?: Array<{
    ecuId: string;
    ecuIdHex: string;
    codes: string[];
  }>;
}

export interface ObdVinData {
  type: number;
  time: string;
  dataType: number;
  vehicleType: number;
  msgSubtype: number;
  vinCode: string;
  timestamp: string;
}

export interface ObdEldData {
  type: number;
  time: string;
  dataType: number;
  vehicleType: number;
  msgSubtype: number;
  eventTime: string;
  eventType: number;
  eventId: number;
  isLiveEvent: number;
  latitude: number;
  longitude: number;
  gpsSpeed: number;
  gpsTime: string;
  gpsRotation: number;
  dataFlowCount: number;
  dataFlowList?: Array<{
    dataId: number;
    data: string;
    pid: string;
    value: number;
  }>;
  timestamp: string;
}

export interface ObdUnknownData {
  type: number;
  time: string;
  dataType: number;
  vehicleType: number;
  msgSubtype: number;
  dataTypeName: string;
  timestamp: string;
}

export interface FaultData {
  ecuCount?: number;
  timestamp?: string;
  ecuList: Array<{
    ecuId: string;
    ecuIdHex: string;
    codes: string[];
  }>;
}

export interface VinData {
  vinCode: string;
}

export interface DataItemConfig {
  reportErrorCode: number;
  itemCount: number;
  itemList: Array<{
    dataId: number;
    status: number;
    pid: string;
  }>;
  timestamp: string;
}

export interface CustomCommandReply {
  reply: string;
}

export interface DriverAuthResult {
  success: boolean;
}

export interface ReadDriverAuthResult {
  driverInfo: string;
}

export interface AuthenticationPassedData {
  deviceAddress: string;
  timestamp: string;
  reason: string;
  status8Expected?: boolean;
  authenticationComplete?: boolean;
  deviceId?: string;
}

export interface RawDataReceived {
  rawData: string;
  timestamp: string;
}

export interface DeviceIdDetected {
  deviceId: string;
  timestamp: string;
  source?: string;
}

// Define OBDDataItem interface for display
export interface OBDDataItem {
  id: string;
  name: string;
  value: string;
  unit: string;
  isError?: boolean;
}

export interface JMBluetoothEvents {
  onDeviceFound: (device: BleDevice) => void;
  onScanStopped: () => void;
  onScanFinished: () => void;
  onConnected: () => void;
  onAuthenticationPassed: (data: AuthenticationPassedData) => void;
  onDisconnected: () => void;
  onConnectFailure: (error: ConnectFailure) => void;
  onDataReceived: (data: any) => void;
  onPasswordCheckResult: (result: PasswordCheckResult) => void;
  onPasswordVerifyResult: (result: PasswordVerifyResult) => void;
  onPasswordSetResult: (result: PasswordSetResult) => void;
  onEldDataReceived: (data: EldData) => void;
  onObdDataReceived: (data: ObdData) => void;
  onObdRawDataReceived: (data: ObdRawData) => void;
  onObdDataFlowReceived: (data: ObdDataFlow) => void;
  onObdErrorDataReceived: (data: ObdErrorData) => void;
  onObdVinDataReceived: (data: ObdVinData) => void;
  onObdEldDataReceived: (data: ObdEldData) => void;
  onObdUnknownDataReceived: (data: ObdUnknownData) => void;
  onObdEldStart: () => void;
  onObdEldFinish: () => void;
  onObdCollectStart: () => void;
  onObdCollectReady: () => void;
  onObdCollectFinish: () => void;
  onRawDataReceived: (data: RawDataReceived) => void;
  onEldDeviceIdDetected: (data: DeviceIdDetected) => void;
  onFaultDataReceived: (data: FaultData) => void;
  onVinDataReceived: (data: VinData) => void;
  onHistoryProgress: (progress: HistoryProgress) => void;
  onTerminalInfo: (info: TerminalInfo) => void;
  onClearFaultResult: (result: ClearFaultResult) => void;
  onUpdateProgress: (progress: UpdateProgress) => void;
  onDataItemConfig: (config: DataItemConfig) => void;
  onDataItemConfigReceived: (config: DataItemConfig) => void;
  onDataItemConfigSet: () => void;
  onSetDataItemConfigResult: (result: { success: boolean }) => void;
  onCustomCommandSent: (result: { success: boolean }) => void;
  onCustomCommandReply: (result: CustomCommandReply) => void;
  onSaveDriverAuthResult: (result: DriverAuthResult) => void;
  onReadDriverAuthResult: (result: ReadDriverAuthResult) => void;
  onOtaStarted: () => void;
  onOtaProgress: (progress: OtaProgress) => void;
  onOtaCompleted: (result: OtaCompleted) => void;
  onOtaFailed: (error: OtaFailed) => void;
}
