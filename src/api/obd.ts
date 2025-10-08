import { apiClient } from './client'

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
 * Send batch OBD data to the API
 */
export const sendObdDataBatch = async (dataList: ObdDataPayload[]) => {
  const response = await apiClient.post('/obd/data/batch', { data: dataList })
  return response.data
}

/**
 * Get OBD data history for a driver
 */
export const getObdDataHistory = async (driverId: string, params: { startDate: string; endDate: string }) => {
  const response = await apiClient.get(`/obd/data/history/${driverId}`, { params })
  return response.data
}

