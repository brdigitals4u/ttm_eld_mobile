/**
 * ELD Events API
 *
 * Helper functions for creating ELD events, including unidentified driving events
 */

import { apiClient } from "./client"
import { API_ENDPOINTS } from "./constants"
import { useAuthStore } from "@/stores/authStore"

export interface UnidentifiedDrivingEventPayload {
  event_type: "unidentified_driving"
  driver_id: string
  vehicle_id?: string
  timestamp: string
  latitude?: number
  longitude?: number
}

/**
 * Create an unidentified driving event
 * This is triggered when all shippers are deactivated
 */
export async function createUnidentifiedDrivingEvent(
  location?: { latitude: number; longitude: number },
): Promise<void> {
  try {
    const { driverProfile, vehicleAssignment } = useAuthStore.getState()

    if (!driverProfile?.driver_id) {
      console.warn("⚠️ Cannot create unidentified event: No driver ID available")
      return
    }

    const payload: UnidentifiedDrivingEventPayload = {
      event_type: "unidentified_driving",
      driver_id: driverProfile.driver_id,
      timestamp: new Date().toISOString(),
    }

    if (vehicleAssignment?.vehicle_info?.id) {
      payload.vehicle_id = vehicleAssignment.vehicle_info.id
    }

    if (location) {
      payload.latitude = location.latitude
      payload.longitude = location.longitude
    }

    console.log("📡 Creating unidentified driving event...", payload)

    const response = await apiClient.post(API_ENDPOINTS.HOS.CREATE_ELD_EVENT, payload)

    if (response.success) {
      console.log("✅ Unidentified driving event created successfully")
    } else {
      console.error("❌ Failed to create unidentified driving event:", response)
    }
  } catch (error) {
    console.error("❌ Error creating unidentified driving event:", error)
    throw error
  }
}

