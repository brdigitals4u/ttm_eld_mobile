export type DriverStatus = 'driving' | 'onDuty' | 'offDuty' | 'sleeping' | 'sleeperBerth' | 'personalConveyance' | 'yardMove';

export interface StatusReason {
  id: string;
  text: string;
  category: DriverStatus | 'all';
}

export interface StatusUpdate {
  status: DriverStatus;
  timestamp: number;
  reason: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isCertified?: boolean;
  logId?: string; // ID for HOS API certification
}

export interface HoursOfService {
  driveTimeRemaining: number; // in minutes
  shiftTimeRemaining: number; // in minutes
  cycleTimeRemaining: number; // in minutes
  breakTimeRemaining: number; // in minutes
  lastCalculated: number; // timestamp
}

export interface LogCertification {
  isCertified: boolean;
  certifiedAt?: number;
  certifiedBy?: string;
  certificationSignature?: string;
}

export interface LogEntry {
  id: string;
  date: string;
  status: DriverStatus;
  startTime: number;
  endTime?: number;
  duration: number;
  reason: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isCertified: boolean;
  isEditable: boolean;
  exemptions?: {
    shortHaul16Hour?: boolean;
    adverseDriving?: {
      enabled: boolean;
      date?: string;
      applyTime?: string;
      remarks?: string;
    };
  };
}

export interface SplitSleepSettings {
  enabled: boolean;
  additionalHours: number;
}

export interface StatusState {
  currentStatus: DriverStatus;
  statusHistory: StatusUpdate[];
  hoursOfService: HoursOfService;
  certification: LogCertification;
  isUpdating: boolean;
  error: string | null;
  logEntries: LogEntry[];
  splitSleepSettings: SplitSleepSettings;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}