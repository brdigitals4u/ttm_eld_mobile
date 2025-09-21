import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { DriverStatus, HoursOfService, LogCertification, LogEntry, SplitSleepSettings, StatusReason, StatusState, StatusUpdate } from '@/types/status';
// Import useAuth from index to match what's provided by AllContextsProvider
// Note: We can't import from index directly due to circular dependency,
// so we'll need to inject the auth data differently

interface StatusContextType extends StatusState {
  updateStatus: (status: DriverStatus, reason: string) => Promise<void>;
  getStatusReasons: (status?: DriverStatus) => StatusReason[];
  formatDuration: (minutes: number) => string;
  certifyLogs: (signature: string) => Promise<void>;
  canUpdateStatus: () => boolean;
  updateLogEntry: (id: string, updates: Partial<LogEntry>) => Promise<void>;
  toggleSplitSleep: (enabled: boolean, additionalHours?: number) => Promise<void>;
  getCurrentLocation: () => Promise<void>;
  uncertifyLogs: () => Promise<void>;
}

const initialHoursOfService: HoursOfService = {
  driveTimeRemaining: 11 * 60, // 11 hours in minutes
  shiftTimeRemaining: 14 * 60, // 14 hours in minutes
  cycleTimeRemaining: 60 * 60, // 60 hours in minutes
  breakTimeRemaining: 8 * 60, // 8 hours in minutes
  lastCalculated: Date.now(),
};

const initialCertification: LogCertification = {
  isCertified: false,
};

const initialSplitSleepSettings: SplitSleepSettings = {
  enabled: false,
  additionalHours: 2,
};

const initialState: StatusState = {
  currentStatus: 'offDuty',
  statusHistory: [],
  hoursOfService: initialHoursOfService,
  certification: initialCertification,
  isUpdating: false,
  error: null,
  logEntries: [],
  splitSleepSettings: initialSplitSleepSettings,
  currentLocation: undefined,
};

// Predefined status reasons
const STATUS_REASONS: StatusReason[] = [
  { id: '1', text: 'Starting shift', category: 'onDuty' },
  { id: '2', text: 'Pre-trip inspection', category: 'onDuty' },
  { id: '3', text: 'Post-trip inspection', category: 'onDuty' },
  { id: '4', text: 'Loading', category: 'onDuty' },
  { id: '5', text: 'Unloading', category: 'onDuty' },
  { id: '6', text: 'Waiting at shipper/receiver', category: 'onDuty' },
  { id: '7', text: 'Fueling', category: 'onDuty' },
  { id: '8', text: 'Maintenance', category: 'onDuty' },
  { id: '9', text: 'Meal break', category: 'offDuty' },
  { id: '10', text: 'Rest break', category: 'offDuty' },
  { id: '11', text: 'End of shift', category: 'offDuty' },
  { id: '12', text: 'Personal conveyance', category: 'personalConveyance' },
  { id: '13', text: 'Start of sleep period', category: 'sleeperBerth' },
  { id: '14', text: 'End of sleep period', category: 'sleeperBerth' },
  { id: '15', text: 'Moving trailer in yard', category: 'yardMoves' },
  { id: '16', text: 'Repositioning vehicle', category: 'yardMoves' },
  { id: '17', text: 'Other', category: 'all' },
];

