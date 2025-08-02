import { supabase, ELDDeviceLog } from '../lib/supabase';
import { BLEDevice, ConnectionFailure, NotifyData } from '../utils/TTMBLEManager';

export class ELDDeviceService {
  private static sessionId = this.generateSessionId();

  private static generateSessionId(): string {
    // Generate a proper UUID v4 format for session ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
   * Log step-by-step connection process
   */
  static async logConnectionStep(
    deviceId: string,
    step: 'scan_started' | 'scan_completed' | 'device_found' | 'device_selected' | 
          'identify_device' | 'gathering_info' | 'capturing_id' | 'pairing' | 
          'connection_established' | 'authentication_started' | 'authentication_completed' |
          'data_collection_started' | 'data_collection_active' | 'data_collection_failed',
    deviceName?: string,
    stepData?: any,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: deviceId,
        device_name: deviceName,
        status: errorCode ? 'failed' : 'in_progress',
        event_type: 'connection_step',
        session_id: this.sessionId,
        error_code: errorCode,
        error_message: errorMessage,
        event_data: {
          step,
          step_data: stepData,
          timestamp: new Date().toISOString(),
          sdk_info: {
            version: '1.0.3',
            platform: 'android',
            manufacturer: 'Jimi IoT'
          }
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log connection step:', error);
      }
    } catch (error) {
      console.error('Error logging connection step:', error);
    }
  }

  /**
   * Log SDK initialization status
   */
  static async logSDKInitialization(
    success: boolean,
    errorMessage?: string,
    sdkVersion?: string
  ): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: 'SDK_INIT',
        status: success ? 'connected' : 'failed',
        event_type: 'sdk_initialization',
        session_id: this.sessionId,
        error_message: errorMessage,
        event_data: {
          initialization_success: success,
          sdk_version: sdkVersion || '1.0.3',
          timestamp: new Date().toISOString(),
          platform_info: {
            os: 'android',
            manufacturer: 'Jimi IoT',
            library: 'libble-native-lib.so'
          }
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log SDK initialization:', error);
      }
    } catch (error) {
      console.error('Error logging SDK initialization:', error);
    }
  }

  /**
   * Log permission request results
   */
  static async logPermissionRequest(
    permissionType: string,
    granted: boolean,
    deniedPermissions?: string[]
  ): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: 'PERMISSIONS',
        status: granted ? 'connected' : 'failed',
        event_type: 'permission_request',
        session_id: this.sessionId,
        event_data: {
          permission_type: permissionType,
          granted,
          denied_permissions: deniedPermissions,
          timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log permission request:', error);
      }
    } catch (error) {
      console.error('Error logging permission request:', error);
    }
  }

  /**
   * Log data collection monitoring
   */
  static async logDataCollectionStatus(
    deviceId: string,
    status: 'started' | 'active' | 'idle' | 'timeout' | 'error',
    dataCount: number = 0,
    lastDataReceived?: Date,
    errorCode?: string,
    errorDetails?: string
  ): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: deviceId,
        status: status === 'error' ? 'failed' : 'connected',
        event_type: 'data_collection_monitoring',
        session_id: this.sessionId,
        error_code: errorCode,
        error_message: errorDetails,
        event_data: {
          collection_status: status,
          data_count: dataCount,
          last_data_received: lastDataReceived?.toISOString(),
          monitoring_timestamp: new Date().toISOString(),
          timeout_duration: status === 'timeout' ? '30_seconds' : undefined,
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log data collection status:', error);
      }
    } catch (error) {
      console.error('Error logging data collection status:', error);
    }
  }

  /**
   * Send comprehensive diagnostic logs
   */
  static async sendDiagnosticLogs(diagnosticData: {
    errorType: string;
    errorMessage: string;
    deviceInfo?: any;
    logs: string[];
    stackTrace?: string;
    sdkVersion?: string;
    appVersion?: string;
  }): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: diagnosticData.deviceInfo?.id || 'DIAGNOSTIC',
        device_name: diagnosticData.deviceInfo?.name,
        device_address: diagnosticData.deviceInfo?.address,
        status: 'failed',
        event_type: 'diagnostic_report',
        session_id: this.sessionId,
        error_message: diagnosticData.errorMessage,
        event_data: {
          error_type: diagnosticData.errorType,
          device_info: diagnosticData.deviceInfo,
          application_logs: diagnosticData.logs,
          stack_trace: diagnosticData.stackTrace,
          sdk_version: diagnosticData.sdkVersion || '1.0.3',
          app_version: diagnosticData.appVersion,
          diagnostic_timestamp: new Date().toISOString(),
          system_info: {
            platform: 'android',
            sdk_manufacturer: 'Jimi IoT',
            native_library: 'libble-native-lib.so'
          }
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to send diagnostic logs:', error);
      } else {
        console.log('Diagnostic logs sent successfully');
      }
    } catch (error) {
      console.error('Error sending diagnostic logs:', error);
    }
  }

  /**
   * Log SDK method calls and responses
   */
  static async logSDKMethodCall(
    methodName: string,
    parameters?: any,
    result?: any,
    error?: any,
    duration?: number
  ): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: 'SDK_METHOD',
        status: error ? 'failed' : 'connected',
        event_type: 'sdk_method_call',
        session_id: this.sessionId,
        error_message: error?.message,
        error_code: error?.code,
        event_data: {
          method_name: methodName,
          parameters,
          result,
          error_details: error,
          execution_duration_ms: duration,
          timestamp: new Date().toISOString(),
        },
      };

      const { error: logError } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (logError) {
        console.error('Failed to log SDK method call:', logError);
      }
    } catch (logError) {
      console.error('Error logging SDK method call:', logError);
    }
  }

  /**
   * Log BLE device signal strength and connection quality
   */
  static async logConnectionQuality(
    deviceId: string,
    signalStrength?: number,
    connectionLatency?: number,
    dataRate?: number,
    connectionStability?: 'stable' | 'unstable' | 'intermittent'
  ): Promise<void> {
    try {
      const logData: ELDDeviceLog = {
        device_id: deviceId,
        status: 'connected',
        event_type: 'connection_quality',
        session_id: this.sessionId,
        event_data: {
          signal_strength_dbm: signalStrength,
          connection_latency_ms: connectionLatency,
          data_rate_bps: dataRate,
          connection_stability: connectionStability,
          quality_check_timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log connection quality:', error);
      }
    } catch (error) {
      console.error('Error logging connection quality:', error);
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
