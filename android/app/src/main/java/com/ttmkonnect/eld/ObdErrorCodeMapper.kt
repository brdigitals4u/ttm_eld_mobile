package com.ttmkonnect.eld

import android.util.Log

/**
 * Maps OBD-II DTC codes and CAN bus error codes to their meanings.
 * 
 * Based on:
 * - OBD-II SAE J2012 standard (P0XXX, P1XXX, B0XXX, C0XXX, U0XXX)
 * - CAN bus error frame specifications
 * - Common manufacturer-specific codes
 */
object ObdErrorCodeMapper {
    private const val TAG = "ObdErrorCodeMapper"
    
    /**
     * CAN Bus Error Codes (NOT OBD-II DTCs)
     * These are raw CAN bus error frames, not diagnostic trouble codes
     * 
     * Format: C[A-F9][0-9A-F]{3}
     * - C = Chassis prefix (but invalid for OBD-II - second char must be 0-3)
     * - [A-F9] = Invalid second character (indicates CAN error, not OBD-II DTC)
     * - [XXX] = Error code in hex
     */
    private val CAN_ERROR_CODES = mapOf(
        // ============================================
        // CAN Channel A Errors (CAXXX)
        // ============================================
        "CA000" to "CAN Channel A: No error",
        "CA001" to "CAN Channel A: Warning level",
        "CA010" to "CAN Channel A: Error active",
        "CA020" to "CAN Channel A: Bus off / Arbitration lost",
        "CA021" to "CAN Channel A: Error passive",
        "CA022" to "CAN Channel A: Bus error",
        "CA023" to "CAN Channel A: Form error",
        "CA024" to "CAN Channel A: Stuff error",
        "CA025" to "CAN Channel A: Bit error",
        "CA026" to "CAN Channel A: CRC error",
        "CA027" to "CAN Channel A: Acknowledgment error",
        "CA028" to "CAN Channel A: Transmit error",
        "CA029" to "CAN Channel A: Receive error",
        "CA030" to "CAN Channel A: Overrun error",
        "CA040" to "CAN Channel A: Underrun error",
        "CA050" to "CAN Channel A: Timeout error",
        "CA060" to "CAN Channel A: Controller error",
        "CA070" to "CAN Channel A: Protocol error",
        "CA080" to "CAN Channel A: Hardware error",
        "CA090" to "CAN Channel A: Software error",
        "CA0A0" to "CAN Channel A: Configuration error",
        "CA0B0" to "CAN Channel A: Initialization error",
        "CA0C0" to "CAN Channel A: Reset error",
        "CA0D0" to "CAN Channel A: State error",
        "CA0E0" to "CAN Channel A: Buffer error",
        "CA0F0" to "CAN Channel A: Unknown error",
        
        // ============================================
        // CAN Channel B Errors (CBXXX)
        // ============================================
        "CB000" to "CAN Channel B: No error",
        "CB010" to "CAN Channel B: Error active",
        "CB020" to "CAN Channel B: Bus off / Arbitration lost",
        "CB021" to "CAN Channel B: Error passive",
        "CB022" to "CAN Channel B: Bus error",
        "CB023" to "CAN Channel B: Form error",
        "CB024" to "CAN Channel B: Stuff error",
        "CB025" to "CAN Channel B: Bit error",
        "CB026" to "CAN Channel B: CRC error",
        "CB027" to "CAN Channel B: Acknowledgment error",
        
        // ============================================
        // High-Numbered CAN Errors (C9XXX range)
        // ============================================
        "C9000" to "CAN: Generic error",
        "C9001" to "CAN: Invalid command",
        "C9002" to "CAN: Invalid parameter",
        "C9003" to "CAN: Invalid state",
        "C9004" to "CAN: Invalid data",
        "C9005" to "CAN: Invalid length",
        "C9006" to "CAN: Invalid checksum",
        "C9007" to "CAN: Invalid sequence",
        "C9008" to "CAN: Invalid address",
        "C9009" to "CAN: Invalid ID",
        "C900A" to "CAN: Invalid format",
        "C900B" to "CAN: Invalid version",
        "C900C" to "CAN: Invalid type",
        "C900D" to "CAN: Invalid mode",
        "C900E" to "CAN: Invalid operation",
        "C900F" to "CAN: Invalid response",
        "C9E00" to "CAN: Extended error",
        "C9E01" to "CAN: Extended timeout",
        "C9E02" to "CAN: Extended format error",
        "C9E03" to "CAN: Extended protocol error",
        "C9F00" to "CAN: Invalid data received / Custom error",
        "C9F01" to "CAN: Data timeout",
        "C9F02" to "CAN: Frame format error",
        "C9F03" to "CAN: Protocol violation",
        "C9F04" to "CAN: Buffer overflow",
        "C9F05" to "CAN: Message lost",
        "C9F06" to "CAN: Message corrupted",
        "C9F07" to "CAN: Message incomplete",
        "C9F08" to "CAN: Message duplicate",
        "C9F09" to "CAN: Message out of order",
        "C9F0A" to "CAN: Message too large",
        "C9F0B" to "CAN: Message too small",
        "C9F0C" to "CAN: Message invalid",
        "C9F0D" to "CAN: Message rejected",
        "C9F0E" to "CAN: Message ignored",
        "C9F0F" to "CAN: Message error",
        "C9FF0" to "CAN: Unknown custom error",
        "C9FF1" to "CAN: Reserved error 1",
        "C9FF2" to "CAN: Reserved error 2",
        "C9FF3" to "CAN: Reserved error 3",
        "C9FFF" to "CAN: Maximum custom error",
        
        // ============================================
        // CAN Status/Internal Codes (C0XXX range)
        // ============================================
        "C0000" to "CAN: No error / OK",
        "C0001" to "CAN: Status OK",
        "C0010" to "CAN: Initializing",
        "C0011" to "CAN: Ready",
        "C0012" to "CAN: Active",
        "C0013" to "CAN: Passive",
        "C0014" to "CAN: Bus off",
        "C0015" to "CAN: Error",
        "C0100" to "CAN: General status",
        "C0101" to "CAN: Communication status",
        "C0102" to "CAN: Network status",
        "C0103" to "CAN: Protocol status",
        "C0104" to "CAN: Hardware status",
        "C0105" to "CAN: Software status",
        "C01FF" to "CAN: Internal fault / Unknown error",
        "C0F00" to "CAN: Fault code 0",
        "C0F01" to "CAN: Fault code 1",
        "C0F02" to "CAN: Fault code 2",
        "C0F03" to "CAN: Fault code 3",
        "C0F04" to "CAN: Fault code 4",
        "C0F05" to "CAN: Fault code 5",
        "C0F06" to "CAN: Fault code 6",
        "C0F07" to "CAN: Fault code 7",
        "C0F08" to "CAN: Fault code 8",
        "C0F09" to "CAN: Fault code 9",
        "C0F0A" to "CAN: Fault code A",
        "C0F0B" to "CAN: Fault code B",
        "C0F0C" to "CAN: Fault code C",
        "C0F0D" to "CAN: Fault code D",
        "C0F0E" to "CAN: Fault code E",
        "C0F0F" to "CAN: Fault code F",
        "C0F10" to "CAN: Communication fault",
        "C0F11" to "CAN: Network fault",
        "C0F12" to "CAN: Protocol fault",
        "C0F13" to "CAN: Hardware fault",
        "C0F14" to "CAN: Software fault",
        "C0F15" to "CAN: Configuration fault",
        "C0F16" to "CAN: Initialization fault",
        "C0F17" to "CAN: Reset fault",
        "C0F18" to "CAN: State fault",
        "C0F19" to "CAN: Buffer fault",
        "C0F1A" to "CAN: Timeout fault",
        "C0F1B" to "CAN: Overrun fault",
        "C0F1C" to "CAN: Underrun fault",
        "C0F1D" to "CAN: Controller fault",
        "C0F1E" to "CAN: Bus fault",
        "C0F1F" to "CAN: Error fault",
        "C0F20" to "CAN: Warning fault",
        "C0F30" to "CAN: Critical fault",
        "C0F40" to "CAN: Fatal fault",
        "C0F50" to "CAN: System fault",
        "C0F60" to "CAN: Device fault",
        "C0F70" to "CAN: Module fault",
        "C0F80" to "CAN: Component fault",
        "C0F90" to "CAN: Interface fault",
        "C0FA0" to "CAN: Link fault",
        "C0FB0" to "CAN: Channel fault",
        "C0FC0" to "CAN: Port fault",
        "C0FD0" to "CAN: Socket fault",
        "C0FE0" to "CAN: Connection fault",
        "C0FE1" to "CAN: Disconnection fault",
        "C0FE2" to "CAN: Reconnection fault",
        "C0FE3" to "CAN: Authentication fault",
        "C0FE4" to "CAN: Authorization fault",
        "C0FE5" to "CAN: Encryption fault",
        "C0FE6" to "CAN: Decryption fault",
        "C0FE7" to "CAN: Validation fault",
        "C0FE8" to "CAN: Verification fault",
        "C0FE9" to "CAN: Checksum fault",
        "C0FEA" to "CAN: CRC fault",
        "C0FEB" to "CAN: Parity fault",
        "C0FEC" to "CAN: Sequence fault",
        "C0FED" to "CAN: Node not responding",
        "C0FEE" to "CAN: Network timeout",
        "C0FEF" to "CAN: Bus communication error",
        "C0FF0" to "CAN: Maximum fault code",
        "C0FF1" to "CAN: Reserved fault 1",
        "C0FF2" to "CAN: Reserved fault 2",
        "C0FF3" to "CAN: Reserved fault 3",
        "C0FFF" to "CAN: Unknown fault",
        
        // ============================================
        // CAN Channel C/D Errors (CCXXX, CDXXX)
        // ============================================
        "CC020" to "CAN Channel C: Bus off / Arbitration lost",
        "CC021" to "CAN Channel C: Error passive",
        "CC022" to "CAN Channel C: Bus error",
        "CD020" to "CAN Channel D: Bus off / Arbitration lost",
        "CD021" to "CAN Channel D: Error passive",
        "CD022" to "CAN Channel D: Bus error",
        
        // ============================================
        // Valid Chassis DTCs (C0XXX) - May appear as CAN errors
        // ============================================
        "C0530" to "Steering Position Sensor Circuit (GM/Ford style - Valid chassis DTC)",
        "C0123" to "Steering Position Sensor Circuit (SAE standard)",
        "C0001" to "ABS Control Module (SAE standard)",
    )
    
