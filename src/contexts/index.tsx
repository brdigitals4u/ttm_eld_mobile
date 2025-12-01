// Re-export all individual context hooks from their separate files
export { useStatus } from "./status-context"
export { useCarrier } from "./carrier-context"
export { useFuel } from "./fuel-context"
export { useAssets } from "./assets-context"
export { useCoDriver } from "./codriver-context"
export { useInspection } from "./inspection-context"
export { useLocation } from "./location-context"

// Export the main context provider
export { AllContextsProvider } from "./AllContextsProvider"

// Auth is now handled by Zustand store
export { useAuth } from "../stores/authStore"
