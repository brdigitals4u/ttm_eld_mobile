import { useMemo } from 'react'
import { useStatusStore } from '@/stores/statusStore'
import { useLocation } from '@/contexts/location-context'

/**
 * Non-blocking hook that returns location data with priority:
 * 1. ELD location (from ELD device)
 * 2. Expo location (from device GPS)
 * 3. Fallback to 0, 0
 * 
 * This hook never blocks and always returns immediately with available data.
 */
export const useLocationData = () => {
  const { eldLocation, currentLocation } = useStatusStore()
  const { requestLocation } = useLocation()

  // Get location with priority: ELD -> Expo -> 0,0
  const locationData = useMemo(() => {
    // Priority 1: ELD location (from ELD device)
    if (eldLocation && 
        eldLocation.latitude !== undefined && 
        eldLocation.longitude !== undefined &&
        !isNaN(eldLocation.latitude) && 
        !isNaN(eldLocation.longitude) &&
        eldLocation.latitude !== 0 && 
        eldLocation.longitude !== 0) {
      return {
        latitude: eldLocation.latitude,
        longitude: eldLocation.longitude,
        source: 'eld' as const,
      }
    }

    // Priority 2: Expo location (from device GPS)
    if (currentLocation && 
        currentLocation.latitude !== undefined && 
        currentLocation.longitude !== undefined &&
        !isNaN(currentLocation.latitude) && 
        !isNaN(currentLocation.longitude) &&
        currentLocation.latitude !== 0 && 
        currentLocation.longitude !== 0) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: currentLocation.address,
        source: 'expo' as const,
      }
    }

    // Priority 3: Fallback to 0, 0
    return {
      latitude: 0,
      longitude: 0,
      source: 'fallback' as const,
    }
  }, [eldLocation, currentLocation])

  return {
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    address: 'address' in locationData ? locationData.address : undefined,
    source: locationData.source,
    // Non-blocking function to refresh expo location (doesn't block if called)
    refreshLocation: async () => {
      // Request location in background without blocking
      requestLocation().catch((error) => {
        console.warn('📍 useLocationData: Failed to refresh expo location:', error)
      })
    },
  }
}

