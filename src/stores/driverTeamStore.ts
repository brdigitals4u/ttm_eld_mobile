import { create } from "zustand"
import { QueryClient } from "@tanstack/react-query"

import {
  driverTeamsApi,
  DriverTeam,
  UpdateTeamStatusRequest,
  TeamRequestData,
} from "@/api/driver-teams"

import { useAuthStore } from "./authStore"

// Global query client instance for invalidating queries
let queryClient: QueryClient | null = null

export const setDriverTeamQueryClient = (client: QueryClient) => {
  queryClient = client
}

// ============================================================================
// Driver Team Store State Interface
// ============================================================================

interface DriverTeamStore {
  teams: DriverTeam[]
  activeTeam: DriverTeam | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchTeams: () => Promise<void>
  fetchActiveTeam: () => Promise<void>
  updateTeamStatus: (id: string, status: "active" | "inactive" | "completed", reason?: string) => Promise<DriverTeam>
  requestTeam: (data: TeamRequestData) => Promise<void>
  setActiveTeam: (team: DriverTeam | null) => void

  // Critical: Get effective driver ID for API calls
  // Returns co-driver ID if active team exists, otherwise driver ID
  getEffectiveDriverId: () => string | null
  getEffectiveDriverName: () => string | null
  isTeamActive: () => boolean

  reset: () => void
}

// ============================================================================
// Driver Team Store
// ============================================================================

