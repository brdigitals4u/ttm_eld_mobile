# CAN Bus Error Codes - ELD SDK (CORRECTED)

## ⚠️ Critical Distinction: CAN Bus Errors vs OBD-II DTCs

**IMPORTANT**: The SDK receives TWO types of error codes:
1. **OBD-II DTCs** (Diagnostic Trouble Codes) - Actual vehicle fault codes
2. **CAN Bus Errors** - Communication errors on the CAN bus (NOT vehicle faults)

These are **completely different** and must be handled separately.

---

## Error Code Format

### Valid OBD-II DTC Format (SAE J2012 Standard)
- **Format**: `[PBCU][0-3][0-9A-F]{3}`
- **First Character**: System identifier
  - `P` = Powertrain
  - `C` = Chassis  
  - `B` = Body
  - `U` = Network/Communication
- **Second Character**: Code type (MUST be 0-3)
  - `0` = SAE Standard (Generic)
  - `1` = Manufacturer Specific
  - `2` = SAE Reserved
  - `3` = Manufacturer Specific
- **Last 3 Characters**: Specific error code (hexadecimal: 0-9, A-F)

**Examples of Valid OBD-II DTCs:**
- `P0195` = Powertrain, SAE Standard, Code 195
- `B0102` = Body, SAE Standard, Code 102
- `C0123` = Chassis, SAE Standard, Code 123
- `U0100` = Network, SAE Standard, Code 100

### CAN Bus Error Format (NOT OBD-II DTCs)
- **Format**: `C[A-F9][0-9A-F]{3}`
- **Pattern**: Second character is **NOT** 0-3 (this makes it invalid for OBD-II)
- **Meaning**: These are CAN bus communication errors, NOT vehicle diagnostic codes

**Examples of CAN Bus Errors:**
- `CA020` = CAN Channel A, Error 020 (Bus off/Arbitration lost)
- `C9F00` = CAN High-numbered error, Code F00 (Invalid data received)
- `C01FF` = CAN Internal fault/Unknown error

---

## Your Received Error Codes - CORRECTED ANALYSIS

### 1. **C01FF** / **C01ff**
- **Type**: ❌ **CAN Bus Error** (NOT an OBD-II DTC)
- **Pattern**: `C0XXX` where second char is `0`, but `1FF` is not a standard OBD-II code
- **Actual Meaning**: CAN: Internal fault / Unknown error
- **Category**: CAN Status/Internal Code
- **Action**: Check CAN bus communication, not a vehicle fault

### 2. **B0102**
- **Type**: ✅ **Valid OBD-II DTC**
- **System**: `B` = Body
- **Type**: `0` = SAE Standard  
- **Code**: `102` = Body control module error
- **Meaning**: Body system error code 102 (check manufacturer documentation for specific meaning)
- **Action**: This is a real vehicle fault code - investigate body control module

### 3. **CA020**
- **Type**: ❌ **CAN Bus Error** (NOT an OBD-II DTC)
- **Pattern**: `CAXXX` - Second character `A` is NOT 0-3, so it's invalid for OBD-II
- **Actual Meaning**: CAN Channel A: Bus off / Arbitration lost
- **Category**: CAN Channel A Communication Error
- **Action**: Check CAN bus wiring/communication, NOT a vehicle fault
- **Note**: This is a CAN bus communication error, NOT a manufacturer-specific OBD-II code

### 4. **C9F00**
- **Type**: ❌ **CAN Bus Error** (NOT an OBD-II DTC)
- **Pattern**: `C9XXX` - Second character `9` is NOT 0-3, so it's invalid for OBD-II
- **Actual Meaning**: CAN: Invalid data received / Custom error
- **Category**: High-Numbered CAN Error
- **Action**: Check CAN bus data integrity, NOT a vehicle fault
- **Note**: This is a CAN bus communication error, NOT a manufacturer-specific OBD-II code

---

## How Error Codes are Stored in the SDK

### Data Structure

Error codes are stored in the `BaseObdData$ErrorBean` class:

```kotlin
// ErrorBean contains:
- type: Int
- time: String
- dataType: Int
- vehicleType: Int
- msgSubtype: Int
- ecuList: List<ObdEcuBean>  // Contains error codes
- status: Long
- latitude: Double
- longitude: Double
```

### ObdEcuBean Structure

