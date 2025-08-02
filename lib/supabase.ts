import '../src/utils/GlobalPolyfills';
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { supabaseStorage } from '../src/utils/SupabaseStorageAdapter'

// These will be replaced with your actual Supabase project credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database types for TypeScript (auto-generated from your schema)
export type Database = {
  public: {
    Tables: {
      drivers: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          license_number: string
          license_state: string
          phone: string | null
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          license_number: string
          license_state: string
          phone?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          license_number?: string
          license_state?: string
          phone?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          vin: string
          license_plate: string
          make: string
          model: string
          year: number
          status: 'active' | 'maintenance' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vin: string
          license_plate: string
          make: string
          model: string
          year: number
          status?: 'active' | 'maintenance' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vin?: string
          license_plate?: string
          make?: string
          model?: string
          year?: number
          status?: 'active' | 'maintenance' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      eld_devices: {
        Row: {
          id: string
          device_id: string
          mac_address: string | null
          firmware_version: string | null
          vehicle_id: string | null
          status: 'active' | 'inactive' | 'maintenance'
          last_connection: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          mac_address?: string | null
          firmware_version?: string | null
          vehicle_id?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          last_connection?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          mac_address?: string | null
          firmware_version?: string | null
          vehicle_id?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          last_connection?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      device_connections: {
        Row: {
          id: string
          device_id: string
          driver_id: string | null
          connection_type: 'bluetooth' | 'wifi' | 'cellular'
          connection_status: 'connected' | 'disconnected' | 'failed' | 'timeout'
          signal_strength: number | null
          error_code: string | null
          error_message: string | null
          metadata: any | null
          timestamp: string
        }
        Insert: {
          id?: string
          device_id: string
          driver_id?: string | null
          connection_type: 'bluetooth' | 'wifi' | 'cellular'
          connection_status: 'connected' | 'disconnected' | 'failed' | 'timeout'
          signal_strength?: number | null
          error_code?: string | null
          error_message?: string | null
          metadata?: any | null
          timestamp?: string
        }
        Update: {
          id?: string
          device_id?: string
          driver_id?: string | null
          connection_type?: 'bluetooth' | 'wifi' | 'cellular'
          connection_status?: 'connected' | 'disconnected' | 'failed' | 'timeout'
          signal_strength?: number | null
          error_code?: string | null
          error_message?: string | null
          metadata?: any | null
          timestamp?: string
        }
      }
      eld_data_logs: {
        Row: {
          id: string
          device_id: string
          driver_id: string
          vehicle_id: string
          log_date: string
          duty_status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving'
          start_time: string
          end_time: string | null
          duration_minutes: number | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          odometer_start: number | null
          odometer_end: number | null
          distance_miles: number | null
          notes: string | null
          is_automatic: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          driver_id: string
          vehicle_id: string
          log_date: string
          duty_status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving'
          start_time: string
          end_time?: string | null
          duration_minutes?: number | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          odometer_start?: number | null
          odometer_end?: number | null
          distance_miles?: number | null
          notes?: string | null
          is_automatic?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          driver_id?: string
          vehicle_id?: string
          log_date?: string
          duty_status?: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving'
          start_time?: string
          end_time?: string | null
          duration_minutes?: number | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          odometer_start?: number | null
          odometer_end?: number | null
          distance_miles?: number | null
          notes?: string | null
          is_automatic?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      system_error_logs: {
        Row: {
          id: string
          device_id: string | null
          driver_id: string | null
          error_level: 'info' | 'warning' | 'error' | 'critical'
          error_code: string | null
          error_message: string
          error_details: any | null
          stack_trace: string | null
          user_agent: string | null
          ip_address: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          device_id?: string | null
          driver_id?: string | null
          error_level: 'info' | 'warning' | 'error' | 'critical'
          error_code?: string | null
          error_message: string
          error_details?: any | null
          stack_trace?: string | null
          user_agent?: string | null
          ip_address?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string | null
          driver_id?: string | null
          error_level?: 'info' | 'warning' | 'error' | 'critical'
          error_code?: string | null
          error_message?: string
          error_details?: any | null
          stack_trace?: string | null
          user_agent?: string | null
          ip_address?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
      }
      vehicle_diagnostics: {
        Row: {
          id: string
          vehicle_id: string
          device_id: string
          diagnostic_code: string
          diagnostic_message: string | null
          severity: 'low' | 'medium' | 'high' | 'critical' | null
          status: 'active' | 'resolved' | 'ignored'
          first_occurred: string
          last_occurred: string
          occurrence_count: number
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          device_id: string
          diagnostic_code: string
          diagnostic_message?: string | null
          severity?: 'low' | 'medium' | 'high' | 'critical' | null
          status?: 'active' | 'resolved' | 'ignored'
          first_occurred?: string
          last_occurred?: string
          occurrence_count?: number
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          device_id?: string
          diagnostic_code?: string
          diagnostic_message?: string | null
          severity?: 'low' | 'medium' | 'high' | 'critical' | null
          status?: 'active' | 'resolved' | 'ignored'
          first_occurred?: string
          last_occurred?: string
          occurrence_count?: number
          resolved_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
