/**
 * Analytics Event Constants
 *
 * Comprehensive event definitions for Firebase Analytics tracking.
 * Organized by category for easy maintenance and Customer Relationship team insights.
 *
 * Event naming convention: snake_case with category prefix
 * Parameter naming: snake_case, descriptive
 */

// ============================================================================
// 1. AUTHENTICATION & ONBOARDING
// ============================================================================

export const AUTH_EVENTS = {
  // Login events
  LOGIN_ATTEMPT: "auth_login_attempt",
  LOGIN_SUCCESS: "auth_login_success",
  LOGIN_FAILURE: "auth_login_failure",

  // Logout events
  LOGOUT: "auth_logout",

  // Privacy & Terms
  PRIVACY_POLICY_VIEWED: "auth_privacy_policy_viewed",
  PRIVACY_POLICY_ACCEPTED: "auth_privacy_policy_accepted",
  PRIVACY_POLICY_DECLINED: "auth_privacy_policy_declined",

  // Welcome/Onboarding
  WELCOME_SCREEN_VIEWED: "auth_welcome_screen_viewed",
  WELCOME_SCREEN_SKIPPED: "auth_welcome_screen_skipped",
  WELCOME_SCREEN_COMPLETED: "auth_welcome_screen_completed",

  // Remember Me
  REMEMBER_ME_ENABLED: "auth_remember_me_enabled",
  REMEMBER_ME_DISABLED: "auth_remember_me_disabled",
} as const

export const AUTH_PARAMS = {
  METHOD: "method", // 'email', 'phone', etc.
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  TENANT_CODE: "tenant_code",
  REMEMBER_ME: "remember_me",
} as const

// ============================================================================
// 2. ELD DEVICE MANAGEMENT
// ============================================================================

export const ELD_EVENTS = {
  // Device Scanning
  DEVICE_SCAN_STARTED: "eld_scan_started",
  DEVICE_SCAN_STOPPED: "eld_scan_stopped",
  DEVICE_FOUND: "eld_device_found",
  DEVICE_SCAN_FAILED: "eld_scan_failed",

  // Connection
  CONNECTION_ATTEMPT: "eld_connection_attempt",
  CONNECTION_SUCCESS: "eld_connection_success",
  CONNECTION_FAILURE: "eld_connection_failure",
  CONNECTION_TIMEOUT: "eld_connection_timeout",

  // Authentication
  AUTHENTICATION_ATTEMPT: "eld_authentication_attempt",
  AUTHENTICATION_SUCCESS: "eld_authentication_success",
  AUTHENTICATION_FAILURE: "eld_authentication_failure",

  // Disconnection
  DISCONNECTION_MANUAL: "eld_disconnection_manual",
  DISCONNECTION_AUTOMATIC: "eld_disconnection_automatic",
  DISCONNECTION_ERROR: "eld_disconnection_error",

  // Connection Duration
  CONNECTION_DURATION: "eld_connection_duration",

  // Device Errors
  DEVICE_ERROR: "eld_device_error",
  DEVICE_MALFUNCTION: "eld_malfunction",

  // Data Reporting
  ELD_REPORTING_STARTED: "eld_reporting_started",
  ELD_REPORTING_STOPPED: "eld_reporting_stopped",
  ELD_DATA_RECEIVED: "eld_data_received",
} as const

export const ELD_PARAMS = {
  DEVICE_ID: "device_id",
  DEVICE_NAME: "device_name",
  DEVICE_ADDRESS: "device_address",
  CONNECTION_TYPE: "connection_type", // 'bluetooth'
  CONNECTION_DURATION_SECONDS: "connection_duration_seconds",
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  MALFUNCTION_CODE: "malfunction_code", // 'M1', 'M2', etc.
  SIGNAL_STRENGTH: "signal_strength",
  SCAN_DURATION_SECONDS: "scan_duration_seconds",
  DEVICES_FOUND_COUNT: "devices_found_count",
} as const

// ============================================================================
// 3. HOS (HOURS OF SERVICE)
// ============================================================================

