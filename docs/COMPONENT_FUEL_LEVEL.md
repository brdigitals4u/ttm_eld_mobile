# Fuel Level Indicator Component Documentation

**File:** `src/components/FuelLevelIndicator.tsx`

## Overview

Circular progress gauge component displaying current fuel level as a percentage. Uses color-coded visual feedback to indicate fuel status (full, medium, low).

## Props

```typescript
interface FuelLevelIndicatorProps {
  fuelLevel: number  // Fuel level percentage (0-100)
}
```

## Visual Design

### Circular Progress Ring

- **Size**: 140px diameter
- **Thickness**: 12px stroke
- **Unfilled Color**: Light gray (#E5E7EB)
- **Filled Color**: Dynamic based on level
- **Stroke Cap**: Rounded ends

### Center Content

- **Icon**: Fuel icon (lucide-react-native)
- **Fuel Value**: Large percentage number (36px, bold)
- **Unit**: "%" symbol

### Label

- **Text**: "Fuel Level"
- **Position**: Below gauge

## Color Coding

Fuel level-based color system:

### Blue (> 50%)
- **Color**: `#0071ce` (Primary brand blue)
- **Meaning**: Good fuel level
- **Usage**: Full to half tank

### Orange (25-50%)
- **Color**: `#F59E0B`
- **Meaning**: Medium fuel level
- **Usage**: Warning - consider refueling

### Red (< 25%)
- **Color**: `#EF4444`
- **Meaning**: Low fuel level
- **Usage**: Critical - refuel soon

**Color Function**:
```typescript
const getFuelColor = () => {
  if (fuelLevel > 50) return '#0071ce'    // Blue
  if (fuelLevel > 25) return '#F59E0B'    // Orange
  return '#EF4444'                        // Red
}
```

## Progress Calculation

```typescript
const progress = Math.min(Math.max(fuelLevel / 100, 0), 1)
```

- Normalized to 0-1 range
- Clamped between 0 and 1
- Progress ring fills proportionally

## Component Structure

```typescript
<View> {/* Container */}
  <View> {/* Gauge Container */}
    <Progress.Circle /> {/* Circular progress */}
    <View> {/* Center Content */}
      <Fuel icon />
      <Text>{fuelLevel}%</Text>
    </View>
  </View>
  <Text>Fuel Level</Text> {/* Label */}
</View>
```

## Usage

### Basic Usage

```typescript
import { FuelLevelIndicator } from '@/components/FuelLevelIndicator'

<FuelLevelIndicator fuelLevel={75} />
```

### In Dashboard

```typescript
const fuelLevel = useMemo(() => {
  const fuelItem = obdData.find(item => 
    item.name.includes('Fuel Level')
  )
  return fuelItem ? parseFloat(fuelItem.value) || 0 : 0
}, [obdData])

<FuelLevelIndicator fuelLevel={fuelLevel} />
```

## Data Source

Typically receives fuel level from:
- OBD data context
- ELD device data
- Vehicle sensors

**OBD Data Extraction**:
```typescript
const fuelItem = obdData.find(
  item => item.name.includes('Fuel Level') || 
          item.name.includes('Fuel Level Input')
)
const fuelLevel = fuelItem ? parseFloat(fuelItem.value) || 0 : 0
```

**OBD PID**: Typically PID `0x2F` (Fuel Level Input)

## Display Format

### Fuel Value

- **Format**: Rounded integer + "%"
- **Font**: 36px, weight 900 (bold)
- **Color**: Matches progress ring color

### Unit

- **Symbol**: "%"
- **Font**: 14px, weight 600
- **Color**: Gray (#6B7280)

### Label

- **Text**: "Fuel Level"
- **Font**: 13px, weight 600
- **Color**: Gray (#6B7280)

## Styling

### Container

- Centered alignment
- Padding: 16px
- Consistent with SpeedGauge

### Gauge

- Absolute positioning for overlay
- Centered content
- Icon spacing: 4px margin bottom

## Color Thresholds

### Full/Good (> 50%)

- Blue color indicates healthy fuel level
- No immediate action needed
- Standard operation

### Medium (25-50%)

- Orange color indicates caution
- Consider refueling soon
- Monitor fuel level

### Low (< 25%)

- Red color indicates critical level
- Refuel immediately
- May affect vehicle operation

## Edge Cases

### Zero Fuel

- Shows 0%
- Red color (critical)
- Progress at 0

### Missing Data

- Pass 0 as default
- Component handles gracefully

### Invalid Values

- Negative values clamped to 0
- Values > 100 clamped to 100
- Progress calculation handles edge cases

## Integration

### With OBD Data Context

```typescript
const { obdData } = useObdData()

const fuelLevel = useMemo(() => {
  // Extract and parse fuel level
}, [obdData])

<FuelLevelIndicator fuelLevel={fuelLevel} />
```

### With Dashboard

Shown alongside SpeedGauge in dashboard ELD data section.

## Performance

- Memoized calculations
- Efficient re-renders
- Native progress component
- Minimal updates

## Accessibility

- Clear visual indicators
- Large readable numbers
- Color + number for level
- Semantic structure

## Related Components

- **SpeedGauge** - Similar gauge design
- **EldIndicator** - Connection status
- Other dashboard indicators

## Notes

- Percentage-based (0-100)
- Color coding provides quick status
- Updates in real-time from OBD data
- Works well in dashboard layout