export const [StatusProvider, useStatus] = createContextHook(() => {
  const [state, setState] = useState<StatusState>(initialState);
  // Remove auth dependency for now to avoid circular import issues
  // TODO: Find a better way to handle auth integration

  // Load status data on mount
  useEffect(() => {

    const loadStatusData = async () => {
      try {
        const statusJson = await AsyncStorage.getItem('driverStatus');
        const historyJson = await AsyncStorage.getItem('statusHistory');
        const hosJson = await AsyncStorage.getItem('hoursOfService');
        const certificationJson = await AsyncStorage.getItem('logCertification');
        const logEntriesJson = await AsyncStorage.getItem('logEntries');
        const splitSleepJson = await AsyncStorage.getItem('splitSleepSettings');
        
        if (statusJson) {
          setState(prev => ({
            ...prev,
            currentStatus: JSON.parse(statusJson),
          }));
        }
        
        if (historyJson) {
          setState(prev => ({
            ...prev,
            statusHistory: JSON.parse(historyJson),
          }));
        }
        
        if (hosJson) {
          setState(prev => ({
            ...prev,
            hoursOfService: JSON.parse(hosJson),
          }));
        }

        if (certificationJson) {
          setState(prev => ({
            ...prev,
            certification: JSON.parse(certificationJson),
          }));
        }

        if (logEntriesJson) {
          setState(prev => ({
            ...prev,
            logEntries: JSON.parse(logEntriesJson),
          }));
        }

        if (splitSleepJson) {
          setState(prev => ({
            ...prev,
            splitSleepSettings: JSON.parse(splitSleepJson),
          }));
        }
      } catch (error) {
        console.error('Failed to load status data:', error);
      }
    };

    loadStatusData();
  }, []);

  // Update HOS calculations periodically
  useEffect(() => {

    const updateHoursOfService = () => {
      setState(prev => {
        const now = Date.now();
        const elapsedMinutes = (now - prev.hoursOfService.lastCalculated) / (1000 * 60);
        
        // Only update if time has passed
        if (elapsedMinutes < 1) return prev;
        
        let updatedHos = { ...prev.hoursOfService, lastCalculated: now };
        
        // Update based on current status
        if (prev.currentStatus === 'driving') {
          updatedHos.driveTimeRemaining = Math.max(0, updatedHos.driveTimeRemaining - elapsedMinutes);
          updatedHos.shiftTimeRemaining = Math.max(0, updatedHos.shiftTimeRemaining - elapsedMinutes);
          updatedHos.cycleTimeRemaining = Math.max(0, updatedHos.cycleTimeRemaining - elapsedMinutes);
          // Reset break timer when driving
          updatedHos.breakTimeRemaining = 8 * 60;
        } else if (prev.currentStatus === 'onDuty' || prev.currentStatus === 'yardMoves') {
          // On duty not driving still counts against shift and cycle
          updatedHos.shiftTimeRemaining = Math.max(0, updatedHos.shiftTimeRemaining - elapsedMinutes);
          updatedHos.cycleTimeRemaining = Math.max(0, updatedHos.cycleTimeRemaining - elapsedMinutes);
          // Break timer counts down when not driving
          updatedHos.breakTimeRemaining = Math.max(0, updatedHos.breakTimeRemaining - elapsedMinutes);
        } else if (prev.currentStatus === 'sleeperBerth') {
          // Sleeper berth counts as rest, so it recharges drive time
          const rechargeRate = prev.splitSleepSettings.enabled ? 0.75 : 0.5;
          updatedHos.driveTimeRemaining = Math.min(11 * 60, updatedHos.driveTimeRemaining + (elapsedMinutes * rechargeRate));
          // Break timer counts down faster when in sleeper berth
          updatedHos.breakTimeRemaining = Math.max(0, updatedHos.breakTimeRemaining - (elapsedMinutes * 2));
        } else if (prev.currentStatus === 'offDuty' || prev.currentStatus === 'personalConveyance') {
          // Off duty and personal conveyance count as rest
          updatedHos.breakTimeRemaining = Math.max(0, updatedHos.breakTimeRemaining - elapsedMinutes);
        }
        
        // Save updated HOS
        AsyncStorage.setItem('hoursOfService', JSON.stringify(updatedHos)).catch(
          err => console.error('Failed to save HOS:', err)
        );
        
        return {
          ...prev,
          hoursOfService: updatedHos,
        };
      });
    };
    
    // Update every minute
    const interval = setInterval(updateHoursOfService, 60 * 1000);
    
    // Initial update
    updateHoursOfService();
    
    return () => clearInterval(interval);
  }, [state.currentStatus]);

  const canUpdateStatus = () => {
    return !state.certification.isCertified;
  };

  const getCurrentLocation = async () => {
    try {
      // In a real app, you would use expo-location here
      // For now, we'll use a mock location
      const location = {
        latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
        address: 'Current Location, CA',
      };
      
      setState(prev => ({
        ...prev,
        currentLocation: location,
      }));
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const updateStatus = async (status: DriverStatus, reason: string) => {
    if (!canUpdateStatus()) {
      Alert.alert(
        'Logs Certified',
        'Cannot update status because logs have been certified. Logs must be uncertified first.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isUpdating: true,
        error: null,
      }));
      
      // Get current location
      await getCurrentLocation();
      
      // Create status update
      const statusUpdate: StatusUpdate = {
        status,
        timestamp: Date.now(),
        reason,
        location: state.currentLocation || {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'San Francisco, CA',
        },
      };
      
      // Create log entry
      const logEntry: LogEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        status,
        startTime: Date.now(),
        duration: 0,
        reason,
        location: statusUpdate.location,
        isCertified: false,
        isEditable: true,
      };
      
      // Update state
      const updatedHistory = [...state.statusHistory, statusUpdate];
      const updatedLogEntries = [...state.logEntries, logEntry];
      
      // Save to storage
      await AsyncStorage.setItem('driverStatus', JSON.stringify(status));
      await AsyncStorage.setItem('statusHistory', JSON.stringify(updatedHistory));
      await AsyncStorage.setItem('logEntries', JSON.stringify(updatedLogEntries));
      
      setState(prev => ({
        ...prev,
        currentStatus: status,
        statusHistory: updatedHistory,
        logEntries: updatedLogEntries,
        isUpdating: false,
      }));
      
      // Alert for critical status changes
      if (status === 'driving' && state.hoursOfService.driveTimeRemaining < 60) {
        Alert.alert(
          'Hours of Service Warning',
          `You have less than ${formatDuration(state.hoursOfService.driveTimeRemaining)} of driving time remaining.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: 'Failed to update status',
      }));
    }
  };

  const certifyLogs = async (signature: string) => {
    try {
      const certification: LogCertification = {
        isCertified: true,
        certifiedAt: Date.now(),
        certifiedBy: 'Driver', // TODO: Get driver name from context
        certificationSignature: signature,
      };

      await AsyncStorage.setItem('logCertification', JSON.stringify(certification));
      
      setState(prev => ({
        ...prev,
        certification,
      }));

      Alert.alert(
        'Logs Certified',
        'Your logs have been successfully certified. No further changes can be made until uncertified.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to certify logs:', error);
      Alert.alert('Error', 'Failed to certify logs');
    }
  };

  const getStatusReasons = (status?: DriverStatus) => {
    if (!status) return STATUS_REASONS;
    return STATUS_REASONS.filter(r => r.category === status || r.category === 'all');
  };

  const updateLogEntry = async (id: string, updates: Partial<LogEntry>) => {
    try {
      const updatedLogEntries = state.logEntries.map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      );
      
      await AsyncStorage.setItem('logEntries', JSON.stringify(updatedLogEntries));
      
      setState(prev => ({
        ...prev,
        logEntries: updatedLogEntries,
      }));
    } catch (error) {
      console.error('Failed to update log entry:', error);
    }
  };

  const toggleSplitSleep = async (enabled: boolean, additionalHours = 2) => {
    try {
      const splitSleepSettings: SplitSleepSettings = {
        enabled,
        additionalHours,
      };
      
      await AsyncStorage.setItem('splitSleepSettings', JSON.stringify(splitSleepSettings));
      
      setState(prev => ({
        ...prev,
        splitSleepSettings,
      }));
    } catch (error) {
      console.error('Failed to update split sleep settings:', error);
    }
  };

  const uncertifyLogs = async () => {
    try {
      const certification: LogCertification = {
        isCertified: false,
      };

      await AsyncStorage.setItem('logCertification', JSON.stringify(certification));
      
      setState(prev => ({
        ...prev,
        certification,
        logEntries: prev.logEntries.map(entry => ({
          ...entry,
          isCertified: false,
          isEditable: true,
        })),
      }));

      Alert.alert(
        'Logs Uncertified',
        'Your logs have been uncertified. You can now make changes.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to uncertify logs:', error);
      Alert.alert('Error', 'Failed to uncertify logs');
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return {
    ...state,
    updateStatus,
    getStatusReasons,
    formatDuration,
    certifyLogs,
    canUpdateStatus,
    updateLogEntry,
    toggleSplitSleep,
    getCurrentLocation,
    uncertifyLogs,
  };
});