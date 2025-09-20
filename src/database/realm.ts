import Realm from 'realm'
import { BSON } from 'realm'
import { 
  User, 
  AuthSession, 
  DriverProfile, 
  HOSStatus, 
  VehicleInfo, 
  VehicleAssignment, 
  OrganizationSettings, 
  DriverData 
} from './schemas'
import type { 
  DriverProfileType, 
  HOSStatusType, 
  VehicleInfoType, 
  VehicleAssignmentType, 
  OrganizationSettingsType, 
  DriverDataType 
} from './schemas'

// Realm configuration
const realmConfig: Realm.Configuration = {
  schema: [
    User, 
    AuthSession, 
    DriverProfile, 
    HOSStatus, 
    VehicleInfo, 
    VehicleAssignment, 
    OrganizationSettings, 
    DriverData
  ],
  schemaVersion: 2,
  deleteRealmIfMigrationNeeded: true, // Only for development
}

// Create and export realm instance
export const realm = new Realm(realmConfig)

// Helper functions for database operations
export const RealmService = {
  // User operations
  createUser: (userData: Partial<User>) => {
    return realm.write(() => {
      return realm.create('User', userData)
    })
  },

  getUser: (id: string) => {
    return realm.objectForPrimaryKey('User', id)
  },

  getAllUsers: () => {
    return realm.objects('User')
  },

  updateUser: (id: string, userData: Partial<User>) => {
    return realm.write(() => {
      const user = realm.objectForPrimaryKey('User', id)
      if (user) {
        Object.assign(user, userData)
      }
      return user
    })
  },

  deleteUser: (id: string) => {
    return realm.write(() => {
      const user = realm.objectForPrimaryKey('User', id)
      if (user) {
        realm.delete(user)
      }
    })
  },

  // Auth session operations
  createAuthSession: (sessionData: Partial<AuthSession>) => {
    return realm.write(() => {
      return realm.create('AuthSession', {
        _id: new BSON.ObjectId(),
        ...sessionData
      })
    })
  },

  getAuthSession: () => {
    return realm.objects('AuthSession').slice(0, 1)[0]
  },

  updateAuthSession: (sessionData: Partial<AuthSession>) => {
    return realm.write(() => {
      const session = realm.objects('AuthSession').slice(0, 1)[0]
      if (session) {
        Object.assign(session, sessionData)
      } else {
        realm.create('AuthSession', sessionData)
      }
    })
  },

  deleteAuthSession: () => {
    return realm.write(() => {
      const sessions = realm.objects('AuthSession')
      realm.delete(sessions)
    })
  },

  // Clear all data
  clearAllData: () => {
    return realm.write(() => {
      realm.deleteAll()
    })
  },

  // Delete all users (for logout)
  deleteAllUsers: () => {
    return realm.write(() => {
      const users = realm.objects('User')
      realm.delete(users)
    })
  },

  // Driver data operations
  createDriverProfile: (profileData: Omit<DriverProfileType, '_id'>) => {
    return realm.write(() => {
      return realm.create('DriverProfile', {
        _id: new BSON.ObjectId(),
        ...profileData
      })
    })
  },

  createHOSStatus: (hosData: Omit<HOSStatusType, '_id'>) => {
    return realm.write(() => {
      return realm.create('HOSStatus', {
        _id: new BSON.ObjectId(),
        ...hosData
      })
    })
  },

  createVehicleInfo: (vehicleData: Omit<VehicleInfoType, '_id'>) => {
    return realm.write(() => {
      return realm.create('VehicleInfo', {
        _id: new BSON.ObjectId(),
        ...vehicleData
      })
    })
  },

  createVehicleAssignment: (assignmentData: Omit<VehicleAssignmentType, '_id' | 'vehicle_info'> & { vehicle_info: VehicleInfoType }) => {
    return realm.write(() => {
      // First create the vehicle info
      const vehicleInfo = realm.create('VehicleInfo', {
        ...assignmentData.vehicle_info,
        _id: new BSON.ObjectId()
      })
      
      // Then create the assignment with the vehicle info
      return realm.create('VehicleAssignment', {
        _id: new BSON.ObjectId(),
        driver_id: assignmentData.driver_id,
        driver_name: assignmentData.driver_name,
        has_vehicle_assigned: assignmentData.has_vehicle_assigned,
        vehicle_info: vehicleInfo,
        assignment_status: assignmentData.assignment_status
      })
    })
  },

  createOrganizationSettings: (settingsData: Omit<OrganizationSettingsType, '_id'>) => {
    return realm.write(() => {
      return realm.create('OrganizationSettings', {
        _id: new BSON.ObjectId(),
        ...settingsData
      })
    })
  },

  // Complete driver data storage - stores the entire API response
  createDriverData: (apiResponse: any) => {
    console.log('Creating driver data with API response:', apiResponse)
    return realm.write(() => {
      // Create driver profile
      console.log('Creating driver profile...')
      const driverProfile = realm.create('DriverProfile', {
        _id: new BSON.ObjectId(),
        driver_id: apiResponse.user.driver_profile.driver_id,
        name: apiResponse.user.driver_profile.name,
        username: apiResponse.user.driver_profile.username,
        phone: apiResponse.user.driver_profile.phone,
        email: apiResponse.user.driver_profile.email,
        driver_license: apiResponse.user.driver_profile.driver_license,
        license_number: apiResponse.user.driver_profile.license_number,
        license_state: apiResponse.user.driver_profile.license_state,
        license_expiry: apiResponse.user.driver_profile.license_expiry,
        company_driver_id: apiResponse.user.driver_profile.company_driver_id,
        hire_date: apiResponse.user.driver_profile.hire_date,
        employment_status: apiResponse.user.driver_profile.employment_status,
        home_terminal_name: apiResponse.user.driver_profile.home_terminal_name,
        home_terminal_address: apiResponse.user.driver_profile.home_terminal_address,
        current_status: apiResponse.user.driver_profile.current_status,
        current_location: apiResponse.user.driver_profile.current_location,
        current_shift: apiResponse.user.driver_profile.current_shift,
        current_cycle: apiResponse.user.driver_profile.current_cycle,
        eld_device_id: apiResponse.user.driver_profile.eld_device_id,
        eld_exempt: apiResponse.user.driver_profile.eld_exempt,
        eld_exempt_reason: apiResponse.user.driver_profile.eld_exempt_reason,
        eld_day_start_hour: apiResponse.user.driver_profile.eld_day_start_hour,
        eld_pc_enabled: apiResponse.user.driver_profile.eld_pc_enabled,
        eld_ym_enabled: apiResponse.user.driver_profile.eld_ym_enabled,
        eld_adverse_weather_exemption_enabled: apiResponse.user.driver_profile.eld_adverse_weather_exemption_enabled,
        eld_big_day_exemption_enabled: apiResponse.user.driver_profile.eld_big_day_exemption_enabled,
        waiting_time_duty_status_enabled: apiResponse.user.driver_profile.waiting_time_duty_status_enabled,
        violations_count: apiResponse.user.driver_profile.violations_count,
        is_active: apiResponse.user.driver_profile.is_active,
        is_deactivated: apiResponse.user.driver_profile.is_deactivated,
        is_deleted: apiResponse.user.driver_profile.is_deleted,
        created_at: apiResponse.user.driver_profile.created_at,
        updated_at: apiResponse.user.driver_profile.updated_at,
        organization_name: apiResponse.user.driver_profile.organization_name,
        timezone: apiResponse.user.driver_profile.timezone,
        locale: apiResponse.user.driver_profile.locale
      })

      // Create HOS status
      console.log('Creating HOS status...')
      const hosStatus = realm.create('HOSStatus', {
        _id: new BSON.ObjectId(),
        driver_id: apiResponse.user.hos_status.driver_id,
        driver_name: apiResponse.user.hos_status.driver_name,
        current_status: apiResponse.user.hos_status.current_status,
        active_clocks: apiResponse.user.hos_status.active_clocks,
        active_violations: apiResponse.user.hos_status.active_violations,
        driving_time_remaining: apiResponse.user.hos_status.time_remaining.driving_time_remaining,
        on_duty_time_remaining: apiResponse.user.hos_status.time_remaining.on_duty_time_remaining,
        cycle_time_remaining: apiResponse.user.hos_status.time_remaining.cycle_time_remaining
      })

      // Create vehicle info
      console.log('Creating vehicle info...')
      const vehicleInfo = realm.create('VehicleInfo', {
        _id: new BSON.ObjectId(),
        id: apiResponse.user.vehicle_assignment.vehicle_info.id,
        vehicle_unit: apiResponse.user.vehicle_assignment.vehicle_info.vehicle_unit,
        make: apiResponse.user.vehicle_assignment.vehicle_info.make,
        model: apiResponse.user.vehicle_assignment.vehicle_info.model,
        year: apiResponse.user.vehicle_assignment.vehicle_info.year,
        license_plate: apiResponse.user.vehicle_assignment.vehicle_info.license_plate,
        vin: apiResponse.user.vehicle_assignment.vehicle_info.vin,
        status: apiResponse.user.vehicle_assignment.vehicle_info.status,
        is_active: apiResponse.user.vehicle_assignment.vehicle_info.is_active,
        current_location: apiResponse.user.vehicle_assignment.vehicle_info.current_location,
        current_odometer: apiResponse.user.vehicle_assignment.vehicle_info.current_odometer,
        assigned_at: apiResponse.user.vehicle_assignment.vehicle_info.assigned_at
      })

      // Create vehicle assignment
      console.log('Creating vehicle assignment...')
      const vehicleAssignment = realm.create('VehicleAssignment', {
        _id: new BSON.ObjectId(),
        driver_id: apiResponse.user.vehicle_assignment.driver_id,
        driver_name: apiResponse.user.vehicle_assignment.driver_name,
        has_vehicle_assigned: apiResponse.user.vehicle_assignment.has_vehicle_assigned,
        assignment_status: apiResponse.user.vehicle_assignment.assignment_status
      })
      
      // Set the relationship after creation
      ;(vehicleAssignment as any).vehicle_info = vehicleInfo

      // Create organization settings
      console.log('Creating organization settings...')
      const organizationSettings = realm.create('OrganizationSettings', {
        _id: new BSON.ObjectId(),
        organization_id: apiResponse.user.organization_settings.organization_id,
        organization_name: apiResponse.user.organization_settings.organization_name,
        timezone: apiResponse.user.organization_settings.timezone,
        locale: apiResponse.user.organization_settings.locale,
        hos_settings: apiResponse.user.organization_settings.hos_settings,
        compliance_settings: apiResponse.user.organization_settings.compliance_settings
      })

      // Create complete driver data
      console.log('Creating complete driver data...')
      const driverData = realm.create('DriverData', {
        _id: new BSON.ObjectId(),
        token: apiResponse.token,
        user_id: apiResponse.user.id,
        email: apiResponse.user.email,
        firstName: apiResponse.user.firstName,
        lastName: apiResponse.user.lastName,
        role: apiResponse.user.role,
        organizationId: apiResponse.user.organizationId,
        onboardingCompleted: apiResponse.user.onboardingCompleted,
        onboardingStep: apiResponse.user.onboardingStep,
        created_at: new Date(),
        updated_at: new Date()
      })
      
      // Set the relationships after creation
      ;(driverData as any).driver_profile = driverProfile
      ;(driverData as any).hos_status = hosStatus
      ;(driverData as any).vehicle_assignment = vehicleAssignment
      ;(driverData as any).organization_settings = organizationSettings

      return driverData
    })
  },

  // Get complete driver data
  getDriverData: () => {
    return realm.objects('DriverData').slice(0, 1)[0]
  },

  // Get driver profile
  getDriverProfile: () => {
    const driverData = realm.objects('DriverData').slice(0, 1)[0]
    return driverData?.driver_profile
  },

  // Get HOS status
  getHOSStatus: () => {
    const driverData = realm.objects('DriverData').slice(0, 1)[0]
    return driverData?.hos_status
  },

  // Get vehicle assignment
  getVehicleAssignment: () => {
    const driverData = realm.objects('DriverData').slice(0, 1)[0]
    return driverData?.vehicle_assignment
  },

  // Get organization settings
  getOrganizationSettings: () => {
    const driverData = realm.objects('DriverData').slice(0, 1)[0]
    return driverData?.organization_settings
  },

  // Update HOS status
  updateHOSStatus: (hosData: Partial<HOSStatusType>) => {
    return realm.write(() => {
      const driverData = realm.objects('DriverData').slice(0, 1)[0]
      if (driverData?.hos_status) {
        Object.assign(driverData.hos_status, hosData)
        driverData.updated_at = new Date()
      }
    })
  },

  // Clear all driver data
  clearDriverData: () => {
    return realm.write(() => {
      realm.delete(realm.objects('DriverData'))
      realm.delete(realm.objects('DriverProfile'))
      realm.delete(realm.objects('HOSStatus'))
      realm.delete(realm.objects('VehicleInfo'))
      realm.delete(realm.objects('VehicleAssignment'))
      realm.delete(realm.objects('OrganizationSettings'))
    })
  },
}

// Close realm when app is unmounted
export const closeRealm = () => {
  if (!realm.isClosed) {
    realm.close()
  }
}