    /**
     * Standard OBD-II DTC Code Descriptions
     * Format: [PBCU][0-3][XXX]
     */
    private val OBD_DTC_CODES = mapOf(
        // Powertrain codes (P0XXX = SAE standard)
        "P0195" to "Engine Oil Temperature Sensor 'A' Circuit Malfunction",
        "P0171" to "System Too Lean (Bank 1)",
        "P0300" to "Random/Multiple Cylinder Misfire Detected",
        "P0420" to "Catalyst System Efficiency Below Threshold (Bank 1)",
        "P0128" to "Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)",
        "P0401" to "Exhaust Gas Recirculation Flow Insufficient Detected",
        "P0455" to "Evaporative Emission Control System Leak Detected (Large Leak)",
        
        // Body codes (B0XXX = SAE standard)
        "B0001" to "Driver Airbag Circuit Malfunction",
        "B0002" to "Passenger Airbag Circuit Malfunction",
        
        // Chassis codes (C0XXX = SAE standard)
        "C0001" to "ABS Control Module",
        "C0123" to "Steering Position Sensor Circuit",
        
        // Network codes (U0XXX = SAE standard)
        "U0100" to "Lost Communication with ECM/PCM 'A'",
        "U0101" to "Lost Communication with TCM",
    )
    
    /**
     * Get the description for an error code
     * @param code The error code (e.g., "P0195", "CA020", "C9F00")
     * @return Description of the code, or null if unknown
     */
    fun getCodeDescription(code: String): String? {
        val upperCode = code.uppercase().trim()
        
        // Check CAN error codes first
        CAN_ERROR_CODES[upperCode]?.let {
            return it
        }
        
        // Check OBD-II DTC codes
        OBD_DTC_CODES[upperCode]?.let {
            return it
        }
        
        // Try to determine type based on format
        return when {
            // CAN bus error (C followed by A, 9, or high hex)
            upperCode.matches(Regex("C[A-F9][0-9A-F]{3}")) -> {
                "CAN Bus Error Frame (not OBD-II DTC)"
            }
            // Valid OBD-II DTC format
            upperCode.matches(Regex("[PBCU][0-3][0-9A-F]{3}")) -> {
                getGenericDtcDescription(upperCode)
            }
            // Invalid format
            else -> {
                "Unknown error code format"
            }
        }
    }
    
