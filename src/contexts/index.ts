// Export individual contexts (non-auth)
export { useStatus } from './status-context';
export { useCarrier } from './carrier-context';
export { useFuel } from './fuel-context';
export { useAssets } from './assets-context';
export { useCoDriver } from './codriver-context';
export { useInspection } from './inspection-context';
export { useObdData } from './obd-data-context';

// Export the main context provider
export { AllContextsProvider } from './AllContextsProvider';

// Auth is now handled by Zustand store
export { useAuth } from '@/stores/authStore';