export const HOS_EVENTS = {
  // Status Changes
  STATUS_CHANGE_ATTEMPT: "hos_status_change_attempt",
  STATUS_CHANGE_SUCCESS: "hos_status_change_success",
  STATUS_CHANGE_FAILURE: "hos_status_change_failure",

  // Specific Status Transitions
  STATUS_TO_DRIVING: "hos_status_to_driving",
  STATUS_TO_ON_DUTY: "hos_status_to_on_duty",
  STATUS_TO_OFF_DUTY: "hos_status_to_off_duty",
  STATUS_TO_SLEEPER_BERTH: "hos_status_to_sleeper_berth",

  // HOS Views
  HOS_SCREEN_VIEWED: "hos_screen_viewed",
  HOS_CLOCK_VIEWED: "hos_clock_viewed",
  HOS_TIME_REMAINING_VIEWED: "hos_time_remaining_viewed",

  // Violations
  VIOLATION_VIEWED: "hos_violation_viewed",
  VIOLATION_WARNING: "hos_violation_warning",
  VIOLATION_ALERT: "hos_violation_alert",

  // Compliance
  COMPLIANCE_WARNING: "hos_compliance_warning",
  COMPLIANCE_SETTINGS_VIEWED: "hos_compliance_settings_viewed",
} as const

export const HOS_PARAMS = {
  FROM_STATUS: "from_status",
  TO_STATUS: "to_status",
  DRIVING_TIME_REMAINING: "driving_time_remaining",
  ON_DUTY_TIME_REMAINING: "on_duty_time_remaining",
  CYCLE_TIME_REMAINING: "cycle_time_remaining",
  VIOLATION_TYPE: "violation_type",
  VIOLATION_SEVERITY: "violation_severity",
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  LOCATION_LATITUDE: "location_latitude",
  LOCATION_LONGITUDE: "location_longitude",
  ODOMETER: "odometer",
} as const

// ============================================================================
// 4. LOGS & CERTIFICATION
// ============================================================================

export const LOGS_EVENTS = {
  // Log Views
  LOGS_SCREEN_VIEWED: "logs_screen_viewed",
  DAILY_LOG_VIEWED: "logs_daily_log_viewed",
  LOG_ENTRY_VIEWED: "logs_entry_viewed",
  LOG_DATE_CHANGED: "logs_date_changed",

  // Certification
  CERTIFICATION_ATTEMPT: "logs_certification_attempt",
  CERTIFICATION_SUCCESS: "logs_certification_success",
  CERTIFICATION_FAILURE: "logs_certification_failure",
  CERTIFICATION_ALL_ATTEMPT: "logs_certification_all_attempt",
  CERTIFICATION_ALL_SUCCESS: "logs_certification_all_success",

  // Transfer
  TRANSFER_ATTEMPT: "logs_transfer_attempt",
  TRANSFER_SUCCESS: "logs_transfer_success",
  TRANSFER_FAILURE: "logs_transfer_failure",
  TRANSFER_METHOD_SELECTED: "logs_transfer_method_selected",

  // Inspector Mode
  INSPECTOR_MODE_ACCESSED: "logs_inspector_mode_accessed",
  INSPECTOR_MODE_EXITED: "logs_inspector_mode_exited",

  // ELD Materials
  ELD_MATERIALS_ACCESSED: "logs_eld_materials_accessed",
} as const

export const LOGS_PARAMS = {
  LOG_DATE: "log_date",
  LOG_ENTRY_COUNT: "log_entry_count",
  CERTIFIED_COUNT: "certified_count",
  UNCERTIFIED_COUNT: "uncertified_count",
  TRANSFER_METHOD: "transfer_method", // 'wireless', 'email_dot', 'email_self'
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
} as const

// ============================================================================
// 5. FUEL MANAGEMENT
// ============================================================================

