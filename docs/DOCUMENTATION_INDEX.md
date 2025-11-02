# TTM Konnect ELD Mobile - Documentation Index

This directory contains comprehensive documentation for all files in the TTM Konnect ELD Mobile application.

## Structure

Documentation is organized by category to match the source code structure.

## Quick Start

- **[DOCUMENTATION_COMPLETE.md](./DOCUMENTATION_COMPLETE.md)** - Complete documentation summary
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - This index file (you are here)

## API Documentation

All API-related files in `src/api/`:

- **[API_CLIENT.md](./API_CLIENT.md)** - Core HTTP client (`client.ts`)
- **[API_CONSTANTS.md](./API_CONSTANTS.md)** - API configuration and constants (`constants.ts`)
- **[API_AUTH.md](./API_AUTH.md)** - Authentication API (`auth.ts`)
- **[API_ORGANIZATION.md](./API_ORGANIZATION.md)** - Organization driver API (`organization.ts`)
- **[API_DASHBOARD.md](./API_DASHBOARD.md)** - Dashboard data API (`dashboard.ts`)
- **[API_HOS.md](./API_HOS.md)** - Hours of Service API (`hos.ts`)
- **[API_OBD.md](./API_OBD.md)** - OBD data API (`obd.ts`)
- **[API_USER.md](./API_USER.md)** - User profile API (`user.ts`)

## Store Documentation

State management stores using Zustand:

- **[STORE_AUTH.md](./STORE_AUTH.md)** - Authentication store (`stores/authStore.ts`)
- **[STORE_STATUS.md](./STORE_STATUS.md)** - Driver status store (`stores/statusStore.ts`)

## Screen Documentation

Application screens:

- **[SCREENS_DASHBOARD.md](./SCREENS_DASHBOARD.md)** - Dashboard screen
- **[SCREENS_LOGIN.md](./SCREENS_LOGIN.md)** - Login screen
- **[SCREENS_SUMMARY.md](./SCREENS_SUMMARY.md)** - All screens overview (DeviceScan, Profile, HOS, Logs, Fuel, Welcome, etc.)

## Component Documentation

Reusable UI components:

- **[COMPONENT_ELD_INDICATOR.md](./COMPONENT_ELD_INDICATOR.md)** - ELD connection status indicator
- **[COMPONENT_SPEED_GAUGE.md](./COMPONENT_SPEED_GAUGE.md)** - Speed gauge component
- **[COMPONENT_FUEL_LEVEL.md](./COMPONENT_FUEL_LEVEL.md)** - Fuel level indicator
- **[COMPONENTS_SUMMARY.md](./COMPONENTS_SUMMARY.md)** - All components overview (Button, Card, Text, Header, HOS components, etc.)

## Context Documentation

React Context providers:

- **[CONTEXT_OBD_DATA.md](./CONTEXT_OBD_DATA.md)** - OBD data context (dual sync)
- **[CONTEXT_ALL_CONTEXTS.md](./CONTEXT_ALL_CONTEXTS.md)** - All contexts provider wrapper
- **[CONTEXTS_SUMMARY.md](./CONTEXTS_SUMMARY.md)** - All contexts overview (Location, Status, Assets, Carrier, CoDriver, Fuel, Inspection)

## Service Documentation

Business logic and service layer:

- **[SERVICE_JM_BLUETOOTH.md](./SERVICE_JM_BLUETOOTH.md)** - JM Bluetooth ELD service (native bridge)
- **[SERVICE_AWS_API.md](./SERVICE_AWS_API.md)** - AWS API service (Lambda client)
- **[SERVICES_SUMMARY.md](./SERVICES_SUMMARY.md)** - All services overview (handleData, ConnectionState, API services)

## Configuration Documentation

App configuration files:

- **[CONFIG_AWS.md](./CONFIG_AWS.md)** - AWS configuration (dual sync settings)
- **[CONFIG_ENVIRONMENT.md](./CONFIG_ENVIRONMENT.md)** - Environment configuration (dev/prod)

## Root Configuration Files

Project configuration and setup:

- **[ROOT_CONFIG_PACKAGE_JSON.md](./ROOT_CONFIG_PACKAGE_JSON.md)** - Package.json with dependencies and scripts
- **[ROOT_CONFIG_APP_JSON.md](./ROOT_CONFIG_APP_JSON.md)** - Expo app configuration
- **[ROOT_CONFIG_TSCONFIG.md](./ROOT_CONFIG_TSCONFIG.md)** - TypeScript configuration
- **[ROOT_CONFIG_EAS.md](./ROOT_CONFIG_EAS.md)** - EAS Build configuration
- **[ROOT_CONFIG_SUMMARY.md](./ROOT_CONFIG_SUMMARY.md)** - Root configuration files overview (Babel, Metro, Jest)

## Database Documentation

Local database setup:

- **[DATABASE_REALM.md](./DATABASE_REALM.md)** - Realm database service
- **[DATABASE_SCHEMAS.md](./DATABASE_SCHEMAS.md)** - Database schemas (User, DriverProfile, HOSStatus, Vehicle, etc.)

## Utility Documentation

