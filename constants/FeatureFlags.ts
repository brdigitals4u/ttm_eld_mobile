// Feature Flags Configuration
export const FeatureFlags = {
  // OBD Feature Flags
  OBD2_MOCKUP_MODE: __DEV__ || true, // Enable mockup mode for testing
  OBD2_ENABLE_ANIMATIONS: true,
  OBD2_ENABLE_REAL_TIME_DATA: true,
  OBD2_ENABLE_PERMISSIONS: true,
  OBD2_ENABLE_DEBUG_LOGS: __DEV__,
  
  // OBD Manager Feature Flags
  OBD_MANAGER_ENABLED: true,
  OBD_MANAGER_BLUETOOTH_ENABLED: true,
  
  // OBD Tools Feature Flags
  OBD_TOOLS_ENABLED: true,
  OBD_TOOLS_DTC_ENABLED: true,
  OBD_TOOLS_ADVANCED_DIAGNOSTICS: true,
} as const;

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (flag: keyof typeof FeatureFlags): boolean => {
  return FeatureFlags[flag] === true;
};

// Development utility to override flags
export const setFeatureFlag = (flag: keyof typeof FeatureFlags, value: boolean) => {
  if (__DEV__) {
    // @ts-ignore - Allow override in development
    FeatureFlags[flag] = value;
    console.log(`Feature flag ${flag} set to ${value}`);
  }
};
