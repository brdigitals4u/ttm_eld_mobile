import React from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { RealmService } from '@/database/realm';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { AuthState, User, VehicleInfo } from '@/types/auth';
import type { Inspection, InspectionItem } from '@/types/inspection';
import type { StatusUpdate } from '@/types/status';
import { StatusProvider as FullStatusProvider, useStatus as useFullStatus } from './status-context';

// Enhanced AuthContextType with Realm-based data
interface AuthContextType extends AuthState {
  login: (profile: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  vehicleInfo: VehicleInfo | null;
  driverProfile: any;
  hosStatus: any;
  vehicleAssignment: any;
  organizationSettings: any;
  refreshDriverData: () => void;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
};



// Auth Context using Realm
export const [AuthProvider, useAuth] = createContextHook(() => {
  const [state, setState] = useState<AuthState>(initialState);
  const [vehicleInfo, setVehicleInfoState] = useState<VehicleInfo | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [hosStatus, setHosStatus] = useState<any>(null);
  const [vehicleAssignment, setVehicleAssignment] = useState<any>(null);
  const [organizationSettings, setOrganizationSettings] = useState<any>(null);

  const refreshDriverData = () => {
    try {
      const driverData = RealmService.getDriverData();
      
      if (driverData) {
        // Update driver profile
        const profile = RealmService.getDriverProfile();
        setDriverProfile(profile);
        
        // Update HOS status
        const hos = RealmService.getHOSStatus();
        setHosStatus(hos);
        
        // Update vehicle assignment
        const vehicle = RealmService.getVehicleAssignment();
        setVehicleAssignment(vehicle);
        
        // Update organization settings
        const orgSettings = RealmService.getOrganizationSettings();
        setOrganizationSettings(orgSettings);
        
        // Create user object from driver data
        const user: any = {
          id: (driverData as any).user_id || '1',
          email: (driverData as any).email || '',
          firstName: (driverData as any).firstName || '',
          lastName: (driverData as any).lastName || '',
          role: (driverData as any).role || 'driver',
          organizationId: (driverData as any).organizationId || '',
          onboardingCompleted: (driverData as any).onboardingCompleted || true,
          onboardingStep: (driverData as any).onboardingStep || 'completed',
          isEmailVerified: true,
          phoneNumber: (profile as any)?.phone || '',
        };
        
        setState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing driver data:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        // Check if we have existing user data
        const hasUserData = await refreshDriverData();
        
        if (hasUserData) {
          // Navigate to dashboard if we have user data
          router.replace('/(tabs)/dashboard');
        } else {
          // No user data found, go to login
          setState({
            ...initialState,
            isLoading: false,
          });
          router.replace('/login');
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
        setState({
          ...initialState,
          isLoading: false,
          error: 'Failed to load authentication state',
        });
        router.replace('/login');
      }
    };

    loadAuthState();
  }, []);

  const login = async (profile: any) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Create user object directly from profile data
      const user: any = profile

      // Set driver profile data from profile
      setDriverProfile(profile.driver_profile || null);
      setHosStatus(profile.hos_status || null);
      setVehicleAssignment(profile.vehicle_assignment || null);
      setOrganizationSettings(profile.organization_settings || null);

      // Update auth state
      setState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
      
      // Navigate to dashboard
      router.replace('/(tabs)/dashboard');
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Reset state
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
      
      setVehicleInfoState(null);
      setDriverProfile(null);
      setHosStatus(null);
      setVehicleAssignment(null);
      setOrganizationSettings(null);
      
      // Navigate to login
      router.replace('/login');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Logout failed',
      }));
      throw error;
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      // Update driver data in Realm
      const driverData = RealmService.getDriverData();
      if (driverData) {
        // Update the realm data
        // This would typically update the driver profile
        const updatedUser = { ...state.user, ...userData };
        setState(prev => ({
          ...prev,
          user: updatedUser as User,
        }));
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  return {
    ...state,
    login,
    logout,
    updateUser,
    vehicleInfo,
    driverProfile,
    hosStatus,
    vehicleAssignment,
    organizationSettings,
    refreshDriverData,
  };
});