export const useDriverTeamStore = create<DriverTeamStore>((set, get) => ({
  // Initial state
  teams: [],
  activeTeam: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch driver teams from API
  fetchTeams: async () => {
    const { token, driverProfile } = useAuthStore.getState()

    // Only fetch if token and driver profile are available
    if (!token || !driverProfile?.driver_id) {
      console.log("⏸️ DriverTeamStore: No token or driver profile available, skipping fetch")
      set({ teams: [], activeTeam: null })
      return
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📡 DriverTeamStore: Fetching driver teams...")
      // Fetch all teams for the primary driver
      const teams = await driverTeamsApi.getDriverTeams({
        primary_driver: driverProfile.driver_id,
      })

      console.log(`✅ DriverTeamStore: Fetched ${teams.length} driver teams`)

      // Find active team (first one with status: "active" and is_active: true)
      const activeTeam =
        teams.find((team) => team.status === "active" && team.is_active === true) || null

      set({
        teams,
        activeTeam,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      })
    } catch (error: any) {
      console.error("❌ DriverTeamStore: Failed to fetch driver teams:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to fetch driver teams",
        teams: [],
        activeTeam: null,
      })
    }
  },

  // Fetch active team for current driver
  fetchActiveTeam: async () => {
    const { token, driverProfile } = useAuthStore.getState()

    // Only fetch if token and driver profile are available
    if (!token || !driverProfile?.driver_id) {
      console.log("⏸️ DriverTeamStore: No token or driver profile available, skipping active fetch")
      set({ activeTeam: null })
      return
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📡 DriverTeamStore: Fetching active team...")
      // Fetch active teams only
      const teams = await driverTeamsApi.getDriverTeams({
        primary_driver: driverProfile.driver_id,
        status: "active",
        is_active: true,
      })

      const activeTeam = teams.length > 0 ? teams[0] : null

      if (activeTeam) {
        console.log("✅ DriverTeamStore: Active team found:", activeTeam.codriver_name)
        set({
          activeTeam,
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        })
      } else {
        console.log("ℹ️ DriverTeamStore: No active team found")
        set({
          activeTeam: null,
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        })
      }
    } catch (error: any) {
      console.error("❌ DriverTeamStore: Failed to fetch active team:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to fetch active team",
        activeTeam: null,
      })
    }
  },

  // Update team status
  updateTeamStatus: async (
    id: string,
    status: "active" | "inactive" | "completed",
    reason?: string,
  ) => {
    set({ isLoading: true, error: null })

    try {
      const { driverProfile } = useAuthStore.getState()

      if (!driverProfile?.driver_id) {
        throw new Error("Driver ID is required to update team status")
      }

      console.log(`📝 DriverTeamStore: Updating team status ${id}...`, { status, reason })

      const updateData: UpdateTeamStatusRequest = {
        status,
        driver_id: driverProfile.driver_id, // Include driver_id
        reason,
      }

      const updatedTeam = await driverTeamsApi.updateTeamStatus(id, updateData)

      console.log("✅ DriverTeamStore: Team status updated:", updatedTeam)

      // Update in teams list
      const updatedTeams = get().teams.map((team) => (team.id === id ? updatedTeam : team))

      // Update active team
      let activeTeam = get().activeTeam

      if (updatedTeam.status === "active" && updatedTeam.is_active === true) {
        // If this team is now active, set it as active
        activeTeam = updatedTeam
      } else if (activeTeam?.id === id) {
        // If we deactivated the active team, clear it
        activeTeam = null
      }

      set({
        teams: updatedTeams,
        activeTeam,
        isLoading: false,
        error: null,
      })

      // Invalidate HOS-related queries to refetch data for new driver
      if (queryClient) {
        console.log("🔄 DriverTeamStore: Invalidating HOS queries after team status change")
        queryClient.invalidateQueries({ queryKey: ["driver", "hos"] })
      }

      return updatedTeam
    } catch (error: any) {
      console.error("❌ DriverTeamStore: Failed to update team status:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to update team status",
      })
      throw error
    }
  },

  // Request new team (auto-approved - team is created immediately)
  requestTeam: async (data: TeamRequestData) => {
    set({ isLoading: true, error: null })

    try {
      console.log("📝 DriverTeamStore: Requesting new team (auto-approved)...", data)
      const createdTeam = await driverTeamsApi.requestTeam(data)
      console.log("✅ DriverTeamStore: Team created (auto-approved):", createdTeam)

      // Add to teams list
      const updatedTeams = [...get().teams, createdTeam]

      // If this team is active, set it as active
      let activeTeam = get().activeTeam
      if (createdTeam.status === "active" && createdTeam.is_active === true) {
        activeTeam = createdTeam
      }

      set({
        teams: updatedTeams,
        activeTeam,
        isLoading: false,
        error: null,
      })

      // Invalidate HOS-related queries to refetch data for new driver
      if (queryClient) {
        console.log("🔄 DriverTeamStore: Invalidating HOS queries after team creation")
        queryClient.invalidateQueries({ queryKey: ["driver", "hos"] })
      }

      return createdTeam
    } catch (error: any) {
      console.error("❌ DriverTeamStore: Failed to request team:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to request team",
      })
      throw error
    }
  },

  // Set active team manually
  setActiveTeam: (team: DriverTeam | null) => {
    set({ activeTeam: team })
  },

  // Critical: Get effective driver ID for API calls
  // Returns co-driver ID if active team exists, otherwise driver ID
  getEffectiveDriverId: () => {
    const { activeTeam } = get()
    const { driverProfile } = useAuthStore.getState()

    // If active team exists and is active, use co-driver ID
    if (
      activeTeam?.codriver_id &&
      activeTeam.status === "active" &&
      activeTeam.is_active === true
    ) {
      console.log(
        "🔄 DriverTeamStore: Using co-driver ID for API calls:",
        activeTeam.codriver_id,
      )
      return activeTeam.codriver_id
    }

    // Otherwise use driver's own ID
    const driverId = driverProfile?.driver_id || null
    if (driverId) {
      console.log("🔄 DriverTeamStore: Using driver ID for API calls:", driverId)
    }
    return driverId
  },

  // Get effective driver name
  getEffectiveDriverName: () => {
    const { activeTeam } = get()
    const { driverProfile } = useAuthStore.getState()

    // If active team exists, return co-driver name
    if (
      activeTeam?.codriver_name &&
      activeTeam.status === "active" &&
      activeTeam.is_active === true
    ) {
      return activeTeam.codriver_name
    }

    // Otherwise return driver's own name
    return driverProfile?.legal_name || driverProfile?.name || null
  },

  // Check if team is active
  isTeamActive: () => {
    const { activeTeam } = get()
    return (
      activeTeam !== null &&
      activeTeam.status === "active" &&
      activeTeam.is_active === true
    )
  },

  // Reset store
  reset: () => {
    set({
      teams: [],
      activeTeam: null,
      isLoading: false,
      error: null,
      lastFetched: null,
    })
  },
}))

// ============================================================================
// Auto-fetch on token availability
// ============================================================================

// Subscribe to token changes and auto-fetch active team
useAuthStore.subscribe(
  (state) => state.token,
  (token, previousToken) => {
    // If token changed from null/undefined to a value, fetch active team
    if (token && !previousToken) {
      console.log("🔑 DriverTeamStore: Token available, fetching active team...")
      useDriverTeamStore.getState().fetchActiveTeam()
    } else if (!token && previousToken) {
      // If token was removed, reset store
      console.log("🔑 DriverTeamStore: Token removed, resetting driver teams...")
      useDriverTeamStore.getState().reset()
    }
  },
)

// Also fetch on initial load if token is already available
if (useAuthStore.getState().token) {
  console.log(
    "🔑 DriverTeamStore: Initial token check - token available, fetching active team...",
  )
  useDriverTeamStore.getState().fetchActiveTeam()
}

