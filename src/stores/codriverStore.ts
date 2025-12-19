import { create } from "zustand"

import {
  codriverAssignmentsApi,
  CoDriverAssignment,
  CreateCoDriverAssignmentRequest,
  UpdateCoDriverAssignmentRequest,
} from "@/api/codriver-assignments"

import { useAuthStore } from "./authStore"
import { useDriverTeamStore } from "./driverTeamStore"

// ============================================================================
// DEPRECATION NOTICE
// ============================================================================
// This store is being migrated to driverTeamStore.
// The new Driver Team Management API provides:
// - Automatic co-driver account creation
// - Concurrency checks
// - FMCSA compliance validation
// - Complete audit logging
//
// For new implementations, use useDriverTeamStore instead.
// This store is kept for backward compatibility during migration.
// ============================================================================

// ============================================================================
// Co-Driver Store State Interface
// ============================================================================

interface CoDriverStore {
  assignments: CoDriverAssignment[]
  activeAssignment: CoDriverAssignment | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchAssignments: () => Promise<void>
  fetchActiveCoDriver: () => Promise<void>
  createAssignment: (codriverId: string, vehicleId?: string) => Promise<CoDriverAssignment>
  updateAssignment: (id: string, data: UpdateCoDriverAssignmentRequest) => Promise<CoDriverAssignment>
  removeAssignment: (id: string) => Promise<void>
  setActiveAssignment: (assignment: CoDriverAssignment | null) => void

  // Critical: Get effective driver ID for API calls
  // Returns co-driver ID if active co-driver exists, otherwise driver ID
  getEffectiveDriverId: () => string | null
  getEffectiveDriverName: () => string | null

  reset: () => void
}

// ============================================================================
// Co-Driver Store
// ============================================================================

