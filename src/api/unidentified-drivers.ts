/**
 * Unidentified Driver API
 *
 * API for handling unidentified driver records and reassignment
 */

import { apiClient } from "./client"
import { API_ENDPOINTS } from "./constants"

export interface UnidentifiedDriverRecord {
  id: string
  timestamp: string
  event_type: string
  latitude?: number
  longitude?: number
  vehicle_id?: string
  missing_fields: string[]
  raw_data: any
}

export interface GetUnidentifiedRecordsResponse {
  records: UnidentifiedDriverRecord[]
  total: number
}

export interface ReassignRecordsRequest {
  record_ids: string[]
  driver_id: string
  annotation: string
  missing_data?: {
    [recordId: string]: {
      [field: string]: any
    }
  }
}

export interface ReassignRecordsResponse {
  success: boolean
  message: string
  reassigned_count: number
  new_event_ids: string[]
}

/**
 * Get unidentified driver records
 */
export async function getUnidentifiedRecords(
  startDate?: Date,
  endDate?: Date,
): Promise<GetUnidentifiedRecordsResponse> {
  const params: any = {}
  if (startDate) {
    params.start_date = startDate.toISOString()
  }
  if (endDate) {
    params.end_date = endDate.toISOString()
  }

  const response = await apiClient.get<GetUnidentifiedRecordsResponse>(
    API_ENDPOINTS.UNIDENTIFIED_DRIVERS || "/api/hos/unidentified-drivers",
    { params },
  )
  return response.data
}

/**
 * Reassign unidentified driver records to a driver
 */
export async function reassignUnidentifiedRecords(
  request: ReassignRecordsRequest,
): Promise<ReassignRecordsResponse> {
  const response = await apiClient.post<ReassignRecordsResponse>(
    API_ENDPOINTS.UNIDENTIFIED_DRIVERS_REASSIGN || "/api/hos/unidentified-drivers/reassign",
    request,
  )
  return response.data
}
