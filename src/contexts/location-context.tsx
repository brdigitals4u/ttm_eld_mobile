import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
// import * as Location from 'expo-location' // Temporarily disabled for native module issues

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  timestamp: number
  address?: string
}

interface LocationContextType {
  currentLocation: LocationData | null
  isLoading: boolean
  error: string | null
  requestLocation: () => Promise<LocationData | null>
  hasPermission: boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

interface LocationProviderProps {
  children: ReactNode
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)

  // Request location permission on mount - but only when needed
  useEffect(() => {
    // Only request permission when the component is actually used
    // This prevents blocking the initial app render
  }, [])

  const requestLocationPermission = async () => {
    try {
      // Mock permission for now - in real app this would use expo-location
      console.log('Mock location permission granted')
      setHasPermission(true)
      setError(null)
    } catch (err) {
      console.warn('Location permission request failed:', err)
      setError('Failed to request location permission')
      setHasPermission(false)
    }
  }

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    // Request permission if we don't have it yet
    if (!hasPermission) {
      await requestLocationPermission()
      if (!hasPermission) {
        setError('Location permission not granted')
        return null
      }
    }

    try {
      setIsLoading(true)
      setError(null)

      // Mock location for now - in real app this would use expo-location
      const mockLocation: LocationData = {
        latitude: 37.7749 + (Math.random() - 0.5) * 0.01, // San Francisco area with some randomness
        longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
        accuracy: 10,
        altitude: null,
        timestamp: Date.now(),
        address: 'San Francisco, CA (Mock Location)',
      }

      setCurrentLocation(mockLocation)
      setIsLoading(false)
      console.log('Mock location data:', mockLocation)
      return mockLocation
    } catch (error: any) {
      console.error('Error getting current location:', error)
      setError(error.message || 'Failed to get current location')
      setIsLoading(false)
      return null
    }
  }

  const requestLocation = async (): Promise<LocationData | null> => {
    return await getCurrentLocation()
  }

  const value: LocationContextType = {
    currentLocation,
    isLoading,
    error,
    requestLocation,
    hasPermission,
  }

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
