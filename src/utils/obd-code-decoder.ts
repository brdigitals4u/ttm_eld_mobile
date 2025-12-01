/**
 * Utilities for decoding OBD-II Diagnostic Trouble Codes (DTC).
 * Covers code structure plus a small lookup of common generic codes.
 */

export interface ObdCodeDetails {
  code: string
  system: string
  systemDescription: string
  isGeneric: boolean
  genericDescription: string
  subsystem: string
  subsystemDescription: string
  faultDescription?: string
}

const SYSTEM_MAP: Record<string, { name: string; description: string }> = {
  P: { name: "Powertrain", description: "Engine, transmission, emissions" },
  B: { name: "Body", description: "Airbags, climate control, conveniences" },
  C: { name: "Chassis", description: "Brakes, steering, suspension" },
  U: { name: "Network", description: "Communication wiring and bus systems" },
}

const GENERICITY_MAP: Record<string, string> = {
  "0": "Generic SAE/ISO defined code",
  "1": "Manufacturer specific code",
  "2": "Manufacturer specific code",
  "3": "Manufacturer specific code",
}

const SUBSYSTEM_MAP: Record<string, string> = {
  "0": "Fuel and air metering and auxiliary emission controls",
  "1": "Fuel and air metering",
  "2": "Fuel injection system",
  "3": "Ignition system or misfire",
  "4": "Auxiliary emission controls",
  "5": "Vehicle speed control and idle control",
  "6": "Computer output circuit",
  "7": "Transmission",
  "8": "Transmission",
  "9": "SAE reserved",
  "A": "Hybrid propulsion",
  "B": "SAE reserved",
  "C": "SAE reserved",
  "D": "SAE reserved",
  "E": "SAE reserved",
  "F": "SAE reserved",
}

const KNOWN_CODE_DESCRIPTIONS: Record<string, string> = {
  P0171: "System Too Lean (Bank 1)",
  P0300: "Random/Multiple Cylinder Misfire Detected",
  P0420: "Catalyst System Efficiency Below Threshold (Bank 1)",
  P0128: "Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)",
  P0401: "Exhaust Gas Recirculation Flow Insufficient Detected",
  P0455: "Evaporative Emission Control System Leak Detected (Large Leak)",
  P0195: 'Engine Oil Temperature Sensor "A" Circuit Malfunction',
}

const DEFAULT_UNKNOWN_DESCRIPTION = "Refer to manufacturer documentation for details"

export function decodeObdCode(rawCode: string | null | undefined): ObdCodeDetails {
  const code = (rawCode || "").toUpperCase().trim()
  const defaultDetails: ObdCodeDetails = {
    code: code || "UNKNOWN",
    system: "UNKNOWN",
    systemDescription: DEFAULT_UNKNOWN_DESCRIPTION,
    isGeneric: false,
    genericDescription: DEFAULT_UNKNOWN_DESCRIPTION,
    subsystem: "UNKNOWN",
    subsystemDescription: DEFAULT_UNKNOWN_DESCRIPTION,
    faultDescription: code ? KNOWN_CODE_DESCRIPTIONS[code] : undefined,
  }

  if (code.length !== 5) {
    return defaultDetails
  }

  const [systemChar, genericChar, subsystemChar] = code

  const systemInfo = SYSTEM_MAP[systemChar] ?? {
    name: "Unknown system",
    description: DEFAULT_UNKNOWN_DESCRIPTION,
  }

  const genericity = GENERICITY_MAP[genericChar] ?? DEFAULT_UNKNOWN_DESCRIPTION
  const isGeneric = genericChar === "0"

  const subsystemDescription = SUBSYSTEM_MAP[subsystemChar] ?? DEFAULT_UNKNOWN_DESCRIPTION

  const faultDescription = KNOWN_CODE_DESCRIPTIONS[code] ?? DEFAULT_UNKNOWN_DESCRIPTION

  return {
    code,
    system: systemInfo.name,
    systemDescription: systemInfo.description,
    isGeneric,
    genericDescription: genericity,
    subsystem: subsystemChar,
    subsystemDescription,
    faultDescription,
  }
}
