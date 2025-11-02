import { apiClient } from './client'
import { awsApiService, AwsObdPayload } from '@/services/AwsApiService'
import { awsConfig } from '@/config/aws-config'

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
}

/**
 * Send OBD data to the API
 */
export const sendObdData = async (data: ObdDataPayload) => {
  const response = await apiClient.post('/obd/data', data)
  return response.data
}

/**
 * Convert ObdDataPayload to AwsObdPayload format
 */
const convertToAwsPayload = (payload: ObdDataPayload, vehicleId: string): AwsObdPayload => {
  // Extract vehicleId from raw_data if available, otherwise use provided vehicleId
  const vin = payload.raw_data?.vehicleId || vehicleId || 'UNKNOWN_VEHICLE'
  
  // Parse timestamp
  const timestamp = payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now()
  
  // Extract allData from raw_data if available
  const allData = payload.raw_data?.allData || []
  
  // Build AWS payload
  const awsPayload: AwsObdPayload = {
    vehicleId: vin,
    driverId: payload.driver_id,
    timestamp: timestamp,
    dataType: 'engine_data',
    latitude: payload.latitude,
    longitude: payload.longitude,
    vehicleSpeed: payload.vehicle_speed,
    engineSpeed: payload.engine_speed,
    coolantTemp: payload.coolant_temp,
    fuelLevel: payload.fuel_level,
    odometer: payload.odometer,
    allData: allData,
  }
  
  // Copy additional fields from raw_data if available
  if (payload.raw_data) {
    if (payload.raw_data.gpsSpeed !== undefined) awsPayload.gpsSpeed = payload.raw_data.gpsSpeed
    if (payload.raw_data.gpsTime) awsPayload.gpsTime = payload.raw_data.gpsTime
    if (payload.raw_data.gpsRotation !== undefined) awsPayload.gpsRotation = payload.raw_data.gpsRotation
    if (payload.raw_data.eventTime) awsPayload.eventTime = payload.raw_data.eventTime
    if (payload.raw_data.eventType !== undefined) awsPayload.eventType = payload.raw_data.eventType
    if (payload.raw_data.eventId !== undefined) awsPayload.eventId = payload.raw_data.eventId
    if (payload.raw_data.isLiveEvent !== undefined) awsPayload.isLiveEvent = payload.raw_data.isLiveEvent
    if (payload.raw_data.batteryVoltage !== undefined) awsPayload.batteryVoltage = payload.raw_data.batteryVoltage
  }
  
  return awsPayload
}

/**
 * Send batch OBD data to AWS /batch endpoint
 */
export const sendObdDataBatch = async (dataList: ObdDataPayload[]) => {
  if (dataList.length === 0) {
    return { success: false, error: 'No data to send' }
  }

  // Get vehicleId from first payload's raw_data, or use a default
  const vehicleId = dataList[0]?.raw_data?.vehicleId || dataList[0]?.raw_data?.vehicle_info?.vin || 'UNKNOWN_VEHICLE'
  
  // Convert to AWS payload format
  const awsPayloads: AwsObdPayload[] = dataList.map(payload => convertToAwsPayload(payload, vehicleId))
  
  // Send to AWS /batch endpoint using AWS API Service's sendBatch method
  const response = await awsApiService.sendBatch(awsPayloads)
  
  return response
}

/**
 * Get OBD data history for a driver
 */
export const getObdDataHistory = async (driverId: string, params: { startDate: string; endDate: string }) => {
  const queryString = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  }).toString()
  const response = await apiClient.get(`/obd/data/history/${driverId}?${queryString}`)
  return response.data
}

