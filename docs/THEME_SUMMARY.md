# Theme Documentation Summary

This document covers all theming and styling files in the application.

## Theme Files Overview

### Core Theme Files

1. **theme.ts** - [See summary below]
2. **colors.ts** - Light theme colors
3. **colorsDark.ts** - Dark theme colors
4. **typography.ts** - Typography definitions
5. **spacing.ts** - Light theme spacing
6. **spacingDark.ts** - Dark theme spacing
7. **timing.ts** - Animation timings
8. **styles.ts** - Common style utilities
9. **types.ts** - Theme type definitions
10. **context.tsx** - Theme context provider
11. **context.utils.ts** - Theme utility functions

## Theme Structure

### theme.ts

**Exports**:
- `lightTheme` - Light theme configuration
- `darkTheme` - Dark theme configuration

**Theme Object**:
```typescript
{
  colors: Colors,
  spacing: Spacing,
  typography: Typography,
  timing: Timing,
  isDark: boolean
}
```

## Colors

### colors.ts

**Corporate Command Theme** - Primary brand colors

**Color Categories**:

#### Neutral Colors
- `neutral100` - Pure White (#FFFFFF)
- `neutral200` - Light Gray (#F0F2F5)
- `neutral300-900` - Gray scale

#### Primary Colors (Brand Blue)
- `primary500` - Main brand blue (#0071ce)
- `primary100-900` - Blue scale

#### Status Colors
- **Success**: Green scale (`success100-900`)
  - `success500` - #28A745 (On Time, Active)
- **Warning**: Yellow/Orange scale (`warning100-900`)
  - `warning500` - #FFC107 (Delayed, Maintenance)
- **Error**: Red scale (`error100-900`)
  - `error500` - #DC3545 (Stopped, SOS)

#### Semantic Colors
- `text` - Primary text color
- `textDim` - Secondary text
- `background` - Screen background
- `border` - Border color
- `tint` - Action/tint color
- `error` - Error color
- `success` - Success color
- `warning` - Warning color

#### Light/Dark Variants
- `light` - Light theme color set
- `dark` - Dark theme color set

**Light Theme Colors**:
```typescript
{
  primary: "#0071ce",
  background: "#FFFFFF",
  card: "#F9FAFB",
  text: "#111827",
  driving: "#10B981",    // Green
  onDuty: "#F59E0B",     // Amber
  offDuty: "#3B82F6",    // Blue
  sleeping: "#6366F1"    // Indigo
}
```

**Dark Theme Colors**:
```typescript
{
  primary: "#0071ce",
  background: "#0F172A",
  card: "#1E293B",
  text: "#F8FAFC",
  // Same status colors
}
```

### colorsDark.ts

**Purpose**: Dark theme color definitions

**Structure**: Similar to colors.ts but for dark mode

## Typography

### typography.ts

**Purpose**: Font and text styling definitions

**Definitions**:
- Font families
- Font sizes
- Font weights
- Line heights
- Text styles

**Presets**:
- `heading` - Large headings
- `subheading` - Medium headings
- `body` - Body text
- `caption` - Small text

## Spacing

### spacing.ts / spacingDark.ts

**Purpose**: Consistent spacing scale

**Values**: 
- `xs`, `sm`, `md`, `lg`, `xl` - Standard sizes
- `tiny`, `small`, `medium`, `large`, `huge` - Named sizes

**Usage**: Padding, margins, gaps

## Timing

### timing.ts

**Purpose**: Animation timing constants

**Values**:
- Standard durations
- Easing functions
- Delay constants

## Styles

### styles.ts

**Purpose**: Common style utilities

**Functions**:
- Style helpers
- Layout utilities
- Combined styles

## Theme Context

### context.tsx

**Purpose**: Theme provider and hook

**Hook**: `useAppTheme()`

**Returns**:
- `theme` - Current theme object
- `themeContext` - 'light' | 'dark'
- `setTheme` - Theme setter
- `toggleTheme` - Theme toggler

**Usage**:
```typescript
const { theme, isDark } = useAppTheme()
const { colors, spacing, typography } = theme
```

### context.utils.ts

**Purpose**: Theme utility functions

**Functions**:
- Theme manipulation
- Color calculations
- Contrast checks

## Types

### types.ts

**Purpose**: TypeScript type definitions

**Types**:
- `Theme` - Complete theme type
- `Colors` - Color type
- `Spacing` - Spacing type
- `Typography` - Typography type
- `Timing` - Timing type

## Theme Usage

### In Components

```typescript
import { useAppTheme } from '@/theme/context'

const MyComponent = () => {
  const { theme } = useAppTheme()
  const { colors } = theme
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  )
}
```

### Direct Import

```typescript
import { colors } from '@/theme/colors'

<View style={{ backgroundColor: colors.background }} />
```

## Color System

### Brand Colors

- **Primary Blue**: #0071ce
- **Deep Navy**: #0A2A4E (Headers)
- **White**: #FFFFFF (Backgrounds)

### Status Colors

- **Success Green**: #28A745 / #10B981
- **Warning Orange**: #FFC107 / #F59E0B
- **Error Red**: #DC3545 / #EF4444

### Duty Status Colors

- **Driving**: Green (#10B981)
- **On Duty**: Amber/Orange (#F59E0B)
- **Off Duty**: Blue (#3B82F6)
- **Sleeper**: Indigo (#6366F1)

## Typography System

### Font Family

- **Primary**: System default
- **Monospace**: For codes, VINs

### Font Sizes

- **Heading**: 24-32px
- **Subheading**: 18-20px
- **Body**: 16px
- **Caption**: 12-14px

### Font Weights

- **Light**: 300
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700
- **Heavy**: 800
- **Black**: 900

## Spacing System

### Scale

- **Tiny**: 4px
- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **Huge**: 32px

**Usage**:
```typescript
padding: spacing.medium
margin: spacing.large
gap: spacing.small
```

## Animation Timings

### Durations

- **Fast**: 150ms
- **Medium**: 300ms
- **Slow**: 500ms
- **Very Slow**: 1000ms

### Easing

- **Ease In**: Acceleration
- **Ease Out**: Deceleration
- **Ease In Out**: Both

## Dark Mode Support

### Automatic Detection

Theme switches based on:
- System preference
- User setting
- Manual toggle

### Color Adaptations

- Backgrounds: Light → Dark
- Text: Dark → Light
- Cards: White → Dark gray
- Borders: Light → Dark

## Best Practices

1. **Use Semantic Colors**: Prefer `colors.text` over hardcoded hex
2. **Use Theme Hook**: Access theme via `useAppTheme()`
3. **Support Dark Mode**: Test in both themes
4. **Consistent Spacing**: Use spacing constants
5. **Typography Presets**: Use defined text styles

## Integration

### With Components

All components support theming via:
- Theme context
- Direct color imports
- Style props

### With Navigation

Theme applied to:
- Header colors
- Tab bar colors
- Status bar colors

### With Status Bar

- Light theme: Dark content
- Dark theme: Light content

