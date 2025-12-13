# CAN Data Payload Documentation

## Overview

CAN (Controller Area Network) bus error data is collected from ELD devices and sent to the backend API along with OBD-II DTC codes. CAN errors represent communication errors on the CAN bus, not diagnostic trouble codes.

## Data Flow

1. **ELD Device** → Sends error data via `onObdErrorDataReceived` event
2. **Native Module** → Extracts CAN errors from raw data (`canErrorCodes` array)
3. **OBD Data Context** → Processes CAN errors and creates payload
4. **API** → Sends to `/obd/data/batch` endpoint

## Payload Structure

### Local API Payload (`POST /obd/data/batch`)

**Endpoint**: `POST /obd/data/batch`

**Request Body**:
```json
{
  "data": [
    {
      "driver_id": "driver-uuid-here",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "data_type": "fault_data",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "device_id": "device-identifier",
      "deviceId": "device-identifier",
      "raw_data": {
        "dataType": "fault_data",
        "faultCodes": [
          {
            "ecuId": "2016",
            "ecuIdHex": "0x7E0",
            "codes": ["C01FF", "C02AA"],
            "details": [
              {
                "code": "C01FF",
                "system": "CAN Bus",
                "systemDescription": "Controller Area Network bus communication system",
                "isGeneric": true,
                "genericDescription": "CAN bus error frame",
                "subsystem": "Communication",
                "subsystemDescription": "Bus communication and protocol",
                "faultDescription": "CAN bus communication error"
              },
              {
                "code": "C02AA",
                "system": "CAN Bus",
                "systemDescription": "Controller Area Network bus communication system",
                "isGeneric": true,
                "genericDescription": "CAN bus error frame",
                "subsystem": "Communication",
                "subsystemDescription": "Bus communication and protocol",
                "faultDescription": "CAN bus timeout error"
              }
            ]
          }
        ],
        "deviceId": "device-identifier",
        "device_id": "device-identifier",
        "eventTime": "2025-01-15T10:30:00.000Z",
        "ack": 0,
        "ackDescription": "Success",
        "dataTypeCode": 0,
        "vehicleType": 0,
        "msgSubtype": 0
      },
      "fault_codes": [
        {
          "ecu_id": "2016",
          "ecu_id_hex": "0x7E0",
          "codes": ["C01FF", "C02AA"],
          "details": [
            {
              "code": "C01FF",
              "system": "CAN Bus",
              "systemDescription": "Controller Area Network bus communication system",
              "isGeneric": true,
              "genericDescription": "CAN bus error frame",
              "subsystem": "Communication",
              "subsystemDescription": "Bus communication and protocol",
              "faultDescription": "CAN bus communication error"
            },
            {
              "code": "C02AA",
              "system": "CAN Bus",
              "systemDescription": "Controller Area Network bus communication system",
              "isGeneric": true,
              "genericDescription": "CAN bus error frame",
              "subsystem": "Communication",
              "subsystemDescription": "Bus communication and protocol",
              "faultDescription": "CAN bus timeout error"
            }
          ]
        }
      ]
    }
  ]
}
```

### AWS Lambda Payload (`POST /data`)

**Endpoint**: `POST /data` (API Gateway)

**Request Body**:
```json
{
  "batch": false,
  "vehicleId": "VIN-OR-VEHICLE-UNIT",
  "driverId": "driver-uuid-here",
  "timestamp": 1705312200000,
  "dataType": "fault_data",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "deviceId": "device-identifier",
  "faultCodes": [
    {
      "ecuId": "2016",
      "ecuIdHex": "0x7E0",
      "codes": ["C01FF", "C02AA"],
      "details": [
        {
          "code": "C01FF",
          "system": "CAN Bus",
          "systemDescription": "Controller Area Network bus communication system",
          "isGeneric": true,
          "genericDescription": "CAN bus error frame",
          "subsystem": "Communication",
          "subsystemDescription": "Bus communication and protocol",
          "faultDescription": "CAN bus communication error"
        },
        {
          "code": "C02AA",
          "system": "CAN Bus",
          "systemDescription": "Controller Area Network bus communication system",
          "isGeneric": true,
          "genericDescription": "CAN bus error frame",
          "subsystem": "Communication",
          "subsystemDescription": "Bus communication and protocol",
          "faultDescription": "CAN bus timeout error"
        }
      ]
    }
  ],
  "allData": [
    {
      "ecuId": "2016",
      "ecuIdHex": "0x7E0",
      "codes": ["C01FF", "C02AA"],
      "details": [
        {
          "code": "C01FF",
          "system": "CAN Bus",
          "systemDescription": "Controller Area Network bus communication system",
          "isGeneric": true,
          "genericDescription": "CAN bus error frame",
          "subsystem": "Communication",
          "subsystemDescription": "Bus communication and protocol",
          "faultDescription": "CAN bus communication error"
        },
        {
          "code": "C02AA",
          "system": "CAN Bus",
          "systemDescription": "Controller Area Network bus communication system",
          "isGeneric": true,
          "genericDescription": "CAN bus error frame",
          "subsystem": "Communication",
          "subsystemDescription": "Bus communication and protocol",
          "faultDescription": "CAN bus timeout error"
        }
      ]
    }
  ]
}
```

## CAN Error vs OBD-II DTC

