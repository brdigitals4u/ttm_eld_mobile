# Theme Colors Documentation

**File:** `src/theme/colors.ts`

## Overview

Comprehensive color palette system for the TTM Konnect ELD Mobile application. Implements Corporate Command Theme with primary brand colors, status colors, semantic colors, and light/dark theme variants.

## Color System

### Corporate Command Theme

Primary brand identity colors based on corporate standards.

## Color Categories

### Neutral Colors (Grayscale)

**Scale**: `neutral100` (lightest) → `neutral900` (darkest)

- **neutral100**: `#FFFFFF` - Pure White (main content backgrounds)
- **neutral200**: `#F0F2F5` - Light Gray (cards, dividers)
- **neutral300**: `#E0E4E7` - Light border gray
- **neutral400**: `#B8BCC8` - Medium gray
- **neutral500**: `#6C7293` - Text gray (secondary text)
- **neutral600**: `#4A5568` - Dark gray
- **neutral700**: `#2D3748` - Darker gray
- **neutral800**: `#1A202C` - Very dark gray (primary text)
- **neutral900**: `#0A2A4E` - Deep Navy Blue (headers, sidebars)

### Primary Colors (Brand Blue)

**Scale**: `primary100` (lightest) → `primary900` (darkest)

- **primary500**: `#0071ce` - **Main brand blue** (buttons, links, selected states)
- **primary600**: `#0056B3` - Darker blue
- **primary700**: `#004085` - Dark blue
- **primary800**: `#003366` - Very dark blue
- **primary900**: `#0A2A4E` - Deep Navy Blue

**Usage**: Primary actions, links, selected states, brand elements

### Success Colors (Green)

**Scale**: `success100` (lightest) → `success900` (darkest)

- **success500**: `#28A745` - Success Green (On Time, Active, Completed)
- **success100-400**: Light green variations (backgrounds)
- **success600-900**: Dark green variations

**Usage**: 
- Success messages
- Active status
- On-time indicators
- Completed tasks

### Warning Colors (Yellow/Orange)

**Scale**: `warning100` (lightest) → `warning900` (darkest)

- **warning500**: `#FFC107` - Warning Orange (Delayed, Maintenance Due)
- **warning100-400**: Light yellow variations (backgrounds)
- **warning600-900**: Dark yellow/orange variations

**Usage**:
- Warning messages
- Caution states
- Maintenance reminders
- Delayed status

### Error Colors (Red)

**Scale**: `error100` (lightest) → `error900` (darkest)

- **error500**: `#DC3545` - Alert Red (Stopped, SOS, Overdue)
- **error100-400**: Light red variations (backgrounds)
- **error600-900**: Dark red variations

**Usage**:
- Error messages
- Alert states
- Stopped status
- Overdue items
- Critical warnings

## Semantic Colors

### Text Colors

