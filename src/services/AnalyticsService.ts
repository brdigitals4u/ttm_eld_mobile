import { Platform } from "react-native"
import analytics from "@react-native-firebase/analytics"

import {
  AUTH_EVENTS,
  ELD_EVENTS,
  HOS_EVENTS,
  LOGS_EVENTS,
  FUEL_EVENTS,
  INSPECTION_EVENTS,
  NAVIGATION_EVENTS,
  SUPPORT_EVENTS,
  ERROR_EVENTS,
  FEATURE_EVENTS,
  SYNC_EVENTS,
  ENGAGEMENT_EVENTS,
} from "@/constants/analyticsEvents"

/**
 * Firebase Analytics Service
 *
 * Comprehensive analytics tracking for user behavior, app usage, and key events.
 * Designed to provide valuable insights for Customer Relationship teams.
 *
 * Events are automatically tracked for:
 * - Screen views (via Expo Router integration)
 * - User properties (driver ID, vehicle assignment, etc.)
 * - Custom events (login, ELD connection, HOS changes, etc.)
 */
class AnalyticsService {
  private initialized = false
  private sessionStartTime: number | null = null
  private screenStartTime: Map<string, number> = new Map()

  /**
   * Initialize Firebase Analytics
   * Should be called once at app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Enable analytics collection (enabled by default)
      await analytics().setAnalyticsCollectionEnabled(true)

      // Set default event parameters
      await analytics().setDefaultEventParameters({
        platform: Platform.OS,
        app_version: "1.0.0", // Update this dynamically if needed
      })

      this.initialized = true
      this.startSession()
      console.log("✅ Firebase Analytics initialized")
    } catch (error) {
      console.error("❌ Failed to initialize Firebase Analytics:", error)
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Track a screen view
   * @param screenName Name of the screen
   * @param screenClass Optional screen class
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    try {
      // End previous screen timing if any
      const previousScreen = Array.from(this.screenStartTime.keys())[0]
      if (previousScreen) {
        const startTime = this.screenStartTime.get(previousScreen)
        if (startTime) {
          const duration = Math.floor((Date.now() - startTime) / 1000)
          await this.logEvent(ENGAGEMENT_EVENTS.TIME_ON_SCREEN, {
            screen_name: previousScreen,
            screen_duration_seconds: duration,
          })
        }
        this.screenStartTime.clear()
      }

      // Start timing for new screen
      this.screenStartTime.set(screenName, Date.now())

      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      })

      // Also log as custom event for better filtering
      await this.logEvent(NAVIGATION_EVENTS.SCREEN_VIEW, {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      })
    } catch (error) {
      console.error("Error logging screen view:", error)
    }
  }

  /**
   * Log a custom event
   * @param eventName Name of the event
   * @param params Optional event parameters
   */
  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    try {
      // Sanitize parameters (Firebase has restrictions)
      const sanitizedParams = this.sanitizeParams(params)
      await analytics().logEvent(eventName, sanitizedParams)
    } catch (error) {
      console.error(`Error logging event ${eventName}:`, error)
    }
  }

  /**
   * Sanitize parameters for Firebase Analytics
   * Firebase has restrictions on parameter names and values
   */
  private sanitizeParams(params?: Record<string, any>): Record<string, any> | undefined {
    if (!params) return undefined

    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(params)) {
      // Parameter names: max 40 chars, alphanumeric + underscore
      const sanitizedKey = key
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .substring(0, 40)
        .toLowerCase()

      // Parameter values: strings max 100 chars, numbers, booleans
      if (typeof value === "string") {
        sanitized[sanitizedKey] = value.substring(0, 100)
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[sanitizedKey] = value
      } else if (value != null) {
        sanitized[sanitizedKey] = String(value).substring(0, 100)
      }
    }

    return sanitized
  }

  /**
   * Set a user property
   * @param name Property name
   * @param value Property value
   */
  async setUserProperty(name: string, value: string | null): Promise<void> {
    try {
      await analytics().setUserProperty(name, value)
    } catch (error) {
      console.error(`Error setting user property ${name}:`, error)
    }
  }

  /**
   * Set user ID for analytics
   * @param userId User ID (driver ID, etc.)
   */
  async setUserId(userId: string | null): Promise<void> {
    try {
      await analytics().setUserId(userId)
    } catch (error) {
      console.error("Error setting user ID:", error)
    }
  }

  /**
   * Reset analytics data (useful for logout)
   */
  async resetAnalyticsData(): Promise<void> {
    try {
      await analytics().resetAnalyticsData()
      this.endSession()
    } catch (error) {
      console.error("Error resetting analytics data:", error)
    }
  }

  // ============================================================================
  // SESSION TRACKING
  // ============================================================================

  private startSession(): void {
    this.sessionStartTime = Date.now()
    this.logEvent(ENGAGEMENT_EVENTS.SESSION_START).catch(() => {})
  }

  private endSession(): void {
    if (this.sessionStartTime) {
      const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000)
      this.logEvent(ENGAGEMENT_EVENTS.SESSION_END, {
        session_duration_seconds: duration,
      }).catch(() => {})
      this.sessionStartTime = null
    }
  }

  // ============================================================================
  // 1. AUTHENTICATION & ONBOARDING
  // ============================================================================

  async logLoginAttempt(method?: string, tenantCode?: string): Promise<void> {
    await this.logEvent(AUTH_EVENTS.LOGIN_ATTEMPT, {
      method: method || "unknown",
      tenant_code: tenantCode,
    })
  }

  async logLoginSuccess(method?: string, tenantCode?: string): Promise<void> {
    await this.logEvent(AUTH_EVENTS.LOGIN_SUCCESS, {
      method: method || "unknown",
      tenant_code: tenantCode,
    })
  }

  async logLoginFailure(method?: string, errorCode?: string, errorMessage?: string): Promise<void> {
    await this.logEvent(AUTH_EVENTS.LOGIN_FAILURE, {
      method: method || "unknown",
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logLogout(): Promise<void> {
    this.endSession()
    await this.logEvent(AUTH_EVENTS.LOGOUT)
  }

  async logPrivacyPolicyViewed(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.PRIVACY_POLICY_VIEWED)
  }

  async logPrivacyPolicyAccepted(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.PRIVACY_POLICY_ACCEPTED)
  }

  async logPrivacyPolicyDeclined(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.PRIVACY_POLICY_DECLINED)
  }

  async logWelcomeScreenViewed(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.WELCOME_SCREEN_VIEWED)
  }

  async logWelcomeScreenSkipped(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.WELCOME_SCREEN_SKIPPED)
  }

  async logWelcomeScreenCompleted(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.WELCOME_SCREEN_COMPLETED)
  }

  async logRememberMeEnabled(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.REMEMBER_ME_ENABLED)
  }

  async logRememberMeDisabled(): Promise<void> {
    await this.logEvent(AUTH_EVENTS.REMEMBER_ME_DISABLED)
  }

  // ============================================================================
  // 2. ELD DEVICE MANAGEMENT
  // ============================================================================

  async logDeviceScanStarted(): Promise<void> {
    await this.logEvent(ELD_EVENTS.DEVICE_SCAN_STARTED)
  }

  async logDeviceScanStopped(durationSeconds?: number, devicesFound?: number): Promise<void> {
    await this.logEvent(ELD_EVENTS.DEVICE_SCAN_STOPPED, {
      scan_duration_seconds: durationSeconds,
      devices_found_count: devicesFound,
    })
  }

  async logDeviceFound(
    deviceId: string,
    deviceName: string,
    signalStrength?: number,
  ): Promise<void> {
    await this.logEvent(ELD_EVENTS.DEVICE_FOUND, {
      device_id: deviceId,
      device_name: deviceName,
      signal_strength: signalStrength,
    })
  }

  async logDeviceScanFailed(errorMessage?: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.DEVICE_SCAN_FAILED, {
      error_message: errorMessage,
    })
  }

  async logConnectionAttempt(deviceId: string, deviceName?: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.CONNECTION_ATTEMPT, {
      device_id: deviceId,
      device_name: deviceName,
    })
  }

  async logConnectionSuccess(
    deviceId: string,
    connectionType: string = "bluetooth",
  ): Promise<void> {
    await this.logEvent(ELD_EVENTS.CONNECTION_SUCCESS, {
      device_id: deviceId,
      connection_type: connectionType,
    })
  }

  async logConnectionFailure(
    deviceId: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(ELD_EVENTS.CONNECTION_FAILURE, {
      device_id: deviceId,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logConnectionTimeout(deviceId: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.CONNECTION_TIMEOUT, {
      device_id: deviceId,
    })
  }

  async logAuthenticationAttempt(deviceId: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.AUTHENTICATION_ATTEMPT, {
      device_id: deviceId,
    })
  }

  async logAuthenticationSuccess(deviceId: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.AUTHENTICATION_SUCCESS, {
      device_id: deviceId,
    })
  }

  async logAuthenticationFailure(deviceId: string, errorMessage?: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.AUTHENTICATION_FAILURE, {
      device_id: deviceId,
      error_message: errorMessage,
    })
  }

  async logDisconnectionManual(deviceId: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.DISCONNECTION_MANUAL, {
      device_id: deviceId,
    })
  }

  async logDisconnectionAutomatic(deviceId: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.DISCONNECTION_AUTOMATIC, {
      device_id: deviceId,
    })
  }

  async logDisconnectionError(deviceId: string, errorMessage?: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.DISCONNECTION_ERROR, {
      device_id: deviceId,
      error_message: errorMessage,
    })
  }

  async logConnectionDuration(deviceId: string, durationSeconds: number): Promise<void> {
    await this.logEvent(ELD_EVENTS.CONNECTION_DURATION, {
      device_id: deviceId,
      connection_duration_seconds: durationSeconds,
    })
  }

  async logDeviceError(deviceId: string, errorCode?: string, errorMessage?: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.DEVICE_ERROR, {
      device_id: deviceId,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logEldMalfunction(malfunctionCode: string, deviceId?: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.DEVICE_MALFUNCTION, {
      malfunction_code: malfunctionCode,
      device_id: deviceId,
    })
  }

  async logEldReportingStarted(deviceId: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.ELD_REPORTING_STARTED, {
      device_id: deviceId,
    })
  }

  async logEldReportingStopped(deviceId: string): Promise<void> {
    await this.logEvent(ELD_EVENTS.ELD_REPORTING_STOPPED, {
      device_id: deviceId,
    })
  }

  async logEldDataReceived(deviceId: string, dataCount?: number): Promise<void> {
    await this.logEvent(ELD_EVENTS.ELD_DATA_RECEIVED, {
      device_id: deviceId,
      data_count: dataCount,
    })
  }

  // ============================================================================
  // 3. HOS (HOURS OF SERVICE)
  // ============================================================================

  async logStatusChangeAttempt(fromStatus: string, toStatus: string): Promise<void> {
    await this.logEvent(HOS_EVENTS.STATUS_CHANGE_ATTEMPT, {
      from_status: fromStatus,
      to_status: toStatus,
    })
  }

  async logStatusChangeSuccess(
    fromStatus: string,
    toStatus: string,
    location?: { latitude: number; longitude: number },
    odometer?: number,
  ): Promise<void> {
    await this.logEvent(HOS_EVENTS.STATUS_CHANGE_SUCCESS, {
      from_status: fromStatus,
      to_status: toStatus,
      location_latitude: location?.latitude,
      location_longitude: location?.longitude,
      odometer,
    })

    // Also log specific status transition events
    if (toStatus === "driving") {
      await this.logEvent(HOS_EVENTS.STATUS_TO_DRIVING, { from_status: fromStatus })
    } else if (toStatus === "on_duty") {
      await this.logEvent(HOS_EVENTS.STATUS_TO_ON_DUTY, { from_status: fromStatus })
    } else if (toStatus === "off_duty") {
      await this.logEvent(HOS_EVENTS.STATUS_TO_OFF_DUTY, { from_status: fromStatus })
    } else if (toStatus === "sleeper_berth") {
      await this.logEvent(HOS_EVENTS.STATUS_TO_SLEEPER_BERTH, { from_status: fromStatus })
    }
  }

  async logStatusChangeFailure(
    fromStatus: string,
    toStatus: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(HOS_EVENTS.STATUS_CHANGE_FAILURE, {
      from_status: fromStatus,
      to_status: toStatus,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logHosScreenViewed(): Promise<void> {
    await this.logEvent(HOS_EVENTS.HOS_SCREEN_VIEWED)
  }

  async logHosClockViewed(): Promise<void> {
    await this.logEvent(HOS_EVENTS.HOS_CLOCK_VIEWED)
  }

  async logHosTimeRemainingViewed(
    drivingTimeRemaining?: number,
    onDutyTimeRemaining?: number,
    cycleTimeRemaining?: number,
  ): Promise<void> {
    await this.logEvent(HOS_EVENTS.HOS_TIME_REMAINING_VIEWED, {
      driving_time_remaining: drivingTimeRemaining,
      on_duty_time_remaining: onDutyTimeRemaining,
      cycle_time_remaining: cycleTimeRemaining,
    })
  }

  async logViolationViewed(violationType?: string, severity?: string): Promise<void> {
    await this.logEvent(HOS_EVENTS.VIOLATION_VIEWED, {
      violation_type: violationType,
      violation_severity: severity,
    })
  }

  async logViolationWarning(violationType?: string): Promise<void> {
    await this.logEvent(HOS_EVENTS.VIOLATION_WARNING, {
      violation_type: violationType,
    })
  }

  async logViolationAlert(violationType?: string): Promise<void> {
    await this.logEvent(HOS_EVENTS.VIOLATION_ALERT, {
      violation_type: violationType,
    })
  }

  async logComplianceWarning(): Promise<void> {
    await this.logEvent(HOS_EVENTS.COMPLIANCE_WARNING)
  }

  async logComplianceSettingsViewed(): Promise<void> {
    await this.logEvent(HOS_EVENTS.COMPLIANCE_SETTINGS_VIEWED)
  }

  // ============================================================================
  // 4. LOGS & CERTIFICATION
  // ============================================================================

  async logLogsScreenViewed(): Promise<void> {
    await this.logEvent(LOGS_EVENTS.LOGS_SCREEN_VIEWED)
  }

  async logDailyLogViewed(logDate: string, entryCount?: number): Promise<void> {
    await this.logEvent(LOGS_EVENTS.DAILY_LOG_VIEWED, {
      log_date: logDate,
      log_entry_count: entryCount,
    })
  }

  async logLogEntryViewed(logDate: string): Promise<void> {
    await this.logEvent(LOGS_EVENTS.LOG_ENTRY_VIEWED, {
      log_date: logDate,
    })
  }

  async logLogDateChanged(fromDate: string, toDate: string): Promise<void> {
    await this.logEvent(LOGS_EVENTS.LOG_DATE_CHANGED, {
      from_date: fromDate,
      to_date: toDate,
    })
  }

  async logCertificationAttempt(logDate: string): Promise<void> {
    await this.logEvent(LOGS_EVENTS.CERTIFICATION_ATTEMPT, {
      log_date: logDate,
    })
  }

  async logCertificationSuccess(logDate: string, certifiedCount?: number): Promise<void> {
    await this.logEvent(LOGS_EVENTS.CERTIFICATION_SUCCESS, {
      log_date: logDate,
      certified_count: certifiedCount,
    })
  }

  async logCertificationFailure(
    logDate: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(LOGS_EVENTS.CERTIFICATION_FAILURE, {
      log_date: logDate,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logCertificationAllAttempt(): Promise<void> {
    await this.logEvent(LOGS_EVENTS.CERTIFICATION_ALL_ATTEMPT)
  }

  async logCertificationAllSuccess(certifiedCount?: number): Promise<void> {
    await this.logEvent(LOGS_EVENTS.CERTIFICATION_ALL_SUCCESS, {
      certified_count: certifiedCount,
    })
  }

  async logTransferAttempt(method: string): Promise<void> {
    await this.logEvent(LOGS_EVENTS.TRANSFER_ATTEMPT, {
      transfer_method: method,
    })
  }

  async logTransferSuccess(method: string): Promise<void> {
    await this.logEvent(LOGS_EVENTS.TRANSFER_SUCCESS, {
      transfer_method: method,
    })
  }

  async logTransferFailure(
    method: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(LOGS_EVENTS.TRANSFER_FAILURE, {
      transfer_method: method,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logTransferMethodSelected(method: string): Promise<void> {
    await this.logEvent(LOGS_EVENTS.TRANSFER_METHOD_SELECTED, {
      transfer_method: method,
    })
  }

  async logInspectorModeAccessed(): Promise<void> {
    await this.logEvent(LOGS_EVENTS.INSPECTOR_MODE_ACCESSED)
  }

  async logInspectorModeExited(): Promise<void> {
    await this.logEvent(LOGS_EVENTS.INSPECTOR_MODE_EXITED)
  }

  async logEldMaterialsAccessed(): Promise<void> {
    await this.logEvent(LOGS_EVENTS.ELD_MATERIALS_ACCESSED)
  }

  // ============================================================================
  // 5. FUEL MANAGEMENT
  // ============================================================================

  async logFuelScreenViewed(): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_SCREEN_VIEWED)
  }

  async logFuelPurchasesViewed(): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_PURCHASES_VIEWED)
  }

  async logFuelStatisticsViewed(): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_STATISTICS_VIEWED)
  }

  async logFuelPurchaseCreateAttempt(): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_PURCHASE_CREATE_ATTEMPT)
  }

  async logFuelPurchaseCreateSuccess(amount?: number, gallons?: number): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_PURCHASE_CREATE_SUCCESS, {
      fuel_amount: amount,
      gallons,
    })
  }

  async logFuelPurchaseCreateFailure(errorCode?: string, errorMessage?: string): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_PURCHASE_CREATE_FAILURE, {
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logFuelPurchaseViewed(purchaseId?: string): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_PURCHASE_VIEWED, {
      purchase_id: purchaseId,
    })
  }

  async logFuelPurchaseEdited(purchaseId?: string): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_PURCHASE_EDITED, {
      purchase_id: purchaseId,
    })
  }

  async logReceiptUploadAttempt(purchaseId?: string): Promise<void> {
    await this.logEvent(FUEL_EVENTS.RECEIPT_UPLOAD_ATTEMPT, {
      purchase_id: purchaseId,
    })
  }

  async logReceiptUploadSuccess(purchaseId?: string, receiptSizeBytes?: number): Promise<void> {
    await this.logEvent(FUEL_EVENTS.RECEIPT_UPLOAD_SUCCESS, {
      purchase_id: purchaseId,
      receipt_size_bytes: receiptSizeBytes,
    })
  }

  async logReceiptUploadFailure(
    purchaseId?: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(FUEL_EVENTS.RECEIPT_UPLOAD_FAILURE, {
      purchase_id: purchaseId,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logReceiptViewed(purchaseId?: string): Promise<void> {
    await this.logEvent(FUEL_EVENTS.RECEIPT_VIEWED, {
      purchase_id: purchaseId,
    })
  }

  async logFuelSearchPerformed(): Promise<void> {
    await this.logEvent(FUEL_EVENTS.FUEL_SEARCH_PERFORMED)
  }

  // ============================================================================
  // 6. INSPECTIONS (DVIR)
  // ============================================================================

  async logInspectionStarted(inspectionType: "pre_trip" | "post_trip" | "dot"): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_STARTED, {
      inspection_type: inspectionType,
    })
  }

  async logInspectionTypeSelected(inspectionType: "pre_trip" | "post_trip" | "dot"): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_TYPE_SELECTED, {
      inspection_type: inspectionType,
    })
  }

  async logInspectionItemUpdated(
    itemId: string,
    itemName: string,
    status: "pass" | "fail" | "na",
  ): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_ITEM_UPDATED, {
      item_id: itemId,
      item_name: itemName,
      item_status: status,
    })

    // Also log specific status events
    if (status === "pass") {
      await this.logEvent(INSPECTION_EVENTS.INSPECTION_ITEM_PASSED, {
        item_id: itemId,
        item_name: itemName,
      })
    } else if (status === "fail") {
      await this.logEvent(INSPECTION_EVENTS.INSPECTION_ITEM_FAILED, {
        item_id: itemId,
        item_name: itemName,
      })
    } else if (status === "na") {
      await this.logEvent(INSPECTION_EVENTS.INSPECTION_ITEM_NA, {
        item_id: itemId,
        item_name: itemName,
      })
    }
  }

  async logInspectionCompletionAttempt(
    inspectionType: string,
    totalItems: number,
    passedItems: number,
    failedItems: number,
    naItems: number,
    requiredItemsPending: number,
  ): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_COMPLETION_ATTEMPT, {
      inspection_type: inspectionType,
      total_items: totalItems,
      passed_items: passedItems,
      failed_items: failedItems,
      na_items: naItems,
      required_items_pending: requiredItemsPending,
    })
  }

  async logInspectionCompleted(
    inspectionType: string,
    totalItems: number,
    passedItems: number,
    failedItems: number,
  ): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_COMPLETED, {
      inspection_type: inspectionType,
      total_items: totalItems,
      passed_items: passedItems,
      failed_items: failedItems,
    })
  }

  async logInspectionCompletionFailure(
    inspectionType: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_COMPLETION_FAILURE, {
      inspection_type: inspectionType,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logInspectionSignatureCaptured(inspectionType: string): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_SIGNATURE_CAPTURED, {
      inspection_type: inspectionType,
    })
  }

  async logInspectionSignatureSubmitted(inspectionType: string): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_SIGNATURE_SUBMITTED, {
      inspection_type: inspectionType,
    })
  }

  async logInspectionScreenViewed(): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_SCREEN_VIEWED)
  }

  async logInspectionHistoryViewed(): Promise<void> {
    await this.logEvent(INSPECTION_EVENTS.INSPECTION_HISTORY_VIEWED)
  }

  // ============================================================================
  // 7. NAVIGATION & SCREEN VIEWS
  // ============================================================================

  async logTabSelected(tabName: string): Promise<void> {
    await this.logEvent(NAVIGATION_EVENTS.TAB_SELECTED, {
      tab_name: tabName,
    })
  }

  async logDeepLinkOpened(url: string, params?: Record<string, any>): Promise<void> {
    await this.logEvent(NAVIGATION_EVENTS.DEEP_LINK_OPENED, {
      deep_link_url: url,
      deep_link_params: JSON.stringify(params),
    })
  }

  async logBackButtonPressed(screenName: string): Promise<void> {
    await this.logEvent(NAVIGATION_EVENTS.BACK_BUTTON_PRESSED, {
      screen_name: screenName,
    })
  }

  async logMenuOpened(): Promise<void> {
    await this.logEvent(NAVIGATION_EVENTS.MENU_OPENED)
  }

  // ============================================================================
  // 8. SUPPORT & HELP
  // ============================================================================

  async logChatSupportOpened(sessionId?: string): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.CHAT_SUPPORT_OPENED, {
      chat_session_id: sessionId,
    })
  }

  async logChatMessageSent(sessionId?: string, messageLength?: number): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.CHAT_MESSAGE_SENT, {
      chat_session_id: sessionId,
      message_length: messageLength,
    })
  }

  async logChatMessageReceived(sessionId?: string): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.CHAT_MESSAGE_RECEIVED, {
      chat_session_id: sessionId,
    })
  }

  async logChatClosed(sessionId?: string): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.CHAT_CLOSED, {
      chat_session_id: sessionId,
    })
  }

  async logHelpAccessed(): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.HELP_ACCESSED)
  }

  async logManualViewed(section?: string): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.MANUAL_VIEWED, {
      manual_section: section,
    })
  }

  async logManualPdfOpened(section?: string): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.MANUAL_PDF_OPENED, {
      manual_section: section,
    })
  }

  async logFaqViewed(category?: string): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.FAQ_VIEWED, {
      faq_category: category,
    })
  }

  async logContactSupportClicked(): Promise<void> {
    await this.logEvent(SUPPORT_EVENTS.CONTACT_SUPPORT_CLICKED)
  }

  // ============================================================================
  // 9. ERRORS & ISSUES
  // ============================================================================

  async logApiError(
    endpoint: string,
    statusCode?: number,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(ERROR_EVENTS.API_ERROR, {
      api_endpoint: endpoint,
      http_status_code: statusCode,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logApiTimeout(endpoint: string): Promise<void> {
    await this.logEvent(ERROR_EVENTS.API_TIMEOUT, {
      api_endpoint: endpoint,
    })
  }

  async logApiNetworkError(endpoint: string, errorMessage?: string): Promise<void> {
    await this.logEvent(ERROR_EVENTS.API_NETWORK_ERROR, {
      api_endpoint: endpoint,
      error_message: errorMessage,
    })
  }

  async logEldError(deviceId: string, errorCode?: string, errorMessage?: string): Promise<void> {
    await this.logEvent(ERROR_EVENTS.ELD_ERROR, {
      device_id: deviceId,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logEldMalfunctionError(malfunctionCode: string, deviceId?: string): Promise<void> {
    await this.logEvent(ERROR_EVENTS.ELD_MALFUNCTION, {
      malfunction_code: malfunctionCode,
      device_id: deviceId,
    })
  }

  async logAppCrash(errorMessage: string, stackTrace?: string): Promise<void> {
    await this.logEvent(ERROR_EVENTS.APP_CRASH, {
      error_message: errorMessage,
      stack_trace: stackTrace,
    })
  }

  async logAppError(errorType: string, errorMessage: string, stackTrace?: string): Promise<void> {
    await this.logEvent(ERROR_EVENTS.APP_ERROR, {
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace,
    })
  }

  async logValidationError(field: string, errorMessage: string): Promise<void> {
    await this.logEvent(ERROR_EVENTS.VALIDATION_ERROR, {
      error_type: "validation",
      error_message: `${field}: ${errorMessage}`,
    })
  }

  async logSyncError(
    syncType: "location" | "obd" | "aws",
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(ERROR_EVENTS.SYNC_ERROR, {
      sync_type: syncType,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logSyncFailure(
    syncType: "location" | "obd" | "aws",
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(ERROR_EVENTS.SYNC_FAILURE, {
      sync_type: syncType,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  // ============================================================================
  // 10. FEATURE USAGE
  // ============================================================================

  async logSettingsAccessed(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.SETTINGS_ACCESSED)
  }

  async logSettingsChanged(settingName: string, settingValue: string): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.SETTINGS_CHANGED, {
      setting_name: settingName,
      setting_value: settingValue,
    })
  }

  async logProfileViewed(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.PROFILE_VIEWED)
  }

  async logProfileEditAttempt(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.PROFILE_EDIT_ATTEMPT)
  }

  async logProfileEditSuccess(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.PROFILE_EDIT_SUCCESS)
  }

  async logProfileEditFailure(errorCode?: string, errorMessage?: string): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.PROFILE_EDIT_FAILURE, {
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logNotificationsViewed(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.NOTIFICATIONS_VIEWED)
  }

  async logNotificationOpened(notificationId: string, notificationType?: string): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.NOTIFICATION_OPENED, {
      notification_id: notificationId,
      notification_type: notificationType,
    })
  }

  async logNotificationDismissed(notificationId: string): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.NOTIFICATION_DISMISSED, {
      notification_id: notificationId,
    })
  }

  async logAssignmentsViewed(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.ASSIGNMENTS_VIEWED)
  }

  async logAssignmentSelected(assignmentId: string): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.ASSIGNMENT_SELECTED, {
      assignment_id: assignmentId,
    })
  }

  async logCoDriverViewed(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.CO_DRIVER_VIEWED)
  }

  async logCoDriverOperation(operationType: string): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.CO_DRIVER_OPERATION, {
      co_driver_operation_type: operationType,
    })
  }

  async logMoreScreenViewed(): Promise<void> {
    await this.logEvent(FEATURE_EVENTS.MORE_SCREEN_VIEWED)
  }

  // ============================================================================
  // 11. DATA SYNC
  // ============================================================================

  async logLocationBatchUploadAttempt(recordCount: number, queueSize?: number): Promise<void> {
    await this.logEvent(SYNC_EVENTS.LOCATION_BATCH_UPLOAD_ATTEMPT, {
      record_count: recordCount,
      queue_size: queueSize,
    })
  }

  async logLocationBatchUploadSuccess(recordCount: number, durationMs?: number): Promise<void> {
    await this.logEvent(SYNC_EVENTS.LOCATION_BATCH_UPLOAD_SUCCESS, {
      record_count: recordCount,
      sync_duration_ms: durationMs,
    })
  }

  async logLocationBatchUploadFailure(
    recordCount: number,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(SYNC_EVENTS.LOCATION_BATCH_UPLOAD_FAILURE, {
      record_count: recordCount,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logLocationQueueSize(queueSize: number): Promise<void> {
    await this.logEvent(SYNC_EVENTS.LOCATION_QUEUE_SIZE, {
      queue_size: queueSize,
    })
  }

  async logObdSyncAttempt(recordCount: number): Promise<void> {
    await this.logEvent(SYNC_EVENTS.OBD_SYNC_ATTEMPT, {
      record_count: recordCount,
    })
  }

  async logObdSyncSuccess(recordCount: number, durationMs?: number): Promise<void> {
    await this.logEvent(SYNC_EVENTS.OBD_SYNC_SUCCESS, {
      record_count: recordCount,
      sync_duration_ms: durationMs,
    })
  }

  async logObdSyncFailure(
    recordCount: number,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(SYNC_EVENTS.OBD_SYNC_FAILURE, {
      record_count: recordCount,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logAwsSyncAttempt(recordCount: number): Promise<void> {
    await this.logEvent(SYNC_EVENTS.AWS_SYNC_ATTEMPT, {
      record_count: recordCount,
    })
  }

  async logAwsSyncSuccess(recordCount: number, durationMs?: number): Promise<void> {
    await this.logEvent(SYNC_EVENTS.AWS_SYNC_SUCCESS, {
      record_count: recordCount,
      sync_duration_ms: durationMs,
    })
  }

  async logAwsSyncFailure(
    recordCount: number,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logEvent(SYNC_EVENTS.AWS_SYNC_FAILURE, {
      record_count: recordCount,
      error_code: errorCode,
      error_message: errorMessage,
    })
  }

  async logSyncRetryAttempt(
    syncType: "location" | "obd" | "aws",
    retryCount: number,
  ): Promise<void> {
    await this.logEvent(SYNC_EVENTS.SYNC_RETRY_ATTEMPT, {
      sync_type: syncType,
      retry_count: retryCount,
    })
  }

  async logSyncRetrySuccess(
    syncType: "location" | "obd" | "aws",
    retryCount: number,
  ): Promise<void> {
    await this.logEvent(SYNC_EVENTS.SYNC_RETRY_SUCCESS, {
      sync_type: syncType,
      retry_count: retryCount,
    })
  }

  async logSyncRetryFailure(
    syncType: "location" | "obd" | "aws",
    retryCount: number,
    errorCode?: string,
  ): Promise<void> {
    await this.logEvent(SYNC_EVENTS.SYNC_RETRY_FAILURE, {
      sync_type: syncType,
      retry_count: retryCount,
      error_code: errorCode,
    })
  }

  // ============================================================================
  // 12. USER ENGAGEMENT
  // ============================================================================

  async logButtonClicked(
    buttonName: string,
    buttonLocation: string,
    screenName?: string,
  ): Promise<void> {
    await this.logEvent(ENGAGEMENT_EVENTS.BUTTON_CLICKED, {
      button_name: buttonName,
      button_location: buttonLocation,
      screen_name: screenName,
    })
  }

  async logFormSubmitted(formName: string, screenName?: string): Promise<void> {
    await this.logEvent(ENGAGEMENT_EVENTS.FORM_SUBMITTED, {
      form_name: formName,
      screen_name: screenName,
    })
  }

  async logFormAbandoned(
    formName: string,
    completionPercentage: number,
    screenName?: string,
  ): Promise<void> {
    await this.logEvent(ENGAGEMENT_EVENTS.FORM_ABANDONED, {
      form_name: formName,
      form_completion_percentage: completionPercentage,
      screen_name: screenName,
    })
  }

  async logFeatureDiscovered(featureName: string): Promise<void> {
    await this.logEvent(ENGAGEMENT_EVENTS.FEATURE_DISCOVERED, {
      feature_name: featureName,
    })
  }

  async logFeatureFirstUse(featureName: string): Promise<void> {
    await this.logEvent(ENGAGEMENT_EVENTS.FEATURE_FIRST_USE, {
      feature_name: featureName,
    })
  }

  // ============================================================================
  // LEGACY METHODS (for backward compatibility)
  // ============================================================================

  /**
   * @deprecated Use logLoginSuccess instead
   */
  async logLogin(method?: string): Promise<void> {
    await this.logLoginSuccess(method)
  }

  /**
   * @deprecated Use logConnectionSuccess instead
   */
  async logEldConnection(deviceId: string, connectionType: string = "bluetooth"): Promise<void> {
    await this.logConnectionSuccess(deviceId, connectionType)
  }

  /**
   * @deprecated Use logDisconnectionManual or logDisconnectionAutomatic instead
   */
  async logEldDisconnection(deviceId: string): Promise<void> {
    await this.logDisconnectionAutomatic(deviceId)
  }

  /**
   * @deprecated Use logStatusChangeSuccess instead
   */
  async logHosStatusChange(fromStatus: string, toStatus: string): Promise<void> {
    await this.logStatusChangeSuccess(fromStatus, toStatus)
  }

  /**
   * @deprecated Use logCertificationSuccess instead
   */
  async logLogCertification(logDate: string): Promise<void> {
    await this.logCertificationSuccess(logDate)
  }

  /**
   * @deprecated Use logLocationBatchUploadSuccess instead
   */
  async logLocationBatchUpload(locationCount: number): Promise<void> {
    await this.logLocationBatchUploadSuccess(locationCount)
  }

  /**
   * @deprecated Use logEldMalfunctionError instead
   */
  async logEldMalfunction(malfunctionCode: string): Promise<void> {
    await this.logEldMalfunctionError(malfunctionCode)
  }

  /**
   * @deprecated Use logAppError instead
   */
  async logError(errorMessage: string, errorType?: string): Promise<void> {
    await this.logAppError(errorType || "unknown", errorMessage)
  }

  /**
   * Set driver properties for analytics
   * @param driverId Driver ID
   * @param vehicleId Vehicle ID (optional)
   * @param organizationId Organization ID (optional)
   */
  async setDriverProperties(
    driverId: string,
    vehicleId?: string,
    organizationId?: string,
  ): Promise<void> {
    await this.setUserId(driverId)
    await this.setUserProperty("driver_id", driverId)

    if (vehicleId) {
      await this.setUserProperty("vehicle_id", vehicleId)
    }

    if (organizationId) {
      await this.setUserProperty("organization_id", organizationId)
    }
  }

  /**
   * Clear driver properties (on logout)
   */
  async clearDriverProperties(): Promise<void> {
    await this.setUserId(null)
    await this.setUserProperty("driver_id", null)
    await this.setUserProperty("vehicle_id", null)
    await this.setUserProperty("organization_id", null)
    await this.resetAnalyticsData()
  }
}

export const analyticsService = new AnalyticsService()