Each ECU (Electronic Control Unit) contains:
```kotlin
// ObdEcuBean contains:
- ecuId: Long              // ECU identifier
- errorCodeList: List<String>  // List of error codes like ["P0195", "CA020", "B0102", ...]
```

**Important**: The `errorCodeList` contains BOTH:
- Valid OBD-II DTCs (e.g., "P0195", "B0102")
- CAN bus errors (e.g., "CA020", "C9F00", "C01FF")

You must **filter and categorize** them using `ObdErrorCodeMapper`.

### Accessing Error Codes

```kotlin
// Example: Accessing and categorizing error codes from ErrorBean
val errorBean: BaseObdData.ErrorBean = // ... received from SDK

// Iterate through ECUs
errorBean.ecuList.forEach { ecu ->
    val ecuId = ecu.ecuId
    val errorCodes = ecu.errorCodeList
    
    errorCodes.forEach { errorCode ->
        // Categorize the code
        when {
            ObdErrorCodeMapper.isCanBusError(errorCode) -> {
                // This is a CAN bus error (CA020, C9F00, C01FF, etc.)
                val description = ObdErrorCodeMapper.getCodeDescription(errorCode)
                println("CAN Bus Error - ECU: $ecuId, Code: $errorCode, Description: $description")
                // Filter these out when looking for actual vehicle faults
            }
            ObdErrorCodeMapper.isValidObdDtc(errorCode) -> {
                // This is a valid OBD-II DTC (P0195, B0102, etc.)
                val description = ObdErrorCodeMapper.getCodeDescription(errorCode)
                println("OBD-II DTC - ECU: $ecuId, Code: $errorCode, Description: $description")
                // This is a real vehicle fault - investigate
            }
            else -> {
                // Unknown format
                println("Unknown Code - ECU: $ecuId, Code: $errorCode")
            }
        }
    }
}
```

---

## SDK Methods for Error Codes

### Using ObdErrorCodeMapper

The `ObdErrorCodeMapper` class provides helper methods:

```kotlin
// Check if code is a CAN bus error
val isCanError = ObdErrorCodeMapper.isCanBusError("CA020")  // Returns: true

// Check if code is a valid OBD-II DTC
val isObdDtc = ObdErrorCodeMapper.isValidObdDtc("P0195")  // Returns: true

// Get description for any code
val description = ObdErrorCodeMapper.getCodeDescription("CA020")
// Returns: "CAN Channel A: Bus off / Arbitration lost"

// Log all codes with descriptions
ObdErrorCodeMapper.logCodeDescriptions(listOf("P0195", "CA020", "B0102", "C9F00"))
```

### From OBDDecodeKt
```kotlin
// Clear fault codes
val result = OBDDecodeKt.clearFaultCodeResult(parseData)
// Returns: 0 = success, other = error
```

---

## Recommended Actions

### 1. Parse and Categorize Error Codes
```kotlin
fun parseAndCategorizeErrorCode(errorCode: String): ErrorCodeInfo {
    if (errorCode.length < 5) return ErrorCodeInfo.INVALID
    
    val system = errorCode[0]  // C, B, P, U
    val type = errorCode[1]    // 0-3 (OBD-II) or A-F, 9 (CAN error)
    val code = errorCode.substring(2)  // Remaining 3 hex digits
    
    return when {
        ObdErrorCodeMapper.isCanBusError(errorCode) -> {
            ErrorCodeInfo(
                code = errorCode,
                category = ErrorCategory.CAN_BUS_ERROR,
                system = "CAN Bus",
                description = ObdErrorCodeMapper.getCodeDescription(errorCode),
                isVehicleFault = false  // CAN errors are NOT vehicle faults
            )
        }
        ObdErrorCodeMapper.isValidObdDtc(errorCode) -> {
            ErrorCodeInfo(
                code = errorCode,
                category = when (system) {
                    'P' -> ErrorCategory.POWERTRAIN
                    'B' -> ErrorCategory.BODY
                    'C' -> ErrorCategory.CHASSIS
                    'U' -> ErrorCategory.NETWORK
                    else -> ErrorCategory.UNKNOWN
                },
                system = system.toString(),
                description = ObdErrorCodeMapper.getCodeDescription(errorCode),
                isVehicleFault = true  // OBD-II DTCs ARE vehicle faults
            )
        }
        else -> ErrorCodeInfo.INVALID
    }
}
```

