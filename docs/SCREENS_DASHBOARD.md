# Dashboard Screen Documentation

**File:** `src/screens/DashboardScreen.tsx`

## Overview

Main dashboard screen displaying driver information, Hours of Service (HOS) status, vehicle data, ELD connection status, and quick actions. This is the primary screen drivers see after login and ELD connection.

## Key Features

- **User Greeting**: Personalized welcome with driver name
- **ELD Connection Indicator**: Visual status of ELD device connection
- **Live Vehicle Data**: Speed gauge and fuel level indicators (when ELD connected)
- **Hours of Service Display**: 
  - Big timer showing time until rest required
  - Drive time remaining
  - Shift time remaining
  - Cycle time remaining
- **Quick Status Cards**: Connection status and log certification status
- **Daily Activity Chart**: Visual timeline of duty status changes
- **Vehicle Information Card**: Complete vehicle details
- **Quick Actions**: Direct navigation to Drive and Logs screens
- **Category Navigation**: HOS, Logs, DVIR, Reports shortcuts

## State Management

### Hooks Used

- `useAuth()` - Authentication and driver data
- `useStatus()` - HOS status and log entries
- `useLocation()` - Current location tracking
- `useObdData()` - ELD/OBD data from connected device

### Data Sources

1. **User Profile**: From authStore (firstName, lastName, driverProfile)
2. **HOS Status**: From authStore.hosStatus
3. **Vehicle Assignment**: From authStore.vehicleAssignment
4. **Organization Settings**: From authStore.organizationSettings
5. **OBD Data**: From OBD data context (speed, fuel level)
6. **Location**: From location context

## UI Components

### Hero Card

Gradient card with welcome message and "Start Driving" action button.

```typescript
<LinearGradient colors={["#66ade7", "#0071ce"]}>
  <Text>Ready to hit the road with TTM Konnect?</Text>
  <TouchableOpacity onPress={() => router.push("/status")}>
    <Text>Start Driving</Text>
  </TouchableOpacity>
</LinearGradient>
```

### Categories Section

Horizontal scrollable category cards:
- **HOS** (active by default)
- **Logs**
- **DVIR**
- **Reports**

### ELD Data Section

Shown only when `eldConnected` is true:
- **Speed Gauge**: Live vehicle speed from OBD data
- **Fuel Level Indicator**: Current fuel percentage

Both displayed in card layout with connection badge.

### Quick Status Cards

Two cards showing:
1. **Connection Status**: Connected/Offline indicator
2. **Logs Status**: Certification status or pending log count

### Hours of Service Card

Large visual display with:
- **Big Timer**: Circular display showing "Time Until Rest" (hours:minutes)
- **Drive Left**: Progress circle and time remaining
- **Shift Left**: Progress circle and time remaining
- **Cycle Time**: Days and hours remaining

### Quick Actions

Two gradient action cards:
- **Drive**: Navigate to status screen
- **Logs**: Navigate to logs screen

### Daily Activity Chart

HOS chart component showing timeline of duty status changes for the current day.

### Vehicle Information Card

Comprehensive vehicle details:
- Current location (from location context)
- Vehicle make, model, year
- License plate
- VIN (partially masked)
- Vehicle unit number

## Data Processing

### Location Address Shortening

```typescript
const shortLocationAddress = useMemo(() => {
  // Returns just city and state, or truncated address
}, [currentLocation])
```

### Speed Extraction

```typescript
const currentSpeed = useMemo(() => {
  // Finds "Vehicle Speed" or "Wheel-Based Vehicle Speed" in OBD data
  // Parses and returns numeric value
}, [obdData])
```

### Fuel Level Extraction

```typescript
const fuelLevel = useMemo(() => {
  // Finds "Fuel Level" in OBD data
  // Parses and returns percentage (0-100)
}, [obdData])
```

### Data Aggregation

The `data` useMemo hook aggregates all information from various stores:
- Driver information
- Vehicle assignment
- HOS status with time calculations
- Certification status
- Log entries count

### Time Formatting

- `time(m)` - Formats minutes to "HH:MM" format
- `cycleTime(m)` - Formats for cycle display "H:MM"
- `pct(remain, total)` - Calculates percentage for progress bars

### Duty Status Styling

`getDutyStatusStyle(status)` returns color scheme based on status:
- **DRIVING**: Yellow/amber theme
- **ON_DUTY**: Blue theme
- **OFF_DUTY**: Gray theme
- **SLEEPER**: Gold/yellow theme

## Animations

### Vehicle Icon Pulse

Animated pulse effect on vehicle information card icon using Reanimated:
- Scale animation (1.0 to 1.15)
- Opacity animation (1.0 to 0.7)
- Infinite repeat with easing

## Navigation

Routes available from dashboard:
- `/status` - Change duty status / Start driving
- `/(tabs)/logs` - View and certify logs
- `/dvir` - DVIR inspections
- Other category screens

## Location Management

Automatically requests location on mount:
```typescript
useEffect(() => {
  requestLocation()
}, [requestLocation])
```

## Styling

Uses comprehensive StyleSheet with:
- Modern card-based design
- Gradient backgrounds
- Shadow effects
- Responsive layout
- Color scheme matching app theme

## Sample Data

Includes hardcoded log data for demonstration:
```typescript
const logs = [
  { start: '2025-10-31T23:00:00-05:00', end: '2025-11-01T06:00:00-05:00', status: 'offDuty' },
  // ... more log entries
]
```

## Dependencies

- React Native components
- `expo-router` for navigation
- `expo-linear-gradient` for gradients
- `react-native-reanimated` for animations
- `react-native-progress` for progress circles
- Custom components: Header, EldIndicator, SpeedGauge, FuelLevelIndicator, HOSCircle, HOSChart
- Custom hooks: useAuth, useStatus, useLocation, useObdData

## Error Handling

- Handles missing data gracefully with fallback values
- Shows "Loading..." states when data is not available
- Handles disconnected ELD device (hides ELD data section)

## Performance

- Uses `useMemo` for expensive calculations
- Memoized data aggregation
- Efficient re-renders with proper dependency arrays

## Notes

- ELD data section only appears when device is connected
- Location is requested automatically on mount
- Daily chart uses sample data (should be replaced with actual log data)
- Vehicle icon has animated pulse effect
- All navigation uses expo-router

