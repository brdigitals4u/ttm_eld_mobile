// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? "http://10.0.2.2:8000/api" : "https://api.ttmkonnect.com/api",
  TIMEOUT: 30000, // Increased to 30 seconds for slow networks/dev environments
  RETRY_ATTEMPTS: 3,
}

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH_TOKEN: "/auth/refresh",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    VERIFY_EMAIL: "/auth/verify-email",
    REAUTH: "/auth/reauthenticate", // Re-authentication for sensitive operations
  },

  // Organization Driver Authentication
  ORGANIZATION: {
    DRIVER_LOGIN: "/organisation_users/login/",
    DRIVER_PROFILE: "/organisation_users/profile/",
    DRIVER_LOGOUT: "/organisation_users/logout/",
    DRIVER_REFRESH_TOKEN: "/organisation_users/refresh/",
    DRIVER_PROFILE_UPDATE: "/driver/profile/update/",
    DRIVER_PROFILE_REQUEST_CHANGE: "/driver/profile/request-change/",
    DRIVER_PROFILE_CHANGE_REQUESTS: "/driver/profile/change-requests/",
  },

  // Driver-specific APIs (new mobile API endpoints)
  DRIVER: {
    // HOS Management
    HOS_CURRENT_STATUS: "/driver/hos/current-status/",
    HOS_CLOCKS: "/driver/hos/clocks/",
    HOS_CHANGE_STATUS: "/driver/hos/change-status/",
    HOS_LOGS: "/driver/hos/logs/",
    HOS_VIOLATIONS: "/driver/hos/violations/",
    HOS_CERTIFY: "/driver/hos/certify/",
    HOS_ANNOTATE: "/driver/hos/annotate/",

    // Location Tracking
    LOCATION_UPDATE: "/driver/location/update/",
    LOCATION_BATCH: "/driver/location/batch/v2/",

    // Device Health
    DEVICE_HEARTBEAT: "/driver/device/heartbeat/",
    DEVICE_MALFUNCTION: "/driver/device/malfunction/",

    // Notifications
    NOTIFICATIONS_REGISTER: "/driver/notifications/register/",
    NOTIFICATIONS: "/driver/notifications/",
    NOTIFICATIONS_READ: "/driver/notifications/read/",
    NOTIFICATIONS_READ_ALL: "/driver/notifications/read-all/",

    // Profile
    PROFILE: "/drivers/me/",

    // Vehicle & Trip Management
    VEHICLE: "/driver/vehicle/",
    VEHICLES: "/driver/vehicles/",
    TRIPS: "/driver/trips/",
    TRIP_DETAILS: "/driver/trips/{id}/",
  },

  // User Management
  USER: {
    PROFILE: "/user/profile",
    UPDATE_PROFILE: "/user/profile",
    CHANGE_PASSWORD: "/user/change-password",
    UPLOAD_AVATAR: "/user/avatar",
    DELETE_ACCOUNT: "/user/account",
  },

  // Dashboard Data
  DASHBOARD: {
    STATS: "/dashboard/stats",
    RECENT_ACTIVITY: "/dashboard/activity",
    NOTIFICATIONS: "/dashboard/notifications",
  },

  // HOS (Hours of Service) APIs
  HOS: {
    GET_CLOCKS: "/hos/clocks/",
    GET_CLOCK: "/hos/clocks/{id}/",
    CREATE_CLOCK: "/hos/clocks/",
    UPDATE_CLOCK: "/hos/clocks/{id}/",
    CHANGE_DUTY_STATUS: "/hos/clocks/{id}/change_duty_status/",
    GET_DAILY_LOGS: "/hos/daily-logs/",
    GET_HOS_LOGS: "/hos/logs/", // GET endpoint for individual log entries
    GET_COMPLIANCE_SETTINGS: "/hos/compliance-settings/",
    CREATE_LOG_ENTRY: "/hos/logs/",
    CREATE_DAILY_LOG: "/hos/daily-logs/",
    CREATE_ELD_EVENT: "/hos/eld-events/",
    CERTIFY_LOG: "/hos/daily-logs/{id}/", // PATCH endpoint per spec
    CERTIFY_ALL_UNCERTIFIED: "/hos/daily-logs/certify-all-uncertified/", // POST endpoint
    UNIDENTIFIED_DRIVERS: "/hos/unidentified-drivers/", // GET unidentified driver records
    UNIDENTIFIED_DRIVERS_REASSIGN: "/hos/unidentified-drivers/reassign/", // POST reassign records
  },

  // ELD Notes
  ELD_NOTES: "/eld/notes/",

  // Fuel Purchase APIs
  FUEL: {
    CREATE_PURCHASE: "/fuel-purchase/fuel-purchases/",
    GET_PURCHASES: "/fuel-purchase/fuel-purchases/",
    GET_DRIVER_PURCHASES: "/driver/fuel-purchases/",
    SEARCH_PURCHASES: "/fuel-purchase/fuel-purchases/search/",
    STATISTICS: "/fuel-purchase/fuel-purchases/statistics/",
    CONFIRM_RECEIPT_UPLOAD: "/fuel-purchase/confirm-receipt-upload/",
  },

  // File Upload APIs
  UPLOAD: {
    GENERATE_UPLOAD_URL: "/generate-upload-url/upload/",
  },

  // Vehicle Management APIs
  VEHICLES: {
    CREATE: "/vehicles/vehicles/",
    GET_ALL: "/vehicles/vehicles/",
    GET_ONE: "/vehicles/vehicles/{id}/",
    UPDATE: "/vehicles/vehicles/{id}/",
  },

  // Trailer Management APIs
  TRAILERS: {
    CREATE: "/assets/trailers/",
    ASSIGN: "/drivers/trailer-assignments/",
    GET_ASSIGNMENTS: "/drivers/trailer-assignments/",
    UPDATE_ASSIGNMENT: "/drivers/trailer-assignments/{id}/",
  },

  // Driver/Co-Driver Management APIs
  DRIVERS: {
    GET_ALL: "/organisation_drivers/",
    CREATE: "/organisation_drivers/",
    CREATE_CO_DRIVER_EVENT: "/hos/eld-events/", // For co-driver login/logout
  },

  // DVIR (Inspection) APIs
  DVIR: {
    CREATE: "/compliance/dvirs/",
    GET_ALL: "/compliance/dvirs/",
    ADD_DEFECT: "/compliance/dvir-defects/",
    GET_DEFECTS: "/compliance/dvir-defects/",
  },

  // Contacts (Shippers) APIs
  CONTACTS: {
    LIST: "/contacts/",
    CREATE: "/contacts/",
    UPDATE: "/contacts/{id}/",
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
  NETWORK_ERROR: "Network connection error. Please check your internet connection.",
  TIMEOUT_ERROR: "Request timeout. Please try again.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  FORBIDDEN: "Access denied.",
  NOT_FOUND: "Resource not found.",
  SERVER_ERROR: "Internal server error. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists.",
  ACCOUNT_NOT_VERIFIED: "Please verify your email address to continue.",
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Welcome back!",
  REGISTER_SUCCESS: "Account created successfully! Please verify your email.",
  LOGOUT_SUCCESS: "You have been logged out successfully.",
  PROFILE_UPDATED: "Profile updated successfully.",
  PASSWORD_CHANGED: "Password changed successfully.",
  EMAIL_VERIFIED: "Email verified successfully.",
} as const

