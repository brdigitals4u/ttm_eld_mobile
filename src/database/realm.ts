// Safe Realm import - handle case where native module isn't linked
import {
  User,
  AuthSession,
  DriverProfile,
  HOSStatus,
  VehicleInfo,
  VehicleAssignment,
  OrganizationSettings,
  DriverData,
} from "./schemas"
import type {
  DriverProfileType,
  HOSStatusType,
  VehicleInfoType,
  VehicleAssignmentType,
  OrganizationSettingsType,
  DriverDataType,
} from "./schemas"

let Realm: any = null
let BSON: any = null

try {
  const realmModule = require("realm")
  Realm = realmModule.default || realmModule
  BSON = realmModule.BSON || (realmModule as any).BSON
} catch (error) {
  console.error("❌ Failed to import Realm module:", error)
  console.warn(
    "⚠️ Realm native module is not properly linked. Local data persistence will be disabled.",
  )
}

// Realm configuration (only if Realm is available)
const getRealmConfig = (): any => {
  if (!Realm) return null
  return {
    schema: [
      User,
      AuthSession,
      DriverProfile,
      HOSStatus,
      VehicleInfo,
      VehicleAssignment,
      OrganizationSettings,
      DriverData,
    ],
    schemaVersion: 2,
    deleteRealmIfMigrationNeeded: true, // Only for development
  }
}

// Create and export realm instance with error handling
let realmInstance: Realm | null = null
let realmInitializationError: Error | null = null

/**
 * Initialize Realm instance (non-blocking)
 */
const initializeRealm = (): any => {
  if (realmInstance && !realmInstance.isClosed) {
    return realmInstance
  }

  if (realmInitializationError) {
    return null
  }

  try {
    // Check if Realm is available
    if (!Realm || typeof Realm === "undefined" || Realm === null) {
      throw new Error("Realm is not available. The native module may not be properly linked.")
    }

    const config = getRealmConfig()
    if (!config) {
      throw new Error("Realm configuration is not available.")
    }

    realmInstance = new Realm(config)
    console.log("✅ Realm database initialized successfully")
    return realmInstance
  } catch (error) {
    realmInitializationError = error as Error
    const errorMessage = (error as Error).message

    console.error("❌ Realm initialization error:", error)

    if (errorMessage.includes("Property") && errorMessage.includes("doesn't exist")) {
      console.error(`
⚠️  Realm native module is not properly linked!

To fix this issue, please run:
1. npm install
2. cd android && ./gradlew clean && cd ..
3. npx react-native start --reset-cache
4. Rebuild the app (npm run android or rebuild in Android Studio)

If the issue persists, you may need to:
- Uninstall the app completely
- Clear Metro bundler cache: npx react-native start --reset-cache
- Rebuild the app from scratch
      `)
    }

    return null
  }
}

// Try to initialize on module load
realmInstance = initializeRealm()

// Export realm getter (will return null if not initialized)
const getRealm = (): Realm | null => {
  if (!realmInstance || realmInstance.isClosed) {
    realmInstance = initializeRealm()
  }
  return realmInstance
}

// Export realm with safe access
export const realm = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getRealm()
    if (!instance) {
      // Return no-op functions if Realm is not available
      if (
        typeof prop === "string" &&
        ["write", "create", "delete", "deleteAll", "objects", "objectForPrimaryKey"].includes(prop)
      ) {
        return () => {
          console.warn(`⚠️ Realm is not available. Operation '${prop}' was skipped.`)
        }
      }
      if (prop === "isClosed") {
        return true
      }
      return undefined
    }
    const value = (instance as any)[prop]
    return typeof value === "function" ? value.bind(instance) : value
  },
})

// Helper function to safely get realm instance
const safeRealm = (): any => {
  return getRealm()
}

