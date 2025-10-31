import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import * as Location from 'expo-location'

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
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        console.log('Location permission granted')
        setHasPermission(true)
        setError(null)
      } else {
        console.warn('Location permission denied')
        setError('Location permission denied')
        setHasPermission(false)
      }
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

      // Get current location using expo-location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      // Reverse geocode to get address
      let address = 'Current Location'
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
        console.log('Reverse geocode result:', reverseGeocode)
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0]
          const addressParts = [
            addr.name,
            addr.street,
            addr.district,
            addr.city,
            addr.region,
            addr.postalCode,
            addr.country,
          ].filter(Boolean)
          
          if (addressParts.length > 0) {
            address = addressParts.join(', ')
          } else {
            // Fallback to coordinates if no address parts
            address = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
          }
        } else {
          // Fallback to coordinates if geocoding returns empty
          address = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError)
        // Fallback to coordinates on error
        address = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
      }

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        timestamp: location.timestamp,
        address: address,
      }

      setCurrentLocation(locationData)
      setIsLoading(false)
      console.log('Location data:', locationData)
      return locationData
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