export const FUEL_EVENTS = {
  // Fuel Screen
  FUEL_SCREEN_VIEWED: "fuel_screen_viewed",
  FUEL_PURCHASES_VIEWED: "fuel_purchases_viewed",
  FUEL_STATISTICS_VIEWED: "fuel_statistics_viewed",

  // Fuel Purchase
  FUEL_PURCHASE_CREATE_ATTEMPT: "fuel_purchase_create_attempt",
  FUEL_PURCHASE_CREATE_SUCCESS: "fuel_purchase_create_success",
  FUEL_PURCHASE_CREATE_FAILURE: "fuel_purchase_create_failure",
  FUEL_PURCHASE_VIEWED: "fuel_purchase_viewed",
  FUEL_PURCHASE_EDITED: "fuel_purchase_edited",

  // Receipt
  RECEIPT_UPLOAD_ATTEMPT: "fuel_receipt_upload_attempt",
  RECEIPT_UPLOAD_SUCCESS: "fuel_receipt_upload_success",
  RECEIPT_UPLOAD_FAILURE: "fuel_receipt_upload_failure",
  RECEIPT_VIEWED: "fuel_receipt_viewed",

  // Search
  FUEL_SEARCH_PERFORMED: "fuel_search_performed",
} as const

export const FUEL_PARAMS = {
  FUEL_AMOUNT: "fuel_amount",
  FUEL_COST: "fuel_cost",
  FUEL_TYPE: "fuel_type",
  GALLONS: "gallons",
  RECEIPT_SIZE_BYTES: "receipt_size_bytes",
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
} as const

// ============================================================================
// 6. INSPECTIONS (DVIR)
// ============================================================================

export const INSPECTION_EVENTS = {
  // Inspection Start
  INSPECTION_STARTED: "inspection_started",
  INSPECTION_TYPE_SELECTED: "inspection_type_selected",

  // Inspection Progress
  INSPECTION_ITEM_UPDATED: "inspection_item_updated",
  INSPECTION_ITEM_PASSED: "inspection_item_passed",
  INSPECTION_ITEM_FAILED: "inspection_item_failed",
  INSPECTION_ITEM_NA: "inspection_item_na",

  // Inspection Completion
  INSPECTION_COMPLETION_ATTEMPT: "inspection_completion_attempt",
  INSPECTION_COMPLETED: "inspection_completed",
  INSPECTION_COMPLETION_FAILURE: "inspection_completion_failure",

  // Signature
  INSPECTION_SIGNATURE_CAPTURED: "inspection_signature_captured",
  INSPECTION_SIGNATURE_SUBMITTED: "inspection_signature_submitted",

  // Inspection View
  INSPECTION_SCREEN_VIEWED: "inspection_screen_viewed",
  INSPECTION_HISTORY_VIEWED: "inspection_history_viewed",
} as const

export const INSPECTION_PARAMS = {
  INSPECTION_TYPE: "inspection_type", // 'pre_trip', 'post_trip', 'dot'
  ITEM_ID: "item_id",
  ITEM_NAME: "item_name",
  ITEM_STATUS: "item_status", // 'pass', 'fail', 'na'
  TOTAL_ITEMS: "total_items",
  PASSED_ITEMS: "passed_items",
  FAILED_ITEMS: "failed_items",
  NA_ITEMS: "na_items",
  REQUIRED_ITEMS_PENDING: "required_items_pending",
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
} as const

// ============================================================================
// 7. NAVIGATION & SCREEN VIEWS
// ============================================================================

export const NAVIGATION_EVENTS = {
  // Screen Views (auto-tracked via Expo Router)
  SCREEN_VIEW: "screen_view",

  // Tab Navigation
  TAB_SELECTED: "tab_selected",

  // Deep Links
  DEEP_LINK_OPENED: "deep_link_opened",

  // Navigation Actions
  BACK_BUTTON_PRESSED: "navigation_back_pressed",
  MENU_OPENED: "navigation_menu_opened",
} as const

export const NAVIGATION_PARAMS = {
  SCREEN_NAME: "screen_name",
  SCREEN_CLASS: "screen_class",
  PREVIOUS_SCREEN: "previous_screen",
  TAB_NAME: "tab_name",
  DEEP_LINK_URL: "deep_link_url",
  DEEP_LINK_PARAMS: "deep_link_params",
} as const

// ============================================================================
// 8. SUPPORT & HELP
// ============================================================================