export const useCoDriverStore = create<CoDriverStore>((set, get) => ({
  // Initial state
  assignments: [],
  activeAssignment: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch co-driver assignments from API
  fetchAssignments: async () => {
    const { token, driverProfile } = useAuthStore.getState()

    // Only fetch if token and driver profile are available
    if (!token || !driverProfile?.driver_id) {
      console.log("⏸️ CoDriverStore: No token or driver profile available, skipping fetch")
      set({ assignments: [], activeAssignment: null })
      return
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📡 CoDriverStore: Fetching co-driver assignments...")
      // Fetch all assignments (not just active) so we can show both active and inactive
      const assignments = await codriverAssignmentsApi.getCoDriverAssignments({
        driver: driverProfile.driver_id,
        // Don't filter by status - get all assignments
      })

      console.log(`✅ CoDriverStore: Fetched ${assignments.length} co-driver assignments`)

      // Find active assignment (first one with status: "active" and is_active: true)
      const activeAssignment =
        assignments.find(
          (assignment) => assignment.status === "active" && assignment.is_active === true,
        ) || null

      set({
        assignments,
        activeAssignment,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      })
    } catch (error: any) {
      console.error("❌ CoDriverStore: Failed to fetch co-driver assignments:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to fetch co-driver assignments",
        assignments: [],
        activeAssignment: null,
      })
    }
  },

  // Fetch active co-driver for current driver
  fetchActiveCoDriver: async () => {
    const { token, driverProfile } = useAuthStore.getState()

    // Only fetch if token and driver profile are available
    if (!token || !driverProfile?.driver_id) {
      console.log("⏸️ CoDriverStore: No token or driver profile available, skipping active fetch")
      set({ activeAssignment: null })
      return
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📡 CoDriverStore: Fetching active co-driver...")
      const activeAssignment = await codriverAssignmentsApi.getActiveCoDriver(
        driverProfile.driver_id,
      )

      if (activeAssignment) {
        console.log("✅ CoDriverStore: Active co-driver found:", activeAssignment.codriver_name)
        set({
          activeAssignment,
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        })
      } else {
        console.log("ℹ️ CoDriverStore: No active co-driver found")
        set({
          activeAssignment: null,
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        })
      }
    } catch (error: any) {
      console.error("❌ CoDriverStore: Failed to fetch active co-driver:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to fetch active co-driver",
        activeAssignment: null,
      })
    }
  },

  // Create co-driver assignment
  createAssignment: async (codriverId: string, vehicleId?: string) => {
    const { token, driverProfile, vehicleAssignment } = useAuthStore.getState()

    if (!token || !driverProfile?.driver_id) {
      throw new Error("No token or driver profile available")
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📝 CoDriverStore: Creating co-driver assignment...", { codriverId, vehicleId })

      // Use vehicle from assignment if available, otherwise use provided vehicleId
      const vehicle = vehicleId || vehicleAssignment?.vehicle_info?.id

      const assignmentData: CreateCoDriverAssignmentRequest = {
        driver: driverProfile.driver_id,
        codriver: codriverId,
        start_time: new Date().toISOString(),
        status: "active",
        vehicle: vehicle,
      }

      const assignment = await codriverAssignmentsApi.createCoDriverAssignment(assignmentData)

      console.log("✅ CoDriverStore: Co-driver assignment created:", assignment)

      // Add to assignments list
      const updatedAssignments = [...get().assignments, assignment]

      // Set as active assignment
      set({
        assignments: updatedAssignments,
        activeAssignment: assignment,
        isLoading: false,
        error: null,
      })

      return assignment
    } catch (error: any) {
      console.error("❌ CoDriverStore: Failed to create co-driver assignment:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to create co-driver assignment",
      })
      throw error
    }
  },

  // Update co-driver assignment (activate/deactivate)
  updateAssignment: async (id: string, data: UpdateCoDriverAssignmentRequest) => {
    set({ isLoading: true, error: null })

    try {
      console.log(`📝 CoDriverStore: Updating co-driver assignment ${id}...`, data)
      const updatedAssignment = await codriverAssignmentsApi.updateCoDriverAssignment(id, data)

      console.log("✅ CoDriverStore: Co-driver assignment updated:", updatedAssignment)

      // Update in assignments list
      const updatedAssignments = get().assignments.map((assignment) =>
        assignment.id === id ? updatedAssignment : assignment,
      )

      // Update active assignment
      let activeAssignment = get().activeAssignment

      if (updatedAssignment.status === "active" && updatedAssignment.is_active === true) {
        // If this assignment is now active, set it as active
        activeAssignment = updatedAssignment
      } else if (activeAssignment?.id === id) {
        // If we deactivated the active assignment, clear it
        activeAssignment = null
      }

      set({
        assignments: updatedAssignments,
        activeAssignment,
        isLoading: false,
        error: null,
      })

      return updatedAssignment
    } catch (error: any) {
      console.error("❌ CoDriverStore: Failed to update co-driver assignment:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to update co-driver assignment",
      })
      throw error
    }
  },

  // Remove co-driver assignment (deactivate)
  removeAssignment: async (id: string) => {
    await get().updateAssignment(id, {
      status: "inactive",
      is_active: false,
      end_time: new Date().toISOString(),
    })
  },

  // Set active assignment manually
  setActiveAssignment: (assignment: CoDriverAssignment | null) => {
    set({ activeAssignment: assignment })
  },

  // Critical: Get effective driver ID for API calls
  // Returns co-driver ID if active co-driver exists, otherwise driver ID
  // NOTE: This now checks driverTeamStore first, then falls back to assignments
  getEffectiveDriverId: () => {
    // Try driverTeamStore first (new system)
    try {
      const teamStore = useDriverTeamStore.getState()
      const teamDriverId = teamStore.getEffectiveDriverId()
      if (teamDriverId) {
        console.log("🔄 CoDriverStore: Using driverTeamStore effective ID:", teamDriverId)
        return teamDriverId
      }
    } catch (error) {
      // driverTeamStore not available, continue with assignments
      console.log("⚠️ CoDriverStore: driverTeamStore not available, using assignments")
    }

    // Fallback to assignments (old system)
    const { activeAssignment } = get()
    const { driverProfile } = useAuthStore.getState()

    // If active co-driver exists, use co-driver ID
    if (activeAssignment?.codriver_id && activeAssignment.status === "active" && activeAssignment.is_active === true) {
      console.log("🔄 CoDriverStore: Using co-driver ID for API calls:", activeAssignment.codriver_id)
      return activeAssignment.codriver_id
    }

    // Otherwise use driver's own ID
    const driverId = driverProfile?.driver_id || null
    if (driverId) {
      console.log("🔄 CoDriverStore: Using driver ID for API calls:", driverId)
    }
    return driverId
  },

  // Get effective driver name
  // NOTE: This now checks driverTeamStore first, then falls back to assignments
  getEffectiveDriverName: () => {
    // Try driverTeamStore first (new system)
    try {
      const teamStore = useDriverTeamStore.getState()
      const teamDriverName = teamStore.getEffectiveDriverName()
      if (teamDriverName) {
        return teamDriverName
      }
    } catch (error) {
      // driverTeamStore not available, continue with assignments
    }

    // Fallback to assignments (old system)
    const { activeAssignment } = get()
    const { driverProfile } = useAuthStore.getState()

    // If active co-driver exists, return co-driver name
    if (activeAssignment?.codriver_name && activeAssignment.status === "active" && activeAssignment.is_active === true) {
      return activeAssignment.codriver_name
    }

    // Otherwise return driver's own name
    return driverProfile?.legal_name || driverProfile?.name || null
  },

  // Reset store
  reset: () => {
    set({
      assignments: [],
      activeAssignment: null,
      isLoading: false,
      error: null,
      lastFetched: null,
    })
  },
}))

// ============================================================================
// Auto-fetch on token availability
// ============================================================================

// Subscribe to token changes and auto-fetch active co-driver
useAuthStore.subscribe(
  (state) => state.token,
  (token, previousToken) => {
    // If token changed from null/undefined to a value, fetch active co-driver
    if (token && !previousToken) {
      console.log("🔑 CoDriverStore: Token available, fetching active co-driver...")
      useCoDriverStore.getState().fetchActiveCoDriver()
    } else if (!token && previousToken) {
      // If token was removed, reset store
      console.log("🔑 CoDriverStore: Token removed, resetting co-driver assignments...")
      useCoDriverStore.getState().reset()
    }
  },
)

// Also fetch on initial load if token is already available
if (useAuthStore.getState().token) {
  console.log(
    "🔑 CoDriverStore: Initial token check - token available, fetching active co-driver...",
  )
  useCoDriverStore.getState().fetchActiveCoDriver()
}