// Helper functions for database operations
export const RealmService = {
  // User operations
  createUser: (userData: Partial<User>) => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping createUser")
      return null
    }
    return r.write(() => {
      return r.create("User", userData)
    })
  },

  getUser: (id: string) => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getUser")
      return null
    }
    return r.objectForPrimaryKey("User", id)
  },

  getAllUsers: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getAllUsers")
      return []
    }
    return r.objects("User")
  },

  updateUser: (id: string, userData: Partial<User>) => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping updateUser")
      return null
    }
    return r.write(() => {
      const user = r.objectForPrimaryKey("User", id)
      if (user) {
        Object.assign(user, userData)
      }
      return user
    })
  },

  deleteUser: (id: string) => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping deleteUser")
      return
    }
    return r.write(() => {
      const user = r.objectForPrimaryKey("User", id)
      if (user) {
        r.delete(user)
      }
    })
  },

  // Auth session operations
  createAuthSession: (sessionData: Partial<AuthSession>) => {
    const r = safeRealm()
    if (!r || !BSON) {
      console.warn("⚠️ Realm not available, skipping createAuthSession")
      return null
    }
    return r.write(() => {
      return r.create("AuthSession", {
        _id: new BSON.ObjectId(),
        ...sessionData,
      })
    })
  },

  getAuthSession: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getAuthSession")
      return null
    }
    return r.objects("AuthSession").slice(0, 1)[0]
  },

  updateAuthSession: (sessionData: Partial<AuthSession>) => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping updateAuthSession")
      return
    }
    return r.write(() => {
      const session = r.objects("AuthSession").slice(0, 1)[0]
      if (session) {
        Object.assign(session, sessionData)
      } else {
        r.create("AuthSession", sessionData)
      }
    })
  },

  deleteAuthSession: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping deleteAuthSession")
      return
    }
    return r.write(() => {
      const sessions = r.objects("AuthSession")
      r.delete(sessions)
    })
  },

  // Clear all data
  clearAllData: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping clearAllData")
      return
    }
    return r.write(() => {
      r.deleteAll()
    })
  },

  // Delete all users (for logout)
  deleteAllUsers: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping deleteAllUsers")
      return
    }
    return r.write(() => {
      const users = r.objects("User")
      r.delete(users)
    })
  },

  // Driver data operations
  createDriverProfile: (profileData: Omit<DriverProfileType, "_id">) => {
    const r = safeRealm()
    if (!r || !BSON) {
      console.warn("⚠️ Realm not available, skipping createDriverProfile")
      return null
    }
    return r.write(() => {
      return r.create("DriverProfile", {
        _id: new BSON.ObjectId(),
        ...profileData,
      })
    })
  },

  createHOSStatus: (hosData: Omit<HOSStatusType, "_id">) => {
    const r = safeRealm()
    if (!r || !BSON) {
      console.warn("⚠️ Realm not available, skipping createHOSStatus")
      return null
    }
    return r.write(() => {
      return r.create("HOSStatus", {
        _id: new BSON.ObjectId(),
        ...hosData,
      })
    })
  },

  createVehicleInfo: (vehicleData: Omit<VehicleInfoType, "_id">) => {
    const r = safeRealm()
    if (!r || !BSON) {
      console.warn("⚠️ Realm not available, skipping createVehicleInfo")
      return null
    }
    return r.write(() => {
      return r.create("VehicleInfo", {
        _id: new BSON.ObjectId(),
        ...vehicleData,
      })
    })
  },

  createVehicleAssignment: (
    assignmentData: Omit<VehicleAssignmentType, "_id" | "vehicle_info"> & {
      vehicle_info: VehicleInfoType
    },
  ) => {
    const r = safeRealm()
    if (!r || !BSON) {
      console.warn("⚠️ Realm not available, skipping createVehicleAssignment")
      return null
    }
    return r.write(() => {
      // First create the vehicle info
      const vehicleInfo = r.create("VehicleInfo", {
        ...assignmentData.vehicle_info,
        _id: new BSON.ObjectId(),
      })

      // Then create the assignment with the vehicle info
      return r.create("VehicleAssignment", {
        _id: new BSON.ObjectId(),
        driver_id: assignmentData.driver_id,
        driver_name: assignmentData.driver_name,
        has_vehicle_assigned: assignmentData.has_vehicle_assigned,
        vehicle_info: vehicleInfo,
        assignment_status: assignmentData.assignment_status,
      })
    })
  },

  createOrganizationSettings: (settingsData: Omit<OrganizationSettingsType, "_id">) => {
    const r = safeRealm()
    if (!r || !BSON) {
      console.warn("⚠️ Realm not available, skipping createOrganizationSettings")
      return null
    }
    return r.write(() => {
      return r.create("OrganizationSettings", {
        _id: new BSON.ObjectId(),
        ...settingsData,
      })
    })
  },

  // Complete driver data storage - stores the entire API response
  createDriverData: (apiResponse: any) => {
    const r = safeRealm()
    if (!r || !BSON) {
      console.warn(
        "⚠️ Realm not available, skipping createDriverData. Login will continue but data won't be persisted locally.",
      )
      return null
    }
    console.log("Creating driver data with API response:", apiResponse)
    return r.write(() => {
      // Create driver profile
      console.log("Creating driver profile...")
      const driverProfile = r.create("DriverProfile", {
        _id: new BSON.ObjectId(),
        driver_id: apiResponse.user.driver_profile.driver_id,
        name: apiResponse.user.driver_profile.name,
        username: apiResponse.user.driver_profile.username,
        phone: apiResponse.user.driver_profile.phone || undefined,
        email: apiResponse.user.driver_profile.email,
        driver_license: apiResponse.user.driver_profile.driver_license || undefined,
        license_number: apiResponse.user.driver_profile.license_number,
        license_state: apiResponse.user.driver_profile.license_state,
        license_expiry: apiResponse.user.driver_profile.license_expiry || undefined,
        company_driver_id: apiResponse.user.driver_profile.company_driver_id,
        hire_date: apiResponse.user.driver_profile.hire_date || undefined,
        employment_status: apiResponse.user.driver_profile.employment_status,
        home_terminal_name: apiResponse.user.driver_profile.home_terminal_name || undefined,
        home_terminal_address: apiResponse.user.driver_profile.home_terminal_address || undefined,
        current_status: apiResponse.user.driver_profile.current_status,
        current_location: apiResponse.user.driver_profile.current_location || undefined,
        current_shift: apiResponse.user.driver_profile.current_shift || undefined,
        current_cycle: apiResponse.user.driver_profile.current_cycle || undefined,
        eld_device_id: apiResponse.user.driver_profile.eld_device_id || undefined,
        eld_exempt: apiResponse.user.driver_profile.eld_exempt,
        eld_exempt_reason: apiResponse.user.driver_profile.eld_exempt_reason || undefined,
        eld_day_start_hour: apiResponse.user.driver_profile.eld_day_start_hour,
        eld_pc_enabled: apiResponse.user.driver_profile.eld_pc_enabled,
        eld_ym_enabled: apiResponse.user.driver_profile.eld_ym_enabled,
        eld_adverse_weather_exemption_enabled:
          apiResponse.user.driver_profile.eld_adverse_weather_exemption_enabled,
        eld_big_day_exemption_enabled:
          apiResponse.user.driver_profile.eld_big_day_exemption_enabled,
        waiting_time_duty_status_enabled:
          apiResponse.user.driver_profile.waiting_time_duty_status_enabled,
        violations_count: apiResponse.user.driver_profile.violations_count,
        is_active: apiResponse.user.driver_profile.is_active,
        is_deactivated: apiResponse.user.driver_profile.is_deactivated,
        is_deleted: apiResponse.user.driver_profile.is_deleted,
        created_at: apiResponse.user.driver_profile.created_at,
        updated_at: apiResponse.user.driver_profile.updated_at,
        organization_name: apiResponse.user.driver_profile.organization_name,
        timezone: apiResponse.user.driver_profile.timezone,
        locale: apiResponse.user.driver_profile.locale,
      })

      // Create HOS status
      console.log("Creating HOS status...")
      const hosStatus = r.create("HOSStatus", {
        _id: new BSON.ObjectId(),
        driver_id: apiResponse.user.hos_status.driver_id,
        driver_name: apiResponse.user.hos_status.driver_name,
        current_status: apiResponse.user.hos_status.current_status,
        active_clocks: apiResponse.user.hos_status.active_clocks,
        active_violations: apiResponse.user.hos_status.active_violations,
        driving_time_remaining: apiResponse.user.hos_status.time_remaining.driving_time_remaining,
        on_duty_time_remaining: apiResponse.user.hos_status.time_remaining.on_duty_time_remaining,
        cycle_time_remaining: apiResponse.user.hos_status.time_remaining.cycle_time_remaining,
      })

      // Create vehicle info
      console.log("Creating vehicle info...")
      const vehicleInfo = r.create("VehicleInfo", {
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
        assigned_at: apiResponse.user.vehicle_assignment.vehicle_info.assigned_at,
      })

      // Create vehicle assignment
      console.log("Creating vehicle assignment...")
      const vehicleAssignment = r.create("VehicleAssignment", {
        _id: new BSON.ObjectId(),
        driver_id: apiResponse.user.vehicle_assignment.driver_id,
        driver_name: apiResponse.user.vehicle_assignment.driver_name,
        has_vehicle_assigned: apiResponse.user.vehicle_assignment.has_vehicle_assigned,
        assignment_status: apiResponse.user.vehicle_assignment.assignment_status,
      })

      // Set the relationship after creation
      ;(vehicleAssignment as any).vehicle_info = vehicleInfo

      // Create organization settings
      console.log("Creating organization settings...")
      const organizationSettings = r.create("OrganizationSettings", {
        _id: new BSON.ObjectId(),
        organization_id: apiResponse.user.organization_settings.organization_id,
        organization_name: apiResponse.user.organization_settings.organization_name,
        timezone: apiResponse.user.organization_settings.timezone,
        locale: apiResponse.user.organization_settings.locale,
        hos_settings: apiResponse.user.organization_settings.hos_settings,
        compliance_settings: apiResponse.user.organization_settings.compliance_settings,
      })

      // Create complete driver data
      console.log("Creating complete driver data...")
      const driverData = r.create("DriverData", {
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
        updated_at: new Date(),
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
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getDriverData")
      return null
    }
    return r.objects("DriverData").slice(0, 1)[0]
  },

  // Get driver profile
  getDriverProfile: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getDriverProfile")
      return null
    }
    const driverData = r.objects("DriverData").slice(0, 1)[0]
    return driverData?.driver_profile
  },

  // Get HOS status
  getHOSStatus: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getHOSStatus")
      return null
    }
    const driverData = r.objects("DriverData").slice(0, 1)[0]
    return driverData?.hos_status
  },

  // Get vehicle assignment
  getVehicleAssignment: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getVehicleAssignment")
      return null
    }
    const driverData = r.objects("DriverData").slice(0, 1)[0]
    return driverData?.vehicle_assignment
  },

  // Get organization settings
  getOrganizationSettings: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping getOrganizationSettings")
      return null
    }
    const driverData = r.objects("DriverData").slice(0, 1)[0]
    return driverData?.organization_settings
  },

  // Update HOS status
  updateHOSStatus: (hosData: Partial<HOSStatusType>) => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping updateHOSStatus")
      return
    }
    return r.write(() => {
      const driverData = r.objects("DriverData").slice(0, 1)[0]
      if (driverData?.hos_status) {
        Object.assign(driverData.hos_status, hosData)
        driverData.updated_at = new Date()
      }
    })
  },

  // Clear all driver data
  clearDriverData: () => {
    const r = safeRealm()
    if (!r) {
      console.warn("⚠️ Realm not available, skipping clearDriverData")
      return
    }
    return r.write(() => {
      r.delete(r.objects("DriverData"))
      r.delete(r.objects("DriverProfile"))
      r.delete(r.objects("HOSStatus"))
      r.delete(r.objects("VehicleInfo"))
      r.delete(r.objects("VehicleAssignment"))
      r.delete(r.objects("OrganizationSettings"))
    })
  },
}

// Close realm when app is unmounted
export const closeRealm = () => {
  const r = safeRealm()
  if (r && !r.isClosed) {
    r.close()
    realmInstance = null
  }
}
