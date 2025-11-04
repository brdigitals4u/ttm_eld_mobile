import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { tokenStorage } from '@/utils/storage';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Computed property for compatibility
  role: string;
  organizationId: string;
  organizationName?: string; // For compatibility
  licenseNumber?: string; // For compatibility
  phoneNumber?: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  onboardingStep: string | number;
  // Custom attributes from driver profile
  companyDriverId?: string;
  licenseState?: string;
  licenseExpiry?: string;
  currentStatus?: string;
  employmentStatus?: string;
  homeTerminalName?: string;
  homeTerminalAddress?: string;
  eldDayStartHour?: number;
  eldPcEnabled?: boolean;
  eldYmEnabled?: boolean;
  timezone?: string;
  locale?: string;
  violationsCount?: number;
  isActive?: boolean;
  // HOS-related custom attributes
  drivingTimeRemaining?: number;
  onDutyTimeRemaining?: number;
  cycleTimeRemaining?: number;
  // Vehicle-related custom attributes
  hasVehicleAssigned?: boolean;
  vehicleUnit?: string;
  vehicleMake?: string;
  vehicleModel?: string;
}

export interface CognitoTokens {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface DriverProfile {
  driver_id: string;
  name: string;
  username: string;
  phone?: string;
  email: string;
  driver_license?: string;
  license_number: string;
  license_state: string;
  license_expiry?: string;
  company_driver_id: string;
  hire_date?: string;
  employment_status: string;
  home_terminal_name?: string;
  home_terminal_address?: string;
  current_status: string;
  current_location?: any;
  current_shift?: any;
  current_cycle?: any;
  eld_device_id?: string;
  eld_exempt: boolean;
  eld_exempt_reason?: string;
  eld_day_start_hour: number;
  eld_pc_enabled: boolean;
  eld_ym_enabled: boolean;
  eld_adverse_weather_exemption_enabled: boolean;
  eld_big_day_exemption_enabled: boolean;
  waiting_time_duty_status_enabled: boolean;
  violations_count: number;
  is_active: boolean;
  is_deactivated: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  organization_name: string;
  timezone: string;
  locale: string;
}

export interface HOSStatus {
  driver_id: string;
  driver_name: string;
  current_status: string;
  active_clocks: any[];
  active_violations: any[];
  time_remaining?: {
    driving_time_remaining: number;
    on_duty_time_remaining: number;
    cycle_time_remaining: number;
  };
  driving_time_remaining?: number;
  on_duty_time_remaining?: number;
  cycle_time_remaining?: number;
}

export interface VehicleInfo {
  id: string;
  vehicle_unit: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  status: string;
  is_active: boolean;
  current_location?: any;
  current_odometer?: any;
  assigned_at: string;
}

export interface VehicleAssignment {
  driver_id: string;
  driver_name: string;
  has_vehicle_assigned: boolean;
  vehicle_info: VehicleInfo | null;
  assignment_status: string;
}

export interface OrganizationSettings {
  organization_id: string;
  organization_name: string;
  timezone: string;
  locale: string;
  hos_settings?: {
    cycle_type: string;
    restart_type: string;
    timezone: string;
    max_driving_hours: number;
    max_on_duty_hours: number;
    required_break_minutes: number;
    max_cycle_hours: number;
    cycle_days: number;
    sleeper_berth_required: boolean;
    sleeper_berth_hours: number;
    eld_timezone: string;
    eld_day_start_hour: number;
    allow_personal_use: boolean;
    allow_yard_moves: boolean;
    require_break_after_hours: number;
  };
  compliance_settings?: {
    auto_certify_logs: boolean;
    require_driver_acknowledgment: boolean;
    violation_notification_enabled: boolean;
    violation_email_recipients: string[];
    violation_escalation_enabled: boolean;
    violation_escalation_hours: number;
    compliance_reporting_enabled: boolean;
    compliance_report_frequency: string;
    audit_trail_retention_days: number;
    data_retention_days: number;
    require_eld_device_certification: boolean;
    allow_manual_log_edits: boolean;
    require_supervisor_approval_for_edits: boolean;
    violation_penalty_enabled: boolean;
    violation_penalty_threshold: number;
  };
}

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  cognitoTokens: CognitoTokens | null; // ✅ NEW: For AWS sync
  
  // User data
  user: User | null;
  driverProfile: DriverProfile | null;
  hosStatus: HOSStatus | null;
  vehicleAssignment: VehicleAssignment | null;
  vehicleInfo: VehicleInfo | null; // For compatibility
  organizationSettings: OrganizationSettings | null;
  
