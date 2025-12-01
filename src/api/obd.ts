import { awsConfig } from "@/config/aws-config"
import { awsApiService, AwsObdPayload } from "@/services/AwsApiService"
import { ObdCodeDetails } from "@/utils/obd-code-decoder"

import { apiClient } from "./client"

export interface ObdDataPayload {
  driver_id: string
  timestamp: string
  vehicle_speed?: number
  engine_speed?: number
  coolant_temp?: number
  fuel_level?: number
  odometer?: number
  latitude?: number
  longitude?: number
  raw_data: any
  data_type?: "engine_data" | "location" | "hos_status" | "fault_data"
  fault_codes?: Array<{
    ecu_id: string
    ecu_id_hex: string
    codes: string[]
    details?: ObdCodeDetails[]
  }>
  device_id?: string
  deviceId?: string
}

/**
 * Send OBD data to the API
 */
export const sendObdData = async (data: ObdDataPayload) => {
  const response = await apiClient.post("/obd/data", data)
  return response.data
}

/**
 * Convert ObdDataPayload to AwsObdPayload format
 */
const convertToAwsPayload = (payload: ObdDataPayload, vehicleId: string): AwsObdPayload => {
  // Extract vehicleId from raw_data if available, otherwise use provided vehicleId
  const vin = payload.raw_data?.vehicleId || vehicleId || "UNKNOWN_VEHICLE"

  // Parse timestamp
  const timestamp = payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now()

  // Extract allData from raw_data if available
  const allData = payload.raw_data?.allData || []
  const dataType = payload.data_type || payload.raw_data?.dataType || "engine_data"
  const deviceId =
    payload.deviceId ||
    payload.device_id ||
    payload.raw_data?.deviceId ||
    payload.raw_data?.device_id ||
    undefined

  const awsPayload: AwsObdPayload = {
    vehicleId: vin,
    driverId: payload.driver_id,
    timestamp: timestamp,
    dataType: dataType,
    latitude: payload.latitude,
    longitude: payload.longitude,
    vehicleSpeed: payload.vehicle_speed,
    engineSpeed: payload.engine_speed,
    coolantTemp: payload.coolant_temp,
    fuelLevel: payload.fuel_level,
    odometer: payload.odometer,
    allData: allData,
    deviceId,
  }

  // Copy additional fields from raw_data if available
  if (payload.raw_data) {
    if (payload.raw_data.gpsSpeed !== undefined) awsPayload.gpsSpeed = payload.raw_data.gpsSpeed
    if (payload.raw_data.gpsTime) awsPayload.gpsTime = payload.raw_data.gpsTime
    if (payload.raw_data.gpsRotation !== undefined)
      awsPayload.gpsRotation = payload.raw_data.gpsRotation
    if (payload.raw_data.eventTime) awsPayload.eventTime = payload.raw_data.eventTime
    if (payload.raw_data.eventType !== undefined) awsPayload.eventType = payload.raw_data.eventType
    if (payload.raw_data.eventId !== undefined) awsPayload.eventId = payload.raw_data.eventId
    if (payload.raw_data.isLiveEvent !== undefined)
      awsPayload.isLiveEvent = payload.raw_data.isLiveEvent
    if (payload.raw_data.batteryVoltage !== undefined)
      awsPayload.batteryVoltage = payload.raw_data.batteryVoltage
    if (Array.isArray(payload.raw_data.faultCodes)) {
      awsPayload.faultCodes = payload.raw_data.faultCodes
      if (!awsPayload.allData || awsPayload.allData.length === 0) {
        awsPayload.allData = payload.raw_data.faultCodes
      }
    }
    if (!awsPayload.deviceId && typeof payload.raw_data.deviceId === "string") {
      awsPayload.deviceId = payload.raw_data.deviceId.trim()
    }
  }

  if (payload.fault_codes && payload.fault_codes.length > 0) {
    awsPayload.faultCodes = payload.fault_codes.map((fault) => ({
      ecuId: fault.ecu_id,
      ecuIdHex: fault.ecu_id_hex,
      codes: fault.codes,
      details: fault.details,
    }))
    if (!awsPayload.allData || awsPayload.allData.length === 0) {
      awsPayload.allData = awsPayload.faultCodes
    }
  }

  return awsPayload
}

/**
 * Send batch OBD data to AWS /batch endpoint
 */
export const sendObdDataBatch = async (dataList: ObdDataPayload[]) => {
  if (dataList.length === 0) {
    return { success: false, error: "No data to send" }
  }

  // Get vehicleId from first payload's raw_data, or use a default
  const vehicleId =
    dataList[0]?.raw_data?.vehicleId ||
    dataList[0]?.raw_data?.vehicle_info?.vin ||
    "UNKNOWN_VEHICLE"

  // Convert to AWS payload format
  const awsPayloads: AwsObdPayload[] = dataList.map((payload) =>
    convertToAwsPayload(payload, vehicleId),
  )

  // Send to AWS /batch endpoint using AWS API Service's sendBatch method
  const response = await awsApiService.sendBatch(awsPayloads)

  return response
}

/**
 * Get OBD data history for a driver
 */
export const getObdDataHistory = async (
  driverId: string,
  params: { startDate: string; endDate: string },
) => {
  const queryString = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  }).toString()
  const response = await apiClient.get(`/obd/data/history/${driverId}?${queryString}`)
  return response.data
}

/**
 * Get DTC (Diagnostic Trouble Code) history
 * @param vehicleId - Vehicle identifier (VIN or vehicle unit)
 * @param params - Query parameters for filtering
 * @returns DTC history records
 */
export const getDtcHistory = async (
  vehicleId: string,
  params?: {
    startDate?: string
    endDate?: string
    code?: string
    severity?: "critical" | "warning" | "info"
  },
) => {
  const queryParams = new URLSearchParams()

  if (params?.startDate) {
    queryParams.append("startDate", params.startDate)
  }
  if (params?.endDate) {
    queryParams.append("endDate", params.endDate)
  }
  if (params?.code) {
    queryParams.append("code", params.code)
  }
  if (params?.severity) {
    queryParams.append("severity", params.severity)
  }

  const queryString = queryParams.toString()
  const url = `/obd/dtc/history/${vehicleId}${queryString ? `?${queryString}` : ""}`
  const response = await apiClient.get(url)
  return response.data
}