// Query Keys for TanStack Query
export const QUERY_KEYS = {
  // Authentication
  AUTH: ["auth"] as const,
  USER_PROFILE: ["user", "profile"] as const,

  // Dashboard
  DASHBOARD_STATS: ["dashboard", "stats"] as const,
  DASHBOARD_ACTIVITY: ["dashboard", "activity"] as const,
  NOTIFICATIONS: ["notifications"] as const,

  // HOS (Hours of Service)
  HOS_CLOCKS: ["hos", "clocks"] as const,
  HOS_CLOCK: (clockId: string) => ["hos", "clock", clockId] as const,
  HOS_DAILY_LOGS: ["hos", "daily-logs"] as const,
  HOS_COMPLIANCE_SETTINGS: ["hos", "compliance-settings"] as const,

  // Fuel Purchase
  FUEL_PURCHASES: ["fuel", "purchases"] as const,
  FUEL_STATISTICS: ["fuel", "statistics"] as const,

  // Vehicles
  VEHICLES: ["vehicles"] as const,
  VEHICLE: (id: string | number) => ["vehicle", id] as const,

  // Trailers
  TRAILERS: ["trailers"] as const,
  TRAILER_ASSIGNMENTS: ["trailer", "assignments"] as const,

  // Drivers
  DRIVERS: ["drivers"] as const,

  // DVIR
  DVIRS: ["dvirs"] as const,
  DVIR_DEFECTS: ["dvir", "defects"] as const,

  // Contacts (Shippers)
  CONTACTS: ["contacts"] as const,
  CONTACT: (id: string) => ["contacts", id] as const,

  // Driver APIs (new mobile endpoints)
  DRIVER_HOS_CURRENT_STATUS: ["driver", "hos", "current-status"] as const,
  DRIVER_HOS_CLOCKS: ["driver", "hos", "clocks"] as const,
  DRIVER_HOS_LOGS: (date: string) => ["driver", "hos", "logs", date] as const,
  DRIVER_HOS_VIOLATIONS: ["driver", "hos", "violations"] as const,
  DRIVER_NOTIFICATIONS: (status?: string) => ["driver", "notifications", status || "all"] as const,
} as const

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_ID: "user_id",
  REMEMBER_ME: "remember_me",
  THEME_MODE: "theme_mode",
  LANGUAGE: "language",
  HAS_SEEN_WELCOME: "has_seen_welcome",
  PRIVACY_POLICY_ACCEPTED: "privacy_policy_accepted",
} as const

