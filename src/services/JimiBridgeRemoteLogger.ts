import { supabase } from '../lib/supabase';

export interface JimiBridgeLog {
  id?: string;
  event_type: string;
  timestamp: number;
  module: string;
  platform: string;
  device_id?: string;
  device_name?: string;
  device_address?: string;
  protocol?: string;
  platform_id?: number;
  detection_method?: string;
  scan_record?: string;
  service_uuids?: string;
  manufacturer_data?: string;
  device_class?: string;
  device_type?: string;
  error?: string;
  error_code?: string;
  error_stack?: string;
  success: boolean;
  duration_ms?: number;
  data_size?: number;
  connection_state?: string;
  scan_result?: string;
  gatt_status?: string;
  characteristic_uuid?: string;
  raw_data?: string;
  parsed_data?: string;
  metadata?: any;
  created_at?: string;
}

class JimiBridgeRemoteLogger {
  private static instance: JimiBridgeRemoteLogger;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): JimiBridgeRemoteLogger {
    if (!JimiBridgeRemoteLogger.instance) {
      JimiBridgeRemoteLogger.instance = new JimiBridgeRemoteLogger();
    }
    return JimiBridgeRemoteLogger.instance;
  }

  /**
   * Initialize the remote logger
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📊 Initializing JimiBridge Remote Logger...');
      
      // Test connection to Supabase
      const { data, error } = await supabase
        .from('jimi_bridge_logs')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ JimiBridge Remote Logger initialization failed:', error);
        throw error;
      }

      this.isInitialized = true;
      console.log('✅ JimiBridge Remote Logger initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize JimiBridge Remote Logger:', error);
      throw error;
    }
  }

  /**
   * Log an event from the native module
   */
  async logEvent(logData: JimiBridgeLog): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('📊 JimiBridge Remote Log:', {
        event_type: logData.event_type,
        device_id: logData.device_id,
        success: logData.success,
        error: logData.error
      });

      const { data, error } = await supabase
        .from('jimi_bridge_logs')
        .insert([logData])
        .select();

      if (error) {
        console.error('❌ Failed to log to Supabase:', error);
        throw error;
      }

      console.log('✅ JimiBridge Remote Log saved successfully');
    } catch (error: any) {
      console.error('❌ JimiBridge Remote Logger error:', error);
      // Don't throw - we don't want logging failures to break the app
    }
  }

  /**
   * Get recent logs for a specific device
   */
  async getDeviceLogs(deviceId: string, limit: number = 50): Promise<JimiBridgeLog[]> {
    try {
      const { data, error } = await supabase
        .from('jimi_bridge_logs')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get device logs:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting device logs:', error);
      return [];
    }
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(limit: number = 20): Promise<JimiBridgeLog[]> {
    try {
      const { data, error } = await supabase
        .from('jimi_bridge_recent_errors')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get recent errors:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting recent errors:', error);
      return [];
    }
  }

  /**
   * Get device statistics
   */
  async getDeviceStats(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('jimi_bridge_device_stats')
        .select('*')
        .order('last_event_timestamp', { ascending: false });

      if (error) {
        console.error('❌ Failed to get device stats:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting device stats:', error);
      return [];
    }
  }

  /**
   * Get logs by event type
   */
  async getLogsByEventType(eventType: string, limit: number = 50): Promise<JimiBridgeLog[]> {
    try {
      const { data, error } = await supabase
        .from('jimi_bridge_logs')
        .select('*')
        .eq('event_type', eventType)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get logs by event type:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting logs by event type:', error);
      return [];
    }
  }

  /**
   * Get logs by protocol
   */
  async getLogsByProtocol(protocol: string, limit: number = 50): Promise<JimiBridgeLog[]> {
    try {
      const { data, error } = await supabase
        .from('jimi_bridge_logs')
        .select('*')
        .eq('protocol', protocol)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get logs by protocol:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting logs by protocol:', error);
      return [];
    }
  }

  /**
   * Get logs by success status
   */
  async getLogsBySuccess(success: boolean, limit: number = 50): Promise<JimiBridgeLog[]> {
    try {
      const { data, error } = await supabase
        .from('jimi_bridge_logs')
        .select('*')
        .eq('success', success)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get logs by success status:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting logs by success status:', error);
      return [];
    }
  }

  /**
   * Get logs within a time range
   */
  async getLogsByTimeRange(startTime: number, endTime: number, limit: number = 100): Promise<JimiBridgeLog[]> {
    try {
      const { data, error } = await supabase
        .from('jimi_bridge_logs')
        .select('*')
        .gte('timestamp', startTime)
        .lte('timestamp', endTime)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get logs by time range:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting logs by time range:', error);
      return [];
    }
  }

  /**
   * Clear old logs (for testing)
   */
  async clearOldLogs(daysOld: number = 7): Promise<void> {
    try {
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('jimi_bridge_logs')
        .delete()
        .lt('timestamp', cutoffTime);

      if (error) {
        console.error('❌ Failed to clear old logs:', error);
        throw error;
      }

      console.log(`✅ Cleared logs older than ${daysOld} days`);
    } catch (error: any) {
      console.error('❌ Error clearing old logs:', error);
    }
  }
}

export const jimiBridgeRemoteLogger = JimiBridgeRemoteLogger.getInstance();
export default jimiBridgeRemoteLogger; 