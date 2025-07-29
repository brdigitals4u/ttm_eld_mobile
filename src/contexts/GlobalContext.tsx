import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from "@sentry/react-native";

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  companyId?: string;
}

export interface ELDDevice {
  id: string;
  name: string;
  macAddress: string;
  machineNumber?: string;
  isConnected: boolean;
  lastConnected?: Date;
  firmwareVersion?: string;
  batteryLevel?: number;
}

export interface GlobalState {
  user: User | null;
  language: string;
  eldDevice: ELDDevice | null;
  isEldConnecting: boolean;
  eldConnectionHistory: Array<{
    timestamp: Date;
    event: string;
    data?: any;
  }>;
  appSettings: {
    notifications: boolean;
    darkMode: boolean;
    autoConnect: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

// Actions
type GlobalAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'SET_ELD_DEVICE'; payload: ELDDevice | null }
  | { type: 'SET_ELD_CONNECTING'; payload: boolean }
  | { type: 'ADD_ELD_EVENT'; payload: { event: string; data?: any } }
  | { type: 'UPDATE_ELD_CONNECTION_STATUS'; payload: boolean }
  | { type: 'UPDATE_ELD_BATTERY'; payload: number }
  | { type: 'UPDATE_APP_SETTINGS'; payload: Partial<GlobalState['appSettings']> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_STATE'; payload: Partial<GlobalState> };

// Initial State
const initialState: GlobalState = {
  user: null,
  language: 'en',
  eldDevice: null,
  isEldConnecting: false,
  eldConnectionHistory: [],
  appSettings: {
    notifications: true,
    darkMode: false,
    autoConnect: true,
  },
  isLoading: false,
  error: null,
};

// Reducer
const globalReducer = (state: GlobalState, action: GlobalAction): GlobalState => {
  switch (action.type) {
    case 'SET_USER':
      // Set user context for Sentry
      if (action.payload) {
        Sentry.setUser({
          id: action.payload.id,
          email: action.payload.email,
          username: action.payload.name,
        });
      } else {
        Sentry.setUser(null);
      }
      return { ...state, user: action.payload };

    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };

    case 'SET_ELD_DEVICE':
      return { ...state, eldDevice: action.payload };

    case 'SET_ELD_CONNECTING':
      return { ...state, isEldConnecting: action.payload };

    case 'ADD_ELD_EVENT':
      const newEvent = {
        timestamp: new Date(),
        event: action.payload.event,
        data: action.payload.data,
      };
      
      // Log to Sentry for monitoring
      Sentry.addBreadcrumb({
        message: `ELD Event: ${action.payload.event}`,
        category: 'eld',
        level: 'info',
        data: action.payload.data,
      });

      return {
        ...state,
        eldConnectionHistory: [newEvent, ...state.eldConnectionHistory].slice(0, 100), // Keep last 100 events
      };

    case 'UPDATE_ELD_CONNECTION_STATUS':
      if (!state.eldDevice) return state;
      return {
        ...state,
        eldDevice: {
          ...state.eldDevice,
          isConnected: action.payload,
          lastConnected: action.payload ? new Date() : state.eldDevice.lastConnected,
        },
      };

    case 'UPDATE_ELD_BATTERY':
      if (!state.eldDevice) return state;
      return {
        ...state,
        eldDevice: {
          ...state.eldDevice,
          batteryLevel: action.payload,
        },
      };

    case 'UPDATE_APP_SETTINGS':
      return {
        ...state,
        appSettings: { ...state.appSettings, ...action.payload },
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      if (action.payload) {
        Sentry.captureMessage(`Global Error: ${action.payload}`, 'error');
      }
      return { ...state, error: action.payload };

case 'LOGOUT':
      // Disconnect ELD on logout
      if (state.eldDevice && state.eldDevice.isConnected) {
        try {
          const TTMBLEManager = require('@/utils/TTMBLEManager').default;
          TTMBLEManager.disconnect();
        } catch (error) {
          console.error('Error disconnecting ELD:', error);
          Sentry.captureException(error);
        }
      }
      // Clear user context from Sentry
      Sentry.setUser(null);
      return {
        ...initialState,
        language: state.language, // Keep language preference
        appSettings: state.appSettings, // Keep app settings
      };

    case 'RESTORE_STATE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
};

// Context
const GlobalContext = createContext<{
  state: GlobalState;
  dispatch: React.Dispatch<GlobalAction>;
  actions: {
    setUser: (user: User | null) => void;
    setLanguage: (language: string) => void;
    setEldDevice: (device: ELDDevice | null) => void;
    setEldConnecting: (connecting: boolean) => void;
    addEldEvent: (event: string, data?: any) => void;
    updateEldConnectionStatus: (connected: boolean) => void;
    updateEldBattery: (batteryLevel: number) => void;
    updateAppSettings: (settings: Partial<GlobalState['appSettings']>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    logout: () => Promise<void>;
    saveStateToStorage: () => Promise<void>;
    loadStateFromStorage: () => Promise<void>;
  };
} | null>(null);

// Storage keys
const STORAGE_KEYS = {
  USER: '@TruckLogELD:user',
  LANGUAGE: '@TruckLogELD:language',
  ELD_DEVICE: '@TruckLogELD:eldDevice',
  APP_SETTINGS: '@TruckLogELD:appSettings',
  ELD_HISTORY: '@TruckLogELD:eldHistory',
};

// Provider Component
export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  // Actions
  const actions = {
    setUser: (user: User | null) => {
      dispatch({ type: 'SET_USER', payload: user });
    },

    setLanguage: (language: string) => {
      dispatch({ type: 'SET_LANGUAGE', payload: language });
    },

    setEldDevice: (device: ELDDevice | null) => {
      dispatch({ type: 'SET_ELD_DEVICE', payload: device });
    },

    setEldConnecting: (connecting: boolean) => {
      dispatch({ type: 'SET_ELD_CONNECTING', payload: connecting });
    },

    addEldEvent: (event: string, data?: any) => {
      dispatch({ type: 'ADD_ELD_EVENT', payload: { event, data } });
    },

    updateEldConnectionStatus: (connected: boolean) => {
      dispatch({ type: 'UPDATE_ELD_CONNECTION_STATUS', payload: connected });
    },

    updateEldBattery: (batteryLevel: number) => {
      dispatch({ type: 'UPDATE_ELD_BATTERY', payload: batteryLevel });
    },

    updateAppSettings: (settings: Partial<GlobalState['appSettings']>) => {
      dispatch({ type: 'UPDATE_APP_SETTINGS', payload: settings });
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },

    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },

    logout: async () => {
      try {
        // Clear all stored data
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER,
          STORAGE_KEYS.ELD_DEVICE,
          STORAGE_KEYS.ELD_HISTORY,
        ]);
        
        dispatch({ type: 'LOGOUT' });
        
        Sentry.addBreadcrumb({
          message: 'User logged out',
          category: 'auth',
          level: 'info',
        });
      } catch (error) {
        console.error('Error during logout:', error);
        Sentry.captureException(error);
      }
    },

    saveStateToStorage: async () => {
      try {
        const savePromises = [
          AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user)),
          AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, state.language),
          AsyncStorage.setItem(STORAGE_KEYS.ELD_DEVICE, JSON.stringify(state.eldDevice)),
          AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(state.appSettings)),
          AsyncStorage.setItem(STORAGE_KEYS.ELD_HISTORY, JSON.stringify(state.eldConnectionHistory.slice(0, 50))), // Save last 50 events
        ];

        await Promise.all(savePromises);
      } catch (error) {
        console.error('Error saving state to storage:', error);
        Sentry.captureException(error);
      }
    },

    loadStateFromStorage: async () => {
      try {
        const [
          userJson,
          language,
          eldDeviceJson,
          appSettingsJson,
          eldHistoryJson,
        ] = await AsyncStorage.multiGet([
          STORAGE_KEYS.USER,
          STORAGE_KEYS.LANGUAGE,
          STORAGE_KEYS.ELD_DEVICE,
          STORAGE_KEYS.APP_SETTINGS,
          STORAGE_KEYS.ELD_HISTORY,
        ]);

        const restoredState: Partial<GlobalState> = {};

        if (userJson[1]) {
          restoredState.user = JSON.parse(userJson[1]);
        }

        if (language[1]) {
          restoredState.language = language[1];
        }

        if (eldDeviceJson[1]) {
          const eldDevice = JSON.parse(eldDeviceJson[1]);
          // Set device as disconnected on app restart
          restoredState.eldDevice = { ...eldDevice, isConnected: false };
        }

        if (appSettingsJson[1]) {
          restoredState.appSettings = JSON.parse(appSettingsJson[1]);
        }

        if (eldHistoryJson[1]) {
          const history = JSON.parse(eldHistoryJson[1]);
          restoredState.eldConnectionHistory = history.map((event:any) => ({
            ...event,
            timestamp: new Date(event.timestamp),
          }));
        }

        dispatch({ type: 'RESTORE_STATE', payload: restoredState });
      } catch (error) {
        console.error('Error loading state from storage:', error);
        Sentry.captureException(error);
      }
    },
  };

  // Load state from storage on app start
  useEffect(() => {
    actions.loadStateFromStorage();
  }, []);

  // Save state to storage whenever it changes
  useEffect(() => {
    if (state.user !== null || state.eldDevice !== null) {
      actions.saveStateToStorage();
    }
  }, [state.user, state.language, state.eldDevice, state.appSettings]);

  return (
    <GlobalContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </GlobalContext.Provider>
  );
};

// Hook to use the context
export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

// Hook for ELD-specific operations
export const useELD = () => {
  const { state, actions } = useGlobalContext();
  
  return {
    device: state.eldDevice,
    isConnecting: state.isEldConnecting,
    isConnected: state.eldDevice?.isConnected || false,
    connectionHistory: state.eldConnectionHistory,
    setDevice: actions.setEldDevice,
    setConnecting: actions.setEldConnecting,
    updateConnectionStatus: actions.updateEldConnectionStatus,
    updateBattery: actions.updateEldBattery,
    addEvent: actions.addEldEvent,
  };
};

export default GlobalContext;
