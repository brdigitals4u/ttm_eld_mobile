interface OBDDataItem {
  id: string
  name: string
  value: string
  unit: string
  isError?: boolean
}

const getPidName = (pid: string): string => {
  const pidMap: { [key: string]: string } = {
    // Your specific OBD PIDs - exactly what you requested
    "0D": "Vehicle Speed Sensor",
    "05": "Engine Coolant Temperature",
    "0F": "Intake Air Temperature",
    "10": "Air Flow Rate (MAF)",
    "11": "Absolute Throttle Position",
    "0E": "Ignition Timing Advance",
    "04": "Calculated Load Value",
    "2F": "Fuel Level Input",
    "44": "Air Fuel Commanded Ratio",
    "74": "Turbocharger RPM",

    // Extended OBD PIDs from the working APK
    "0114": "Calculated LOAD Value",
    "0127": "Total Engine Running Time",
    "0528": "Total Mileage",
    "052c": "FuelConsumption",
    "052d": "EngineCoolant Coolant Temperature",
    "052e": "Engine Inlet Air Temperature",
    "0530": "Voltage",
    "0535": "Vehicle Speed",
    "0536": "Engine Speed",
    "0537": "Fuel Consumption",
    "0538": "Fuel Consumption (instant)",
    "053b": "Fuel Pressure (gauge)",
    "053c": "Air Flow",
    "053d": "Intake Manifold Absolute Pressure",
    "053f": "Accelerator Pedal Position",
    "0543": "Fuel Level",
    "0544": "Fuel Level",
    "0546": "Accumulated Mileage",
    "0548": "Absolute Throttle Position",
    "0549": "Ambient Air Temperature",
    "054a": "Ignition Timing Advance",
    "054b": "Long Term Fuel Trim - Bank 1",
    "054c": "Yaw Rate",
    "054d": "Lateral Acceleration",
    "054e": "Longitudinal Acceleration",
    "0552": "Engine Fuel Rate",
    "0553": "Engine Instantaneous Fuel Economy",
    "0554": "Engine Average Fuel Economy",
    "0555": "Seat Belt Switch",
    "0556": "Aftertreatment 1 Diesel Exhaust Fluid Tank Level 2",
    "0557": "Aftertreatment 1 Diesel Particulate Filter Intake Gas Temperature",
    "0558": "Aftertreatment 2 Diesel Particulate Filter Intake Gas Temperature",
    "0559": "Aftertreatment 1 Diesel Particulate Filter Outlet Temperature",
    "055a": "Aftertreatment 2 Diesel Particulate Filter Outlet Temperature",
    "055b": "Aftertreatment 1 Diesel Particulate Filter Differential Pressure",
    "055c": "Aftertreatment 2 Diesel Particulate Filter Differential Pressure",
    "055d": "Aftertreatment 1 Selective Catalytic Reduction Intake NOx",
    "055e": "Aftertreatment 1 Outlet NOx",
    "055f": "Aftertreatment 2 Selective Catalytic Reduction Intake NOx",
    "0560": "Aftertreatment 2 Outlet NOx",
    "0561": "Aftertreatment 1 Exhaust Gas Mass Flow Rat",
    "8001": "ACC OUT Status",
    "8002": "Trouble code",
    "E002": "Actual Engine Percent Torque",
    "E003": "Accelerator Pedal Position 1",
    "E004": "Engine Torque Mode",
    "EEF1": "PTO Governor State",
    "EEF6": "Intake Manifold Temperature",
    "F003": "Engine Percent Load At Current Speed",
    "F004": "Engine Speed",
    "F009": "Steering Wheel Angle",
    "F00A": "Engine Intake Air Mass Flow Rate",
    "FCB7": "Hybrid Battery Pack Remaining Charge",
    "FD09": "High resolution engine total fuel used",
    "FDB8": "Time Since Engine Start",
    "FE56": "Aftertreatment 1 Diesel Exhaust Fluid Tank Level",
    "FEAF": "Total Fuel Used (Gaseous)",
    "FEC1": "High Resolution Total Vehicle Distance",
    "FECA": "Malfunction Indicator Lamp",
    "FEE0": "Total Vehicle Distance",
    "FEE5": "Engine Total Hours of Operation",
    "FEE9": "Engine Total Fuel Used (Diesel)",
    "FEEC": "Vehicle Identification Number",
    "FEEE": "Engine Coolant Temperature",
    "FEF1": "Wheel-Based Vehicle Speed",
    "FEF2": "Engine Throttle Valve 1 Position 1",
    "FEF5": "Barometric Pressure",
    "FEF6": "Engine Turbocharger Boost Pressure",
    "FEFC": "Fuel Level 1",
  }

  // Try exact match first
  if (pidMap[pid]) {
    return pidMap[pid]
  }

  // Try case-insensitive lookup
  const upperPid = pid.toUpperCase()
  const lowerPid = pid.toLowerCase()

  return pidMap[upperPid] || pidMap[lowerPid] || `PID ${pid}`
}

