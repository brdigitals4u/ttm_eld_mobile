import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DriverStatus, HoursOfService, LogCertification, LogEntry, SplitSleepSettings, StatusReason, StatusUpdate } from '@/types/status';

// Types
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
  eldLocation?: {
    latitude: number;
    longitude: number;
    timestamp?: number;
  };
}

// Actions
interface StatusActions {
  // Status management
  setCurrentStatus: (status: DriverStatus) => void;
  updateStatus: (status: DriverStatus, reason: string) => Promise<void>;
  addStatusUpdate: (update: StatusUpdate) => void;
  setStatusHistory: (history: StatusUpdate[]) => void;
  clearStatusHistory: () => void;
  
  // HOS management
  setHoursOfService: (hos: HoursOfService) => void;
  updateHoursOfService: (updates: Partial<HoursOfService>) => void;
  
  // Certification
  setCertification: (cert: LogCertification) => void;
  certifyLogs: (signature: string) => Promise<void>;
  uncertifyLogs: () => void;
  
  // UI state
  setUpdating: (updating: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Log entries
  setLogEntries: (entries: LogEntry[]) => void;
  updateLogEntry: (id: string, updates: Partial<LogEntry>) => Promise<void>;
  
  // Split sleep settings
  setSplitSleepSettings: (settings: SplitSleepSettings) => void;
  toggleSplitSleep: (enabled: boolean, additionalHours?: number) => Promise<void>;
  
  // Location
  setCurrentLocation: (location: StatusState['currentLocation']) => void;
  setEldLocation: (location: StatusState['eldLocation']) => void;
  
  // Utility functions
  getStatusReasons: (status?: DriverStatus) => StatusReason[];
  formatDuration: (minutes: number) => string;
  canUpdateStatus: () => boolean;
  
  // Reset
  reset: () => void;
}

// Initial state
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
  currentStatus: "offDuty",
  statusHistory: [],
  hoursOfService: initialHoursOfService,
  certification: initialCertification,
  isUpdating: false,
  error: null,
  logEntries: [],
  splitSleepSettings: initialSplitSleepSettings,
  currentLocation: undefined,
  eldLocation: undefined,
};

