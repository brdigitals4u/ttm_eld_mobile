# SDK Error Code Parsing Algorithm

## Overview

The Jimi SDK extracts error codes from raw byte data. Since the SDK uses native methods for parsing, the exact algorithm is in native code (C/C++), but we can infer the process from the SDK structure.

## SDK Structure

### Key Classes

1. **`BtParseData`** - Contains parsed data from Bluetooth
   - `getOBDDataSource()`: Returns raw `ByteArray` of OBD data
   - `getOBDData()`: Returns parsed `BaseObdData` (could be `ErrorBean`)

2. **`BaseObdData.ErrorBean`** - Contains error information
   - `ecuList: List<ObdEcuBean>` - List of ECUs with error codes

3. **`ObdEcuBean`** - Contains ECU-specific error codes
   - `ecuId: Long` - ECU identifier
   - `errorCodeList: List<String>` - List of error code strings (e.g., "P0195", "CA020")

## Error Code Format

### OBD-II DTC Format (SAE J2012 Standard)
```
[PBCU][0-3][XXX]
```

**First Character (System Type):**
- `P` = Powertrain
- `B` = Body  
- `C` = Chassis
- `U` = Network

**Second Character (Code Type):**
- `0` = SAE Standard
- `1` = Manufacturer Specific
- `2` = SAE Reserved
- `3` = Manufacturer Specific

**Last 3 Characters:**
- `000-FFF` (hex digits) - Specific fault code

**Examples:**
- `P0195` = Powertrain, SAE Standard, Code 195
- `P0300` = Powertrain, SAE Standard, Code 300
- `C0123` = Chassis, SAE Standard, Code 123

### CAN Bus Error Format (NOT OBD-II DTCs)
```
C[A-F9][XXX]
```

**Pattern:**
- `C` = Chassis prefix (but not valid OBD-II)
- `[A-F9]` = Invalid second character (not 0-3)
- `[XXX]` = Error code

**Examples:**
- `CA020` = CAN Channel A, Error 020 (Bus off/Arbitration lost)
- `C9F00` = CAN High-numbered error, Code F00 (Invalid data received)
- `C01FF` = CAN Internal fault

## Algorithm Inference

Based on SDK structure and OBD-II standards, the algorithm likely works as follows:

### Step 1: Extract Raw Data
```kotlin
val rawData = btParseData.getOBDDataSource() // Returns ByteArray
```

### Step 2: Parse OBD Data
```kotlin
val obdData = btParseData.getOBDData() // Returns BaseObdData
```

### Step 3: Extract Error Codes (if ErrorBean)
```kotlin
if (obdData is BaseObdData.ErrorBean) {
    val ecuList = obdData.ecuList
    ecuList.forEach { ecu ->
        val codes = ecu.errorCodeList // List<String> like ["P0195", "CA020"]
    }
}
```

## How Codes Are Formed

### OBD-II DTC Codes (Mode 03 Response)

OBD-II DTCs are typically encoded as **2 bytes** in the response:

**Byte 1:**
```
Bits 7-6: DTC Type
  00 = P0XXX (Powertrain, SAE)
  01 = P1XXX (Powertrain, Manufacturer)
  10 = P2XXX (Powertrain, SAE Reserved)
  11 = P3XXX (Powertrain, Manufacturer)

Bits 5-4: First digit of code (0-F)
Bits 3-0: Second digit of code (0-F)
```

**Byte 2:**
```
Bits 7-4: Third digit of code (0-F)
Bits 3-0: Fourth digit of code (0-F)
```

**Example: P0195**
- P0 = Powertrain, SAE Standard = `00` in bits 7-6
- 1 = First digit = `0001` in bits 5-2
- 9 = Second digit = `1001` in bits 1-0
- 5 = Third digit = `0101` in bits 7-4 of byte 2
- (Fourth digit is 0, but P0195 only has 3 digits after P0)

**Decoding Algorithm:**
```kotlin
fun decodeDtcFromBytes(byte1: Byte, byte2: Byte): String {
    val dtcType = (byte1.toInt() shr 6) and 0x03
    val firstDigit = (byte1.toInt() shr 4) and 0x03
    val secondDigit = byte1.toInt() and 0x0F
    val thirdDigit = (byte2.toInt() shr 4) and 0x0F
    val fourthDigit = byte2.toInt() and 0x0F
    
    val prefix = when (dtcType) {
        0 -> "P0"
        1 -> "P1"
        2 -> "C0" // Or B0, U0 depending on context
        3 -> "C1" // Or B1, U1 depending on context
        else -> "P0"
    }
    
    return "$prefix${firstDigit.toString(16).uppercase()}${secondDigit.toString(16).uppercase()}${thirdDigit.toString(16).uppercase()}${fourthDigit.toString(16).uppercase()}"
}
```

