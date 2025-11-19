/**
 * ELD Driver Notes API
 * 
 * API for attaching driver notes to ELD records
 * Preserves original timestamp and adds note timestamp
 */

import { apiClient } from './client'
import { API_ENDPOINTS } from './constants'

export interface DriverNote {
  id: string
  record_id: string
  driver_id: string
  note: string
  original_timestamp: string // Original record timestamp
  note_timestamp: string // When note was added
  location?: {
    latitude: number
    longitude: number
  }
  created_at: string
}

export interface CreateDriverNoteRequest {
  record_id: string
  note: string
  original_timestamp: string
  location?: {
    latitude: number
    longitude: number
  }
}

export interface CreateDriverNoteResponse {
  success: boolean
  message: string
  note: DriverNote
}

export interface GetRecordNotesResponse {
  notes: DriverNote[]
}

/**
 * Create a driver note for an ELD record
 */
export async function createDriverNote(
  request: CreateDriverNoteRequest
): Promise<CreateDriverNoteResponse> {
  const response = await apiClient.post<CreateDriverNoteResponse>(
    API_ENDPOINTS.ELD_NOTES || '/eld/notes',
    request
  )
  return response.data
}

/**
 * Get all notes for a specific record
 */
export async function getRecordNotes(recordId: string): Promise<GetRecordNotesResponse> {
  const response = await apiClient.get<GetRecordNotesResponse>(
    `${API_ENDPOINTS.ELD_NOTES || '/eld/notes'}/${recordId}`
  )
  return response.data
}

/**
 * Get all notes for a driver
 */
export async function getDriverNotes(driverId: string): Promise<GetRecordNotesResponse> {
  const response = await apiClient.get<GetRecordNotesResponse>(
    `${API_ENDPOINTS.ELD_NOTES || '/eld/notes'}/driver/${driverId}`
  )
  return response.data
}

/**
 * Delete a driver note
 */
export async function deleteDriverNote(noteId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `${API_ENDPOINTS.ELD_NOTES || '/eld/notes'}/${noteId}`
  )
  return response.data
}

