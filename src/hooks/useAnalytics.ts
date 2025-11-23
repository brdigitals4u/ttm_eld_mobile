/**
 * useAnalytics Hook
 * 
 * React hook for easy analytics tracking in components.
 * Provides convenient access to analytics service methods.
 */

import { useCallback } from 'react'
import { analyticsService } from '@/services/AnalyticsService'
import { useRouter, usePathname } from 'expo-router'
import { useEffect } from 'react'

/**
 * Hook for tracking analytics events
 * Automatically tracks screen views when the component mounts
 * 
 * @param screenName Optional screen name for automatic tracking
 * @returns Analytics service methods
 */
export function useAnalytics(screenName?: string) {
  const router = useRouter()
  const pathname = usePathname()

  // Auto-track screen view when screen name is provided
  useEffect(() => {
    if (screenName) {
      analyticsService.logScreenView(screenName).catch(() => {})
    } else if (pathname) {
      // Use pathname as fallback
      const screenNameFromPath = pathname.split('/').pop() || pathname
      analyticsService.logScreenView(screenNameFromPath).catch(() => {})
    }
  }, [screenName, pathname])

  // Wrapper functions for common analytics operations
  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    return analyticsService.logEvent(eventName, params)
  }, [])

  const trackScreenView = useCallback((name: string, screenClass?: string) => {
    return analyticsService.logScreenView(name, screenClass)
  }, [])

  const trackButtonClick = useCallback((buttonName: string, buttonLocation: string, screenName?: string) => {
    return analyticsService.logButtonClicked(buttonName, buttonLocation, screenName)
  }, [])

  const trackError = useCallback((errorMessage: string, errorType?: string) => {
    return analyticsService.logAppError(errorType || 'unknown', errorMessage)
  }, [])

  return {
    // Core methods
    trackEvent,
    trackScreenView,
    trackButtonClick,
    trackError,
    
    // Auth methods
    logLoginAttempt: analyticsService.logLoginAttempt.bind(analyticsService),
    logLoginSuccess: analyticsService.logLoginSuccess.bind(analyticsService),
    logLoginFailure: analyticsService.logLoginFailure.bind(analyticsService),
    logLogout: analyticsService.logLogout.bind(analyticsService),
    
    // ELD methods
    logDeviceScanStarted: analyticsService.logDeviceScanStarted.bind(analyticsService),
    logDeviceFound: analyticsService.logDeviceFound.bind(analyticsService),
    logConnectionSuccess: analyticsService.logConnectionSuccess.bind(analyticsService),
    logConnectionFailure: analyticsService.logConnectionFailure.bind(analyticsService),
    logDisconnectionManual: analyticsService.logDisconnectionManual.bind(analyticsService),
    
    // HOS methods
    logStatusChangeAttempt: analyticsService.logStatusChangeAttempt.bind(analyticsService),
    logStatusChangeSuccess: analyticsService.logStatusChangeSuccess.bind(analyticsService),
    logStatusChangeFailure: analyticsService.logStatusChangeFailure.bind(analyticsService),
    
    // Logs methods
    logLogsScreenViewed: analyticsService.logLogsScreenViewed.bind(analyticsService),
    logCertificationAttempt: analyticsService.logCertificationAttempt.bind(analyticsService),
    logCertificationSuccess: analyticsService.logCertificationSuccess.bind(analyticsService),
    
    // Fuel methods
    logFuelScreenViewed: analyticsService.logFuelScreenViewed.bind(analyticsService),
    logFuelPurchaseCreateAttempt: analyticsService.logFuelPurchaseCreateAttempt.bind(analyticsService),
    logFuelPurchaseCreateSuccess: analyticsService.logFuelPurchaseCreateSuccess.bind(analyticsService),
    
    // Inspection methods
    logInspectionStarted: analyticsService.logInspectionStarted.bind(analyticsService),
    logInspectionCompleted: analyticsService.logInspectionCompleted.bind(analyticsService),
    
    // Support methods
    logChatSupportOpened: analyticsService.logChatSupportOpened.bind(analyticsService),
    logChatMessageSent: analyticsService.logChatMessageSent.bind(analyticsService),
    
    // Sync methods
    logLocationBatchUploadAttempt: analyticsService.logLocationBatchUploadAttempt.bind(analyticsService),
    logLocationBatchUploadSuccess: analyticsService.logLocationBatchUploadSuccess.bind(analyticsService),
    logLocationBatchUploadFailure: analyticsService.logLocationBatchUploadFailure.bind(analyticsService),
    
    // Feature methods
    logSettingsAccessed: analyticsService.logSettingsAccessed.bind(analyticsService),
    logProfileViewed: analyticsService.logProfileViewed.bind(analyticsService),
    
    // Direct access to service (for advanced usage)
    service: analyticsService,
  }
}