// Predefined status reasons
const STATUS_REASONS: StatusReason[] = [
  { "id": "1", "text": "Starting shift", "category": "onDuty" },
  { "id": "2", "text": "Pre-trip inspection", "category": "onDuty" },
  { "id": "3", "text": "Post-trip inspection", "category": "onDuty" },
  { "id": "4", "text": "Loading", "category": "onDuty" },
  { "id": "5", "text": "Unloading", "category": "onDuty" },
  { "id": "6", "text": "Waiting at shipper/receiver", "category": "onDuty" },
  { "id": "7", "text": "Fueling", "category": "onDuty" },
  { "id": "8", "text": "Maintenance", "category": "onDuty" },
  { "id": "9", "text": "Meal break", "category": "offDuty" },
  { "id": "10", "text": "Rest break", "category": "offDuty" },
  { "id": "11", "text": "End of shift", "category": "offDuty" },
  { "id": "12", "text": "Personal conveyance", "category": "personalConveyance" },
  { "id": "13", "text": "Start of sleep period", "category": "sleeperBerth" },
  { "id": "14", "text": "End of sleep period", "category": "sleeperBerth" },
  { "id": "15", "text": "Yard moves", "category": "yardMove" },
  { "id": "16", "text": "Driving", "category": "driving" },
  { "id": "17", "text": "On duty not driving", "category": "onDuty" },
  { "id": "18", "text": "Off duty", "category": "offDuty" },
  { "id": "19", "text": "Sleeper berth", "category": "sleeperBerth" },
  { "id": "20", "text": "Personal conveyance", "category": "personalConveyance" },
  { "id": "21", "text": "Performing safety checks", "category": "onDuty" },
  { "id": "22", "text": "Securing cargo", "category": "onDuty" },
  { "id": "23", "text": "Attending safety meeting", "category": "onDuty" },
  { "id": "24", "text": "Paperwork and documentation", "category": "onDuty" },
  { "id": "25", "text": "Training or instruction", "category": "onDuty" },
  { "id": "26", "text": "Assisting another driver", "category": "onDuty" },
  { "id": "27", "text": "Route planning", "category": "onDuty" },
  { "id": "28", "text": "Equipment check", "category": "onDuty" },
  { "id": "29", "text": "Emergency response", "category": "onDuty" },
  { "id": "30", "text": "Vehicle cleaning", "category": "onDuty" },
  { "id": "31", "text": "Attending appointment", "category": "offDuty" },
  { "id": "32", "text": "Running personal errands", "category": "offDuty" },
  { "id": "33", "text": "Waiting for assignment", "category": "offDuty" },
  { "id": "34", "text": "Time at home", "category": "offDuty" },
  { "id": "35", "text": "Non-work travel", "category": "offDuty" },
  { "id": "36", "text": "Voluntary unpaid leave", "category": "offDuty" },
  { "id": "37", "text": "Vacation time", "category": "offDuty" },
  { "id": "38", "text": "Non-job related activities", "category": "offDuty" },
  { "id": "39", "text": "Entering highway", "category": "driving" },
  { "id": "40", "text": "Exiting highway", "category": "driving" },
  { "id": "41", "text": "City driving", "category": "driving" },
  { "id": "42", "text": "Rural driving", "category": "driving" },
  { "id": "43", "text": "Detour route", "category": "driving" },
  { "id": "44", "text": "Driving in adverse weather", "category": "driving" },
  { "id": "45", "text": "Returning to terminal", "category": "driving" },
  { "id": "46", "text": "Resting in sleeper", "category": "sleeperBerth" },
  { "id": "47", "text": "Extended sleeper berth period", "category": "sleeperBerth" },
  { "id": "48", "text": "Sleeper berth repositioning", "category": "sleeperBerth" },
  { "id": "49", "text": "Traveling to lodging", "category": "personalConveyance" },
  { "id": "50", "text": "Commuting to/from terminal", "category": "personalConveyance" },
  { "id": "51", "text": "Using vehicle for personal tasks (non-work)", "category": "personalConveyance" },
  { "id": "52", "text": "Moving within facility/yard", "category": "yardMove" },
  { "id": "53", "text": "Positioning vehicle for service", "category": "yardMove" },
  { "id": "54", "text": "Relocation for inspection", "category": "yardMove" },
  { "id": "55", "text": "Moving trailer in yard", "category": "yardMove" },
  { "id": "56", "text": "Arranging vehicle for loading/unloading", "category": "yardMove" },
  { "id": "57", "text": "Scheduled maintenance", "category": "onDuty" },
  { "id": "58", "text": "Unscheduled repairs", "category": "onDuty" },
  { "id": "59", "text": "Tire change", "category": "onDuty" },
  { "id": "60", "text": "Brake inspection", "category": "onDuty" },
  { "id": "61", "text": "Awaiting mechanic", "category": "onDuty" },
  { "id": "62", "text": "Cleaning vehicle interior/exterior", "category": "onDuty" },
  { "id": "63", "text": "Other", "category": "onDuty" },
  { "id": "64", "text": "Other", "category": "offDuty" },
  { "id": "65", "text": "Other", "category": "sleeperBerth" },
  { "id": "66", "text": "Other", "category": "personalConveyance" },
  { "id": "67", "text": "Other", "category": "all" },
];