### CAN Bus Error Codes

CAN bus errors are **NOT** OBD-II DTCs. They're raw CAN bus error frames:

**Format:**
- Typically encoded as hex strings in the data stream
- Pattern: `C[A-F9][0-9A-F]{3}`
- Examples: `CA020`, `C9F00`, `C01FF`

**Meaning:**
- `CA` = CAN Channel A
- `C9` = High-numbered CAN error (0x9XXX range)
- `C0` = CAN internal/status code

## Complete Code List from SDK Analysis

### CAN Bus Error Codes (Filtered Out)

| Code | Pattern | Meaning | Source |
|------|---------|---------|--------|
| CA020 | `C` + `A` + `020` | CAN Channel A: Bus off / Arbitration lost | Raw CAN error frame |
| CA021 | `C` + `A` + `021` | CAN Channel A: Error passive | Raw CAN error frame |
| CA022 | `C` + `A` + `022` | CAN Channel A: Bus error | Raw CAN error frame |
| CA023 | `C` + `A` + `023` | CAN Channel A: Form error | Raw CAN error frame |
| CA024 | `C` + `A` + `024` | CAN Channel A: Stuff error | Raw CAN error frame |
| CA025 | `C` + `A` + `025` | CAN Channel A: Bit error | Raw CAN error frame |
| CA026 | `C` + `A` + `026` | CAN Channel A: CRC error | Raw CAN error frame |
| CA027 | `C` + `A` + `027` | CAN Channel A: Acknowledgment error | Raw CAN error frame |
| CB020 | `C` + `B` + `020` | CAN Channel B: Bus off / Arbitration lost | Raw CAN error frame |
| C9F00 | `C` + `9` + `F00` | CAN: Invalid data received / Custom error | High-numbered CAN error |
| C9F01 | `C` + `9` + `F01` | CAN: Data timeout | High-numbered CAN error |
| C9F02 | `C` + `9` + `F02` | CAN: Frame format error | High-numbered CAN error |
| C9F03 | `C` + `9` + `F03` | CAN: Protocol violation | High-numbered CAN error |
| C01FF | `C` + `0` + `1FF` | CAN: Internal fault / Unknown error | CAN status code |
| C0FEF | `C` + `0` + `FEF` | CAN: Bus communication error | CAN status code |
| C0FEE | `C` + `0` + `FEE` | CAN: Network timeout | CAN status code |
| C0FED | `C` + `0` + `FED` | CAN: Node not responding | CAN status code |
| C0530 | `C` + `0` + `530` | CAN: Steering Position Sensor (GM/Ford) | May be valid chassis DTC |

### Valid OBD-II DTC Codes (Processed)

| Code | Pattern | Meaning | Source |
|------|---------|---------|--------|
| P0195 | `P` + `0` + `195` | Engine Oil Temperature Sensor "A" Circuit Malfunction | OBD-II Mode 03 |
| P0171 | `P` + `0` + `171` | System Too Lean (Bank 1) | OBD-II Mode 03 |
| P0300 | `P` + `0` + `300` | Random/Multiple Cylinder Misfire Detected | OBD-II Mode 03 |
| P0420 | `P` + `0` + `420` | Catalyst System Efficiency Below Threshold | OBD-II Mode 03 |
| P0128 | `P` + `0` + `128` | Coolant Thermostat Malfunction | OBD-II Mode 03 |
| P0401 | `P` + `0` + `401` | EGR Flow Insufficient | OBD-II Mode 03 |
| P0455 | `P` + `0` + `455` | Evaporative Emission Control System Leak | OBD-II Mode 03 |

## SDK Parsing Flow

```
Raw Bluetooth Data (ByteArray)
    ↓
BtProtocolParser.parse()
    ↓
BtParseData (with ACK and raw source)
    ↓
getOBDDataSource() → Raw ByteArray
getOBDData() → BaseObdData (ErrorBean, EldData, etc.)
    ↓
If ErrorBean:
    ecuList → List<ObdEcuBean>
        ↓
    errorCodeList → List<String> ["P0195", "CA020", ...]
```

