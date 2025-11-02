# Screens Documentation Summary

This document covers all screen components in the application.

## Screen Files Overview

### Located in `src/screens/`

1. **DashboardScreen.tsx** - [See SCREENS_DASHBOARD.md](./SCREENS_DASHBOARD.md)
2. **LoginScreen.tsx** - [See SCREENS_LOGIN.md](./SCREENS_LOGIN.md)
3. **DeviceScanScreen.tsx** - ELD device scanning and connection
4. **ProfileScreen.tsx** - User profile and settings
5. **HOSScreen.tsx** - Hours of Service management
6. **LogsScreen.tsx** - HOS logs and certification
7. **FuelScreen.tsx** - Fuel tracking (wraps app/fuel)
8. **WelcomeScreen.tsx** - Welcome/onboarding screen

### Located in `src/app/`

These are Expo Router route files:

- **index.tsx** - Root route handler
- **login.tsx** - Login route (uses LoginScreen)
- **device-scan.tsx** - Device scan route (uses DeviceScanScreen)
- **welcome.tsx** - Welcome route (uses WelcomeScreen)
- **(tabs)/dashboard.tsx** - Dashboard tab route
- **(tabs)/logs.tsx** - Logs tab route
- **(tabs)/fuel.tsx** - Fuel tab route
- **(tabs)/profile.tsx** - Profile tab route
- **status.tsx** - Status change screen
- **dvir.tsx** - DVIR inspection screen
- **inspection.tsx** - Inspection screen
- **assignments.tsx** - Assignments screen
- **carrier.tsx** - Carrier screen
- **codriver.tsx** - Co-driver screen
- **more.tsx** - More/settings screen
- **settings.tsx** - Settings screen
- **inspector-mode.tsx** - Inspector mode screen

## DeviceScanScreen.tsx

**Purpose**: Bluetooth device scanning and ELD connection

**Key Features**:
- Device discovery via Bluetooth scan
- Device list with signal strength
- Connection handling
- Authentication flow
- Dev mode skip button
- Connection state management

**Main Functions**:
- `initializeBluetooth()` - SDK initialization
- `startScan()` / `stopScan()` - Device scanning
- `connectToDevice()` - Device connection
- Event listeners for connection events

**Navigation**: Navigates to `/(tabs)/dashboard` after successful authentication

## ProfileScreen.tsx

**Purpose**: User profile display and management

**Key Features**:
- Driver profile information
- Contact information
- Company information
- Vehicle assignment details
- ELD configuration settings
- HOS status overview
- Compliance status
- Logout functionality

**Sections**:
1. **Gradient Header** - Driver name and status badge
2. **Quick Stats** - HOS time remaining
3. **Status Badge** - Current duty status
4. **Contact Information** - Email, phone, license
5. **Company Information** - Organization details
6. **Vehicle Assignment** - Vehicle details
7. **ELD Configuration** - Device settings and exemptions
8. **Compliance Status** - Violations display
9. **Menu Items** - Navigation options

## HOSScreen.tsx

**Purpose**: Hours of Service management and display

**Key Features**:
- Current HOS status display
- Time remaining calculations
- Progress bars for time limits
- Violations display
- Status change actions

**Display Components**:
- Main timer (Stop In)
- Drive Left timer
- Shift Left timer
- Cycle Left timer
- Current status badge
- Active violations list

**Data Source**: Realm database (HOSStatus)

## LogsScreen.tsx

**Purpose**: HOS logs viewing, certification, and transfer

**Key Features**:
- Daily log entries
- Date selector (previous/next day)
- Log certification
- Transfer logs (wireless, email to DOT, email to self)
- ELD materials access
- Inspector mode
- HOS chart visualization

**Main Functions**:
- `getFilteredLogs()` - Filters logs by selected date
- `handleCertifyLogs()` - Certifies daily logs
- `handleTransferLogs()` - Transfer options
- `shareLogsViaEmail()` - Email sharing

**Modals**:
- Certification modal
- Transfer modal
- ELD materials modal

## FuelScreen.tsx

**Purpose**: Fuel tracking (wrapper)

**Implementation**: Wraps `@/app/fuel` component

**Note**: Implementation delegated to route file

## WelcomeScreen.tsx

**Purpose**: Onboarding and welcome experience

**Key Features**:
- Brand introduction
- Welcome message
- Next/Skip buttons
- Privacy policy link
- Mark welcome as seen

**Design**:
- Violet gradient background
- SVG background decorations
- White bottom card with content
- Image placeholder

**Storage**: Saves `has_seen_welcome` flag to storage

## Status Screen (status.tsx)

**Purpose**: Duty status change interface

**Expected Features**:
- Current status display
- Status change options
- Location capture
- Reason selection
- Status history

## Route Files Summary

All route files in `src/app/` are Expo Router files that:
- Define routes using file-based routing
- May wrap screen components
- Handle navigation logic
- Provide route-specific layouts

## Common Patterns

### Screen Structure

Most screens follow this pattern:
1. Header component
2. ScrollView with content
3. Sections with cards
4. Action buttons

### State Management

- Use Zustand stores (authStore, statusStore)
- Use React Query for API data
- Use contexts for shared data

### Navigation

- Uses `expo-router` for navigation
- `router.push()` for navigation
- `router.replace()` for replacement
- `router.back()` for going back

## Screen Dependencies

Common dependencies across screens:
- `@/stores/authStore` - Authentication state
- `@/stores/statusStore` - Status state
- `@/contexts` - Various contexts
- `@/components` - UI components
- `@/theme` - Theming
- `expo-router` - Navigation

