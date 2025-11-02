# Speed Gauge Component Documentation

**File:** `src/components/SpeedGauge.tsx`

## Overview

Circular progress gauge component displaying current vehicle speed with color-coded visual feedback. Shows speed in a circular progress ring with dynamic color based on speed range.

## Props

```typescript
interface SpeedGaugeProps {
  speed: number        // Current speed in mph or km/h
  maxSpeed?: number    // Maximum speed for gauge (default: 120)
  unit?: 'mph' | 'km/h'  // Speed unit (default: 'mph')
}
```

## Visual Design

### Circular Progress Ring

- **Size**: 140px diameter
- **Thickness**: 12px stroke
- **Unfilled Color**: Light gray (#E5E7EB)
- **Filled Color**: Dynamic based on speed
- **Stroke Cap**: Rounded ends

### Center Content

- **Icon**: Gauge icon (lucide-react-native)
- **Speed Value**: Large number (36px, bold)
- **Unit Label**: Small text below value

### Label

- **Text**: "Current Speed"
- **Position**: Below gauge

## Color Coding

Speed-based color system:

### Green (< 30)
- **Color**: `#22C55E`
- **Meaning**: Low speed (idle/crawling)
- **Usage**: Parking, slow traffic

### Blue (30-60)
- **Color**: `#0071ce` (Primary brand blue)
- **Meaning**: Normal city speed
- **Usage**: City driving, normal operation

### Orange (60-80)
- **Color**: `#F59E0B`
- **Meaning**: Moderate-high speed
- **Usage**: Highway speeds, caution

### Red (80+)
- **Color**: `#EF4444`
- **Meaning**: High speed
- **Usage**: Warning, excessive speed

**Color Function**:
```typescript
const getSpeedColor = () => {
  if (speed < 30) return '#22C55E'    // Green
  if (speed < 60) return '#0071ce'    // Blue
  if (speed < 80) return '#F59E0B'    // Orange
  return '#EF4444'                    // Red
}
```

## Progress Calculation

```typescript
const progress = Math.min(speed / maxSpeed, 1)
```

- Progress ranges from 0 to 1
- Capped at 1.0 (doesn't exceed maxSpeed visually)
- Visual ring fills proportionally

## Component Structure

```typescript
<View> {/* Container */}
  <View> {/* Gauge Container */}
    <Progress.Circle /> {/* Circular progress */}
    <View> {/* Center Content */}
      <Gauge icon />
      <Text>{speed}</Text>
      <Text>{unit}</Text>
    </View>
  </View>
  <Text>Current Speed</Text> {/* Label */}
</View>
```

## Usage

### Basic Usage

```typescript
import { SpeedGauge } from '@/components/SpeedGauge'

<SpeedGauge speed={65} unit="mph" />
```

### With Max Speed

```typescript
<SpeedGauge speed={100} maxSpeed={150} unit="km/h" />
```

### In Dashboard

```typescript
const currentSpeed = useMemo(() => {
  // Extract from OBD data
  const speedItem = obdData.find(item => 
    item.name.includes('Vehicle Speed')
  )
  return speedItem ? parseFloat(speedItem.value) || 0 : 0
}, [obdData])

<SpeedGauge speed={currentSpeed} unit="mph" maxSpeed={120} />
```

## Data Source

Typically receives speed from:
- OBD data context
- ELD device data
- Real-time vehicle data

**OBD Data Extraction**:
```typescript
const speedItem = obdData.find(
  item => item.name.includes('Vehicle Speed') || 
          item.name.includes('Wheel-Based Vehicle Speed')
)
const speed = speedItem ? parseFloat(speedItem.value) || 0 : 0
```

## Display Format

### Speed Value

- **Format**: Rounded integer
- **Font**: 36px, weight 900 (bold)
- **Color**: Matches progress ring color

### Unit Label

- **Format**: "mph" or "km/h"
- **Font**: 14px, weight 600
- **Color**: Gray (#6B7280)

### Label Text

- **Text**: "Current Speed"
- **Font**: 13px, weight 600
- **Color**: Gray (#6B7280)

## Styling

### Container

- Centered alignment
- Padding: 16px
- Flexible sizing

### Gauge

- Absolute positioning for overlay
- Centered content
- Icon spacing: 4px margin bottom

## Animations

**None currently** - Could add:
- Smooth speed updates
- Pulse on high speed
- Color transitions

## Accessibility

- Clear visual indicators
- Large readable numbers
- Color + number for speed
- Semantic structure

## Performance

- Memoized calculations
- Efficient re-renders
- Native progress component
- Minimal layout calculations

## Integration

### With OBD Data Context

```typescript
const { obdData } = useObdData()

const speed = useMemo(() => {
  // Extract and parse speed
}, [obdData])

<SpeedGauge speed={speed} />
```

### With Dashboard

Shown in dashboard ELD data section when device connected.

## Unit Conversion

Component accepts both units:
- **mph**: Miles per hour (US standard)
- **km/h**: Kilometers per hour (metric)

**Conversion**: Not handled by component (convert before passing)

## Edge Cases

### Zero Speed

- Shows 0
- Green color (< 30 range)
- Progress at 0

### Missing Data

- Pass 0 as default
- Component handles gracefully

### Exceeding Max Speed

- Progress capped at 1.0
- Color shows red
- Value still displays actual speed

## Dependencies

- `react-native-progress` - Circular progress component
- `lucide-react-native` - Gauge icon
- React Native core components

## Related Components

- **FuelLevelIndicator** - Similar gauge design
- **EldIndicator** - Connection status indicator
- **HOSCircle** - HOS time display

## Notes

- Real-time updates recommended
- Color coding provides quick visual feedback
- Responsive design for different screen sizes
- Works well in dashboard card layout

