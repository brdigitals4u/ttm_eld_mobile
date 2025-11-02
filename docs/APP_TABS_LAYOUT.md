# Tabs Layout Documentation

**File**: `src/app/(tabs)/_layout.tsx`

## Overview

Bottom tab navigation layout configuration. Defines tab bar styling, tab items, icons, labels, and navigation structure using Expo Router's tab navigation.

## Tab Structure

### Tab Components

```typescript
<Tabs>
  <TabSlot />  {/* Renders selected screen */}
  <TabList>    {/* Tab bar */}
    <TabTrigger> {/* Tab buttons */}
  </TabList>
</Tabs>
```

## Tab Items

### 1. Dashboard Tab

- **Route**: `/dashboard`
- **Name**: `"dashboard"`
- **Icon**: `"menu"`
- **Label**: `"Home"`

### 2. Logs Tab

- **Route**: `/logs`
- **Name**: `"logs"`
- **Icon**: `"view"`
- **Label**: `"Logs"`

### 3. Fuel Tab

- **Route**: `/fuel`
- **Name**: `"fuel"`
- **Icon**: `"bell"`
- **Label**: `"Fuel"`

### 4. Profile Tab

- **Route**: `/profile`
- **Name**: `"profile"`
- **Icon**: `"user"`
- **Label**: `"Profile"`

## Custom Tab Button

### Component

```typescript
function CustomTabButton({ isFocused, icon, label, ...props })
```

### Features

- **Icon Display**: Shows icon with color based on focus
- **Label Text**: Shows label below icon
- **Focus State**: Active/inactive styling
- **Press Handling**: Standard tab press

### Styling

**Inactive**:
- Icon: White
- Background: Transparent
- Label: White

**Active**:
- Icon: Primary blue (#0071ce)
- Background: White
- Label: Dark text (#222)

## Tab Bar Styling

### Container

```typescript
{
  flexDirection: "row",
  justifyContent: "space-between",
  backgroundColor: COLORS.primary,  // Blue
  borderRadius: 28,
  padding: 8,
  marginHorizontal: 16,
  marginVertical: 12,
  marginBottom: Platform.OS === 'ios' ? 24 : 36,
  elevation: 8,
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 5 },
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
}
```

### Visual Design

- **Background**: Primary blue (#0071ce)
- **Shape**: Rounded (28px radius)
- **Position**: Floating at bottom
- **Shadow**: Elevated appearance
- **Padding**: 8px internal

### Platform Differences

- **iOS**: 24px bottom margin
- **Android**: 36px bottom margin

## Tab Item Styling

### Base Style

```typescript
{
  flex: 1,
  alignItems: "center",
  paddingVertical: 14,
  borderRadius: 24,
  marginHorizontal: 4,
  backgroundColor: "transparent",
}
```

### Active Style

```typescript
{
  backgroundColor: COLORS.white,
}
```

Active tab has white background.

### Label Styling

**Inactive**:
```typescript
{
  fontSize: 12,
  color: COLORS.white,
  marginTop: 4,
}
```

**Active**:
```typescript
{
  fontSize: 12,
  color: "#222",
  fontWeight: "500",
  marginTop: 4,
}
```

## Navigation

### Tab Switching

Tabs automatically switch when:
- User taps tab button
- Programmatic navigation to tab route

### Route Matching

Tab routes match file structure:
- `(tabs)/dashboard.tsx` → `/dashboard`
- `(tabs)/logs.tsx` → `/logs`
- `(tabs)/fuel.tsx` → `/fuel`
- `(tabs)/profile.tsx` → `/profile`

## Icon System

### Icon Component

Uses `@/components/Icon` component:
- Size: 22px
- Color: Dynamic based on focus
- Icon names from asset system

### Available Icons

- `"menu"` - Dashboard/home
- `"view"` - Logs/view
- `"bell"` - Fuel/notifications
- `"user"` - Profile

## Accessibility

- **Touch Targets**: Minimum 44x44px
- **Labels**: Clear text labels
- **Focus Indicators**: Visual feedback
- **Color Contrast**: Sufficient contrast

## Responsive Design

### Layout

- **Horizontal**: Space evenly
- **Vertical**: Center aligned
- **Flexible**: Adapts to screen width

### Sizing

- **Tab Items**: Equal width (flex: 1)
- **Icons**: Fixed 22px
- **Labels**: Fixed 12px font

## Platform Considerations

### iOS

- Safe area handling
- Bottom spacing for home indicator
- Native tab bar behavior

### Android

- Material Design guidelines
- Back button handling
- System navigation bar spacing

## Customization

### Colors

Uses `COLORS` constant:
- Primary blue for background
- White for active state
- Dynamic icon colors

### Layout

Can customize:
- Tab order
- Icons
- Labels
- Styling
- Behavior

## Usage Example

```typescript
// Navigate to tab
router.push('/(tabs)/dashboard')
router.push('/(tabs)/logs')

// Get current tab
const route = usePathname()  // "/dashboard", "/logs", etc.
```

## Related Files

- `(tabs)/dashboard.tsx` - Dashboard screen
- `(tabs)/logs.tsx` - Logs screen
- `(tabs)/fuel.tsx` - Fuel screen
- `(tabs)/profile.tsx` - Profile screen

## Notes

1. Uses Expo Router tab navigation
2. Custom tab button design
3. Floating tab bar design
4. Platform-specific spacing
5. Accessible touch targets

