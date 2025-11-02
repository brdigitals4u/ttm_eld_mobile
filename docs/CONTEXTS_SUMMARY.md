# Contexts Documentation Summary

This document covers all React Context providers in the application.

## Context Architecture

### AllContextsProvider.tsx

Main wrapper that provides all contexts in nested structure:

```typescript
LocationProvider
  └─ AssetsProvider
      └─ CarrierProvider
          └─ CoDriverProvider
              └─ FuelProvider
                  └─ InspectionProvider
                      └─ StatusProvider
                          └─ ObdDataProvider
```

**Usage**: Wraps entire app (except auth which uses Zustand)

**Location**: Wrapped in root `_layout.tsx`

## Context Providers

### ObdDataProvider

[See CONTEXT_OBD_DATA.md](./CONTEXT_OBD_DATA.md)

**Purpose**: OBD/ELD data collection and synchronization

**Key Features**:
- Real-time OBD data from ELD device
- Dual sync (Local API + AWS)
- Data buffering
- Connection status

### LocationProvider (location-context.tsx)

**Purpose**: GPS location tracking and management

**Key Features**:
- Current location tracking
- Address geocoding
- Permission handling
- Location updates

**Hook**: `useLocation()`

**Returns**:
- `currentLocation` - Current GPS coordinates and address
- `requestLocation()` - Request location update
- `isLoading` - Location loading state
- `error` - Location error

**Usage**:
```typescript
const { currentLocation, requestLocation } = useLocation()
```

### StatusProvider (status-context.ts)

**Purpose**: Driver status and HOS management

**Key Features**:
- Current duty status
- Status history
- HOS calculations
- Status change handling

**Hook**: `useStatus()`

**Note**: May be replaced/merged with statusStore

### AssetsProvider (assets-context.ts)

**Purpose**: Asset management context

**Features**: Asset data management (vehicles, equipment, etc.)

### CarrierProvider (carrier-context.ts)

**Purpose**: Carrier/company information

**Features**: Carrier data and settings

### CoDriverProvider (codriver-context.ts)

**Purpose**: Co-driver information and management

**Features**: Co-driver data and relationships

### FuelProvider (fuel-context.ts)

**Purpose**: Fuel tracking and management

**Features**: Fuel transaction data and history

### InspectionProvider (inspection-context.ts)

**Purpose**: Inspection and DVIR management

**Features**: Inspection data and forms

### AuthContext.tsx / auth-context.ts

**Purpose**: Authentication context (legacy)

**Note**: Most authentication now uses Zustand authStore. This may be legacy code.

## Context Patterns

### Provider Structure

```typescript
const Context = createContext<ContextType | undefined>(undefined)

export const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(initialState)
  
  // Effects and logic
  
  const value = {
    // State and methods
  }
  
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useContext = () => {
  const context = useContext(Context)
  if (!context) {
    throw new Error('useContext must be used within Provider')
  }
  return context
}
```

### Context Hooks

All contexts provide custom hooks:
- `useObdData()` - OBD data
- `useLocation()` - Location
- `useStatus()` - Status
- `useAssets()` - Assets
- `useCarrier()` - Carrier
- `useCoDriver()` - Co-driver
- `useFuel()` - Fuel
- `useInspection()` - Inspection

### Context Index

**index.tsx** - Exports all contexts and hooks

**index.ts** - Type exports

## Integration

### With Zustand

Contexts work alongside Zustand stores:
- Contexts: Real-time data, device communication
- Zustand: Global state, persistence

### With React Query

Some contexts may use React Query for:
- Server state
- Caching
- Refetching

### With Screens

Screens use contexts via hooks:
```typescript
const { obdData, isConnected } = useObdData()
const { currentLocation } = useLocation()
```

## Context Lifecycle

### Initialization

Contexts initialize when:
- Provider is mounted
- Dependencies are available (auth, permissions)

### Cleanup

Contexts clean up:
- Event listeners
- Timers/intervals
- Subscriptions

### Error Handling

Contexts handle errors:
- Try-catch blocks
- Error state
- Fallback values
- User notifications

## Performance Considerations

1. **Memoization**: Use useMemo for expensive calculations
2. **Context Splitting**: Separate contexts for different concerns
3. **Selective Updates**: Only update when necessary
4. **Cleanup**: Proper cleanup on unmount

## Common Patterns

### Location Context Pattern

```typescript
useEffect(() => {
  // Request location on mount
  requestLocation()
}, [])
```

### OBD Data Pattern

```typescript
useEffect(() => {
  if (!isAuthenticated) return
  
  // Setup listeners
  const listener = JMBluetoothService.addEventListener(...)
  
  return () => {
    // Cleanup
    JMBluetoothService.removeEventListener(listener)
  }
}, [isAuthenticated])
```

## Future Improvements

- Consolidate auth context with Zustand
- Add error boundaries for contexts
- Implement context debugging tools
- Add context unit tests

