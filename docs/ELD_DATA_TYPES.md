# ELD Data Types Reference

This document outlines the data types and structure available from TTM ELD devices through the TTMBLEManager.

## Data Structure

### NotifyData Interface
```typescript
export interface NotifyData {
  dataType: string;
  rawData: string;
  ack?: number;
  error?: string;
}
```

## Available Data Types

Based on the TTM SDK documentation and simulator, the following data types are available:

### 1. ELD_DATA
**Type**: `ELD_DATA`
**Description**: Primary ELD data containing vehicle and driver information

**Raw Data Structure** (JSON stringified):
```typescript
{
  vehicleData: {
    speed: number;           // Vehicle speed (10-90 mph)
    rpm: number;             // Engine RPM (800-2800)
    engineHours: number;     // Total engine hours (e.g., 50000-60000)
    odometer: number;        // Total mileage (e.g., 500000-600000 miles)
    fuelLevel: number;       // Fuel level percentage (0-100%)
    engineTemp: number;      // Engine temperature (180-230°F)
    diagnosticCodes: string[]; // Array of diagnostic trouble codes
    location: {
      latitude: number;      // GPS latitude
      longitude: number;     // GPS longitude  
      accuracy: number;      // GPS accuracy in meters (3-13m)
    };
    timestamp: number;       // Unix timestamp
  };
  driverStatus: 'driving' | 'onDuty' | 'offDuty' | 'sleeping' | 'sleeperBerth';
  hoursOfService: {
    driveTimeRemaining: number;    // Minutes remaining (0-660)
    shiftTimeRemaining: number;    // Minutes remaining (0-840)
    cycleTimeRemaining: number;    // Minutes remaining (0-4200)
    breakTimeRemaining: number;    // Minutes remaining (0-480)
    lastCalculated: number;        // Unix timestamp
  };
  timestamp: number;
  deviceId: string;
  sequenceNumber: number;
}
```

### 2. MALFUNCTION
**Type**: `MALFUNCTION`
**Description**: Device malfunction or error notifications

**Raw Data Structure** (JSON stringified):
```typescript
{
  errorCode: string;       // Error code (e.g., "DEVICE_MALFUNCTION")
  message: string;         // Human-readable error message
  timestamp: number;       // Unix timestamp when error occurred
}
```

### 3. AUTHENTICATION
**Type**: `AUTHENTICATION` 
**Description**: Authentication status updates

**Raw Data Structure** (JSON stringified):
```typescript
{
  status: 'success' | 'failed';
  message: string;
  timestamp: number;
}
```

### 4. CONNECTION_STATUS
**Type**: `CONNECTION_STATUS`
**Description**: Device connection state changes

**Raw Data Structure** (JSON stringified):
```typescript
{
  status: 'connected' | 'disconnected';
  deviceId: string;
  timestamp: number;
}
```

## Data Frequency and Characteristics

### ELD_DATA
- **Frequency**: Every 5 seconds when `startReportEldData()` is active
- **Size**: ~500-800 bytes per packet
- **Reliability**: High - includes sequence numbers for ordering

### MALFUNCTION
- **Frequency**: Event-driven (only when issues occur)
- **Size**: ~100-200 bytes per packet
- **Reliability**: Critical - immediate notification

### Device-Specific Variations

#### TTM Premium Devices
- Higher data frequency (every 2-3 seconds)
- More detailed diagnostic codes
- Enhanced GPS accuracy

#### TTM Standard Devices  
- Standard frequency (every 5 seconds)
- Basic diagnostic information
- Standard GPS accuracy

#### Generic ELD Devices
- Variable frequency (5-10 seconds)
- Limited diagnostic codes
- Basic location data

## Common Diagnostic Codes

The following diagnostic trouble codes (DTCs) are commonly reported:

- `P0420` - Catalyst System Efficiency Below Threshold
- `P0171` - System Too Lean (Bank 1)
- `P0128` - Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)
- `P0442` - Evaporative Emission Control System Leak Detected (Small Leak)
- `P0455` - Evaporative Emission Control System Leak Detected (Large Leak)

## Usage Examples

### Processing ELD Data
```typescript
TTMBLEManager.onNotifyReceived((data: NotifyData) => {
  switch (data.dataType) {
    case 'ELD_DATA':
      try {
        const eldData = JSON.parse(data.rawData);
        console.log('Vehicle Speed:', eldData.vehicleData.speed);
        console.log('Driver Status:', eldData.driverStatus);
        console.log('GPS Location:', eldData.vehicleData.location);
      } catch (error) {
        console.error('Failed to parse ELD data:', error);
      }
      break;
      
    case 'MALFUNCTION':
      try {
        const malfunctionData = JSON.parse(data.rawData);
        console.error('Device Malfunction:', malfunctionData.message);
      } catch (error) {
        console.error('Failed to parse malfunction data:', error);
      }
      break;
  }
});
```

### Acknowledging Received Data
```typescript
// Send acknowledgment back to device
await TTMBLEManager.replyReceivedEldData();
```

## Data Storage Recommendations

### Real-time Display
- Show last 10-20 ELD_DATA records
- Display current driver status prominently
- Show live GPS location on map

### Historical Storage
- Store all ELD_DATA for compliance (minimum 6 months)
- Archive MALFUNCTION events for maintenance tracking
- Maintain connection logs for troubleshooting

### Performance Considerations
- Process data asynchronously to avoid UI blocking
- Implement data buffering for network interruptions
- Use efficient JSON parsing libraries for large volumes

## Troubleshooting

### Common Issues

1. **Missing Data Fields**
   - Some generic devices may not provide all fields
   - Always check for field existence before accessing

2. **Timestamp Synchronization**
   - Device timestamps may drift from system time
   - Consider using `sendUTCTime()` periodically

3. **Data Corruption**
   - Network interruptions can cause incomplete JSON
   - Implement try-catch blocks around JSON.parse()

4. **High Data Volume**
   - Premium devices generate significant data
   - Implement data throttling or sampling as needed

## Compliance Notes

This data structure supports DOT/FMCSA compliance requirements for:
- Hours of Service (HOS) tracking
- Vehicle inspection records (DVIR)
- Location and movement tracking
- Engine diagnostics and maintenance