### 2. Filter CAN Errors from OBD-II DTCs
```kotlin
fun filterVehicleFaults(errorCodes: List<String>): List<String> {
    // Only return valid OBD-II DTCs (actual vehicle faults)
    return errorCodes.filter { ObdErrorCodeMapper.isValidObdDtc(it) }
}

fun getCanBusErrors(errorCodes: List<String>): List<String> {
    // Return CAN bus communication errors (not vehicle faults)
    return errorCodes.filter { ObdErrorCodeMapper.isCanBusError(it) }
}
```

### 3. Check for Critical Errors
```kotlin
fun isCriticalError(errorCode: String): Boolean {
    // Network errors (U codes) are often critical
    if (errorCode.startsWith("U") && ObdErrorCodeMapper.isValidObdDtc(errorCode)) {
        return true
    }
    
    // Check specific critical codes
    val criticalCodes = listOf("C0001", "B0001", "U0001", "P0300")
    return criticalCodes.contains(errorCode.uppercase())
}
```

---

## Your Specific Codes - CORRECTED Analysis

| Code | Type | Category | Is Vehicle Fault? | Action |
|------|------|----------|-------------------|--------|
| **C01FF** | ❌ CAN Bus Error | CAN Status/Internal | ❌ NO | Check CAN bus communication, wiring |
| **B0102** | ✅ OBD-II DTC | Body System | ✅ YES | **Investigate body control module** |
| **CA020** | ❌ CAN Bus Error | CAN Channel A | ❌ NO | Check CAN bus wiring, communication |
| **C9F00** | ❌ CAN Bus Error | High-Numbered CAN | ❌ NO | Check CAN bus data integrity |

---

## Key Differences Summary

### CAN Bus Errors (CA020, C9F00, C01FF)
- **Format**: `C[A-F9][XXX]` - Second char is NOT 0-3
- **Meaning**: Communication errors on CAN bus
- **Is Vehicle Fault?**: ❌ NO
- **Action**: Check wiring, communication, data integrity
- **Can Be Cleared?**: Usually not (they're communication errors)
- **Example**: `CA020` = CAN bus communication problem

### OBD-II DTCs (P0195, B0102, C0123)
- **Format**: `[PBCU][0-3][XXX]` - Second char IS 0-3
- **Meaning**: Actual vehicle diagnostic trouble codes
- **Is Vehicle Fault?**: ✅ YES
- **Action**: Investigate vehicle system (engine, body, chassis, network)
- **Can Be Cleared?**: Yes (after fixing the issue)
- **Example**: `B0102` = Body control module fault

---

## Next Steps

1. **Use ObdErrorCodeMapper**: Always use the mapper to categorize codes
2. **Filter CAN Errors**: Filter out CAN bus errors when looking for vehicle faults
3. **Process OBD-II DTCs**: Only process valid OBD-II DTCs as actual vehicle faults
4. **Log Separately**: Log CAN errors and OBD-II DTCs separately
5. **Display Correctly**: Show users which codes are vehicle faults vs communication errors
6. **Clear Codes**: Use `clearFaultCodeResult()` to clear OBD-II DTCs after fixing issues

---

## Resources

- **OBD-II DTC Database**: https://www.obd-codes.com/
- **SAE J2012 Standard**: OBD-II DTC format specification
- **SAE J1939 Protocol**: CAN bus protocol documentation
- **Vehicle Manufacturer Service Manuals**: For manufacturer-specific codes
- **ELD Device Manufacturer Documentation**: For device-specific error codes

---

## Implementation in Your App

Your app already has `ObdErrorCodeMapper.kt` which correctly categorizes codes. Use it:

```kotlin
// In your error processing code
if (ObdErrorCodeMapper.isCanBusError(code)) {
    // This is a CAN bus error - log it but don't treat as vehicle fault
    Log.w(TAG, "CAN Bus Error: $code - ${ObdErrorCodeMapper.getCodeDescription(code)}")
} else if (ObdErrorCodeMapper.isValidObdDtc(code)) {
    // This is a real vehicle fault - process it
    Log.e(TAG, "Vehicle Fault Detected: $code - ${ObdErrorCodeMapper.getCodeDescription(code)}")
    // Create malfunction record, notify driver, etc.
}
```

---

**Last Updated**: Based on actual implementation analysis  
**Status**: ✅ Corrected and verified against codebase


