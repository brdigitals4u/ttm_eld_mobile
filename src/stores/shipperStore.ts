import { create } from "zustand"
import { contactsApi, Contact, CreateContactRequest, UpdateContactRequest } from "@/api/contacts"
import { useAuthStore } from "./authStore"

// ============================================================================
// Shipper Store State Interface
// ============================================================================

interface ShipperStore {
  shippers: Contact[]
  activeShipper: Contact | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchShippers: () => Promise<void>
  createShipper: (data: CreateContactRequest) => Promise<Contact>
  updateShipper: (id: string, data: UpdateContactRequest) => Promise<Contact>
  setActiveShipper: (shipper: Contact | null) => void
  checkAllDeactivated: () => Promise<void>
  reset: () => void
}

// ============================================================================
// Helper function to create unidentified driving event
// ============================================================================

async function createUnidentifiedDrivingEvent() {
  try {
    // Try to get location from location context if available
    let location: { latitude: number; longitude: number } | undefined

    try {
      const { useLocationStore } = await import("@/contexts/location-context")
      const currentLocation = useLocationStore?.getState?.()?.currentLocation
      if (currentLocation) {
        location = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }
      }
    } catch (e) {
      // Location not available, continue without it
      console.log("Location not available for unidentified event")
    }

    const { createUnidentifiedDrivingEvent } = await import("@/api/eld-events")
    await createUnidentifiedDrivingEvent(location)
  } catch (error) {
    console.error("❌ Error creating unidentified driving event:", error)
  }
}

// ============================================================================
// Shipper Store
// ============================================================================

export const useShipperStore = create<ShipperStore>((set, get) => ({
  // Initial state
  shippers: [],
  activeShipper: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch shippers from API
  fetchShippers: async () => {
    const { token } = useAuthStore.getState()

    // Only fetch if token is available
    if (!token) {
      console.log("⏸️ ShipperStore: No token available, skipping fetch")
      set({ shippers: [], activeShipper: null })
      return
    }

    set({ isLoading: true, error: null })

    try {
      console.log("📡 ShipperStore: Fetching shippers...")
      const contacts = await contactsApi.getContacts({ contact_type: "CUSTOMER" })

      console.log(`✅ ShipperStore: Fetched ${contacts.length} shippers`)

      // Find active shipper (first one with is_active: true)
      const activeShipper = contacts.find((contact) => contact.is_active) || null

      set({
        shippers: contacts,
        activeShipper,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      })

      // If no active shipper and we have shippers, check if all are deactivated
      if (!activeShipper && contacts.length > 0) {
        console.log("⚠️ ShipperStore: No active shipper found, checking if all are deactivated...")
        await get().checkAllDeactivated()
      }
    } catch (error: any) {
      console.error("❌ ShipperStore: Failed to fetch shippers:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to fetch shippers",
        shippers: [],
        activeShipper: null,
      })
    }
  },

  // Create new shipper
  createShipper: async (data: CreateContactRequest) => {
    set({ isLoading: true, error: null })

    try {
      console.log("📝 ShipperStore: Creating shipper...", data)
      const newShipper = await contactsApi.createContact({
        ...data,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })

      console.log("✅ ShipperStore: Shipper created:", newShipper)

      // Add to shippers list
      const updatedShippers = [...get().shippers, newShipper]

      // If this is the first active shipper, set it as active
      let activeShipper = get().activeShipper
      if (newShipper.is_active && !activeShipper) {
        activeShipper = newShipper
      }

      set({
        shippers: updatedShippers,
        activeShipper,
        isLoading: false,
        error: null,
      })

      return newShipper
    } catch (error: any) {
      console.error("❌ ShipperStore: Failed to create shipper:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to create shipper",
      })
      throw error
    }
  },

  // Update shipper (activate/deactivate)
  updateShipper: async (id: string, data: UpdateContactRequest) => {
    set({ isLoading: true, error: null })

    try {
      console.log(`📝 ShipperStore: Updating shipper ${id}...`, data)
      const updatedShipper = await contactsApi.updateContact(id, data)

      console.log("✅ ShipperStore: Shipper updated:", updatedShipper)

      // Update in shippers list
      const updatedShippers = get().shippers.map((shipper) =>
        shipper.id === id ? updatedShipper : shipper,
      )

      // Update active shipper
      let activeShipper = get().activeShipper

      if (updatedShipper.is_active) {
        // If this shipper is now active, set it as active
        activeShipper = updatedShipper
      } else if (activeShipper?.id === id) {
        // If we deactivated the active shipper, find another active one
        activeShipper = updatedShippers.find((s) => s.is_active) || null
      }

      set({
        shippers: updatedShippers,
        activeShipper,
        isLoading: false,
        error: null,
      })

      // Check if all shippers are now deactivated
      if (!activeShipper && updatedShippers.length > 0) {
        console.log("⚠️ ShipperStore: No active shipper after update, checking if all are deactivated...")
        await get().checkAllDeactivated()
      }

      return updatedShipper
    } catch (error: any) {
      console.error("❌ ShipperStore: Failed to update shipper:", error)
      set({
        isLoading: false,
        error: error?.message || "Failed to update shipper",
      })
      throw error
    }
  },

  // Set active shipper manually
  setActiveShipper: (shipper: Contact | null) => {
    set({ activeShipper: shipper })
  },

  // Check if all shippers are deactivated and create unidentified event
  checkAllDeactivated: async () => {
    const { shippers } = get()

    // Check if all shippers are deactivated
    const allDeactivated = shippers.length > 0 && shippers.every((s) => !s.is_active)

    if (allDeactivated) {
      console.log("🚨 ShipperStore: All shippers are deactivated, creating unidentified driving event...")
      await createUnidentifiedDrivingEvent()
    }
  },

  // Reset store
  reset: () => {
    set({
      shippers: [],
      activeShipper: null,
      isLoading: false,
      error: null,
      lastFetched: null,
    })
  },
}))

// ============================================================================
// Auto-fetch on token availability
// ============================================================================

// Subscribe to token changes and auto-fetch shippers
useAuthStore.subscribe(
  (state) => state.token,
  (token, previousToken) => {
    // If token changed from null/undefined to a value, fetch shippers
    if (token && !previousToken) {
      console.log("🔑 ShipperStore: Token available, fetching shippers...")
      useShipperStore.getState().fetchShippers()
    } else if (!token && previousToken) {
      // If token was removed, reset store
      console.log("🔑 ShipperStore: Token removed, resetting shippers...")
      useShipperStore.getState().reset()
    }
  },
)

// Also fetch on initial load if token is already available
if (useAuthStore.getState().token) {
  console.log("🔑 ShipperStore: Initial token check - token available, fetching shippers...")
  useShipperStore.getState().fetchShippers()
}

