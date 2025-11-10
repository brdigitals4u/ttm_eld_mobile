import { BSON } from 'realm'

// User schema for storing user profile data
export class User extends Realm.Object {
  _id!: BSON.ObjectId
  email!: string
  firstName!: string
  lastName!: string
  avatar?: string
  phoneNumber?: string
  dateOfBirth?: Date
  isEmailVerified!: boolean
  createdAt!: Date
  updatedAt!: Date

  static schema: Realm.ObjectSchema = {
    name: 'User',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      email: 'string',
      firstName: 'string',
      lastName: 'string',
      avatar: 'string?',
      phoneNumber: 'string?',
      dateOfBirth: 'date?',
      isEmailVerified: 'bool',
      createdAt: 'date',
      updatedAt: 'date',
    },
  }
}

// Auth session schema for storing authentication tokens
export class AuthSession extends Realm.Object {
  _id!: BSON.ObjectId
  accessToken!: string
  refreshToken!: string
  userId!: string
  expiresAt!: Date
  createdAt!: Date

  static schema: Realm.ObjectSchema = {
    name: 'AuthSession',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      accessToken: 'string',
      refreshToken: 'string',
      userId: 'string',
      expiresAt: 'date',
      createdAt: 'date',
    },
  }
}

// Types for TypeScript
export interface UserType {
  _id: string | BSON.ObjectId
  email: string
  firstName: string
  lastName: string
  avatar?: string
  phoneNumber?: string
  dateOfBirth?: Date
  isEmailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuthSessionType {
  _id: string | BSON.ObjectId
  accessToken: string
  refreshToken: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

export interface LoginCredentials {
  email: string
  password: string
  tenant_code: string
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth?: Date
}

export interface AuthResponse {
  user: UserType
  tokens: {
    accessToken: string
    refreshToken: string
    expiresAt: Date
  }
}

// Driver Profile Schema for storing complete driver data
export class DriverProfile extends Realm.Object {
  _id!: BSON.ObjectId
  driver_id!: string
  name!: string
  username!: string
  phone?: string
  email!: string
  driver_license?: string
  license_number!: string
  license_state!: string
  license_expiry?: string
  company_driver_id!: string
  hire_date?: string
  employment_status!: string
  home_terminal_name?: string
  home_terminal_address?: string
  current_status!: string
  current_location?: any
  current_shift?: any
  current_cycle?: any
  eld_device_id?: string
  eld_exempt!: boolean
  eld_exempt_reason?: string
  eld_day_start_hour!: number
  eld_pc_enabled!: boolean
  eld_ym_enabled!: boolean
  eld_adverse_weather_exemption_enabled!: boolean
  eld_big_day_exemption_enabled!: boolean
  waiting_time_duty_status_enabled!: boolean
  violations_count!: number
  is_active!: boolean
  is_deactivated!: boolean
  is_deleted!: boolean
  created_at!: string
  updated_at!: string
  organization_name!: string
  timezone!: string
  locale!: string

  static schema: Realm.ObjectSchema = {
    name: 'DriverProfile',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      driver_id: 'string',
      name: 'string',
      username: 'string',
      phone: 'string?',
      email: 'string',
      driver_license: 'string?',
      license_number: 'string',
      license_state: 'string',
      license_expiry: 'string?',
      company_driver_id: 'string',
      hire_date: 'string?',
      employment_status: 'string',
      home_terminal_name: 'string?',
      home_terminal_address: 'string?',
      current_status: 'string',
      current_location: 'mixed?',
      current_shift: 'mixed?',
      current_cycle: 'mixed?',
      eld_device_id: 'string?',
      eld_exempt: 'bool',
      eld_exempt_reason: 'string?',
      eld_day_start_hour: 'int',
      eld_pc_enabled: 'bool',
      eld_ym_enabled: 'bool',
      eld_adverse_weather_exemption_enabled: 'bool',
      eld_big_day_exemption_enabled: 'bool',
      waiting_time_duty_status_enabled: 'bool',
      violations_count: 'int',
      is_active: 'bool',
      is_deactivated: 'bool',
      is_deleted: 'bool',
      created_at: 'string',
      updated_at: 'string',
      organization_name: 'string',
      timezone: 'string',
      locale: 'string',
    },
  }
}

// HOS Status Schema for storing Hours of Service data
export class HOSStatus extends Realm.Object {
  _id!: BSON.ObjectId
  driver_id!: string
  driver_name!: string
  current_status!: string
  active_clocks!: any[]
  active_violations!: any[]
  driving_time_remaining!: number
  on_duty_time_remaining!: number
  cycle_time_remaining!: number

  static schema: Realm.ObjectSchema = {
    name: 'HOSStatus',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      driver_id: 'string',
      driver_name: 'string',
      current_status: 'string',
      active_clocks: 'mixed[]',
      active_violations: 'mixed[]',
      driving_time_remaining: 'int',
      on_duty_time_remaining: 'int',
      cycle_time_remaining: 'int',
    },
  }
}

