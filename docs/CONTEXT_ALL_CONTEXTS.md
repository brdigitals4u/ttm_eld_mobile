# All Contexts Provider Documentation

**File:** `src/contexts/AllContextsProvider.tsx`

## Overview

Main context provider wrapper that nests all application contexts in a specific order. Provides a single entry point for context initialization and ensures proper dependency order.

## Context Hierarchy

```
LocationProvider (outermost)
  └─ AssetsProvider
      └─ CarrierProvider
          └─ CoDriverProvider
              └─ FuelProvider
                  └─ InspectionProvider
                      └─ StatusProvider
                          └─ ObdDataProvider (innermost)
```

## Provider Order

The nesting order is intentional:

1. **LocationProvider** - Location services (used by many contexts)
2. **AssetsProvider** - Asset data (may use location)
3. **CarrierProvider** - Carrier info (uses assets)
4. **CoDriverProvider** - Co-driver data (uses carrier)
5. **FuelProvider** - Fuel tracking (uses carrier, location)
6. **InspectionProvider** - Inspections (uses carrier, vehicle)
7. **StatusProvider** - Status/HOS (uses location, driver)
8. **ObdDataProvider** - OBD data (uses status, auth, location)

## Usage

### In Root Layout

```typescript
import { AllContextsProvider } from '@/contexts/AllContextsProvider'

export default function RootLayout() {
  return (
    <AllContextsProvider>
      {/* App content */}
    </AllContextsProvider>
  )
}
```

### Wrapping

Should wrap the entire app, typically in `_layout.tsx`:

```typescript
<AllContextsProvider>
  <NavigationContainer>
    {/* Routes */}
  </NavigationContainer>
</AllContextsProvider>
```

## Context Dependencies

### LocationProvider

**Depends on**: None (base service)

**Provides to**: All other contexts

### AssetsProvider

**Depends on**: LocationProvider

**Provides to**: CarrierProvider, others

### CarrierProvider

**Depends on**: AssetsProvider, LocationProvider

**Provides to**: CoDriverProvider, FuelProvider, InspectionProvider

### CoDriverProvider

**Depends on**: CarrierProvider

**Provides to**: StatusProvider

### FuelProvider

**Depends on**: CarrierProvider, LocationProvider

**Provides to**: Screens

### InspectionProvider

**Depends on**: CarrierProvider

**Provides to**: Inspection screens

### StatusProvider

**Depends on**: LocationProvider, CoDriverProvider

**Provides to**: ObdDataProvider, Status screens

### ObdDataProvider

**Depends on**: StatusProvider, Auth (Zustand), LocationProvider

**Provides to**: Dashboard, ELD screens

## Why This Order?

### Dependency Flow

1. **Location** is fundamental - many features need it
2. **Assets** provide vehicle/equipment data
3. **Carrier** provides organization context
4. **CoDriver** needs carrier info
5. **Fuel** needs carrier and location
6. **Inspection** needs carrier and assets
7. **Status** needs location and driver info
8. **OBD Data** needs status, location, and auth

### Avoiding Circular Dependencies

The order prevents:
- Context A depending on Context B
- Context B depending on Context A

## Initialization

### Mount Order

Contexts initialize in nesting order:
1. LocationProvider mounts first
2. AssetsProvider mounts second
3. ... and so on
4. ObdDataProvider mounts last

### Effect Order

useEffect hooks run in mount order, ensuring dependencies are ready.

## Error Boundaries

Consider wrapping in ErrorBoundary:

```typescript
<ErrorBoundary>
  <AllContextsProvider>
    {/* App */}
  </AllContextsProvider>
</ErrorBoundary>
```

## Performance

### Re-render Optimization

Each context is independent:
- Only re-renders when its own state changes
- Doesn't cause cascading re-renders
- Memoization in each context

### Initialization Time

- Contexts initialize sequentially
- Fast initialization (mostly state)
- No blocking operations

## Alternative: Auth Context

**Note**: Authentication uses Zustand store, not React Context.

**Why**: 
- Zustand provides persistence
- Better performance
- Simpler state management
- No provider nesting needed

## Custom Hooks Export

Contexts export hooks via `contexts/index.tsx`:

```typescript
export { useLocation } from './location-context'
export { useObdData } from './obd-data-context'
// ... etc
```

**Usage**:
```typescript
import { useLocation, useObdData } from '@/contexts'
```

## Testing

When testing components:
1. Wrap in AllContextsProvider
2. Or mock individual contexts
3. Or test contexts independently

## Future Improvements

1. **Lazy Loading**: Load contexts on demand
2. **Context Splitting**: Split large contexts
3. **Performance Monitoring**: Track context performance
4. **Error Handling**: Context-level error boundaries

## Notes

- Order matters for dependencies
- Auth is separate (Zustand)
- Each context is independent
- Proper cleanup on unmount
- No circular dependencies

