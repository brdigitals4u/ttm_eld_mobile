import { create } from "zustand"

import {
  trailersApi,
  TrailerAssignment,
  CreateTrailerRequest,
  UpdateTrailerAssignmentRequest,
  generateUniqueAssetId,
} from "@/api/trailers"

import { useAuthStore } from "./authStore"

// ============================================================================
// Trailer Store State Interface
// ============================================================================

interface TrailerStore {
  assignments: TrailerAssignment[]
  activeTrailer: TrailerAssignment | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchAssignments: () => Promise<void>
  createAndAssignTrailer: (name: string) => Promise<TrailerAssignment>
  updateAssignment: (id: string, data: UpdateTrailerAssignmentRequest) => Promise<TrailerAssignment>
  removeAssignment: (id: string) => Promise<void>
  setActiveTrailer: (assignment: TrailerAssignment | null) => void
  reset: () => void
}

// ============================================================================
// Trailer Store
// ============================================================================

export const useTrailerStore = create<TrailerStore>((set, get) => ({
  // Initial state
  assignments: [],
  activeTrailer: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch trailer assignments from API
  fetchAssignments: async () => {
    const { token, driverProfile } = useAuthStore.getState()

    // Only fetch if token and driver profile are available
    if (!token || !driverProfile?.driver_id) {
      console.log("⏸️ TrailerStore: No token or driver profile available, skipping fetch")
      set({ assignments: [], activeTrailer: null })
      return
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📡 TrailerStore: Fetching trailer assignments...")
      // Fetch all assignments (not just active) so we can show both active and inactive
      const assignments = await trailersApi.getTrailerAssignments({
        driver: driverProfile.driver_id,
        // Don't filter by status - get all assignments
      })

      console.log(`✅ TrailerStore: Fetched ${assignments.length} trailer assignments`)

      // Find active trailer (first one with status: "active")
      const activeTrailer = assignments.find((assignment) => assignment.status === "active") || null

      set({
        assignments,
        activeTrailer,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      })
    } catch (error: any) {
      console.error("❌ TrailerStore: Failed to fetch trailer assignments:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to fetch trailer assignments",
        assignments: [],
        activeTrailer: null,
      })
    }
  },

  // Create trailer and assign to driver
  createAndAssignTrailer: async (name: string) => {
    const { token, driverProfile } = useAuthStore.getState()

    if (!token || !driverProfile?.driver_id) {
      throw new Error("No token or driver profile available")
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📝 TrailerStore: Creating and assigning trailer...", { name })

      // 1. Generate unique asset_id
      const asset_id = generateUniqueAssetId()
      console.log(`🔑 TrailerStore: Generated asset_id: ${asset_id}`)

      // 2. Create trailer
      const trailerData: CreateTrailerRequest = {
        asset_id,
        name,
        trailer_type: "other",
        make: "Driver Added Trailer",
        model: "Driver Added Trailer",
        year: new Date().getFullYear(),
        asset_type: "trailer",
        vin: "DATS3333331111143",
        license_plate: " DRIVERTRAILER",
        registration_state: "CA",
        registration_expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
          .toISOString()
          .split("T")[0],
        length: 53,
        width: 8,
        height: 13,
        weight_capacity: 45000,
        is_tracked: true,
        volume_capacity: 2000,
        temperature_setting: 0,
      }

      const trailer = await trailersApi.createTrailer(trailerData)
      console.log("✅ TrailerStore: Trailer created:", trailer)

      // 3. Assign trailer to driver
      const assignment = await trailersApi.assignTrailer({
        driver: driverProfile.driver_id,
        trailer: trailer.id,
        start_time: new Date().toISOString(),
        status: "active",
        is_primary: true,
      })

      console.log("✅ TrailerStore: Trailer assigned:", assignment)

      // Add to assignments list
      const updatedAssignments = [...get().assignments, assignment]

      // If this is the first active trailer, set it as active
      let activeTrailer = get().activeTrailer
      if (assignment.status === "active" && !activeTrailer) {
        activeTrailer = assignment
      }

      set({
        assignments: updatedAssignments,
        activeTrailer,
        isLoading: false,
        error: null,
      })

      return assignment
    } catch (error: any) {
      console.error("❌ TrailerStore: Failed to create and assign trailer:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to create and assign trailer",
      })
      throw error
    }
  },

  // Update trailer assignment (activate/deactivate)
  updateAssignment: async (id: string, data: UpdateTrailerAssignmentRequest) => {
    set({ isLoading: true, error: null })

    try {
      console.log(`📝 TrailerStore: Updating trailer assignment ${id}...`, data)
      const updatedAssignment = await trailersApi.updateTrailerAssignment(id, data)

      console.log("✅ TrailerStore: Trailer assignment updated:", updatedAssignment)

      // Update in assignments list
      const updatedAssignments = get().assignments.map((assignment) =>
        assignment.id === id ? updatedAssignment : assignment,
      )

      // Update active trailer
      let activeTrailer = get().activeTrailer

      if (updatedAssignment.status === "active") {
        // If this assignment is now active, set it as active
        activeTrailer = updatedAssignment
      } else if (activeTrailer?.id === id) {
        // If we deactivated the active trailer, find another active one
        activeTrailer = updatedAssignments.find((a) => a.status === "active") || null
      }

      set({
        assignments: updatedAssignments,
        activeTrailer,
        isLoading: false,
        error: null,
      })

      return updatedAssignment
    } catch (error: any) {
      console.error("❌ TrailerStore: Failed to update trailer assignment:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to update trailer assignment",
      })
      throw error
    }
  },

  // Remove trailer assignment (deactivate)
  removeAssignment: async (id: string) => {
    await get().updateAssignment(id, {
      status: "inactive",
      end_time: new Date().toISOString(),
    })
  },

  // Set active trailer manually
  setActiveTrailer: (assignment: TrailerAssignment | null) => {
    set({ activeTrailer: assignment })
  },

  // Reset store
  reset: () => {
    set({
      assignments: [],
      activeTrailer: null,
      isLoading: false,
      error: null,
      lastFetched: null,
    })
  },
}))

// ============================================================================
// Auto-fetch on token availability
// ============================================================================

// Subscribe to token changes and auto-fetch trailer assignments
useAuthStore.subscribe(
  (state) => state.token,
  (token, previousToken) => {
    // If token changed from null/undefined to a value, fetch assignments
    if (token && !previousToken) {
      console.log("🔑 TrailerStore: Token available, fetching trailer assignments...")
      useTrailerStore.getState().fetchAssignments()
    } else if (!token && previousToken) {
      // If token was removed, reset store
      console.log("🔑 TrailerStore: Token removed, resetting trailer assignments...")
      useTrailerStore.getState().reset()
    }
  },
)

// Also fetch on initial load if token is already available
if (useAuthStore.getState().token) {
  console.log(
    "🔑 TrailerStore: Initial token check - token available, fetching trailer assignments...",
  )
  useTrailerStore.getState().fetchAssignments()
}