- **`text`**: `neutral800` - Primary text color (#1A202C)
- **`textDim`**: `neutral500` - Secondary text color (#6C7293)

### Background Colors

- **`background`**: `neutral100` - Screen background (#FFFFFF)
- **`surface`**: `neutral100` - Card/surface background (#FFFFFF)
- **`cardBackground`**: `neutral100` - Card background (#FFFFFF)
- **`sectionBackground`**: `neutral200` - Section background (#F0F2F5)

### Border Colors

- **`border`**: `neutral300` - Border color (#E0E4E7)
- **`separator`**: `neutral200` - Divider color (#F0F2F5)

### Interactive Colors

- **`tint`**: `primary500` - Main action color (#0071ce)
- **`tintInactive`**: `neutral400` - Inactive state (#B8BCC8)

### Status Colors

- **`error`**: `error500` - Error color (#DC3545)
- **`errorBackground`**: `error100` - Error background
- **`success`**: `success500` - Success color (#28A745)
- **`successBackground`**: `success100` - Success background
- **`warning`**: `warning500` - Warning color (#FFC107)
- **`warningBackground`**: `warning100` - Warning background
- **`info`**: `primary500` - Info color (#0071ce)
- **`infoBackground`**: `primary100` - Info background

### UI Element Colors

- **`headerBackground`**: `neutral900` - Header background (#0A2A4E)
- **`buttonPrimary`**: `primary500` - Primary button (#0071ce)
- **`buttonPrimaryText`**: `neutral100` - Button text (#FFFFFF)
- **`buttonSecondary`**: `neutral200` - Secondary button (#F0F2F5)
- **`buttonSecondaryText`**: `neutral800` - Secondary text (#1A202C)

### Input Colors

- **`inputBackground`**: `neutral100` - Input background (#FFFFFF)
- **`inputBorder`**: `neutral300` - Input border (#E0E4E7)
- **`inputBorderFocused`**: `primary500` - Focused border (#0071ce)
- **`inputBorderError`**: `error500` - Error border (#DC3545)

## Light Theme Colors

```typescript
light: {
  primary: "#0071ce",        // Main brand blue
  secondary: "#3B82F6",      // Bright blue
  background: "#FFFFFF",     // White
  card: "#F9FAFB",           // Light gray
  surface: "#F3F4F6",        // Gray surface
  text: "#111827",           // Dark text
  textSecondary: "#6B7280",  // Gray text
  border: "#E5E7EB",         // Light border
  notification: "#EF4444",   // Red
  success: "#10B981",        // Green
  warning: "#F59E0B",        // Orange
  danger: "#EF4444",         // Red
  error: "#EF4444",          // Red
  inactive: "#9CA3AF",       // Gray
  
  // Duty Status Colors
  driving: "#10B981",        // Green
  onDuty: "#F59E0B",         // Amber
  offDuty: "#3B82F6",        // Blue
  sleeping: "#6366F1",       // Indigo
  
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.5)",
  shadowColor: "#000000"
}
```

## Dark Theme Colors

```typescript
dark: {
  primary: "#0071ce",        // Same brand blue
  secondary: "#60A5FA",      // Lighter blue
  background: "#0F172A",     // Dark background
  card: "#1E293B",           // Dark card
  surface: "#334155",        // Dark surface
  text: "#F8FAFC",           // Light text
  textSecondary: "#CBD5E1",  // Light gray text
  border: "#475569",         // Dark border
  notification: "#EF4444",   // Red
  success: "#10B981",        // Green
  warning: "#F59E0B",        // Orange
  danger: "#EF4444",         // Red
  error: "#EF4444",          // Red
  inactive: "#64748B",       // Gray
  
  // Duty Status Colors (same as light)
  driving: "#10B981",
  onDuty: "#F59E0B",
  offDuty: "#3B82F6",
  sleeping: "#6366F1",
  
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.7)",
  shadowColor: "#000000"
}
```

## Duty Status Colors

### Driving
- **Color**: `#10B981` (Green)
- **Usage**: Active driving status
- **Meaning**: Vehicle in motion

### On Duty
- **Color**: `#F59E0B` (Amber/Orange)
- **Usage**: On duty but not driving
- **Meaning**: Working but stationary

### Off Duty
- **Color**: `#3B82F6` (Blue)
- **Usage**: Off duty status
- **Meaning**: Rest break, not working

### Sleeper Berth
- **Color**: `#6366F1` (Indigo)
- **Usage**: Sleeper berth rest
- **Meaning**: Extended rest period

## Color Usage Guidelines

### Primary Actions

Use `primary500` (#0071ce) for:
- Primary buttons
- Active links
- Selected states
- Brand elements
- Call-to-action buttons

### Status Indicators

- **Success**: Green for positive states
- **Warning**: Orange for caution
- **Error**: Red for critical issues

### Text Hierarchy

- **Primary Text**: `text` (dark gray)
- **Secondary Text**: `textDim` (medium gray)
- **Disabled Text**: `tintInactive` (light gray)

### Backgrounds

- **Screens**: `background` (white/dark)
- **Cards**: `surface` or `cardBackground`
- **Sections**: `sectionBackground`

## Color Constants Export

### Main Export

```typescript
export const colors = {
  palette,              // Complete palette
  PRIMARY: "#0071ce",   // Primary brand color
  transparent: "rgba(0, 0, 0, 0)",
  // Semantic colors
  text, textDim, background, border, tint,
  // Status colors
  error, success, warning, info,
  // UI colors
  headerBackground, buttonPrimary, etc.,
  // Theme variants
  light, dark
}
```

## Accessibility

### Contrast Ratios

- Text on background: WCAG AA compliant
- Interactive elements: 4.5:1 minimum
- Large text: 3:1 minimum

### Color Blindness

- Don't rely solely on color
- Use icons and text
- Provide alternative indicators

## Usage Examples

### Component Styling

```typescript
import { colors } from '@/theme/colors'

<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.text }}>Hello</Text>
  <Button style={{ backgroundColor: colors.buttonPrimary }} />
</View>
```

### Theme Hook

```typescript
import { useAppTheme } from '@/theme/context'

const { theme } = useAppTheme()
const { colors } = theme

<View style={{ backgroundColor: colors.background }} />
```

### Status Colors

```typescript
const statusColor = status === 'driving' 
  ? colors.light.driving 
  : colors.light.offDuty
```

## Color Naming Convention

### Scale Naming

- `100` - Lightest (backgrounds)
- `200-400` - Light (subtle backgrounds)
- `500` - Base color (main usage)
- `600-900` - Dark (text, emphasis)

### Semantic Naming

- Descriptive names: `success`, `error`, `warning`
- Purpose-based: `buttonPrimary`, `headerBackground`
- State-based: `text`, `textDim`

## Notes

- Consistent with corporate brand guidelines
- Supports both light and dark themes
- Duty status colors are standardized
- All colors have sufficient contrast
- Palette provides flexibility for UI elements

