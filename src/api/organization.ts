import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from './client'
import { API_CONFIG, API_ENDPOINTS, QUERY_KEYS } from './constants'
import { tokenStorage, userStorage } from '@/utils/storage'
import { RealmService } from '@/database/realm'
import { BSON } from 'realm'

// Organization Driver types
export interface OrganizationDriverLoginCredentials {
  email: string
  password: string
}

export interface DriverProfile {
  driver_id: string
  name: string
  username: string
  phone: string | null
  email: string
  driver_license: string | null
  license_number: string
  license_state: string
  license_expiry: string | null
  company_driver_id: string
  hire_date: string | null
  employment_status: string
  home_terminal_name: string | null
  home_terminal_address: string | null
  current_status: string
  current_location: any | null
  current_shift: any | null
  current_cycle: any | null
  eld_device_id: string | null
  eld_exempt: boolean
  eld_exempt_reason: string | null
  eld_day_start_hour: number
  eld_pc_enabled: boolean
  eld_ym_enabled: boolean
  eld_adverse_weather_exemption_enabled: boolean
  eld_big_day_exemption_enabled: boolean
  waiting_time_duty_status_enabled: boolean
  violations_count: number
  is_active: boolean
  is_deactivated: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  organization_name: string
  timezone: string
  locale: string
}

export interface HOSStatus {
  driver_id: string
  driver_name: string
  current_status: string
  active_clocks: any[]
  active_violations: any[]
  time_remaining: {
    driving_time_remaining: number
    on_duty_time_remaining: number
    cycle_time_remaining: number
  }
}

export interface VehicleInfo {
  id: string
  vehicle_unit: string
  make: string
  model: string
  year: number
  license_plate: string
  vin: string
  status: string
  is_active: boolean
  current_location: any | null
  current_odometer: any | null
  assigned_at: string
}

export interface VehicleAssignment {
  driver_id: string
  driver_name: string
  has_vehicle_assigned: boolean
  vehicle_info: VehicleInfo
  assignment_status: string
}

export interface OrganizationSettings {
  organization_id: string
  organization_name: string
  timezone: string
  locale: string
  hos_settings: any | null
  compliance_settings: any | null
}

export interface OrganizationDriverProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
  onboardingCompleted: boolean
  onboardingStep: number
  driver_profile: DriverProfile
  hos_status: HOSStatus
  vehicle_assignment: VehicleAssignment
  organization_settings: OrganizationSettings
}

export interface OrganizationDriverAuthResponse {
  token: string
  user: OrganizationDriverProfile
}

// Organization Driver API functions
export const organizationApi = {
  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing API connection to:', API_CONFIG.BASE_URL)
      const response = await apiClient.get('/test')
      return response.success
    } catch (error) {
      console.error('API connection test failed:', error)
      return false
    }
  },

  // Login driver
  async loginDriver(credentials: OrganizationDriverLoginCredentials): Promise<OrganizationDriverAuthResponse> {
    console.log('Attempting login to:', API_CONFIG.BASE_URL + API_ENDPOINTS.ORGANIZATION.DRIVER_LOGIN)
    const response = await apiClient.post<OrganizationDriverAuthResponse>(
      API_ENDPOINTS.ORGANIZATION.DRIVER_LOGIN, 
      credentials
    )
    
    if (response.success && response.data) {
      // Store token securely
      await tokenStorage.setAccessToken(response.data.token)
      
      // Store driver ID
      await userStorage.setUserId(response.data.user.id)
      
      // Store complete driver data in Realm
      await RealmService.createDriverData(response.data)
      
      // Store basic user data in Realm (for compatibility)
      await RealmService.createUser({
        _id: new BSON.ObjectId(),
        email: response.data.user.email,
        firstName: response.data.user.firstName,
        lastName: response.data.user.lastName,
        avatar: undefined,
        phoneNumber: response.data.user.driver_profile.phone,
        dateOfBirth: undefined,
        isEmailVerified: true,
        createdAt: new Date(response.data.user.driver_profile.created_at),
        updatedAt: new Date(response.data.user.driver_profile.updated_at),
      })
      
      // Store auth session in Realm
      await RealmService.createAuthSession({
        accessToken: response.data.token,
        refreshToken: '', // Organization API doesn't provide refresh token
        userId: response.data.user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        createdAt: new Date(),
      })
    }
    
    return response.data!
  },

  // Get driver profile
  async getDriverProfile(): Promise<OrganizationDriverProfile> {
    const response = await apiClient.get<OrganizationDriverProfile>(
      API_ENDPOINTS.ORGANIZATION.DRIVER_PROFILE
    )
    
    if (response.success && response.data) {
      // Update driver data in Realm
      await RealmService.updateUser(response.data.id, {
        _id: response.data.id as any,
        email: response.data.email,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        avatar: undefined,
        phoneNumber: response.data.driver_profile.phone,
        dateOfBirth: undefined,
        isEmailVerified: true,
        createdAt: new Date(response.data.driver_profile.created_at),
        updatedAt: new Date(response.data.driver_profile.updated_at),
      })
    }
    
    return response.data!
  },

  // Logout driver
  async logoutDriver(): Promise<void> {
    // Note: Logout API endpoint may not exist, so we'll just clear local data
    console.log('Logging out driver - clearing local data only')
    
    try {
      // Clear stored tokens and user data
      await tokenStorage.removeTokens()
      await userStorage.removeUserId()
      
      // Clear all Realm data
      await RealmService.deleteAuthSession()
      await RealmService.deleteAllUsers()
      await RealmService.clearDriverData()
      
      console.log('Driver logout completed - all local data cleared')
    } catch (error) {
      console.error('Error clearing local data during logout:', error)
      // Continue anyway - we want to logout even if cleanup fails
    }
  },
}

// React Query hooks for organization driver
export const useDriverLogin = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: organizationApi.loginDriver,
    onSuccess: (data) => {
      // Invalidate and refetch driver profile
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH })
    },
    onError: (error: ApiError) => {
      console.error('Driver login error:', error)
    },
  })
}

export const useDriverProfile = () => {
  return useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: organizationApi.getDriverProfile,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useDriverLogout = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: organizationApi.logoutDriver,
    onSuccess: () => {
      console.log('Logout mutation successful')
      // Clear all queries
      queryClient.clear()
    },
    onError: (error: ApiError) => {
      console.error('Driver logout error:', error)
      // Still clear queries even if API call fails
      queryClient.clear()
    },
  })
}