export const SUPPORT_EVENTS = {
  // Chat Support
  CHAT_SUPPORT_OPENED: "support_chat_opened",
  CHAT_MESSAGE_SENT: "support_chat_message_sent",
  CHAT_MESSAGE_RECEIVED: "support_chat_message_received",
  CHAT_CLOSED: "support_chat_closed",

  // Help & Documentation
  HELP_ACCESSED: "support_help_accessed",
  MANUAL_VIEWED: "support_manual_viewed",
  MANUAL_PDF_OPENED: "support_manual_pdf_opened",
  FAQ_VIEWED: "support_faq_viewed",

  // Contact
  CONTACT_SUPPORT_CLICKED: "support_contact_clicked",
} as const

export const SUPPORT_PARAMS = {
  CHAT_SESSION_ID: "chat_session_id",
  MESSAGE_LENGTH: "message_length",
  MANUAL_SECTION: "manual_section",
  FAQ_CATEGORY: "faq_category",
} as const

// ============================================================================
// 9. ERRORS & ISSUES
// ============================================================================

export const ERROR_EVENTS = {
  // API Errors
  API_ERROR: "error_api_error",
  API_TIMEOUT: "error_api_timeout",
  API_NETWORK_ERROR: "error_api_network_error",

  // ELD Errors
  ELD_ERROR: "error_eld_error",
  ELD_MALFUNCTION: "error_eld_malfunction",

  // App Errors
  APP_CRASH: "error_app_crash",
  APP_ERROR: "error_app_error",
  VALIDATION_ERROR: "error_validation_error",

  // Sync Errors
  SYNC_ERROR: "error_sync_error",
  SYNC_FAILURE: "error_sync_failure",
} as const

export const ERROR_PARAMS = {
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  ERROR_TYPE: "error_type",
  API_ENDPOINT: "api_endpoint",
  HTTP_STATUS_CODE: "http_status_code",
  STACK_TRACE: "stack_trace",
  MALFUNCTION_CODE: "malfunction_code",
  SYNC_TYPE: "sync_type", // 'location', 'obd', 'aws'
} as const

// ============================================================================
// 10. FEATURE USAGE
// ============================================================================

export const FEATURE_EVENTS = {
  // Settings
  SETTINGS_ACCESSED: "feature_settings_accessed",
  SETTINGS_CHANGED: "feature_settings_changed",

  // Profile
  PROFILE_VIEWED: "feature_profile_viewed",
  PROFILE_EDIT_ATTEMPT: "feature_profile_edit_attempt",
  PROFILE_EDIT_SUCCESS: "feature_profile_edit_success",
  PROFILE_EDIT_FAILURE: "feature_profile_edit_failure",

  // Notifications
  NOTIFICATIONS_VIEWED: "feature_notifications_viewed",
  NOTIFICATION_OPENED: "feature_notification_opened",
  NOTIFICATION_DISMISSED: "feature_notification_dismissed",

  // Assignments
  ASSIGNMENTS_VIEWED: "feature_assignments_viewed",
  ASSIGNMENT_SELECTED: "feature_assignment_selected",

  // Co-driver
  CO_DRIVER_VIEWED: "feature_co_driver_viewed",
  CO_DRIVER_OPERATION: "feature_co_driver_operation",

  // More Features
  MORE_SCREEN_VIEWED: "feature_more_screen_viewed",
} as const

export const FEATURE_PARAMS = {
  SETTING_NAME: "setting_name",
  SETTING_VALUE: "setting_value",
  NOTIFICATION_ID: "notification_id",
  NOTIFICATION_TYPE: "notification_type",
  ASSIGNMENT_ID: "assignment_id",
  CO_DRIVER_OPERATION_TYPE: "co_driver_operation_type",
} as const

// ============================================================================
// 11. DATA SYNC
// ============================================================================