### CAN Errors
- **Type**: `can_error`
- **System**: `CAN Bus`
- **Description**: Communication errors on the CAN bus
- **Examples**: `C01FF`, `C02AA`, `C03BB`
- **Characteristics**:
  - Cannot be cleared (communication errors)
  - Appear even when OBD-II DTCs are cleared
  - Indicate bus communication issues, not vehicle faults

### OBD-II DTCs
- **Type**: `obd_dtc`
- **System**: Various (Powertrain, Chassis, Body, Network)
- **Description**: Diagnostic trouble codes from vehicle ECUs
- **Examples**: `P0195`, `P0300`, `U0100`
- **Characteristics**:
  - Can be cleared (diagnostic codes)
  - Indicate actual vehicle faults
  - Standard OBD-II format (P, C, B, U codes)

## Combined Payload Example

When both CAN errors and OBD-II DTCs are present:

```json
{
  "driver_id": "driver-uuid",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data_type": "fault_data",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "device_id": "device-identifier",
  "fault_codes": [
    {
      "ecu_id": "2016",
      "ecu_id_hex": "0x7E0",
      "codes": ["C01FF", "P0195", "P0300"],
      "details": [
        {
          "code": "C01FF",
          "type": "can_error",
          "system": "CAN Bus",
          "faultDescription": "CAN bus communication error"
        },
        {
          "code": "P0195",
          "type": "obd_dtc",
          "system": "Powertrain",
          "faultDescription": "Engine Oil Temperature Sensor Circuit Malfunction"
        },
        {
          "code": "P0300",
          "type": "obd_dtc",
          "system": "Powertrain",
          "faultDescription": "Random/Multiple Cylinder Misfire Detected"
        }
      ]
    }
  ],
  "raw_data": {
    "dataType": "fault_data",
    "faultCodes": [
      {
        "ecuId": "2016",
        "ecuIdHex": "0x7E0",
        "codes": ["C01FF", "P0195", "P0300"],
        "details": [
          {
            "code": "C01FF",
            "system": "CAN Bus",
            "faultDescription": "CAN bus communication error"
          },
          {
            "code": "P0195",
            "system": "Powertrain",
            "faultDescription": "Engine Oil Temperature Sensor Circuit Malfunction"
          },
          {
            "code": "P0300",
            "system": "Powertrain",
            "faultDescription": "Random/Multiple Cylinder Misfire Detected"
          }
        ]
      }
    ],
    "ack": 0,
    "ackDescription": "Success",
    "dataTypeCode": 0,
    "vehicleType": 0,
    "msgSubtype": 0,
    "eventTime": "2025-01-15T10:30:00.000Z"
  }
}
```

## Field Descriptions

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `driver_id` | string | Driver UUID identifier |
| `timestamp` | string | ISO 8601 timestamp when error was detected |
| `data_type` | string | Always `"fault_data"` for CAN/OBD errors |
| `raw_data` | object | Contains full error data structure |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `latitude` | number | GPS latitude when error detected |
| `longitude` | number | GPS longitude when error detected |
| `device_id` | string | ELD device identifier |
| `fault_codes` | array | Array of fault code objects (one per ECU) |

### Fault Code Object Structure

```typescript
{
  ecu_id: string          // ECU identifier (e.g., "2016")
  ecu_id_hex: string     // ECU identifier in hex (e.g., "0x7E0")
  codes: string[]         // Array of error codes (CAN or OBD-II)
  details: ObdCodeDetails[]  // Full decoded details for each code
}
```

### ObdCodeDetails Structure

```typescript
{
  code: string                    // Error code (e.g., "C01FF", "P0195")
  system: string                  // System name (e.g., "CAN Bus", "Powertrain")
  systemDescription: string        // Full system description
  isGeneric: boolean              // Whether code is generic
  genericDescription?: string     // Generic description if applicable
  subsystem: string               // Subsystem name
  subsystemDescription: string    // Full subsystem description
  faultDescription: string        // Human-readable fault description
}
```

## Processing Flow

1. **Native Module** (`JMBluetoothModule.kt`):
   - Extracts CAN errors from raw ELD data
   - Creates `canErrorCodes` array: `[{ code: "C01FF", type: "can_error", description: "..." }]`
   - Sends via `onObdErrorDataReceived` event

2. **OBD Data Context** (`obd-data-context.tsx`):
   - Receives error data with `canErrorCodes` array
   - Processes each CAN error into `ObdCodeDetails` structure
   - Creates malfunction records (one per code)
   - Builds payload using `handleDtcData()` function
   - Adds to `dataBufferRef` for batch sync

3. **API Sync** (`obd.ts`):
   - Batches payloads every 60 seconds
   - Sends to `/obd/data/batch` endpoint
   - Also syncs to AWS Lambda if enabled

## Code Location

- **Native Processing**: `android/app/src/main/java/com/ttmkonnect/eld/JMBluetoothModule.kt` (lines 2437-2507)
- **Context Processing**: `src/contexts/obd-data-context.tsx` (lines 1630-2079)
- **Payload Creation**: `src/services/handleDtcData.ts`
- **API Functions**: `src/api/obd.ts`

## Notes

- CAN errors are **separate** from OBD-II DTCs
- CAN errors indicate **communication issues**, not vehicle faults
- CAN errors **cannot be cleared** (they're bus errors, not diagnostic codes)
- Both CAN errors and OBD-II DTCs are sent in the **same payload**
- Each code gets its **own record** in the malfunction list
- Payloads are **batched** and sent every 60 seconds
- GPS coordinates are included if available when error was detected



















