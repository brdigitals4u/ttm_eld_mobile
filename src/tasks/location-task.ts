import * as Location from "expo-location"
import * as TaskManager from "expo-task-manager"

import { useStatusStore } from "@/stores/statusStore"

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK"

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error("❌ Background location task error:", error)
    return
  }

  const { locations } = (data || {}) as { locations?: Location.LocationObject[] }
  if (!locations || locations.length === 0) {
    return
  }

  const latest = locations[0]
  const { latitude, longitude } = latest.coords
  if (latitude == null || longitude == null) {
    return
  }

  const store = useStatusStore.getState()
  store.setCurrentLocation({
    latitude,
    longitude,
    address: store.currentLocation?.address,
  })

  if (store.setEldLocation) {
    store.setEldLocation({
      latitude,
      longitude,
      timestamp: latest.timestamp,
    })
  }

  console.log("📍 Background location update:", latitude, longitude)
})
