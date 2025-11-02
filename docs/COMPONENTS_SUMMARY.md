# Components Documentation Summary

This document covers all reusable UI components in the application.

## Component Categories

### Core UI Components

#### Button.tsx
Standard button component with presets and variants.

**Props**:
- `preset`: 'default' | 'filled' | 'reversed'
- `text`: Button label
- `onPress`: Handler function
- `style`: Custom styles

#### AnimatedButton.tsx
Button with loading and success animations (Lottie).

**Features**:
- Loading animation
- Success animation
- Auto-navigation on success
- Disabled state

#### LoadingButton.tsx
Button with loading spinner state.

**Variants**: 'primary' | 'secondary' | 'outline' | 'danger'

#### Text.tsx
Text component with presets.

**Presets**: 'default' | 'bold' | 'heading' | 'subheading'
**Features**: Theming support, custom styles

#### TextField.tsx
Text input component with validation.

**Features**:
- Label and placeholder
- Error messages
- Secure text entry
- Validation states

### Card Components

#### Card.tsx
Basic card container.

#### EvevatedCard.tsx (ElevatedCard)
Card with elevation shadow effects.

**Usage**: Profile sections, status cards

#### StatCircleCard.tsx
Statistics display with circular progress indicators.

**Features**:
- Multiple stat items
- Circular progress
- Custom colors
- Icon support

### Indicator Components

#### EldIndicator.tsx
[See COMPONENT_ELD_INDICATOR.md](./COMPONENT_ELD_INDICATOR.md)

ELD connection status indicator with animations.

#### SpeedGauge.tsx
Circular speed gauge component.

**Props**:
- `speed`: number (mph or km/h)
- `maxSpeed`: number (default: 120)
- `unit`: 'mph' | 'km/h'

**Features**:
- Color based on speed (green → blue → orange → red)
- Circular progress
- Icon indicator
- Responsive sizing

**Usage**:
```typescript
<SpeedGauge speed={65} unit="mph" maxSpeed={120} />
```

#### FuelLevelIndicator.tsx
Circular fuel level gauge component.

**Props**:
- `fuelLevel`: number (0-100 percentage)

**Features**:
- Color based on level (blue → orange → red)
- Circular progress
- Fuel icon
- Percentage display

**Usage**:
```typescript
<FuelLevelIndicator fuelLevel={75} />
```

### HOS Components

#### HOSSvg.tsx
SVG-based HOS circle component for time display.

**Features**: Circular time display with text

#### HOSChart.tsx
HOS timeline chart component.

**Features**:
- Timeline visualization
- Status color coding
- Time range display

#### VictoryHOS.tsx
Victory.js-based HOS chart.

**Features**: Advanced charting with Victory library

### Navigation Components

#### Header.tsx
Standard app header component.

**Props**:
- `title`: Header title
- `titleMode`: 'center' | 'flex'
- `leftIcon`: Back button icon
- `leftText`: Left side text
- `rightText`: Right side text/actions
- `backgroundColor`: Header background
- `onLeftPress`: Left action handler

**Features**:
- Safe area handling
- Shadow effects
- Customizable actions
- Theme support

### Display Components

#### StatusDisplay.tsx
Status information display component.

#### LogEntry.tsx
Individual log entry display.

**Features**:
- Status badge
- Timestamp
- Location
- Reason
- Certification status

#### EmptyState.tsx
Empty state placeholder.

**Props**:
- `title`: Empty state title
- `subtitle`: Description
- `icon`: Optional icon

### Form Components

#### Toggle Components

**Toggle/Switch.tsx** - Toggle switch component
**Toggle/Checkbox.tsx** - Checkbox component
**Toggle/Radio.tsx** - Radio button component
**Toggle/Toggle.tsx** - Base toggle component

**Features**:
- Controlled/uncontrolled
- Theming support
- Accessibility

### Layout Components

#### Screen.tsx
Base screen wrapper component.

**Presets**: 'fixed' | 'scroll' | 'auto'

**Features**:
- Safe area handling
- Background color
- Keyboard avoiding
- Content scrolling

#### ListItem.tsx
List item component for menus.

**Features**:
- Left/right icons
- Title and subtitle
- Press handling
- Chevron indicator

### Image Components

#### AutoImage.tsx
Automatic image sizing component.

**Features**:
- Auto-dimension calculation
- Placeholder support
- Error handling

#### TTMKonnectLogo.tsx
TTM Konnect logo component.

**Features**: Consistent logo display

### Toast Components

#### Toast.tsx
Toast notification component.

**Usage**: Via ToastProvider context

**Methods**:
- `toast.success(message, duration)`
- `toast.error(message, duration)`
- `toast.info(message, duration)`

### Icon Components

#### Icon.tsx
Icon wrapper component.

**Features**:
- Multiple icon libraries support
- Theming
- Size variants

### Error Handling

#### ErrorBoundary/ErrorBoundary.tsx
React Error Boundary wrapper.

**Features**:
- Catches React errors
- Error display
- Recovery options

#### ErrorBoundary/ErrorDetails.tsx
Error details display component.

## Component Patterns

### Theming

Most components support theming via:
```typescript
const { theme } = useAppTheme()
const { colors } = theme
```

### Props Patterns

**Common Props**:
- `style` - Custom styles
- `onPress` - Press handlers
- `disabled` - Disabled state
- `testID` - Testing identifier

### Styling

Components use:
- StyleSheet for styles
- Theme colors
- Consistent spacing
- Shadow effects

## Component Usage Examples

### Button
```typescript
<Button
  preset="filled"
  text="Submit"
  onPress={handleSubmit}
/>
```

### LoadingButton
```typescript
<LoadingButton
  title="Save"
  onPress={handleSave}
  variant="primary"
  loading={isLoading}
/>
```

### Card
```typescript
<ElevatedCard style={styles.card}>
  <Text>Card content</Text>
</ElevatedCard>
```

### SpeedGauge
```typescript
<SpeedGauge speed={currentSpeed} unit="mph" />
```

### Header
```typescript
<Header
  title="Dashboard"
  leftIcon="back"
  onLeftPress={() => router.back()}
  RightActionComponent={<EldIndicator />}
/>
```

## Component Organization

Components are organized by:
- **Function**: Buttons, Cards, Indicators
- **Feature**: HOS, Status, Logs
- **Type**: Form, Display, Layout

## Dependencies

Common dependencies:
- `react-native` - Core components
- `lucide-react-native` - Icons
- `react-native-progress` - Progress indicators
- `react-native-reanimated` - Animations
- `@/theme` - Theming
- `expo-router` - Navigation

## Accessibility

Components include:
- Proper labels
- Touch target sizes (min 44x44)
- Color contrast
- Screen reader support (where applicable)

## Performance

Optimizations:
- Memoization where needed
- Native drivers for animations
- Efficient re-renders
- Lazy loading for heavy components