// App Configuration
export const APP_CONFIG = {
  APP_NAME: "TTMKonnect",
  VERSION: "1.0.0",
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  PAGINATION_LIMIT: 20,
} as const

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  BASE_URL: __DEV__ ? "ws://10.0.2.2:8001" : "ws://api.ttmkonnect.com:8001",
  PATH: "/ws/violations",
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  PING_INTERVAL: 20000, // Server sends ping every 20 seconds
  PONG_TIMEOUT: 60000, // Must respond within 60 seconds
  RECONNECT_DELAY_INITIAL: 1000, // 1 second
  RECONNECT_DELAY_MAX: 30000, // 30 seconds max
  RECONNECT_DELAY_MULTIPLIER: 2, // Exponential backoff
} as const

// Violation Types and Priorities
export const VIOLATION_TYPES = {
  // Critical violations (always sent immediately)
  ELEVEN_HOUR_DRIVING: "11_hour_driving",
  FOURTEEN_HOUR_SHIFT: "14_hour_shift",
  DRIVING_AFTER_SHIFT: "driving_after_shift",

  // High priority violations
  THIRTY_MINUTE_BREAK: "30_minute_break",
  SIXTY_HOUR_CYCLE: "60_hour_cycle",
  SEVENTY_HOUR_CYCLE: "70_hour_cycle",

  // Medium priority violations
  IMPROPER_PC_DRIVING: "improper_pc_driving",
  YARD_MOVE_VIOLATION: "yard_move_violation",
  SPLIT_SLEEPER_VIOLATION: "split_sleeper_violation",
} as const

// Violation Priority Levels
export const VIOLATION_PRIORITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const

// Violation Type to Priority Mapping
export const VIOLATION_PRIORITY_MAP: Record<string, string> = {
  [VIOLATION_TYPES.ELEVEN_HOUR_DRIVING]: VIOLATION_PRIORITY.CRITICAL,
  [VIOLATION_TYPES.FOURTEEN_HOUR_SHIFT]: VIOLATION_PRIORITY.CRITICAL,
  [VIOLATION_TYPES.DRIVING_AFTER_SHIFT]: VIOLATION_PRIORITY.CRITICAL,
  [VIOLATION_TYPES.THIRTY_MINUTE_BREAK]: VIOLATION_PRIORITY.HIGH,
  [VIOLATION_TYPES.SIXTY_HOUR_CYCLE]: VIOLATION_PRIORITY.HIGH,
  [VIOLATION_TYPES.SEVENTY_HOUR_CYCLE]: VIOLATION_PRIORITY.HIGH,
  [VIOLATION_TYPES.IMPROPER_PC_DRIVING]: VIOLATION_PRIORITY.MEDIUM,
  [VIOLATION_TYPES.YARD_MOVE_VIOLATION]: VIOLATION_PRIORITY.MEDIUM,
  [VIOLATION_TYPES.SPLIT_SLEEPER_VIOLATION]: VIOLATION_PRIORITY.MEDIUM,
}
