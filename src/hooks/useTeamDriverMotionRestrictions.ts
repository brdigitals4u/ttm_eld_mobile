/**
 * Team Driver Motion Restrictions Hook
 * 
 * Enforces ELD compliance rules for team drivers:
 * - Co-drivers can make entries while vehicle in motion (if logged in before motion)
 * - Co-drivers cannot switch driving roles when vehicle is in motion
 * - Only authenticated co-drivers can access their own records
 */

import { useEffect, useState, useCallback } from 'react'
import { useObdData } from '@/contexts/obd-data-context'
import { useCoDriver } from '@/contexts/codriver-context'

export interface MotionRestrictions {
  canMakeEntries: boolean
  canSwitchRoles: boolean
  canEditRecords: boolean
  restrictionReason: string | null
}

export interface UseTeamDriverMotionRestrictionsOptions {
  checkInterval?: number // Default: 1000ms (1 second)
}

export function useTeamDriverMotionRestrictions(
  options: UseTeamDriverMotionRestrictionsOptions = {}
): MotionRestrictions & {
  isVehicleInMotion: boolean
  wasCoDriverLoggedInBeforeMotion: boolean
} {
  const { checkInterval = 1000 } = options
  const { currentSpeedMph, activityState } = useObdData()
  const { activeCoDriver } = useCoDriver()

  const [isVehicleInMotion, setIsVehicleInMotion] = useState(false)
  const [motionStartTime, setMotionStartTime] = useState<Date | null>(null)
  const [coDriverLoginTime, setCoDriverLoginTime] = useState<Date | null>(null)
  const [wasCoDriverLoggedInBeforeMotion, setWasCoDriverLoggedInBeforeMotion] = useState(false)

  // Track vehicle motion
  useEffect(() => {
    const isMoving = currentSpeedMph >= 5 // SPEED_THRESHOLD_DRIVING
    const wasMoving = isVehicleInMotion

    if (isMoving && !wasMoving) {
      // Vehicle just started moving
      setMotionStartTime(new Date())
      // Check if co-driver was logged in before motion started
      if (coDriverLoginTime && motionStartTime && coDriverLoginTime < motionStartTime) {
        setWasCoDriverLoggedInBeforeMotion(true)
      } else if (activeCoDriver) {
        // Co-driver is active, check if they logged in before now
        setWasCoDriverLoggedInBeforeMotion(true)
      } else {
        setWasCoDriverLoggedInBeforeMotion(false)
      }
    } else if (!isMoving && wasMoving) {
      // Vehicle stopped
      setMotionStartTime(null)
      setWasCoDriverLoggedInBeforeMotion(false)
    }

    setIsVehicleInMotion(isMoving)
  }, [currentSpeedMph, isVehicleInMotion, coDriverLoginTime, motionStartTime, activeCoDriver])

  // Track co-driver login time
  useEffect(() => {
    if (activeCoDriver) {
      setCoDriverLoginTime(new Date())
    } else {
      setCoDriverLoginTime(null)
      setWasCoDriverLoggedInBeforeMotion(false)
    }
  }, [activeCoDriver])

  // Determine restrictions
  const restrictions = useCallback((): MotionRestrictions => {
    // If vehicle is not in motion, all operations are allowed
    if (!isVehicleInMotion) {
      return {
        canMakeEntries: true,
        canSwitchRoles: true,
        canEditRecords: true,
        restrictionReason: null,
      }
    }

    // Vehicle is in motion
    if (!activeCoDriver) {
      // No co-driver active - standard motion restrictions apply
      return {
        canMakeEntries: false, // Standard restriction: no entries while moving
        canSwitchRoles: false,
        canEditRecords: false,
        restrictionReason: 'Vehicle is in motion. Entries are blocked for safety.',
      }
    }

    // Co-driver is active
    if (wasCoDriverLoggedInBeforeMotion) {
      // Co-driver logged in before motion started - can make entries on own records
      return {
        canMakeEntries: true, // Can make entries on own records
        canSwitchRoles: false, // Cannot switch driving roles while moving
        canEditRecords: true, // Can edit own records
        restrictionReason: 'Vehicle is in motion. You can edit your own records but cannot switch roles.',
      }
    } else {
      // Co-driver logged in after motion started - standard restrictions apply
      return {
        canMakeEntries: false,
        canSwitchRoles: false,
        canEditRecords: false,
        restrictionReason: 'Vehicle is in motion. Co-driver must log in before vehicle starts moving to make entries.',
      }
    }
  }, [isVehicleInMotion, activeCoDriver, wasCoDriverLoggedInBeforeMotion])

  const [restrictionState, setRestrictionState] = useState<MotionRestrictions>(restrictions())

  // Update restrictions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRestrictionState(restrictions())
    }, checkInterval)

    return () => clearInterval(interval)
  }, [restrictions, checkInterval])

  return {
    ...restrictionState,
    isVehicleInMotion,
    wasCoDriverLoggedInBeforeMotion,
  }
}