const getPidUnit = (pid: string): string => {
  const unitMap: { [key: string]: string } = {
    // Your specific OBD PIDs
    "0D": "km/h",
    "05": "°C",
    "0F": "°C",
    "10": "g/s",
    "11": "%",
    "0E": "deg",
    "04": "%",
    "2F": "%",
    "44": "ratio",
    "74": "rpm",

    // Extended OBD PIDs from working APK
    "0114": "%",
    "0127": "s",
    "0528": "KM",
    "052c": "L",
    "052d": "°C",
    "052e": "°C",
    "0530": "mV",
    "0535": "mph",
    "0536": "rpm",
    "0537": "L/100KM",
    "0538": "L/100KM",
    "053b": "kPa",
    "053c": "g/s",
    "053d": "kPa",
    "053f": "%",
    "0543": "L",
    "0544": "%",
    "0546": "km",
    "0548": "%",
    "0549": "°C",
    "054a": "deg",
    "054b": "%",
    "054c": "rad/s",
    "054d": "m/s2",
    "054e": "m/s2",
    "0552": "L/h",
    "0553": "L/100KM",
    "0554": "L/100KM",
    "0555": "",
    "0556": "%",
    "0557": "°C",
    "0558": "°C",
    "0559": "°C",
    "055a": "°C",
    "055b": "kPa",
    "055c": "kPa",
    "055d": "ppm",
    "055e": "ppm",
    "055f": "ppm",
    "0560": "ppm",
    "0561": "kg/h",
    "8001": "",
    "8002": "",
    "E002": "%",
    "E003": "%",
    "E004": "",
    "EEF1": "",
    "EEF6": "°C",
    "F003": "%",
    "F004": "rpm",
    "F009": "deg",
    "F00A": "g/s",
    "FCB7": "%",
    "FD09": "L",
    "FDB8": "s",
    "FE56": "%",
    "FEAF": "L",
    "FEC1": "km",
    "FECA": "", // Boolean indicator (ON/OFF)
    "FEE0": "km",
    "FEE5": "h",
    "FEE9": "L",
    "FEEC": "",
    "FEEE": "°C",
    "FEF1": "mph",
    "FEF2": "%",
    "FEF5": "kPa",
    "FEF6": "kPa",
    "FEFC": "%",
  }

  // Try exact match first
  if (unitMap[pid]) {
    return unitMap[pid]
  }

  // Try case-insensitive lookup
  const upperPid = pid.toUpperCase()
  const lowerPid = pid.toLowerCase()

  return unitMap[upperPid] || unitMap[lowerPid] || ""
}

const formatPidValue = (pid: any, value: any) => {
  const upperPid = pid.toUpperCase()

  switch (upperPid) {
    // Engine Speed (rpm) - y = x * 0.125
    case "F004":
      return (value * 0.125).toFixed(0)

    // Wheel-Based Speed (mph) - y = x / 256 * 0.621371 (convert km/h to mph)
    case "FEF1":
      return ((value / 256) * 0.621371).toFixed(1)

    // Malfunction Indicator Lamp (1: ON, 0: OFF)
    case "FECA":
      return value === 1 ? "ON" : "OFF"

    // Total Vehicle Distance (km) - y = x * 0.125
    case "FEE0":
      return (value * 0.125).toFixed(1)

    // Engine Torque (%) - y = x
    case "E004":
      return value.toString()

    // Engine Load (%) - y = x
    case "F003":
      return value.toString()

    // Turbocharger Boost Pressure (kPa) - y = x * 2
    case "FEF6":
      return (value * 2).toFixed(1)

    // Engine Coolant Temperature (°C) - y = x - 40
    case "FEEE":
      return (value - 40).toFixed(1)

    // Engine Total Fuel Used (L) - y = x * 0.5
    case "FEE9":
      return (value * 0.5).toFixed(2)

    // Fuel Level or Throttle Position (%) - y = x * 0.4
    case "FEFC":
    case "E003":
    case "FEF2":
      return (value * 0.4).toFixed(1)

    // Engine Intake Air (kg/h) - y = x * 0.05
    case "F00A":
      return (value * 0.05).toFixed(2)

    // Barometric Pressure (kPa) - y = x * 0.5
    case "FEF5":
      return (value * 0.5).toFixed(1)

    // PTO Governor State - Special mapping
    case "EEF1":
      const states = {
        0x00: "Off/Disabled",
        0x01: "Hold",
        0x02: "Remote Hold",
        0x03: "Standby",
        0x04: "Remote Standby",
        0x05: "Set",
        0x06: "Decelerate/Coast",
      } as any
      return states[value] || value.toString()

    // Hybrid Battery Pack Remaining Charge (%) - y = x * 0.0025 (FCB7)
    case "FCB7":
      return (value * 0.0025).toFixed(2)

    // Engine Fuel Rate (L/h) - y = x * 0.05 (552)
    case "552":
      return (value * 0.05).toFixed(2)

    // Instantaneous Fuel Economy (km/L) - y = x / 512 (553, 554)
    case "553":
    case "554":
      return (value / 512).toFixed(2)

    // Total Fuel Used (Gaseous) (kg) - y = x * 0.5 (FEAF)
    case "FEAF":
      return (value * 0.5).toFixed(2)

    // Diesel Exhaust Fluid Level (%) - y = x * 0.4 (FE56)
    case "FE56":
      return (value * 0.4).toFixed(1)

    // Diesel Exhaust Fluid Tank Level 2 (mm) - y = x * 0.1 (556)
    case "556":
      return (value * 0.1).toFixed(1)

    // Steering Wheel Angle (rad) - y = x / 1024 - 31.374 (F009)
    case "F009":
      return (value / 1024 - 31.374).toFixed(3)

    // Yaw Rate (rad/s) - y = x / 8192 - 3.92 (54C)
    case "54C":
      return (value / 8192 - 3.92).toFixed(3)

    // Lateral Acceleration (m/s²) - y = x / 2048 - 15.687 (54D)
    case "54D":
      return (value / 2048 - 15.687).toFixed(3)

    // Longitudinal Acceleration (m/s²) - y = x / 10 - 12.5 (54E)
    case "54E":
      return (value / 10 - 12.5).toFixed(2)

    // Others: Use the formula provided in the sheet (not implemented here, but add cases as needed)
    default:
      return value.toFixed(2)
  }
}

