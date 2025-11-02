# App Routing Documentation

This document covers Expo Router file-based routing structure.

## Routing Structure

### Root Layout

**File**: `src/app/_layout.tsx`

**Purpose**: Root app layout and providers

**Responsibilities**:
- Wraps app with providers
- Sets up navigation structure
- Handles app-wide configuration
- Theme provider
- Toast provider
- Query provider
- All contexts provider

### Tab Layout

**File**: `src/app/(tabs)/_layout.tsx`

**Purpose**: Bottom tab navigation layout

**Tabs**:
1. **Dashboard** - Main dashboard screen
2. **Logs** - HOS logs screen
3. **Fuel** - Fuel tracking screen
4. **Profile** - User profile screen

**Configuration**:
- Tab bar styling
- Tab icons
- Tab labels
- Active/inactive states

## Route Files

### Authentication Routes

- **`login.tsx`** - Login screen route
- **`welcome.tsx`** - Welcome/onboarding route

### Device Routes

- **`device-scan.tsx`** - ELD device scanning route

### Main Routes

- **`index.tsx`** - Root route (redirects to welcome/login/dashboard)

### Tab Routes (in `(tabs)/`)

- **`dashboard.tsx`** - Dashboard tab
- **`logs.tsx`** - Logs tab
- **`fuel.tsx`** - Fuel tab
- **`profile.tsx`** - Profile tab

### Feature Routes

- **`status.tsx`** - Status change screen
- **`dvir.tsx`** - DVIR inspection
- **`inspection.tsx`** - Inspection screen
- **`assignments.tsx`** - Assignments screen
- **`carrier.tsx`** - Carrier screen
- **`codriver.tsx`** - Co-driver screen
- **`more.tsx`** - More/settings screen
- **`settings.tsx`** - Settings screen
- **`inspector-mode.tsx`** - Inspector mode

### Asset Route

- **`assets.tsx`** - Asset management

## Route Patterns

### File-Based Routing

Expo Router uses file system for routes:
- `app/login.tsx` → `/login`
- `app/status.tsx` → `/status`
- `app/(tabs)/dashboard.tsx` → `/(tabs)/dashboard`

### Route Groups

- **`(tabs)`** - Tab navigation group (doesn't appear in URL)

### Dynamic Routes

Not currently used, but supported:
- `app/user/[id].tsx` → `/user/123`

### Nested Routes

- Tab routes are nested in `(tabs)` group
- Each tab is a separate route file

## Navigation

### Navigation Methods

```typescript
import { router } from 'expo-router'

// Push (adds to stack)
router.push('/status')

// Replace (replaces current)
router.replace('/dashboard')

// Back
router.back()

// Check if can go back
router.canGoBack()
```

### Navigation Examples

```typescript
// Navigate to status
router.push('/status')

// Navigate to dashboard tab
router.push('/(tabs)/dashboard')

// Replace current route
router.replace('/login')

// Go back
if (router.canGoBack()) {
  router.back()
}
```

## Route Guards

### Authentication Guard

Routes can check authentication:
```typescript
if (!isAuthenticated) {
  router.replace('/login')
}
```

### ELD Connection Guard

Some routes may require ELD connection:
```typescript
if (!eldConnected) {
  router.replace('/device-scan')
}
```

## Route Configuration

### Tab Bar Configuration

In `(tabs)/_layout.tsx`:
- Tab names
- Tab icons
- Tab labels
- Tab order

### Stack Configuration

In root `_layout.tsx`:
- Header configuration
- Screen options
- Navigation defaults

## Deep Linking

### URL Scheme

**Scheme**: `ttmkonnectbind://`

### Supported Links

- `ttmkonnectbind://login`
- `ttmkonnectbind://dashboard`
- `ttmkonnectbind://status`

### Link Handling

Handled in AppDelegate (iOS) and MainActivity (Android)

## Route Transitions

### Default Transitions

- Stack: Slide from right
- Tabs: Fade/instant
- Modal: Slide from bottom

### Custom Transitions

Can be configured per route or globally

## Type Safety

### Typed Routes

**Enabled**: `"typedRoutes": true` in app.json

**Benefits**:
- Type-safe navigation
- Autocomplete for routes
- Compile-time route checking

## Route Structure Summary

```
app/
├── _layout.tsx           # Root layout
├── index.tsx             # Root route
├── login.tsx             # Login
├── welcome.tsx           # Welcome
├── device-scan.tsx       # Device scan
├── status.tsx            # Status
├── (tabs)/               # Tab group
│   ├── _layout.tsx       # Tab layout
│   ├── dashboard.tsx     # Dashboard tab
│   ├── logs.tsx          # Logs tab
│   ├── fuel.tsx          # Fuel tab
│   └── profile.tsx       # Profile tab
└── [feature routes]      # Other routes
```

## Notes

- File-based routing is intuitive
- Routes match file structure
- Tab group doesn't affect URL
- Type-safe navigation available
- Deep linking supported