  // Actions
  login: (loginData: any) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Data setters
  setDriverProfile: (profile: DriverProfile | null) => void;
  setHosStatus: (status: HOSStatus | null) => void;
  setVehicleAssignment: (assignment: VehicleAssignment | null) => void;
  setVehicleInfo: (info: VehicleInfo | null) => void; // For compatibility
  setOrganizationSettings: (settings: OrganizationSettings | null) => void;
  
  // HOS status updater
  updateHosStatus: (updates: Partial<HOSStatus>) => void;
  
  // Utility
  refreshDriverData: () => void;
}

// Create the auth store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
      cognitoTokens: null,
      user: null,
      driverProfile: null,
      hosStatus: null,
      vehicleAssignment: null,
      vehicleInfo: null,
      organizationSettings: null,

      // Actions
      login: async (loginData: any) => {
        try {
          console.log('🔐 AuthStore: Starting login process...');
          console.log('📦 AuthStore: Received login data:', loginData);
          
          set({ isLoading: true, error: null });

          let userData: User;
          let driverProfile: DriverProfile | null = null;
          let hosStatus: HOSStatus | null = null;
          let vehicleAssignment: VehicleAssignment | null = null;
          let vehicleInfo: VehicleInfo | null = null;
          let organizationSettings: OrganizationSettings | null = null;
          let token: string | null = null;
          let cognitoTokens: CognitoTokens | null = null;

          // Check if this is the complete API response
          if (loginData.user && loginData.token) {
            console.log('📡 AuthStore: Processing complete API response');
            console.log('🔑 AuthStore: Token received:', loginData.token ? 'Token exists' : 'No token');
            token = loginData.token;
            
            // Extract Cognito tokens if present (for AWS sync)
            if (loginData.cognito_tokens) {
              console.log('🔑 AuthStore: Cognito tokens received (for AWS sync)');
              cognitoTokens = loginData.cognito_tokens;
            }
            
            // Extract user data with custom attributes from driver profile
            userData = {
              id: loginData.user.id,
              email: loginData.user.email,
              firstName: loginData.user.firstName,
              lastName: loginData.user.lastName,
              name: loginData.user.driver_profile?.name || `${loginData.user.firstName} ${loginData.user.lastName}`,
              role: loginData.user.role || 'driver',
              organizationId: loginData.user.organizationId,
              organizationName: loginData.user.organization_settings?.organization_name,
              licenseNumber: loginData.user.driver_profile?.license_number,
              phoneNumber: loginData.user.driver_profile?.phone,
              isEmailVerified: true,
              onboardingCompleted: loginData.user.onboardingCompleted || false,
              onboardingStep: loginData.user.onboardingStep || 0,
              // Custom attributes from driver profile
              companyDriverId: loginData.user.driver_profile?.company_driver_id,
              licenseState: loginData.user.driver_profile?.license_state,
              licenseExpiry: loginData.user.driver_profile?.license_expiry,
              currentStatus: loginData.user.driver_profile?.current_status,
              employmentStatus: loginData.user.driver_profile?.employment_status,
              homeTerminalName: loginData.user.driver_profile?.home_terminal_name,
              homeTerminalAddress: loginData.user.driver_profile?.home_terminal_address,
              eldDayStartHour: loginData.user.driver_profile?.eld_day_start_hour,
              eldPcEnabled: loginData.user.driver_profile?.eld_pc_enabled,
              eldYmEnabled: loginData.user.driver_profile?.eld_ym_enabled,
              timezone: loginData.user.driver_profile?.timezone || loginData.user.organization_settings?.timezone,
              locale: loginData.user.driver_profile?.locale || loginData.user.organization_settings?.locale,
              violationsCount: loginData.user.driver_profile?.violations_count || 0,
              isActive: loginData.user.driver_profile?.is_active ?? true,
              // HOS-related custom attributes
              drivingTimeRemaining: loginData.user.hos_status?.time_remaining?.driving_time_remaining || loginData.user.hos_status?.driving_time_remaining,
              onDutyTimeRemaining: loginData.user.hos_status?.time_remaining?.on_duty_time_remaining || loginData.user.hos_status?.on_duty_time_remaining,
              cycleTimeRemaining: loginData.user.hos_status?.time_remaining?.cycle_time_remaining || loginData.user.hos_status?.cycle_time_remaining,
              // Vehicle-related custom attributes
              hasVehicleAssigned: loginData.user.vehicle_assignment?.has_vehicle_assigned ?? false,
              vehicleUnit: loginData.user.vehicle_assignment?.vehicle_info?.vehicle_unit,
              vehicleMake: loginData.user.vehicle_assignment?.vehicle_info?.make,
              vehicleModel: loginData.user.vehicle_assignment?.vehicle_info?.model,
            };

            // Extract profile data
            driverProfile = loginData.user.driver_profile || null;
            hosStatus = loginData.user.hos_status || null;
            vehicleAssignment = loginData.user.vehicle_assignment || null;
            vehicleInfo = vehicleAssignment?.vehicle_info || null;
            organizationSettings = loginData.user.organization_settings || null;

            console.log('✅ AuthStore: Extracted profile data from API response');
            console.log('👤 Driver Profile:', driverProfile ? 'Available' : 'Not available');
            if (driverProfile) {
              console.log('📋 Driver Profile Details:', {
                driver_id: driverProfile.driver_id,
                name: driverProfile.name,
                email: driverProfile.email,
                company_driver_id: driverProfile.company_driver_id,
                hasDriverId: !!driverProfile.driver_id,
              });
            }
            console.log('⏰ HOS Status:', hosStatus ? 'Available' : 'Not available');
            if (hosStatus) {
              console.log('⏰ HOS Status Details:', {
                driver_id: hosStatus.driver_id,
                driver_name: hosStatus.driver_name,
                current_status: hosStatus.current_status,
              });
            }
            console.log('🚛 Vehicle Assignment:', vehicleAssignment ? 'Available' : 'Not available');
            if (vehicleAssignment) {
              console.log('🚛 Vehicle Assignment Details:', {
                driver_id: vehicleAssignment.driver_id,
                driver_name: vehicleAssignment.driver_name,
                has_vehicle_assigned: vehicleAssignment.has_vehicle_assigned,
              });
            }
            console.log('🏢 Organization Settings:', organizationSettings ? 'Available' : 'Not available');
          } else {
            console.log('📄 AuthStore: Processing basic user profile');
            console.log('🔑 AuthStore: No token in loginData, checking for token field directly');
            token = loginData.token || null;
            // Handle basic user profile (fallback)
            userData = {
              id: loginData.id || loginData._id,
              email: loginData.email,
              firstName: loginData.firstName,
              lastName: loginData.lastName,
              role: loginData.role || 'driver',
              organizationId: loginData.organizationId || '',
              phoneNumber: loginData.phoneNumber,
              isEmailVerified: loginData.isEmailVerified || true,
              onboardingCompleted: loginData.onboardingCompleted || false,
              onboardingStep: loginData.onboardingStep || 0,
            };
          }

          // Store token using proper tokenStorage
          if (token) {
            await tokenStorage.setAccessToken(token);
            console.log('💾 AuthStore: Token stored in SecureStore');
            console.log('🔄 AuthStore: Token will also be persisted in Zustand state');
          }

          // Update state
          set({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            token,
            cognitoTokens,
            user: userData,
            driverProfile,
            hosStatus,
            vehicleAssignment,
            vehicleInfo,
            organizationSettings,
          });

          console.log('✅ AuthStore: Login completed successfully');
          console.log('👤 User:', userData.firstName, userData.lastName);
          console.log('📋 Final Driver Profile in Store:', {
            hasDriverProfile: !!driverProfile,
            driver_id: driverProfile?.driver_id || 'MISSING',
            name: driverProfile?.name || 'N/A',
            email: driverProfile?.email || 'N/A',
          });
          
          // Verify driver_id is saved
          const stateAfterSave = useAuthStore.getState();
          console.log('🔍 Verification: Driver ID in saved state:', {
            driverProfileExists: !!stateAfterSave.driverProfile,
            driverId: stateAfterSave.driverProfile?.driver_id || 'NOT FOUND',
            matches: stateAfterSave.driverProfile?.driver_id === driverProfile?.driver_id,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          console.error('❌ AuthStore: Login failed:', errorMessage);
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          console.log('🔓 AuthStore: Logging out...');
          
          // Disconnect ELD device before logout
          try {
            console.log('📡 AuthStore: Disconnecting ELD device...');
            const JMBluetoothService = require('@/services/JMBluetoothService').default;
            await JMBluetoothService.disconnect();
            console.log('✅ AuthStore: ELD device disconnected successfully');
          } catch (eldError) {
            console.warn('⚠️ AuthStore: Failed to disconnect ELD device:', eldError);
            // Continue with logout even if ELD disconnect fails
          }
          
          // Clear stored tokens
          await tokenStorage.removeTokens();
          
          // Reset state
          set({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            token: null,
            cognitoTokens: null,
            user: null,
            driverProfile: null,
            hosStatus: null,
            vehicleAssignment: null,
            vehicleInfo: null,
            organizationSettings: null,
          });

          console.log('✅ AuthStore: Logout completed');
        } catch (error) {
          console.error('❌ AuthStore: Logout failed:', error);
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Data setters
      setDriverProfile: (profile: DriverProfile | null) => {
        console.log('📝 AuthStore: Setting driver profile:', profile ? 'Available' : 'Null');
        set({ driverProfile: profile });
      },

      setHosStatus: (status: HOSStatus | null) => {
        console.log('📝 AuthStore: Setting HOS status:', status ? 'Available' : 'Null');
        set({ hosStatus: status });
      },

      updateHosStatus: (updates: Partial<HOSStatus>) => {
        console.log('🔄 AuthStore: Updating HOS status with:', updates);
        set((state) => ({
          hosStatus: state.hosStatus ? { ...state.hosStatus, ...updates } : updates as HOSStatus,
        }));
      },

      setVehicleAssignment: (assignment: VehicleAssignment | null) => {
        console.log('📝 AuthStore: Setting vehicle assignment:', assignment ? 'Available' : 'Null');
        set({ vehicleAssignment: assignment });
      },

      setVehicleInfo: (info: VehicleInfo | null) => {
        console.log('📝 AuthStore: Setting vehicle info:', info ? 'Available' : 'Null');
        set({ vehicleInfo: info });
      },

      setOrganizationSettings: (settings: OrganizationSettings | null) => {
        console.log('📝 AuthStore: Setting organization settings:', settings ? 'Available' : 'Null');
        set({ organizationSettings: settings });
      },

      // Utility function for compatibility
      refreshDriverData: () => {
        console.log('🔄 AuthStore: refreshDriverData called (no-op with Zustand)');
        // With Zustand, data is automatically persisted and restored
        // This is a no-op for compatibility with existing code
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        cognitoTokens: state.cognitoTokens,
        user: state.user,
        driverProfile: state.driverProfile,
        hosStatus: state.hosStatus,
        vehicleAssignment: state.vehicleAssignment,
        vehicleInfo: state.vehicleInfo,
        organizationSettings: state.organizationSettings,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 AuthStore: Rehydrating from AsyncStorage...');
        if (state) {
          console.log('👤 Restored User:', state.user ? `${state.user.firstName} ${state.user.lastName}` : 'None');
          console.log('📋 Restored Driver Profile:', state.driverProfile ? 'Available' : 'None');
          console.log('⏰ Restored HOS Status:', state.hosStatus ? 'Available' : 'None');
          console.log('🚛 Restored Vehicle Assignment:', state.vehicleAssignment ? 'Available' : 'None');
          console.log('🚗 Restored Vehicle Info:', state.vehicleInfo ? 'Available' : 'None');
          console.log('🏢 Restored Organization Settings:', state.organizationSettings ? 'Available' : 'None');
          
          // Sync token from Zustand state to SecureStore for API client
          if (state.token) {
            console.log('🔄 AuthStore: Syncing token from Zustand to SecureStore...');
            console.log('🔑 AuthStore: Token value:', state.token ? 'Token exists' : 'No token');
            tokenStorage.setAccessToken(state.token).then(() => {
              console.log('✅ AuthStore: Token synced to SecureStore successfully');
            }).catch((error) => {
              console.error('❌ AuthStore: Failed to sync token to SecureStore:', error);
            });
          } else {
            console.log('⚠️ AuthStore: No token found in rehydrated state');
          }
        }
      },
    }
  )
);

// Hook for easier usage with detailed logging
export const useAuth = () => {
  const store = useAuthStore();
  
  // Only log on actual usage, not on every render
  const isFirstRender = React.useRef(true);
  
  React.useEffect(() => {
    if (isFirstRender.current) {
      console.log('🔍 useAuth Hook Called - Current State:');
      console.log('  🔐 Authenticated:', store.isAuthenticated);
      console.log('  ⏳ Loading:', store.isLoading);
      console.log('  ❌ Error:', store.error);
      console.log('  👤 User:', store.user ? `${store.user.firstName} ${store.user.lastName}` : 'None');
      console.log('  📋 Driver Profile:', store.driverProfile ? 'Available' : 'None');
      console.log('  ⏰ HOS Status:', store.hosStatus ? 'Available' : 'None');
      console.log('  🚛 Vehicle Assignment:', store.vehicleAssignment ? 'Available' : 'None');
      console.log('  🚗 Vehicle Info:', store.vehicleInfo ? 'Available' : 'None');
      console.log('  🏢 Organization Settings:', store.organizationSettings ? 'Available' : 'None');
      isFirstRender.current = false;
    }
  }, [store.isAuthenticated, store.user, store.driverProfile]);
  
  return store;
};

// Import React for the hook
import React from 'react';