// Assets Context
export const [AssetsProvider, useAssets] = createContextHook(() => {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addAsset = async (assetData: any) => {
    setIsLoading(true);
    try {
      // Mock asset creation
      const newAsset = {
        id: Date.now().toString(),
        ...assetData,
        documents: [],
      };
      setAssets(prev => [...prev, newAsset]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAsset = async (id: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
  };

  return {
    assets,
    addAsset,
    deleteAsset,
    isLoading,
  };
});

// Carrier Context
export const [CarrierProvider, useCarrier] = createContextHook(() => {
  const [carrierInfo, setCarrierInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateCarrierInfo = async (info: any) => {
    setIsLoading(true);
    try {
      setCarrierInfo(info);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    carrierInfo,
    updateCarrierInfo,
    isLoading,
  };
});

// CoDriver Context
export const [CoDriverProvider, useCoDriver] = createContextHook(() => {
  const [coDrivers, setCoDrivers] = useState<any[]>([]);
  const [activeCoDriver, setActiveCoDriverState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addCoDriver = async (driverData: any) => {
    setIsLoading(true);
    try {
      const newDriver = {
        id: Date.now().toString(),
        ...driverData,
        isActive: false,
      };
      setCoDrivers(prev => [...prev, newDriver]);
    } finally {
      setIsLoading(false);
    }
  };

  const removeCoDriver = async (id: string) => {
    setCoDrivers(prev => prev.filter(driver => driver.id !== id));
    if (activeCoDriver?.id === id) {
      setActiveCoDriverState(null);
    }
  };

  const setActiveCoDriver = async (driver: any) => {
    setActiveCoDriverState(driver);
  };

  return {
    coDrivers,
    activeCoDriver,
    addCoDriver,
    removeCoDriver,
    setActiveCoDriver,
    isLoading,
  };
});

// Fuel Context
export const [FuelProvider, useFuel] = createContextHook(() => {
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addFuelReceipt = async (receiptData: any) => {
    setIsLoading(true);
    try {
      const newReceipt = {
        id: Date.now().toString(),
        ...receiptData,
        createdAt: Date.now(),
      };
      setReceipts((prev: any) => [...prev, newReceipt] as any);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFuelReceipt = async (id: string) => {
    setReceipts(prev => prev.filter((receipt: any) => receipt.id !== id));
  };

  return {
    receipts,
    addFuelReceipt,
    deleteFuelReceipt,
    isLoading,
  };
});

// Inspection Context

const MOCK_INSPECTION_ITEMS: InspectionItem[] = [
  { id: '1', category: 'Engine', item: 'Oil level', isRequired: true, status: 'pending' },
  { id: '2', category: 'Engine', item: 'Coolant level', isRequired: true, status: 'pending' },
  { id: '3', category: 'Lights', item: 'Headlights', isRequired: true, status: 'pending' },
  { id: '4', category: 'Lights', item: 'Tail lights', isRequired: true, status: 'pending' },
  { id: '5', category: 'Tires', item: 'Tire condition', isRequired: true, status: 'pending' },
  { id: '6', category: 'Brakes', item: 'Brake system', isRequired: true, status: 'pending' },
];

export const [InspectionProvider, useInspection] = createContextHook(() => {
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startInspection = async (type: 'pre-trip' | 'post-trip' | 'dot') => {
    setIsLoading(true);
    try {
      // Mock inspection data
      const inspection: Inspection = {
        id: Date.now().toString(),
        type,
        vehicleId: 'mock-vehicle',
        driverId: 'mock-driver',
        startTime: Date.now(),
        items: MOCK_INSPECTION_ITEMS.map(item => ({ ...item, status: 'pending' })),
        overallStatus: 'pending',
      };
      setCurrentInspection(inspection);
    } finally {
      setIsLoading(false);
    }
  };

  const updateInspectionItem = async (itemId: string, status: 'pass' | 'fail' | 'na', notes?: string) => {
    if (currentInspection) {
      setCurrentInspection(prev => prev ? ({
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId ? { ...item, status, notes } : item
        ),
      }) : null);
    }
  };

  const completeInspection = async (signature: string) => {
    setIsLoading(true);
    try {
      if (currentInspection) {
        setCurrentInspection(prev => prev ? ({
          ...prev,
          overallStatus: 'pending' as const,
          signature,
          endTime: Date.now(),
        }) : null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentInspection,
    startInspection,
    updateInspectionItem,
    completeInspection,
    isLoading,
  };
});

// Re-export the full StatusProvider and useStatus from status-context
export const StatusProvider = FullStatusProvider;
export const useStatus = useFullStatus;

// Main Context Provider that wraps all contexts (except auth which is now handled by Zustand)
export const AllContextsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AssetsProvider>
      <CarrierProvider>
        <CoDriverProvider>
          <FuelProvider>
            <InspectionProvider>
              <StatusProvider>
                {children}
              </StatusProvider>
            </InspectionProvider>
          </FuelProvider>
        </CoDriverProvider>
      </CarrierProvider>
    </AssetsProvider>
  );
};