    /**
     * Get generic description based on DTC code format
     */
    private fun getGenericDtcDescription(code: String): String {
        if (code.length != 5) return "Invalid DTC format"
        
        val firstChar = code[0]
        val secondChar = code[1]
        val lastThree = code.substring(2)
        
        val system = when (firstChar) {
            'P' -> "Powertrain"
            'B' -> "Body"
            'C' -> "Chassis"
            'U' -> "Network"
            else -> "Unknown"
        }
        
        val standard = when (secondChar) {
            '0' -> "SAE Standard"
            '1' -> "Manufacturer Specific"
            '2' -> "SAE Reserved"
            '3' -> "Manufacturer Specific"
            else -> "Unknown"
        }
        
        return "$system - $standard (Code: $lastThree)"
    }
    
    /**
     * Check if a code is a CAN bus error (not an OBD-II DTC)
     */
    fun isCanBusError(code: String): Boolean {
        val upperCode = code.uppercase().trim()
        
        // Known CAN error codes
        if (CAN_ERROR_CODES.containsKey(upperCode)) {
            return true
        }
        
        // Pattern matching for CAN errors
        // C followed by A-F or 9 (not 0-3 which is valid OBD-II)
        return upperCode.matches(Regex("C[A-F9][0-9A-F]{3}"))
    }
    