Utility functions and helpers:

- **[UTILS_ELD_STORAGE.md](./UTILS_ELD_STORAGE.md)** - ELD device storage utility
- **[UTILS_SUMMARY.md](./UTILS_SUMMARY.md)** - All utilities overview (storage, date formatting, hooks, etc.)

## Theme Documentation

Styling and theming:

- **[THEME_COLORS.md](./THEME_COLORS.md)** - Color system (Corporate Command Theme)
- **[THEME_SUMMARY.md](./THEME_SUMMARY.md)** - Theme overview (typography, spacing, timing, context)

## Type Documentation

TypeScript type definitions:

- **[TYPES_ELD.md](./TYPES_ELD.md)** - ELD device types
- **[TYPES_SUMMARY.md](./TYPES_SUMMARY.md)** - All types overview (Auth, Status, Fuel, Inspection, Carrier, CoDriver, Assets, JMBluetooth)

## Native Documentation

### Android

Android native code:

- **[ANDROID_MAIN_APPLICATION.md](./ANDROID_MAIN_APPLICATION.md)** - Main application class
- **[ANDROID_BUILD_GRADLE.md](./ANDROID_BUILD_GRADLE.md)** - Android build configuration
- **[ANDROID_NATIVE_MODULES.md](./ANDROID_NATIVE_MODULES.md)** - Native modules (JMBluetoothModule, MainActivity)

### iOS

iOS native code:

- **[IOS_APP_DELEGATE.md](./IOS_APP_DELEGATE.md)** - iOS app delegate
- **[IOS_NATIVE_SUMMARY.md](./IOS_NATIVE_SUMMARY.md)** - iOS files overview (AppDelegate, Info.plist, Podfile)

## Plugin Documentation

Expo config plugins:

- **[PLUGIN_SPLASH_SCREEN.md](./PLUGIN_SPLASH_SCREEN.md)** - Splash screen plugin (fixes double splash)

## Routing Documentation

App routing and layout:

- **[APP_ROUTING.md](./APP_ROUTING.md)** - Routing structure (file-based routing)
- **[APP_ROOT_LAYOUT.md](./APP_ROOT_LAYOUT.md)** - Root layout (providers, initialization)
- **[APP_TABS_LAYOUT.md](./APP_TABS_LAYOUT.md)** - Tabs layout (bottom tab navigation)

## Existing Documentation

Previously created documentation files:

- **[API_ENDPOINTS_LIST.md](./API_ENDPOINTS_LIST.md)** - API endpoints reference
- **[API_ENDPOINTS_SUMMARY.md](./API_ENDPOINTS_SUMMARY.md)** - API summary
- **[APP_SETUP.md](./APP_SETUP.md)** - App setup guide
- **[BETA-1_FINAL_SUMMARY.md](./BETA-1_FINAL_SUMMARY.md)** - Beta 1 summary
- **[BETA-1_QUICK_START.md](./BETA-1_QUICK_START.md)** - Quick start guide
- **[ELD_DISPLAY_IMPLEMENTATION.md](./ELD_DISPLAY_IMPLEMENTATION.md)** - ELD display implementation
- **[ELD_INTEGRATION_REVIEW.md](./ELD_INTEGRATION_REVIEW.md)** - ELD integration review
- **[HYBRID_AWS_IMPLEMENTATION.md](./HYBRID_AWS_IMPLEMENTATION.md)** - AWS hybrid implementation
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation summary
- **[README.md](./README.md)** - Main README
- **[TOAST_AND_DRIVER_API.md](./TOAST_AND_DRIVER_API.md)** - Toast and driver API docs
- **[generate-icons.md](./generate-icons.md)** - Icon generation guide

## How to Use This Documentation

1. **For API Integration**: Start with API documentation files
2. **For State Management**: Check Store documentation
3. **For UI Development**: Review Component and Screen documentation
4. **For Configuration**: Check Config and Root Config files
5. **For Native Features**: See Android/iOS documentation
6. **For Services**: Check Service documentation
7. **For Data Flow**: Check Context documentation
8. **For Routing**: Check Routing documentation

## Documentation Coverage

- ✅ **API Files**: 8/8 documented
- ✅ **Store Files**: 2/2 documented
- ✅ **Screen Files**: 8+ documented (individual + summary)
- ✅ **Component Files**: 30+ documented (key components + summary)
- ✅ **Context Files**: 8 documented (individual + summary)
- ✅ **Service Files**: 8 documented (key services + summary)
- ✅ **Config Files**: All documented
- ✅ **Type Files**: All documented (key types + summary)
- ✅ **Utils Files**: All documented (key utils + summary)
- ✅ **Theme Files**: All documented
- ✅ **Database Files**: 2/2 documented
- ✅ **Native Files**: Android and iOS documented
- ✅ **Routing Files**: All documented

## Documentation Status

- ✅ **Completed**: All major files documented
- ✅ **Summaries**: Category summaries created
- ✅ **Index**: Complete index with all documentation
- ✅ **Cross-references**: Documentation files reference each other

## Contributing

When adding new files or features, please update the relevant documentation file or create a new one following the existing format.