// Vehicle Info Schema for storing vehicle assignment data
export class VehicleInfo extends Realm.Object {
  _id!: BSON.ObjectId
  id!: string
  vehicle_unit!: string
  make!: string
  model!: string
  year!: number
  license_plate!: string
  vin!: string
  status!: string
  is_active!: boolean
  current_location?: any
  current_odometer?: any
  assigned_at!: string

  static schema: Realm.ObjectSchema = {
    name: 'VehicleInfo',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      id: 'string',
      vehicle_unit: 'string',
      make: 'string',
      model: 'string',
      year: 'int',
      license_plate: 'string',
      vin: 'string',
      status: 'string',
      is_active: 'bool',
      current_location: 'mixed?',
      current_odometer: 'mixed?',
      assigned_at: 'string',
    },
  }
}

// Vehicle Assignment Schema
export class VehicleAssignment extends Realm.Object {
  _id!: BSON.ObjectId
  driver_id!: string
  driver_name!: string
  has_vehicle_assigned!: boolean
  vehicle_info!: VehicleInfo
  assignment_status!: string

  static schema: Realm.ObjectSchema = {
    name: 'VehicleAssignment',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      driver_id: 'string',
      driver_name: 'string',
      has_vehicle_assigned: 'bool',
      vehicle_info: 'VehicleInfo',
      assignment_status: 'string',
    },
  }
}

// Organization Settings Schema
export class OrganizationSettings extends Realm.Object {
  _id!: BSON.ObjectId
  organization_id!: string
  organization_name!: string
  timezone!: string
  locale!: string
  hos_settings?: any
  compliance_settings?: any

  static schema: Realm.ObjectSchema = {
    name: 'OrganizationSettings',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      organization_id: 'string',
      organization_name: 'string',
      timezone: 'string',
      locale: 'string',
      hos_settings: 'mixed?',
      compliance_settings: 'mixed?',
    },
  }
}

// Complete Driver Data Schema - stores the entire API response
export class DriverData extends Realm.Object {
  _id!: BSON.ObjectId
  token!: string
  user_id!: string
  email!: string
  firstName!: string
  lastName!: string
  role!: string
  organizationId!: string
  onboardingCompleted!: boolean
  onboardingStep!: number
  driver_profile!: DriverProfile
  hos_status!: HOSStatus
  vehicle_assignment!: VehicleAssignment
  organization_settings!: OrganizationSettings
  created_at!: Date
  updated_at!: Date

  static schema: Realm.ObjectSchema = {
    name: 'DriverData',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      token: 'string',
      user_id: 'string',
      email: 'string',
      firstName: 'string',
      lastName: 'string',
      role: 'string',
      organizationId: 'string',
      onboardingCompleted: 'bool',
      onboardingStep: 'int',
      driver_profile: 'DriverProfile',
      hos_status: 'HOSStatus',
      vehicle_assignment: 'VehicleAssignment',
      organization_settings: 'OrganizationSettings',
      created_at: 'date',
      updated_at: 'date',
    },
  }
}

// TypeScript interfaces for the new schemas
export interface DriverProfileType {
  _id: string | BSON.ObjectId
  driver_id: string
  name: string
  username: string
  phone: string
  email: string
  driver_license: string
  license_number: string
  license_state: string
  license_expiry?: string
  company_driver_id: string
  hire_date?: string
  employment_status: string
  home_terminal_name?: string
  home_terminal_address?: string
  current_status: string
  current_location?: any
  current_shift?: any
  current_cycle?: any
  eld_device_id?: string
  eld_exempt: boolean
  eld_exempt_reason?: string
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

export interface HOSStatusType {
  _id: string | BSON.ObjectId
  driver_id: string
  driver_name: string
  current_status: string
  active_clocks: any[]
  active_violations: any[]
  driving_time_remaining: number
  on_duty_time_remaining: number
  cycle_time_remaining: number
}

export interface VehicleInfoType {
  _id: string | BSON.ObjectId
  id: string
  vehicle_unit: string
  make: string
  model: string
  year: number
  license_plate: string
  vin: string
  status: string
  is_active: boolean
  current_location?: any
  current_odometer?: any
  assigned_at: string
}

export interface VehicleAssignmentType {
  _id: string | BSON.ObjectId
  driver_id: string
  driver_name: string
  has_vehicle_assigned: boolean
  vehicle_info: VehicleInfoType
  assignment_status: string
}

export interface OrganizationSettingsType {
  _id: string | BSON.ObjectId
  organization_id: string
  organization_name: string
  timezone: string
  locale: string
  hos_settings?: any
  compliance_settings?: any
}

export interface DriverDataType {
  _id: string | BSON.ObjectId
  token: string
  user_id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
  onboardingCompleted: boolean
  onboardingStep: number
  driver_profile: DriverProfileType
  hos_status: HOSStatusType
  vehicle_assignment: VehicleAssignmentType
  organization_settings: OrganizationSettingsType
  created_at: Date
  updated_at: Date
}