    /**
     * Check if a code is a valid OBD-II DTC
     */
    fun isValidObdDtc(code: String): Boolean {
        val upperCode = code.uppercase().trim()
        
        // Must match OBD-II format: [PBCU][0-3][0-9A-F]{3}
        if (!upperCode.matches(Regex("[PBCU][0-3][0-9A-F]{3}"))) {
            return false
        }
        
        // Not a CAN error
        return !isCanBusError(upperCode)
    }
    
    /**
     * Get all known CAN error codes
     */
    fun getCanErrorCodes(): Map<String, String> {
        return CAN_ERROR_CODES
    }
    
    /**
     * Get all known OBD-II DTC codes
     */
    fun getObdDtcCodes(): Map<String, String> {
        return OBD_DTC_CODES
    }
    
    /**
     * Log all codes found with their descriptions
     */
    fun logCodeDescriptions(codes: List<String>) {
        if (codes.isEmpty()) {
            Log.d(TAG, "No error codes to describe")
            return
        }
        
        Log.i(TAG, "═══════════════════════════════════════════════════════")
        Log.i(TAG, "Error Code Analysis (${codes.size} codes found):")
        Log.i(TAG, "═══════════════════════════════════════════════════════")
        
        val canErrors = mutableListOf<String>()
        val obdDtcs = mutableListOf<String>()
        val unknown = mutableListOf<String>()
        
        codes.forEach { code ->
            val description = getCodeDescription(code)
            val isCan = isCanBusError(code)
            val isValid = isValidObdDtc(code)
            
            when {
                isCan -> {
                    canErrors.add(code)
                    Log.w(TAG, "🚫 CAN Error: $code - $description")
                }
                isValid -> {
                    obdDtcs.add(code)
                    Log.i(TAG, "✅ OBD-II DTC: $code - $description")
                }
                else -> {
                    unknown.add(code)
                    Log.w(TAG, "❓ Unknown: $code - $description")
                }
            }
        }
        
        Log.i(TAG, "═══════════════════════════════════════════════════════")
        Log.i(TAG, "Summary:")
        Log.i(TAG, "  CAN Bus Errors: ${canErrors.size} - ${canErrors.joinToString(", ")}")
        Log.i(TAG, "  OBD-II DTCs: ${obdDtcs.size} - ${obdDtcs.joinToString(", ")}")
        Log.i(TAG, "  Unknown: ${unknown.size} - ${unknown.joinToString(", ")}")
        Log.i(TAG, "═══════════════════════════════════════════════════════")
    }
}