export const useStatusStore = create<StatusState & StatusActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Status management
      setCurrentStatus: (status: DriverStatus) => {
        console.log('🔄 StatusStore: Setting current status to:', status);
        set({ currentStatus: status });
      },

      updateStatus: async (status: DriverStatus, reason: string) => {
        console.log('🔄 StatusStore: Updating status to:', status, 'with reason:', reason);
        
        const state = get();
        set({ isUpdating: true, error: null });

        try {
          // Create status update
          const statusUpdate: StatusUpdate = {
            status,
            timestamp: Date.now(),
            reason,
            location: state.currentLocation,
          };

          // Add to history
          const newHistory = [...state.statusHistory, statusUpdate];
          set({ 
            statusHistory: newHistory,
            currentStatus: status 
          });

          // Save to AsyncStorage
          await AsyncStorage.setItem('statusHistory', JSON.stringify(newHistory));
          await AsyncStorage.setItem('currentStatus', status);

          console.log('✅ StatusStore: Status updated successfully');
        } catch (error) {
          console.error('❌ StatusStore: Failed to update status:', error);
          set({ error: 'Failed to update status' });
        } finally {
          set({ isUpdating: false });
        }
      },

      addStatusUpdate: (update: StatusUpdate) => {
        console.log('🔄 StatusStore: Adding status update:', update);
        const state = get();
        
        // Prevent duplicate updates within the same second
        const now = Date.now();
        const lastUpdate = state.statusHistory[state.statusHistory.length - 1];
        if (lastUpdate && Math.abs(lastUpdate.timestamp - now) < 1000) {
          console.log('⚠️ StatusStore: Skipping duplicate update within 1 second');
          return;
        }
        
        const newHistory = [...state.statusHistory, update];
        set({ 
          statusHistory: newHistory,
          currentStatus: update.status 
        });
      },

      setStatusHistory: (history: StatusUpdate[]) => {
        console.log('🔄 StatusStore: Setting status history:', history.length, 'entries');
        set({ statusHistory: history });
      },

      clearStatusHistory: () => {
        console.log('🔄 StatusStore: Clearing status history');
        set({ statusHistory: [] });
      },

      // HOS management
      setHoursOfService: (hos: HoursOfService) => {
        console.log('🔄 StatusStore: Setting HOS:', hos);
        set({ hoursOfService: hos });
      },

      updateHoursOfService: (updates: Partial<HoursOfService>) => {
        console.log('🔄 StatusStore: Updating HOS with:', updates);
        const state = get();
        set({ 
          hoursOfService: { ...state.hoursOfService, ...updates }
        });
      },

      // Certification
      setCertification: (cert: LogCertification) => {
        console.log('🔄 StatusStore: Setting certification:', cert);
        set({ certification: cert });
      },

      certifyLogs: async (signature: string) => {
        console.log('🔄 StatusStore: Certifying logs with signature');
        set({ isUpdating: true, error: null });

        try {
          const state = get();
          const updatedCertification = {
            ...state.certification,
            isCertified: true,
            signature,
            certifiedAt: Date.now(),
          };

          set({ certification: updatedCertification });

          // Save to AsyncStorage
          await AsyncStorage.setItem('certification', JSON.stringify(updatedCertification));
          
          console.log('✅ StatusStore: Logs certified successfully');
        } catch (error) {
          console.error('❌ StatusStore: Failed to certify logs:', error);
          set({ error: 'Failed to certify logs' });
        } finally {
          set({ isUpdating: false });
        }
      },

      uncertifyLogs: () => {
        console.log('🔄 StatusStore: Uncertifying logs');
        set({ 
          certification: { isCertified: false }
        });
      },

      // UI state
      setUpdating: (updating: boolean) => {
        set({ isUpdating: updating });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Log entries
      setLogEntries: (entries: LogEntry[]) => {
        console.log('🔄 StatusStore: Setting log entries:', entries.length);
        set({ logEntries: entries });
      },

      updateLogEntry: async (id: string, updates: Partial<LogEntry>) => {
        console.log('🔄 StatusStore: Updating log entry:', id, updates);
        const state = get();
        const updatedEntries = state.logEntries.map(entry =>
          entry.id === id ? { ...entry, ...updates } : entry
        );
        set({ logEntries: updatedEntries });
      },

      // Split sleep settings
      setSplitSleepSettings: (settings: SplitSleepSettings) => {
        console.log('🔄 StatusStore: Setting split sleep settings:', settings);
        set({ splitSleepSettings: settings });
      },

      toggleSplitSleep: async (enabled: boolean, additionalHours = 2) => {
        console.log('🔄 StatusStore: Toggling split sleep:', enabled, additionalHours);
        const newSettings = { enabled, additionalHours };
        set({ splitSleepSettings: newSettings });
        
        try {
          await AsyncStorage.setItem('splitSleepSettings', JSON.stringify(newSettings));
          console.log('✅ StatusStore: Split sleep settings saved');
        } catch (error) {
          console.error('❌ StatusStore: Failed to save split sleep settings:', error);
        }
      },

      // Location
      setCurrentLocation: (location: StatusState['currentLocation']) => {
        console.log('🔄 StatusStore: Setting current location (expo-location):', location);
        set({ currentLocation: location });
      },
      
      setEldLocation: (location: StatusState['eldLocation']) => {
        console.log('🔄 StatusStore: Setting ELD location:', location);
        set({ eldLocation: location });
      },

      // Utility functions
      getStatusReasons: (status?: DriverStatus): StatusReason[] => {
        if (!status) return STATUS_REASONS;
        return STATUS_REASONS.filter(reason => reason.category === status);
      },

      formatDuration: (minutes: number): string => {
        const roundedMinutes = Math.round(minutes);
        const hours = Math.floor(roundedMinutes / 60);
        const mins = Math.floor(roundedMinutes % 60);
        return `${hours}h ${mins}m`;
      },

      canUpdateStatus: (): boolean => {
        const state = get();
        return !state.isUpdating && !state.error;
      },

      // Reset
      reset: () => {
        console.log('🔄 StatusStore: Resetting to initial state');
        set(initialState);
      },
    }),
    {
      name: 'status-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStatus: state.currentStatus,
        statusHistory: state.statusHistory,
        hoursOfService: state.hoursOfService,
        certification: state.certification,
        splitSleepSettings: state.splitSleepSettings,
        currentLocation: state.currentLocation,
        eldLocation: state.eldLocation,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 StatusStore: Rehydrating from AsyncStorage...');
        if (state) {
          console.log('✅ StatusStore: Rehydrated successfully');
          console.log('📊 StatusStore: Current status:', state.currentStatus);
          console.log('📊 StatusStore: Status history entries:', state.statusHistory.length);
        }
      },
    }
  )
);