export const SYNC_EVENTS = {
  // Location Sync
  LOCATION_BATCH_UPLOAD_ATTEMPT: "sync_location_batch_attempt",
  LOCATION_BATCH_UPLOAD_SUCCESS: "sync_location_batch_success",
  LOCATION_BATCH_UPLOAD_FAILURE: "sync_location_batch_failure",
  LOCATION_QUEUE_SIZE: "sync_location_queue_size",

  // OBD Data Sync
  OBD_SYNC_ATTEMPT: "sync_obd_attempt",
  OBD_SYNC_SUCCESS: "sync_obd_success",
  OBD_SYNC_FAILURE: "sync_obd_failure",

  // AWS Sync
  AWS_SYNC_ATTEMPT: "sync_aws_attempt",
  AWS_SYNC_SUCCESS: "sync_aws_success",
  AWS_SYNC_FAILURE: "sync_aws_failure",

  // Sync Retry
  SYNC_RETRY_ATTEMPT: "sync_retry_attempt",
  SYNC_RETRY_SUCCESS: "sync_retry_success",
  SYNC_RETRY_FAILURE: "sync_retry_failure",
} as const

export const SYNC_PARAMS = {
  SYNC_TYPE: "sync_type", // 'location', 'obd', 'aws'
  RECORD_COUNT: "record_count",
  BATCH_SIZE: "batch_size",
  SYNC_DURATION_MS: "sync_duration_ms",
  RETRY_COUNT: "retry_count",
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  QUEUE_SIZE: "queue_size",
} as const

// ============================================================================
// 12. USER ENGAGEMENT
// ============================================================================

export const ENGAGEMENT_EVENTS = {
  // Session
  SESSION_START: "engagement_session_start",
  SESSION_END: "engagement_session_end",

  // Time Tracking
  TIME_IN_APP: "engagement_time_in_app",
  TIME_ON_SCREEN: "engagement_time_on_screen",

  // Feature Discovery
  FEATURE_DISCOVERED: "engagement_feature_discovered",
  FEATURE_FIRST_USE: "engagement_feature_first_use",

  // User Actions
  BUTTON_CLICKED: "engagement_button_clicked",
  FORM_SUBMITTED: "engagement_form_submitted",
  FORM_ABANDONED: "engagement_form_abandoned",
} as const

export const ENGAGEMENT_PARAMS = {
  SESSION_DURATION_SECONDS: "session_duration_seconds",
  SCREEN_DURATION_SECONDS: "screen_duration_seconds",
  FEATURE_NAME: "feature_name",
  BUTTON_NAME: "button_name",
  BUTTON_LOCATION: "button_location",
  FORM_NAME: "form_name",
  FORM_COMPLETION_PERCENTAGE: "form_completion_percentage",
} as const

// ============================================================================
// ALL EVENTS (for easy iteration)
// ============================================================================

export const ALL_ANALYTICS_EVENTS = {
  ...AUTH_EVENTS,
  ...ELD_EVENTS,
  ...HOS_EVENTS,
  ...LOGS_EVENTS,
  ...FUEL_EVENTS,
  ...INSPECTION_EVENTS,
  ...NAVIGATION_EVENTS,
  ...SUPPORT_EVENTS,
  ...ERROR_EVENTS,
  ...FEATURE_EVENTS,
  ...SYNC_EVENTS,
  ...ENGAGEMENT_EVENTS,
} as const

// ============================================================================
// ALL PARAMS (for easy iteration)
// ============================================================================

export const ALL_ANALYTICS_PARAMS = {
  ...AUTH_PARAMS,
  ...ELD_PARAMS,
  ...HOS_PARAMS,
  ...LOGS_PARAMS,
  ...FUEL_PARAMS,
  ...INSPECTION_PARAMS,
  ...NAVIGATION_PARAMS,
  ...SUPPORT_PARAMS,
  ...ERROR_PARAMS,
  ...FEATURE_PARAMS,
  ...SYNC_PARAMS,
  ...ENGAGEMENT_PARAMS,
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AnalyticsEvent = (typeof ALL_ANALYTICS_EVENTS)[keyof typeof ALL_ANALYTICS_EVENTS]
export type AnalyticsParam = (typeof ALL_ANALYTICS_PARAMS)[keyof typeof ALL_ANALYTICS_PARAMS]
