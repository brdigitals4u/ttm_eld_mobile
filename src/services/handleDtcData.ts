/**
 * Transformation function for DTC (Diagnostic Trouble Code) data
 * Similar to handleData() but specifically for DTC codes
 * Transforms DTC string codes to ObdDataPayload format for backend sync
 */

import { ObdDataPayload } from '@/api/obd'
import { decodeObdCode, ObdCodeDetails } from '@/utils/obd-code-decoder'

/**
 * Transform DTC codes to ObdDataPayload format
 * Uses same structure as handleData() payload for consistent backend sync
 * 
 * @param dtcCodes - Array of DTC code strings (e.g., ["P0195", "P0300"])
 * @param ecuId - ECU identifier (string)
 * @param ecuIdHex - ECU identifier in hex format (e.g., "0x7E0")
 * @param timestamp - Date when DTC was detected
 * @param location - Optional GPS coordinates
 * @param driverId - Driver identifier
 * @param deviceId - Optional device identifier
 * @returns ObdDataPayload formatted for backend sync
 */
export const handleDtcData = (
  dtcCodes: string[],
  ecuId: string,
  ecuIdHex: string,
  timestamp: Date,
  location: { latitude: number; longitude: number } | undefined,
  driverId: string,
  deviceId?: string
): ObdDataPayload => {
  // Decode all DTC codes to get full details
  const decodedCodes: ObdCodeDetails[] = dtcCodes.map((code) => decodeObdCode(code))

  // Build fault codes payload structure
  const faultCodesPayload = [
    {
      ecu_id: ecuId,
      ecu_id_hex: ecuIdHex,
      codes: dtcCodes,
      details: decodedCodes,
    },
  ]

  // Build raw data structure matching handleData format
  const rawFaultDetails = {
    dataType: 'fault_data' as const,
    faultCodes: [
      {
        ecuId,
        ecuIdHex,
        codes: dtcCodes,
        details: decodedCodes,
      },
    ],
    deviceId: deviceId ?? undefined,
    device_id: deviceId ?? undefined,
    eventTime: timestamp.toISOString(),
  }

  // Build payload matching handleData structure
  const payload: ObdDataPayload = {
    driver_id: driverId,
    timestamp: timestamp.toISOString(),
    raw_data: rawFaultDetails,
    data_type: 'fault_data',
    fault_codes: faultCodesPayload,
    device_id: deviceId ?? undefined,
    deviceId: deviceId ?? undefined,
  }

  // Add GPS coordinates if available
  if (location) {
    payload.latitude = location.latitude
    payload.longitude = location.longitude
  }

  return payload
}

