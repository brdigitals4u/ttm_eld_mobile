# OBD API Documentation

**File:** `src/api/obd.ts`

## Overview

OBD (On-Board Diagnostics) API module for sending vehicle diagnostic data collected from ELD devices. Supports single record and batch uploads, as well as data history retrieval.

## Features

- Single OBD data record submission
- Batch OBD data upload (for offline/queued data)
- OBD data history retrieval
- Vehicle diagnostic data tracking

## Data Types

### ObdDataPayload

OBD data record structure:

```typescript
{
  driver_id: string
  timestamp: string
  vehicle_speed?: number        // km/h or mph
  engine_speed?: number         // RPM
  coolant_temp?: number         // Celsius
  fuel_level?: number           // Percentage (0-100)
  odometer?: number             // Total distance
  latitude?: number             // GPS latitude
  longitude?: number            // GPS longitude
  raw_data: any                 // Raw OBD response data
}
```

**Required Fields:**
- `driver_id`: Driver identifier
- `timestamp`: ISO 8601 timestamp
- `raw_data`: Raw OBD device response

**Optional Fields:**
- All other fields are optional diagnostic metrics

## API Functions

### `sendObdData(data)`

Sends a single OBD data record to the API.

**Parameters:**
- `data`: ObdDataPayload object

**Returns:** Promise with API response data

**Endpoint:** `POST /obd/data`

**Example:**
```typescript
const response = await sendObdData({
  driver_id: 'driver-123',
  timestamp: new Date().toISOString(),
  vehicle_speed: 65,
  engine_speed: 2500,
  coolant_temp: 85,
  fuel_level: 75,
  odometer: 50000,
  latitude: 40.7128,
  longitude: -74.0060,
  raw_data: {
    pid: '0x0D',
    value: '0x41',
    description: 'Vehicle Speed'
  }
})
```

### `sendObdDataBatch(dataList)`

Sends multiple OBD data records in a single batch request.

**Parameters:**
- `dataList`: Array of ObdDataPayload objects

**Returns:** Promise with API response data

**Endpoint:** `POST /obd/data/batch`

**Request Body:**
```typescript
{
  data: ObdDataPayload[]
}
```

**Use Cases:**
- Offline data sync when connection is restored
- Periodic batch uploads to reduce API calls
- Queued data from ELD device buffer

**Example:**
```typescript
const batchData = [
  {
    driver_id: 'driver-123',
    timestamp: '2024-01-15T10:00:00Z',
    vehicle_speed: 65,
    raw_data: { /* ... */ }
  },
  {
    driver_id: 'driver-123',
    timestamp: '2024-01-15T10:01:00Z',
    vehicle_speed: 70,
    raw_data: { /* ... */ }
  }
]

const response = await sendObdDataBatch(batchData)
```

### `getObdDataHistory(driverId, params)`

Retrieves OBD data history for a driver within a date range.

**Parameters:**
- `driverId`: string - Driver identifier
- `params`: Object with date range
  - `startDate`: string - Start date (ISO 8601 format)
  - `endDate`: string - End date (ISO 8601 format)

**Returns:** Promise with API response data (array of OBD records)

**Endpoint:** `GET /obd/data/history/{driverId}`

**Query Parameters:**
- `startDate`: Start of date range
- `endDate`: End of date range

**Example:**
```typescript
const history = await getObdDataHistory('driver-123', {
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z'
})

history.forEach(record => {
  console.log(`Speed: ${record.vehicle_speed} km/h`)
  console.log(`Fuel: ${record.fuel_level}%`)
})
```

## Data Collection Flow

1. **ELD Device**: Collects OBD data via Bluetooth
2. **App Buffer**: Stores data locally (in-memory or database)
3. **Sync Interval**: Periodically sends data to API (e.g., every 60 seconds)
4. **Batch Upload**: Sends multiple records in single request
5. **History Retrieval**: Fetches historical data for display/analysis

## Integration with OBD Context

This API integrates with the OBD Data Context (`obd-data-context.tsx`) which:
- Buffers OBD data in memory
- Handles batch uploads every sync interval
- Manages offline/online state
- Coordinates with ELD device service

## Typical Usage Pattern

```typescript
// 1. Collect OBD data from ELD device
const obdData = {
  driver_id: currentDriverId,
  timestamp: new Date().toISOString(),
  vehicle_speed: eldData.speed,
  engine_speed: eldData.rpm,
  fuel_level: eldData.fuelLevel,
  latitude: currentLocation.latitude,
  longitude: currentLocation.longitude,
  raw_data: eldData.rawResponse
}

// 2. Send immediately (if online) or buffer for batch
if (isOnline) {
  await sendObdData(obdData)
} else {
  // Add to buffer for batch upload later
  obdBuffer.push(obdData)
}

// 3. Batch upload when connection restored
if (obdBuffer.length > 0 && isOnline) {
  await sendObdDataBatch(obdBuffer)
  obdBuffer = []
}
```

## Error Handling

The API functions use the `apiClient` which handles:
- Network errors
- Timeout errors (30-second timeout)
- Authentication errors (401)
- Server errors (500+)

**Best Practice:** Implement retry logic for batch uploads to handle transient failures.

## Data Retention

- Single records are sent immediately when connection is available
- Batched records should be uploaded regularly (e.g., every 60 seconds)
- Historical data can be retrieved for reporting/analysis
- Consider implementing local storage for offline data persistence

## Performance Considerations

1. **Batch Size**: Limit batch size (e.g., 50-100 records) to avoid timeout
2. **Sync Interval**: Balance between data freshness and battery/data usage
3. **History Queries**: Use appropriate date ranges to limit response size
4. **Background Sync**: Upload data in background to avoid blocking UI

## Dependencies

- `./client`: ApiClient for HTTP requests

## Future Enhancements

Potential improvements:
- Compression for batch data
- Delta sync (only send changed data)
- Data aggregation before upload
- Background sync service
- Conflict resolution for offline updates

