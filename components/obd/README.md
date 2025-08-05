# OBD Components

This directory contains three comprehensive OBD (On-Board Diagnostics) components for different use cases in the TruckLog ELD application.

## Components Overview

### 1. OBD2 (`OBD2.tsx`)
- **Purpose**: Mockup mode for end-to-end testing
- **Features**: 
  - Permission handling
  - Device scanning simulation
  - Basic OBD2 data display (RPM, Speed, Engine Temperature, Fuel Level)
  - Mock data streaming for testing

### 2. OBD Manager (`OBDManager.tsx`)
- **Purpose**: Bluetooth OBD device management
- **Features**:
  - Bluetooth permission requests
  - Bluetooth device scanning
  - Signal strength monitoring
  - MAC address display
  - Enhanced OBD data (includes Battery Voltage, Oil Pressure)

### 3. OBD Tools (`OBDTools.tsx`)
- **Purpose**: Advanced diagnostic tools
- **Features**:
  - Advanced permissions
  - Professional diagnostic device support
  - DTC (Diagnostic Trouble Codes) reading/clearing
  - Comprehensive diagnostic data
  - System status monitoring
  - O2 sensor and MAF readings

## Architecture

### SDK Layer (`/sdk`)
- `OBD2SDK.ts`: Mock OBD2 operations
- `OBDManagerSDK.ts`: Bluetooth OBD operations
- `OBDToolsSDK.ts`: Advanced diagnostic operations

### Hooks Layer (`/hooks`)
- `useOBD2.ts`: State management for OBD2 operations
- `useOBDManager.ts`: State management for Bluetooth OBD
- `useOBDTools.ts`: State management for diagnostic tools

### Components Layer (`/components`)
- `DeviceCard.tsx`: Reusable device display component
- `DataDisplayCard.tsx`: Real-time data visualization

## Features

### ✅ Implemented
- Dark/Light theme support
- Animated transitions
- Permission handling
- Mock device scanning
- Real-time data streaming simulation
- Professional UI components
- Type-safe implementations
- Modular architecture

### 🎨 UI/UX Features
- Consistent theming with app
- Smooth animations
- Loading states
- Device capability display
- Signal strength indicators
- Status color coding
- Professional card layouts

### 🔧 Technical Features
- TypeScript support
- Custom hooks for state management
- SDK pattern for business logic
- Modular component architecture
- Proper cleanup on unmount
- Error handling
- Mock data for testing

## Usage

```typescript
import { OBD2, OBDManager, OBDTools } from '@/components/obd';

// Use in route files
export default function OBD2Screen() {
  return <OBD2 />;
}
```

## Navigation

The components are accessible through the More tab with the following routes:
- `/obd2` - OBD2 mockup mode
- `/obd-manager` - Bluetooth OBD Manager
- `/obd-tools` - Advanced OBD Tools

## Development Notes

- All components follow the existing app patterns
- Mock data is used for demonstration
- Ready for real SDK integration
- Follows React Native best practices
- Implements proper TypeScript typing
