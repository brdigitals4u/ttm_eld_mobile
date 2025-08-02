import createContextHook from '@nkzw/create-context-hook';
import { SafeAsyncStorage } from '../src/utils/AsyncStorageWrapper';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthState, User, VehicleInfo } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setVehicleInfo: (info: VehicleInfo) => Promise<void>;
  vehicleInfo: VehicleInfo | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
};

// Mock users for demo
const MOCK_USERS = [
  {
    id: '1',
    email: 'driver@example.com',
    password: 'password',
    name: 'John Doe',
    licenseNumber: 'DL12345678',
    organizationId: 'org1',
    organizationName: 'Acme Trucking Co.',
  },
];

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [state, setState] = useState<AuthState>(initialState);
  const [vehicleInfo, setVehicleInfoState] = useState<VehicleInfo | null>(null);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const userJson = await SafeAsyncStorage.getItem('user');
        const vehicleJson = await SafeAsyncStorage.getItem('vehicleInfo');
        
        if (userJson) {
          const user = JSON.parse(userJson);
          setState({
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
          });
          
          if (vehicleJson) {
            setVehicleInfoState(JSON.parse(vehicleJson));
          }
          
          // Navigate based on auth state
          if (!vehicleJson) {
            router.replace('/(app)/vehicle-setup');
          } else {
            router.replace('/(app)/(tabs)');
          }
        } else {
          setState({
            ...initialState,
            isLoading: false,
          });
          router.replace('/(auth)/login');
        }
      } catch (error) {
        setState({
          ...initialState,
          isLoading: false,
          error: 'Failed to load authentication state',
        });
        router.replace('/(auth)/login');
      }
    };

    loadAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setState({
        ...state,
        isLoading: true,
        error: null,
      });

      // Mock authentication
      const user = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
      );

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const { password: _, ...userWithoutPassword } = user;
      
      await SafeAsyncStorage.setItem('user', JSON.stringify(userWithoutPassword));
      
      setState({
        isAuthenticated: true,
        user: userWithoutPassword,
        isLoading: false,
        error: null,
      });

      // Check if vehicle info exists
      const vehicleJson = await SafeAsyncStorage.getItem('vehicleInfo');
      if (vehicleJson) {
        setVehicleInfoState(JSON.parse(vehicleJson));
        router.replace('/(app)/(tabs)');
      } else {
        router.replace('/(app)/vehicle-setup');
      }
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  };

  const logout = async () => {
    try {
      await SafeAsyncStorage.removeItem('user');
      await SafeAsyncStorage.removeItem('vehicleInfo');
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
      setVehicleInfoState(null);
      router.replace('/(auth)/login');
    } catch (error) {
      setState({
        ...state,
        error: 'Logout failed',
      });
    }
  };

  const setVehicleInfo = async (info: VehicleInfo) => {
    try {
      await SafeAsyncStorage.setItem('vehicleInfo', JSON.stringify(info));
      setVehicleInfoState(info);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      console.error('Failed to save vehicle info:', error);
    }
  };

  return {
    ...state,
    login,
    logout,
    setVehicleInfo,
    vehicleInfo,
  };
});