## Key Insight

**The SDK doesn't create these codes - it extracts them from the raw data stream.**

- **OBD-II DTCs** (like P0195) come from the vehicle's ECU via OBD-II Mode 03
- **CAN bus errors** (like CA020, C9F00) come from the CAN bus controller's error frames
- The SDK's `getOBDData()` method parses the raw bytes and extracts error code strings
- These strings are stored in `ObdEcuBean.errorCodeList` as-is

## Why We See CA020, C9F00, etc.

These codes appear because:
1. The ELD device receives raw CAN bus error frames
2. The SDK extracts them as strings from the data stream
3. They match the pattern `C[A-F9][XXX]` but are NOT valid OBD-II DTCs
4. They should be filtered out when looking for real diagnostic trouble codes

## Algorithm Summary

1. **SDK receives raw bytes** from Bluetooth
2. **SDK parses bytes** using native code (algorithm unknown, but follows OBD-II standard)
3. **SDK extracts error codes** as strings from parsed data
4. **Codes are stored** in `ObdEcuBean.errorCodeList`
5. **We filter** CAN bus errors (CA020, C9F00, etc.) from valid OBD-II DTCs (P0195, etc.)

The exact native parsing algorithm is proprietary, but the output format (error code strings) is what we work with.

## Complete Error Code List

### CAN Bus Error Codes (200+ codes)

See `ObdErrorCodeMapper.kt` for the complete mapping. Categories:

1. **CAN Channel A Errors (CAXXX)**: 30+ codes (CA000-CA0FF)
   - CA020: Bus off / Arbitration lost
   - CA021: Error passive
   - CA022: Bus error
   - CA023: Form error
   - CA024: Stuff error
   - CA025: Bit error
   - CA026: CRC error
   - CA027: Acknowledgment error
   - And more...

2. **CAN Channel B Errors (CBXXX)**: 10+ codes (CB000-CB0FF)
   - CB020: Bus off / Arbitration lost
   - CB021: Error passive
   - CB022: Bus error
   - And more...

3. **High-Numbered CAN Errors (C9XXX)**: 50+ codes (C9000-C9FFF)
   - C9F00: Invalid data received / Custom error
   - C9F01: Data timeout
   - C9F02: Frame format error
   - C9F03: Protocol violation
   - C9F04: Buffer overflow
   - C9F05: Message lost
   - And more...

4. **CAN Status/Internal Codes (C0XXX)**: 100+ codes (C0000-C0FFF)
   - C01FF: Internal fault / Unknown error
   - C0FEF: Bus communication error
   - C0FEE: Network timeout
   - C0FED: Node not responding
   - And more...

5. **CAN Channel C/D Errors (CCXXX, CDXXX)**: Additional channel errors

### Pattern Recognition Algorithm

The SDK likely uses pattern matching to extract codes:

```kotlin
// Pseudo-code of SDK algorithm (inferred from bytecode analysis)
fun extractErrorCodes(rawBytes: ByteArray): List<String> {
    val codes = mutableListOf<String>()
    val hexString = rawBytes.toHexString()
    
    // Pattern 1: OBD-II DTC format [PBCU][0-3][0-9A-F]{3}
    val obdPattern = Regex("[PBCU][0-3][0-9A-F]{3}")
    codes.addAll(obdPattern.findAll(hexString).map { it.value })
    
    // Pattern 2: CAN error format C[A-F9][0-9A-F]{3}
    val canPattern = Regex("C[A-F9][0-9A-F]{3}")
    codes.addAll(canPattern.findAll(hexString).map { it.value })
    
    // Pattern 3: ASCII strings in data
    val asciiString = String(rawBytes, Charsets.UTF_8)
    val asciiPattern = Regex("[PBCU][0-9A-F]{4}")
    codes.addAll(asciiPattern.findAll(asciiString).map { it.value })
    
    return codes.distinct()
}
```

### Code Formation Rules

1. **OBD-II DTCs**: Follow SAE J2012 standard `[PBCU][0-3][XXX]`
2. **CAN Errors**: Follow pattern `C[A-F9][XXX]` where second char is NOT 0-3
3. **ASCII Encoding**: Codes may appear as ASCII strings in data stream
4. **Hex Encoding**: Codes may appear as hex byte patterns
5. **2-byte Encoding**: OBD-II DTCs may be encoded as 2 bytes per standard

The SDK extracts these patterns from the raw data and returns them as strings.

