// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://10.0.2.2:8000/api' : 'https://api.ttmkonnect.com/api',
  TIMEOUT: 30000, // Increased to 30 seconds for slow networks/dev environments
  RETRY_ATTEMPTS: 3,
}

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  
  // Organization Driver Authentication
  ORGANIZATION: {
    DRIVER_LOGIN: '/organisation_users/login/',
    DRIVER_PROFILE: '/organisation_users/profile/',
    DRIVER_LOGOUT: '/organisation_users/logout/',
  },
  
  // User Management
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    CHANGE_PASSWORD: '/user/change-password',
    UPLOAD_AVATAR: '/user/avatar',
    DELETE_ACCOUNT: '/user/account',
  },
  
  // Dashboard Data
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT_ACTIVITY: '/dashboard/activity',
    NOTIFICATIONS: '/dashboard/notifications',
  },
  
  // HOS (Hours of Service) APIs
  HOS: {
    GET_CLOCKS: '/hos/clocks/',
    GET_CLOCK: '/hos/clocks/{id}/',
    CREATE_CLOCK: '/hos/clocks/',
    UPDATE_CLOCK: '/hos/clocks/{id}/',
    CHANGE_DUTY_STATUS: '/hos/clocks/{id}/change_duty_status/',
    GET_DAILY_LOGS: '/hos/daily-logs/',
    GET_HOS_LOGS: '/hos/logs/',  // GET endpoint for individual log entries
    GET_COMPLIANCE_SETTINGS: '/hos/compliance-settings/',
    CREATE_LOG_ENTRY: '/hos/logs/',
    CREATE_DAILY_LOG: '/hos/daily-logs/',
    CREATE_ELD_EVENT: '/hos/eld-events/',
    CERTIFY_LOG: '/hos/daily-logs/{id}/',  // PATCH endpoint per spec
    CERTIFY_ALL_UNCERTIFIED: '/hos/daily-logs/certify-all-uncertified/',  // POST endpoint
  },
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email address to continue.',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  REGISTER_SUCCESS: 'Account created successfully! Please verify your email.',
  LOGOUT_SUCCESS: 'You have been logged out successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  EMAIL_VERIFIED: 'Email verified successfully.',
} as const

  // Query Keys for TanStack Query
export const QUERY_KEYS = {
  // Authentication
  AUTH: ['auth'] as const,
  USER_PROFILE: ['user', 'profile'] as const,
  
  // Dashboard
  DASHBOARD_STATS: ['dashboard', 'stats'] as const,
  DASHBOARD_ACTIVITY: ['dashboard', 'activity'] as const,
  NOTIFICATIONS: ['notifications'] as const,
  
  // HOS (Hours of Service)
  HOS_CLOCKS: ['hos', 'clocks'] as const,
  HOS_CLOCK: (clockId: string) => ['hos', 'clock', clockId] as const,
  HOS_DAILY_LOGS: ['hos', 'daily-logs'] as const,
  HOS_COMPLIANCE_SETTINGS: ['hos', 'compliance-settings'] as const,
} as const

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  REMEMBER_ME: 'remember_me',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
  HAS_SEEN_WELCOME: 'has_seen_welcome',
} as const

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'TTMKonnect',
  VERSION: '1.0.0',
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  PAGINATION_LIMIT: 20,
} as const
