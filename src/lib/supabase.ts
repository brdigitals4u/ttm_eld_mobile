import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual Supabase URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client with AsyncStorage for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database type definitions
export interface ELDDeviceLog {
  id?: string;
  device_id: string;
  device_name?: string;
  device_address?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'failed';
  connection_attempt_id?: string;
  event_type: 'connection' | 'disconnection' | 'data_received' | 'error' | 'authentication';
  event_data?: any;
  raw_data?: string;
  error_message?: string;
  error_code?: string;
  passcode_length?: number;
  authentication_passed?: boolean;
  data_type?: string;
  ack_received?: boolean;
  ack_data?: string;
  user_id?: string;
  session_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default supabase;
