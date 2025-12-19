/**
 * usePreTripCheck Hook
 *
 * Checks if a pre-trip inspection has been completed recently (within last 24 hours).
 * Used to validate compliance before allowing driving status.
 */

import { useMemo } from "react"

import { useInspection } from "@/contexts"

/**
 * Hook to check if pre-trip inspection is completed
 * @returns Object with hasCompletedPreTrip boolean and inspection details
 */
export function usePreTripCheck() {
  const { currentInspection, inspections } = useInspection()

  const hasCompletedPreTrip = useMemo(() => {
    // Check if there's a current pre-trip inspection that's completed
    if (currentInspection?.type === "pre-trip" && currentInspection.overallStatus === "pass") {
      return true
    }

    // Check if there's a completed pre-trip inspection in the last 24 hours
    const now = Date.now()
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    const recentPreTrip = inspections.find((inspection) => {
      const isPreTrip = inspection.type === "pre-trip"
      const isCompleted = inspection.overallStatus === "pass"
      const isRecent = inspection.startTime >= twentyFourHoursAgo
      return isPreTrip && isCompleted && isRecent
    })

    return !!recentPreTrip
  }, [currentInspection, inspections])

  const lastPreTripInspection = useMemo(() => {
    const preTripInspections = inspections
      .filter((inspection) => inspection.type === "pre-trip")
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))

    return preTripInspections[0] || null
  }, [inspections])

  return {
    hasCompletedPreTrip,
    lastPreTripInspection,
    isRecent: lastPreTripInspection
      ? Date.now() - (lastPreTripInspection.startTime || 0) < 24 * 60 * 60 * 1000
      : false,
  }
}

















