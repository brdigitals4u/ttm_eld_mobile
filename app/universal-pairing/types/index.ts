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
  
  // FMCSA ELD Compliance Data Elements
  eldData?: {
    // 24-Hour Period Data
    periodStartTime?: string;
    date?: string;
    time?: string;
    timeZoneOffset?: number;
    
    // Carrier Information
    carrierName?: string;
    carrierUSDOTNumber?: string;
    
    // Vehicle Information
    vin?: string;
    cmvPowerUnitNumber?: string;
    trailerNumbers?: string[];
    vehicleMiles?: number;
    engineHours?: number;
    
    // Driver Information
    driverFirstName?: string;
    driverLastName?: string;
    driverLicenseNumber?: string;
    driverLicenseIssuingState?: string;
    driverLocationDescription?: string;
    
    // ELD Device Information
    eldIdentifier?: string;
    eldProvider?: string;
    eldRegistrationId?: string;
    eldUsername?: string;
    eldAccountType?: string;
    eldAuthenticationValue?: string;
    
    // Event Data
    eventCode?: string;
    eventType?: string;
    eventSequenceId?: number;
    eventRecordOrigin?: string;
    eventRecordStatus?: string;
    eventDataCheckValue?: string;
    
    // Location Data
    latitude?: number;
    longitude?: number;
    geoLocation?: string;
    distanceSinceLastValidCoordinates?: number;
    
    // Diagnostic Data
    malfunctionIndicatorStatus?: string;
    malfunctionDiagnosticCode?: string;
    dataDiagnosticEventIndicatorStatus?: string;
    
    // Configuration
    exemptDriverConfiguration?: string;
    multidayBasisUsed?: number; // 7 or 8 days
    
    // Additional Data
    orderNumber?: string;
    shippingDocumentNumber?: string;
    outputFileComment?: string;
    commentAnnotation?: string;
    
    // File Data
    fileDataCheckValue?: string;
    lineDataCheckValue?: string;
  };
  
  // Enhanced CAN Data (from your hardware)
  canData?: {
    // Engine Performance Metrics
    engine_throttle?: number;
    engine_throttle_valve_1_position_1?: number;
    engine_intake_air_mass_flow_rate?: number;
    engine_percent_load_at_current_speed?: number;
    engine_speed?: number;
    engine_runtime?: number;
    engine_running_time?: number;
    time_since_engine_start?: number;
    accelerator_pedal_position_1?: number;
    
    // Vehicle Status
    wheel_based_vehicle_speed?: number;
    total_vehicle_distance?: number;
    acc_out_status?: string;
    malfunction_indicator_lamp?: string;
    
    // Environmental Data
    engine_inlet_air_temperature?: number;
    engine_coolant_temperature?: number;
    intake_manifold_absolute_pressure?: number;
    barometric_pressure?: number;
    
    // Fuel System
    fuel_level?: number;
    fuel_level_1?: number;
    
    // Electrical System
    voltage?: number;
    
    // Legacy fields for backward compatibility
    air_flow?: number;
    engine_load?: number;
    coolant_temp?: number;
    vehicle_distance?: number;
    speed?: number;
    engine_rpm?: number;
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
