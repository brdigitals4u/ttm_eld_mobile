# OBD Error Codes Reference

Complete list of error codes found in ELD data and their meanings.

## CAN Bus Error Codes (NOT OBD-II DTCs)

These are raw CAN bus error frames, **not** OBD-II diagnostic trouble codes. They should be filtered out when looking for actual DTCs.

### CAN Channel A Errors
| Code | Meaning |
|------|---------|
| CA020 | CAN Channel A: Bus off / Arbitration lost |
| CA021 | CAN Channel A: Error passive |
| CA022 | CAN Channel A: Bus error |
| CA023 | CAN Channel A: Form error |
| CA024 | CAN Channel A: Stuff error |
| CA025 | CAN Channel A: Bit error |
| CA026 | CAN Channel A: CRC error |
| CA027 | CAN Channel A: Acknowledgment error |

### CAN Channel B Errors
| Code | Meaning |
|------|---------|
| CB020 | CAN Channel B: Bus off / Arbitration lost |
| CB021 | CAN Channel B: Error passive |
| CB022 | CAN Channel B: Bus error |

### High-Numbered CAN Custom Errors (0x9XXX range)
| Code | Meaning |
|------|---------|
| C9F00 | CAN: Invalid data received / Custom error |
| C9F01 | CAN: Data timeout |
| C9F02 | CAN: Frame format error |
| C9F03 | CAN: Protocol violation |
| C9F04 | CAN: Buffer overflow |
| C9F05 | CAN: Message lost |

### CAN Bus Status Codes
| Code | Meaning |
|------|---------|
| C01FF | CAN: Internal fault / Unknown error |
| C0FEF | CAN: Bus communication error |
| C0FEE | CAN: Network timeout |
| C0FED | CAN: Node not responding |
| C0530 | CAN: Steering Position Sensor Circuit (GM/Ford style - may be valid chassis DTC) |

## Valid OBD-II DTC Codes

These follow the SAE J2012 standard format: `[PBCU][0-3][XXX]`

### Format Explanation
- **First Character**: System type
  - `P` = Powertrain
  - `B` = Body
  - `C` = Chassis
  - `U` = Network

- **Second Character**: Code type
  - `0` = SAE Standard
  - `1` = Manufacturer Specific
  - `2` = SAE Reserved
  - `3` = Manufacturer Specific

- **Last 3 Characters**: Specific fault code (000-FFF in hex)

### Common Powertrain Codes (P0XXX)
| Code | Meaning |
|------|---------|
| P0195 | Engine Oil Temperature Sensor "A" Circuit Malfunction |
| P0171 | System Too Lean (Bank 1) |
| P0300 | Random/Multiple Cylinder Misfire Detected |
| P0420 | Catalyst System Efficiency Below Threshold (Bank 1) |
| P0128 | Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature) |
| P0401 | Exhaust Gas Recirculation Flow Insufficient Detected |
| P0455 | Evaporative Emission Control System Leak Detected (Large Leak) |

### Body Codes (B0XXX)
| Code | Meaning |
|------|---------|
| B0001 | Driver Airbag Circuit Malfunction |
| B0002 | Passenger Airbag Circuit Malfunction |

### Chassis Codes (C0XXX)
| Code | Meaning |
|------|---------|
| C0001 | ABS Control Module |
| C0123 | Steering Position Sensor Circuit |

### Network Codes (U0XXX)
| Code | Meaning |
|------|---------|
| U0100 | Lost Communication with ECM/PCM "A" |
| U0101 | Lost Communication with TCM |

## How to Identify Code Type

### CAN Bus Error Pattern
- Format: `C[A-F9][0-9A-F]{3}`
- Examples: `CA020`, `C9F00`, `C01FF`
- **These are NOT OBD-II DTCs** - they're CAN bus error frames

### Valid OBD-II DTC Pattern
- Format: `[PBCU][0-3][0-9A-F]{3}`
- Examples: `P0195`, `P0300`, `B0001`, `C0123`, `U0100`
- **These are real OBD-II diagnostic trouble codes**

## Implementation

The `ObdErrorCodeMapper` class in `android/app/src/main/java/com/ttmkonnect/eld/ObdErrorCodeMapper.kt` provides:

- `getCodeDescription(code: String)`: Get description for any code
- `isCanBusError(code: String)`: Check if code is a CAN bus error
- `isValidObdDtc(code: String)`: Check if code is a valid OBD-II DTC
- `logCodeDescriptions(codes: List<String>)`: Log all codes with descriptions

## Usage Example

```kotlin
// Check if code is a CAN error
if (ObdErrorCodeMapper.isCanBusError("CA020")) {
    // Filter it out - not a real DTC
}

// Get description
val description = ObdErrorCodeMapper.getCodeDescription("P0195")
// Returns: "Engine Oil Temperature Sensor 'A' Circuit Malfunction"

// Log all codes with descriptions
ObdErrorCodeMapper.logCodeDescriptions(listOf("P0195", "CA020", "C9F00"))
```

## Notes

1. **CAN errors are filtered out** - Only valid OBD-II DTCs are processed
2. **P0195 must be injected** - It won't appear unless injected via simulator's fault injection menu
3. **Simulator must be in SAE Mode** - Mode 03 is required for proper OBD-II DTC transmission
4. **12V power required** - Simulator screen/menu needs 12V adapter, not just USB

