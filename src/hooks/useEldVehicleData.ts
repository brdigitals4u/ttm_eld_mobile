import { useMemo } from 'react'
import { useObdData } from '@/contexts/obd-data-context'

/**
 * Hook to extract vehicle data (odometer, fuel level, speed) from ELD live data
 * 
 * This hook processes the OBD data array from the ELD device and extracts:
 * - Odometer: Total Vehicle Distance (in km or miles)
 * - Fuel Level: Current fuel level percentage
 * - Speed: Vehicle speed (in mph or km/h)
 * 
 * @returns Object containing odometer, fuelLevel, speed with their values, units, and source
 */
export const useEldVehicleData = () => {
  const { obdData, isConnected: eldConnected } = useObdData()

  const vehicleData = useMemo(() => {
    // Default values
    const defaultData = {
      odometer: {
        value: null as number | null,
        unit: 'miles' as string,
        rawValue: null as number | null,
        rawUnit: null as string | null,
        source: 'none' as 'eld' | 'none',
      },
      fuelLevel: {
        value: null as number | null,
        unit: '%' as string,
        source: 'none' as 'eld' | 'none',
      },
      speed: {
        value: null as number | null,
        unit: 'mph' as string,
        rawValue: null as number | null,
        rawUnit: null as string | null,
        source: 'none' as 'eld' | 'none',
      },
    }

    if (!eldConnected || !obdData || obdData.length === 0) {
      return defaultData
    }

    // Extract Odometer
    const odometerItem = obdData.find(
      (item) =>
        item.name.includes('Total Vehicle Distance') ||
        item.name.includes('High Resolution Total Vehicle Distance') ||
        item.name.includes('Odometer') ||
        item.name.includes('Vehicle Distance') ||
        item.name.includes('Accumulated Mileage')
    )

    if (odometerItem) {
      const rawValue = parseFloat(odometerItem.value)
      if (!isNaN(rawValue) && rawValue >= 0) {
        const rawUnit = odometerItem.unit?.toLowerCase() || ''
        const isKm = rawUnit.includes('km')
        const isMiles = rawUnit.includes('mi') || rawUnit.includes('mile')
        
        // Convert to miles if needed (default ELD provides in km)
        let value = rawValue
        let unit = 'miles'
        
        if (isKm && !isMiles) {
          value = rawValue * 0.621371 // Convert km to miles
          unit = 'miles'
        } else if (isMiles) {
          value = rawValue
          unit = 'miles'
        } else {
          // Assume km if unit not specified
          value = rawValue * 0.621371
          unit = 'miles'
        }

        defaultData.odometer = {
          value: Math.round(value),
          unit,
          rawValue,
          rawUnit: odometerItem.unit || null,
          source: 'eld',
        }
      }
    }

    // Extract Fuel Level
    const fuelLevelItem = obdData.find(
      (item) =>
        item.name.includes('Fuel Level') ||
        item.name.includes('Fuel Level Input') ||
        item.name.includes('Fuel Level 1')
    )

    if (fuelLevelItem) {
      const value = parseFloat(fuelLevelItem.value)
      if (!isNaN(value) && value >= 0 && value <= 100) {
        defaultData.fuelLevel = {
          value: Math.round(value * 10) / 10, // Round to 1 decimal
          unit: '%',
          source: 'eld',
        }
      }
    }

    // Extract Speed
    const speedItem = obdData.find(
      (item) =>
        item.name.includes('Vehicle Speed') ||
        item.name.includes('Wheel-Based Vehicle Speed') ||
        item.name.includes('Vehicle Speed Sensor')
    )

    if (speedItem) {
      const rawValue = parseFloat(speedItem.value)
      if (!isNaN(rawValue) && rawValue >= 0) {
        const rawUnit = speedItem.unit?.toLowerCase() || ''
        const isKmh = rawUnit.includes('km/h') || rawUnit.includes('kmh')
        const isMph = rawUnit.includes('mph')
        
        // Convert to mph if needed
        let value = rawValue
        let unit = 'mph'
        
        if (isKmh && !isMph) {
          value = rawValue * 0.621371 // Convert km/h to mph
          unit = 'mph'
        } else if (isMph) {
          value = rawValue
          unit = 'mph'
        } else {
          // Assume km/h if unit not specified
          value = rawValue * 0.621371
          unit = 'mph'
        }

        defaultData.speed = {
          value: Math.round(value * 10) / 10, // Round to 1 decimal
          unit,
          rawValue,
          rawUnit: speedItem.unit || null,
          source: 'eld',
        }
      }
    }

    return defaultData
  }, [obdData, eldConnected])

  return {
    ...vehicleData,
    isConnected: eldConnected,
    hasData: eldConnected && (vehicleData.odometer.source === 'eld' || 
                              vehicleData.fuelLevel.source === 'eld' || 
                              vehicleData.speed.source === 'eld'),
  }
}

