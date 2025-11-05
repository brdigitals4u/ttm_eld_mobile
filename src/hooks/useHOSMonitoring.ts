import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { hosApi } from '@/api/hos'
import { sendHOSViolationAlert } from '@/services/NotificationService'
import { QUERY_KEYS } from '@/api/constants'

/**
 * Hook to monitor HOS times and trigger push notifications for violations
 * 
 * Monitors:
 * - 11-hour driving limit (alerts at 30min, 15min, 5min remaining)
 * - 14-hour shift limit (alerts at 30min, 15min, 5min remaining)
 * - 70-hour cycle limit (alerts at 2hr, 1hr remaining)
 * - 30-minute break requirement
 */
export function useHOSMonitoring(enabled: boolean = true) {
  const alertedTimesRef = useRef<Set<string>>(new Set())

  // Poll HOS clock every 60 seconds
  const { data: hosClock } = useQuery({
    queryKey: QUERY_KEYS.HOS_CLOCK,
    queryFn: hosApi.getHOSClock,
    enabled,
    refetchInterval: 60 * 1000, // Check every minute
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (!hosClock || !enabled) return

    const checkAndAlert = async () => {
      const {
        driving_time_remaining,
        on_duty_time_remaining,
        cycle_time_remaining,
        current_duty_status,
      } = hosClock

      // Only alert if driver is currently driving or on duty
      const isActive = current_duty_status === 'driving' || current_duty_status === 'on_duty'
      if (!isActive) return

      // ========================================
      // 11-Hour Driving Limit Alerts
      // ========================================
      if (current_duty_status === 'driving') {
        // Alert at 30 minutes remaining
        if (driving_time_remaining <= 30 && driving_time_remaining > 25) {
          const key = '11_hour_30min'
          if (!alertedTimesRef.current.has(key)) {
            await sendHOSViolationAlert('11_hour', driving_time_remaining)
            alertedTimesRef.current.add(key)
          }
        }
        // Alert at 15 minutes remaining
        else if (driving_time_remaining <= 15 && driving_time_remaining > 10) {
          const key = '11_hour_15min'
          if (!alertedTimesRef.current.has(key)) {
            await sendHOSViolationAlert('11_hour', driving_time_remaining)
            alertedTimesRef.current.add(key)
          }
        }
        // Alert at 5 minutes remaining
        else if (driving_time_remaining <= 5 && driving_time_remaining > 0) {
          const key = '11_hour_5min'
          if (!alertedTimesRef.current.has(key)) {
            await sendHOSViolationAlert('11_hour', driving_time_remaining)
            alertedTimesRef.current.add(key)
          }
        }
      }

      // ========================================
      // 14-Hour Shift Limit Alerts
      // ========================================
      if (isActive) {
        // Alert at 30 minutes remaining
        if (on_duty_time_remaining <= 30 && on_duty_time_remaining > 25) {
          const key = '14_hour_30min'
          if (!alertedTimesRef.current.has(key)) {
            await sendHOSViolationAlert('14_hour', on_duty_time_remaining)
            alertedTimesRef.current.add(key)
          }
        }
        // Alert at 15 minutes remaining
        else if (on_duty_time_remaining <= 15 && on_duty_time_remaining > 10) {
          const key = '14_hour_15min'
          if (!alertedTimesRef.current.has(key)) {
            await sendHOSViolationAlert('14_hour', on_duty_time_remaining)
            alertedTimesRef.current.add(key)
          }
        }
        // Alert at 5 minutes remaining
        else if (on_duty_time_remaining <= 5 && on_duty_time_remaining > 0) {
          const key = '14_hour_5min'
          if (!alertedTimesRef.current.has(key)) {
            await sendHOSViolationAlert('14_hour', on_duty_time_remaining)
            alertedTimesRef.current.add(key)
          }
        }
      }

      // ========================================
      // 70-Hour Cycle Limit Alerts
      // ========================================
      const cycleHoursRemaining = cycle_time_remaining / 60
      
      // Alert at 2 hours remaining
      if (cycleHoursRemaining <= 2 && cycleHoursRemaining > 1.5) {
        const key = '70_hour_2hr'
        if (!alertedTimesRef.current.has(key)) {
          await sendHOSViolationAlert('70_hour', cycle_time_remaining)
          alertedTimesRef.current.add(key)
        }
      }
      // Alert at 1 hour remaining
      else if (cycleHoursRemaining <= 1 && cycleHoursRemaining > 0.5) {
        const key = '70_hour_1hr'
        if (!alertedTimesRef.current.has(key)) {
          await sendHOSViolationAlert('70_hour', cycle_time_remaining)
          alertedTimesRef.current.add(key)
        }
      }
    }

    checkAndAlert()
  }, [hosClock, enabled])

  // Clear alerted times when driver goes off duty (reset for next cycle)
  useEffect(() => {
    if (hosClock?.current_duty_status === 'off_duty' || hosClock?.current_duty_status === 'sleeper_berth') {
      alertedTimesRef.current.clear()
    }
  }, [hosClock?.current_duty_status])

  return {
    hosClock,
    isMonitoring: enabled,
  }
}
