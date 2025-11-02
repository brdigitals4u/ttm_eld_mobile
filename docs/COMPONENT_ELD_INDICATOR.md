# ELD Indicator Component Documentation

**File:** `src/components/EldIndicator.tsx`

## Overview

Visual status indicator component displaying ELD device connection status and data sync state. Shows real-time connection status, local API sync status, and AWS sync status with animated visual feedback.

## Visual States

### Green (Connected)

**Color**: `#10B981`

**Conditions**:
- ELD device connected
- OBD data being received
- No active sync
- AWS sync successful or idle

### Red (Error/Disconnected)

**Color**: `#EF4444`

**Conditions** (prioritized):
1. AWS sync error
2. ELD device disconnected
3. No OBD data received

### Blue (Syncing)

**Color**: `#5750F1` (indigo)

**Conditions**:
- Local API sync in progress (`isSyncing`)
- AWS sync in progress (`awsSyncStatus === 'syncing'`)

## Animations

### Pulse Animation

Active during syncing:
- Scale: 1.0 → 1.2 → 1.0
- Duration: 600ms per direction
- Loop: Infinite
- Native driver: Yes

### Rotation Animation

Active during syncing:
- Rotation: 0° → 360°
- Duration: 2000ms
- Loop: Infinite
- Native driver: Yes

## Dual Ring Display

### Single Ring (Local Sync Only)

Shown when only local sync is active:
- Inner ring visible
- Blue color
- Smaller ring (16x16px)

### Dual Rings (Both Syncs Active)

Shown when AWS sync is active:
- Outer ring visible (20x20px)
- Inner ring may also be visible
- Indicates dual sync mode

## State Logic

### Color Priority

1. **Error States** (highest priority)
   - AWS sync error → Red
   - Device disconnected → Red
   - No data → Red

2. **Syncing States**
   - Local sync active → Blue
   - AWS sync active → Blue

3. **Success States**
   - AWS sync success → Green (temporary)
   - Connected and idle → Green

### Sync Status Detection

```typescript
const isAnySyncing = isSyncing || awsSyncStatus === 'syncing'
```

Checks both local and AWS sync status.

## Component Structure

```typescript
<Animated.View>  // Container with animations
  <View>         // Indicator circle
    {/* Outer ring for AWS sync */}
    {/* Inner ring for local sync */}
  </View>
</Animated.View>
```

## Styling

### Container

- Size: 6x6px
- Center-aligned content
- Supports transform animations

### Indicator

- Size: 2x2px circle
- Border radius: 6px (creates dot effect)
- Shadow effects for depth
- Background color: Dynamic based on state

### Sync Rings

- Position: Absolute
- Border: 2px solid indigo
- Opacity: 0.2-0.4 (semi-transparent)
- Outer ring: 20x20px
- Inner ring: 16x16px

## Hook Dependencies

Uses `useObdData()` hook to access:
- `isConnected`: Device connection status
- `isSyncing`: Local API sync status
- `obdData`: Current OBD data array
- `awsSyncStatus`: AWS sync state

## Usage

```typescript
import { EldIndicator } from '@/components/EldIndicator'

// In render
<EldIndicator />
```

Typically placed in:
- Dashboard header (top right)
- Status bars
- Connection status areas

## Integration

### With Dashboard

Shown in dashboard greeting section:
```typescript
<View style={styles.greetingRow}>
  <Text>Hi {driverName},</Text>
  <EldIndicator />
</View>
```

### State Updates

Automatically updates when:
- ELD device connects/disconnects
- Sync operations start/complete
- OBD data is received
- AWS sync status changes

## Color Constants

```typescript
const COLORS = {
  green: '#10B981',    // Success/connected
  red: '#EF4444',      // Error/disconnected
  sync: '#5750F1',     // Syncing (indigo)
  border: '#E6E7FB',   // Border color
}
```

## Performance

- Uses native driver for animations
- Minimal re-renders (only on state change)
- Small component footprint
- Efficient animation loops

## Accessibility

- Visual indicator only (no screen reader text)
- Color-coded status (consider adding text labels)
- Size appropriate for visibility

## Future Enhancements

- Text label option
- Tap to view details
- Vibration feedback
- Sound alerts for errors
- Connection quality indicator

