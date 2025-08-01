import { supabase, ELDDeviceLog } from '../lib/supabase';
import { BLEDevice, ConnectionFailure, NotifyData } from '../utils/TTMBLEManager';

export class ELDDeviceService {
  private static sessionId = this.generateSessionId();

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log device connection attempt
   */
  static async logConnectionAttempt(device: BLEDevice, passcodeLength?: number): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: device.id,
        device_name: device.name,
        device_address: device.address,
        status: 'connecting',
        event_type: 'connection',
        session_id: this.sessionId,
        passcode_length: passcodeLength,
        event_data: {
          device_info: device,
          attempt_timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log connection attempt:', error);
      }
    } catch (error) {
      console.error('Error logging connection attempt:', error);
    }
  }

  /**
   * Log successful device connection
   */
  static async logConnectionSuccess(device: BLEDevice): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: device.id,
        device_name: device.name,
        device_address: device.address,
        status: 'connected',
        event_type: 'connection',
        session_id: this.sessionId,
        event_data: {
          device_info: device,
          success_timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log connection success:', error);
      }
    } catch (error) {
      console.error('Error logging connection success:', error);
    }
  }

  /**
   * Log connection failure
   */
  static async logConnectionFailure(device: BLEDevice, failure: ConnectionFailure): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: device.id,
        device_name: device.name,
        device_address: device.address,
        status: 'failed',
        event_type: 'error',
        session_id: this.sessionId,
        error_message: failure.message,
        error_code: failure.status?.toString(),
        event_data: {
          device_info: device,
          failure_details: failure,
          failure_timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log connection failure:', error);
      }
    } catch (error) {
      console.error('Error logging connection failure:', error);
    }
  }

  /**
   * Log device disconnection
   */
  static async logDisconnection(deviceId: string): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: deviceId,
        status: 'disconnected',
        event_type: 'disconnection',
        session_id: this.sessionId,
        event_data: {
          disconnection_timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log disconnection:', error);
      }
    } catch (error) {
      console.error('Error logging disconnection:', error);
    }
  }

  /**
   * Log authentication success/failure
   */
  static async logAuthentication(
    deviceId: string, 
    passed: boolean, 
    passcodeLength?: number
  ): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: deviceId,
        status: passed ? 'connected' : 'failed',
        event_type: 'authentication',
        session_id: this.sessionId,
        authentication_passed: passed,
        passcode_length: passcodeLength,
        event_data: {
          authentication_result: passed,
          timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log authentication:', error);
      }
    } catch (error) {
      console.error('Error logging authentication:', error);
    }
  }

  /**
   * Log ELD data received
   */
  static async logELDData(deviceId: string, data: NotifyData): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: deviceId,
        status: 'connected',
        event_type: 'data_received',
        session_id: this.sessionId,
        data_type: data.dataType,
        raw_data: data.rawData,
        ack_received: !!data.ack,
        ack_data: data.ack,
        error_message: data.error,
        event_data: {
          full_data: data,
          received_timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log ELD data:', error);
      }
    } catch (error) {
      console.error('Error logging ELD data:', error);
    }
  }

  /**
   * Get recent device logs for a specific device
   */
  static async getDeviceLogs(
    deviceId: string, 
    limit: number = 50
  ): Promise<ELDDeviceLog[]> {
    try {
      const { data, error } = await supabase
        .from('eld_device_logs')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch device logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching device logs:', error);
      return [];
    }
  }

  /**
   * Get all device logs for current session
   */
  static async getSessionLogs(limit: number = 100): Promise<ELDDeviceLog[]> {
    try {
      const { data, error } = await supabase
        .from('eld_device_logs')
        .select('*')
        .eq('session_id', this.sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch session logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching session logs:', error);
      return [];
    }
  }

  /**
   * Get recent device activity summary
   */
  static async getRecentDeviceActivity(hours: number = 24): Promise<any[]> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from('recent_device_activity')
        .select('*')
        .gte('created_at', since.toISOString())
        .eq('rn', 1); // Get only the most recent activity per device

      if (error) {
        console.error('Failed to fetch recent device activity:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent device activity:', error);
      return [];
    }
  }

  /**
   * Clear old logs (cleanup function)
   */
  static async clearOldLogs(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('eld_device_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to clear old logs:', error);
      }
    } catch (error) {
      console.error('Error clearing old logs:', error);
    }
  }

  /**
   * Get current session ID
   */
  static getCurrentSessionId(): string {
    return this.sessionId;
  }

  /**
   * Start new session
   */
  static startNewSession(): string {
    this.sessionId = this.generateSessionId();
    return this.sessionId;
  }
}