export const handleData = (data: any) => {
  const displayData: OBDDataItem[] = []

  // Extract GPS coordinates if available
  if (data.latitude && data.longitude) {
    displayData.push({
      id: "gps_coords",
      name: "GPS Coordinates",
      value: `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`,
      unit: "lat/lng",
    })
  }

  // Extract OBD data from dataFlowList if available
  if (data.dataFlowList && Array.isArray(data.dataFlowList)) {
    console.log("📊 Processing dataFlowList with", data.dataFlowList.length, "items")

    data.dataFlowList.forEach((item: any, index: number) => {
      console.log(`🔍 Processing item ${index}:`, JSON.stringify(item))

      // Extract PID and value from each data item
      let pid: string | undefined
      let value: number | undefined

      // Handle the data structure from native module
      if (item.dataId !== undefined) {
        // Convert dataId to hex string for PID identification
        pid = item.pid || String(item.dataId).padStart(4, "0").toUpperCase()
        console.log(`🔍 Using dataId: ${item.dataId}, PID: ${pid}`)

        // Try to get value from different possible fields
        if (item.value !== undefined) {
          value = typeof item.value === "number" ? item.value : parseFloat(item.value) || 0
          console.log(`🔍 Using value field: ${item.value} -> ${value}`)
        } else if (item.data !== undefined) {
          value = typeof item.data === "number" ? item.data : parseFloat(item.data) || 0
          console.log(`🔍 Using data field: ${item.data} -> ${value}`)
        } else {
          value = 0
          console.log(`🔍 No value found, using 0`)
        }
      } else if (item.pid !== undefined) {
        // Fallback to pid field
        pid = item.pid
        console.log(`🔍 Using pid field: ${pid}`)
        value = typeof item.value === "number" ? item.value : parseFloat(item.value) || 0
      }

      // Process the PID and value
      if (pid && value !== undefined && !isNaN(value)) {
        console.log(`🔍 Processing PID: ${pid}, Value: ${value}`)

        const pidName = getPidName(pid)
        const unit = getPidUnit(pid)
        const formattedValue = formatPidValue(pid, value)

        console.log(
          `📊 Processed: PID=${pid}, Name=${pidName}, Value=${formattedValue}, Unit=${unit}`,
        )
        console.log(`🔍 Debug: PID=${pid}, Normalized=${pid.toUpperCase()}, Found Name=${pidName}`)

        if (pidName === `PID ${pid}`) {
          console.log(`⚠️ WARNING: PID ${pid} not found in mapping!`)
        }

        displayData.push({
          id: `pid_${pid}`,
          name: pidName,
          value: formattedValue,
          unit: unit,
        })
      } else {
        console.log(`❌ Skipping item ${index}: Invalid PID or value`)
        console.log(
          `❌ PID: ${pid}, Value: ${value}, isNaN: ${value !== undefined ? isNaN(value) : "undefined"}`,
        )
      }
    })
  }

  console.log("✅ Processed OBD data items:", displayData)
  return displayData
}