// Selectors for better performance
export const useCurrentStatus = () => useStatusStore(state => state.currentStatus);
export const useStatusHistory = () => useStatusStore(state => state.statusHistory);
export const useHoursOfService = () => useStatusStore(state => state.hoursOfService);
export const useCertification = () => useStatusStore(state => state.certification);
export const useIsUpdating = () => useStatusStore(state => state.isUpdating);
export const useStatusError = () => useStatusStore(state => state.error);
export const useLogEntries = () => useStatusStore(state => state.logEntries);
export const useSplitSleepSettings = () => useStatusStore(state => state.splitSleepSettings);
export const useCurrentLocation = () => useStatusStore(state => state.currentLocation);

// Action selectors
export const useStatusActions = () => useStatusStore(state => ({
  setCurrentStatus: state.setCurrentStatus,
  updateStatus: state.updateStatus,
  addStatusUpdate: state.addStatusUpdate,
  setStatusHistory: state.setStatusHistory,
  clearStatusHistory: state.clearStatusHistory,
  setHoursOfService: state.setHoursOfService,
  updateHoursOfService: state.updateHoursOfService,
  setCertification: state.setCertification,
  certifyLogs: state.certifyLogs,
  uncertifyLogs: state.uncertifyLogs,
  setUpdating: state.setUpdating,
  setError: state.setError,
  clearError: state.clearError,
  setLogEntries: state.setLogEntries,
  updateLogEntry: state.updateLogEntry,
  setSplitSleepSettings: state.setSplitSleepSettings,
  toggleSplitSleep: state.toggleSplitSleep,
  setCurrentLocation: state.setCurrentLocation,
  setEldLocation: state.setEldLocation,
  getStatusReasons: state.getStatusReasons,
  formatDuration: state.formatDuration,
  canUpdateStatus: state.canUpdateStatus,
  reset: state.reset,
}));
