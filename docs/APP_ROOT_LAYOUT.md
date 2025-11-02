# Root Layout Documentation

**File**: `src/app/_layout.tsx`

## Overview

Root application layout that wraps the entire app with providers and initializes core services. Sets up theme, i18n, fonts, splash screen, error boundaries, and all context providers.

## Key Responsibilities

### Provider Nesting

Wraps app with providers in this order:
```
SafeAreaProvider
  └─ QueryProvider (React Query)
      └─ AllContextsProvider
          └─ ThemeProvider
              └─ ToastProvider
                  └─ KeyboardProvider
                      └─ <Slot /> (Routes)
```

### Initialization Tasks

1. **Font Loading**: Loads custom fonts
2. **i18n Setup**: Initializes internationalization
3. **Date Locale**: Loads date formatting locale
4. **Splash Screen**: Manages splash screen visibility

## Splash Screen Management

### Prevent Auto Hide

```typescript
SplashScreen.preventAutoHideAsync()
```

Prevents splash from hiding automatically.

### Configuration

```typescript
SplashScreen.setOptions({
  duration: 800,
  fade: true,
})
```

- 800ms duration
- Fade animation

### Hide Conditions

Splash hides when:
1. Fonts loaded AND i18n initialized
2. OR safety timeout (4 seconds) expires

### Safety Timeout

```typescript
useEffect(() => {
  const t = setTimeout(() => setSplashSafeTimeoutDone(true), 4000)
  return () => clearTimeout(t)
}, [])
```

Ensures splash hides even if initialization hangs.

## Font Loading

```typescript
const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
```

- Loads custom fonts from theme typography
- Handles loading errors
- Blocks render until loaded

## i18n Initialization

```typescript
useEffect(() => {
  initI18n()
    .then(() => setIsI18nInitialized(true))
    .then(() => loadDateFnsLocale())
}, [])
```

- Initializes translation system
- Loads date formatting locale
- Async initialization

## Provider Setup

### SafeAreaProvider

**Purpose**: Handles safe area insets (notches, status bars)

**Configuration**:
```typescript
<SafeAreaProvider initialMetrics={initialWindowMetrics}>
```

### QueryProvider

**Purpose**: React Query for server state management

**Features**:
- API data caching
- Background refetching
- Optimistic updates

### AllContextsProvider

**Purpose**: All application contexts

**Includes**:
- LocationProvider
- AssetsProvider
- CarrierProvider
- CoDriverProvider
- FuelProvider
- InspectionProvider
- StatusProvider
- ObdDataProvider

### ThemeProvider

**Purpose**: Theme management (light/dark mode)

**Features**:
- Theme switching
- Theme persistence
- Theme context

### ToastProvider

**Purpose**: Toast notification system

**Features**:
- Success toasts
- Error toasts
- Info toasts
- Auto-dismiss

### KeyboardProvider

**Purpose**: Keyboard management

**Features**:
- Keyboard avoiding
- Keyboard animations
- Keyboard events

## Development Tools

### Reactotron

**Conditional Loading**:
```typescript
if (__DEV__) {
  require("src/devtools/ReactotronConfig.ts")
}
```

Only loads in development mode.

## Error Boundary

```typescript
export { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary"
```

Exports error boundary for route-level error handling.

## Rendering Logic

### Loading State

```typescript
if (!loaded) {
  return null  // Shows splash screen
}
```

Returns null while loading (splash visible).

### Loaded State

Renders provider tree with routes when:
- Fonts loaded
- i18n initialized
- No font errors

## Route Rendering

```typescript
<Slot />
```

Expo Router slot renders current route.

## Initialization Flow

1. **App Starts** → Splash visible
2. **Fonts Load** → Async font loading
3. **i18n Init** → Async i18n setup
4. **Date Locale** → Load date formatting
5. **All Ready** → Hide splash, render app
6. **Safety Timeout** → Force hide after 4s

## Error Handling

### Font Errors

```typescript
useEffect(() => {
  if (fontError) throw fontError
}, [fontError])
```

Throws font errors to error boundary.

### Initialization Errors

Caught by:
- Error boundary
- React error boundaries
- Native error handling

## Performance

### Lazy Loading

- Reactotron only in dev
- Conditional requires
- Efficient provider setup

### Splash Management

- Fast initialization
- Safety timeout prevents hanging
- Smooth transition

## Dependencies

### Core

- `expo-router` - Routing
- `expo-splash-screen` - Splash management
- `expo-font` - Font loading
- `react-native-safe-area-context` - Safe areas
- `react-native-keyboard-controller` - Keyboard

### Providers

- `@/providers/QueryProvider` - React Query
- `@/providers/ToastProvider` - Toasts
- `@/contexts` - All contexts
- `@/theme/context` - Theme

### Utils

- `@/i18n` - Internationalization
- `@/utils/formatDate` - Date formatting

## Notes

1. Providers nested in specific order
2. Splash screen managed carefully
3. Async initialization handled properly
4. Safety timeout prevents hanging
5. Error boundaries catch initialization errors

