import { supabase, ELDDeviceLog } from '../lib/supabase';
import { BLEDevice, ConnectionFailure, NotifyData } from '../utils/TTMBLEManager';

export class SupabaseLogger {
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
   * Generic log method for any type of data
   */
  static async log(
    data: {
      deviceId?: string;
      deviceName?: string;
      deviceAddress?: string;
      status?: 'connected' | 'disconnected' | 'connecting' | 'failed';
      eventType?: string; // Allow any string, will be mapped to valid enum
      dataType?: string;
      rawData?: any;
      errorMessage?: string;
      errorCode?: string;
      eventData?: any;
      sessionId?: string;
      passcodeLength?: number;
      authenticationPassed?: boolean;
      ackReceived?: boolean;
      ackData?: any;
    }
  ): Promise<void> {
    try {
      // Map event types to valid enum values
      const mapEventType = (eventType?: string): 'connection' | 'disconnection' | 'data_received' | 'error' | 'authentication' => {
        switch (eventType) {
          case 'connection_attempt':
          case 'connection':
            return 'connection';
          case 'disconnection':
            return 'disconnection';
          case 'data_received':
          case 'eld_data':
            return 'data_received';
          case 'error':
          case 'connection_error':
          case 'authentication_error':
            return 'error';
          case 'authentication':
            return 'authentication';
          default:
            return 'connection'; // Default fallback
        }
      };

      // Map status to valid enum values
      const mapStatus = (status?: string): 'connected' | 'disconnected' | 'connecting' | 'failed' => {
        switch (status) {
          case 'connected':
            return 'connected';
          case 'disconnected':
            return 'disconnected';
          case 'in_progress':
          case 'connecting':
            return 'connecting';
          case 'failed':
            return 'failed';
          default:
            return 'connecting'; // Default fallback
        }
      };

      const logData: ELDDeviceLog = {
        device_id: data.deviceId || 'SYSTEM',
        device_name: data.deviceName,
        device_address: data.deviceAddress,
        status: mapStatus(data.status),
        event_type: mapEventType(data.eventType),
        session_id: data.sessionId || this.sessionId,
        data_type: data.dataType,
        raw_data: typeof data.rawData === 'string' ? data.rawData : JSON.stringify(data.rawData),
        error_message: data.errorMessage,
        error_code: data.errorCode,
        passcode_length: data.passcodeLength,
        authentication_passed: data.authenticationPassed,
        ack_received: data.ackReceived,
        ack_data: typeof data.ackData === 'string' ? data.ackData : JSON.stringify(data.ackData),
        event_data: data.eventData,
      };

      console.log('📊 Attempting to log to Supabase:', {
        device_id: logData.device_id,
        status: logData.status,
        event_type: logData.event_type,
        data_type: logData.data_type
      });

      const { error } = await supabase
        .from('eld_device_logs')
        .insert(logData);

      if (error) {
        console.error('❌ Failed to log data to Supabase:', error);
        console.error('📊 Data that failed:', JSON.stringify(logData, null, 2));
        console.error('🔍 Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.log('📝 Fallback: Logging to console only');
      } else {
        console.log('✅ Data logged to Supabase successfully');
      }
    } catch (error) {
      console.error('❌ Error logging data:', error);
      console.log('📝 Fallback: Logging to console only');
    }
  }

  /**
   * Log connection attempt with method detection
   */
  static async logConnectionAttempt(
    device: any, 
    passcodeLength: any,
    connectionMethod: any
  ): Promise<void> {
    await this.log({
      deviceId: device?.id,
      deviceName: device?.name,
      deviceAddress: device?.address,
      status: 'connecting',
      eventType: 'connection',
      eventData: {
        passcodeLength,
        connectionMethod,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log connection success with method detection
   */
  static async logConnectionSuccess(
    device: BLEDevice,
    connectionMethod: 'ttm_sdk' | 'direct_ble' = 'ttm_sdk'
  ): Promise<void> {
    await this.log({
      deviceId: device.id,
      deviceName: device.name,
      deviceAddress: device.address,
      status: 'connected',
      eventType: 'connection',
      eventData: {
        connection_method: connectionMethod,
        success: true,
        device_info: {
          name: device.name,
          address: device.address
        },
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log connection failure
   */
  static async logConnectionFailure(device: BLEDevice, failure: ConnectionFailure): Promise<void> {
    // Always log to console for debugging
    console.log('🔴 Connection Failure Logged:', {
      device: device.name || device.id,
      error: failure.message,
      status: failure.status,
      timestamp: new Date().toISOString()
    });

    await this.log({
      deviceId: device.id,
      deviceName: device.name,
      deviceAddress: device.address,
      status: 'failed',
      eventType: 'error',
      errorMessage: failure.message,
      errorCode: failure.status?.toString() || 'unknown',
      eventData: {
        device_info: device,
        failure_details: failure,
        failure_timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Log device disconnection
   */
  static async logDisconnection(deviceId: string): Promise<void> {
    await this.log({
      deviceId,
      status: 'disconnected',
      eventType: 'disconnection',
      eventData: {
        disconnection_timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log authentication attempt and result
   */
  static async logAuthentication(
    deviceId: string, 
    passed: boolean, 
    passcodeLength?: number
  ): Promise<void> {
    await this.log({
      deviceId,
      status: passed ? 'connected' : 'failed',
      eventType: 'authentication',
      passcodeLength,
      authenticationPassed: passed,
      eventData: {
        authentication_passed: passed,
        passcode_length: passcodeLength,
        authentication_timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log ELD data received from device
   */
  static async logELDData(deviceId: string, data: NotifyData): Promise<void> {
    // Always log to console for debugging
    console.log('📊 ELD Data Logged:', {
      deviceId,
      dataType: data.dataType,
      rawDataLength: data.rawData?.length || 0,
      ack: data.ack,
      error: data.error,
      timestamp: new Date().toISOString()
    });

    await this.log({
      deviceId,
      status: 'connected',
      eventType: 'data_received',
      dataType: data.dataType || 'unknown',
      rawData: data.rawData || data.toString(),
      ackReceived: !!data.ack,
      ackData: data.ack?.toString(),
      eventData: {
        data_type: data.dataType,
        raw_data_length: data.rawData?.length || 0,
        has_ack: !!data.ack,
        has_error: !!data.error,
        raw_data_preview: data.rawData?.substring(0, 100) || 'No raw data',
        data_analysis: {
          data_type: data.dataType,
          raw_data_length: data.rawData?.length || 0,
          has_ack: !!data.ack,
          has_error: !!data.error,
          raw_data_preview: data.rawData?.substring(0, 100) || 'No raw data'
        }
      }
    });
  }

  /**
   * Log a generic event
   */
  static async logEvent(
    eventType: string,
    data: {
      deviceId?: string;
      deviceName?: string;
      deviceAddress?: string;
      status?: 'connected' | 'disconnected' | 'connecting' | 'failed';
      dataType?: string;
      rawData?: any;
      errorMessage?: string;
      errorCode?: string;
      eventData?: any;
    }
  ): Promise<void> {
    await this.log({
      ...data,
      eventType,
    });
  }

  /**
   * Log system events
   */
  static async logSystemEvent(
    eventType: string,
    eventData?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      deviceId: 'SYSTEM',
      status: errorMessage ? 'failed' : 'connected',
      eventType,
      errorMessage,
      eventData: {
        ...eventData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log SDK events
   */
  static async logSDKEvent(
    eventType: string,
    deviceId?: string,
    eventData?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      deviceId: deviceId || 'SDK',
      status: errorMessage ? 'failed' : 'connected',
      eventType,
      errorMessage,
      eventData: {
        ...eventData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log user actions
   */
  static async logUserAction(
    action: string,
    deviceId?: string,
    actionData?: any
  ): Promise<void> {
    await this.log({
      deviceId: deviceId || 'USER',
      status: 'connected',
      eventType: 'user_action',
      eventData: {
        action,
        action_data: actionData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log performance metrics
   */
  static async logPerformance(
    metric: string,
    value: number,
    unit?: string,
    deviceId?: string,
    additionalData?: any
  ): Promise<void> {
    await this.log({
      deviceId: deviceId || 'PERFORMANCE',
      status: 'connected',
      eventType: 'performance_metric',
      eventData: {
        metric,
        value,
        unit,
        additional_data: additionalData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log error with full context
   */
  static async logError(
    error: Error | string,
    context: {
      deviceId?: string;
      deviceName?: string;
      deviceAddress?: string;
      eventType?: string;
      additionalData?: any;
    } = {}
  ): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    await this.log({
      deviceId: context.deviceId || 'ERROR',
      deviceName: context.deviceName,
      deviceAddress: context.deviceAddress,
      status: 'failed',
      eventType: context.eventType || 'error',
      errorMessage,
      eventData: {
        error_message: errorMessage,
        error_stack: errorStack,
        additional_data: context.additionalData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log connection error with detailed error information
   */
  static async logConnectionError(
    device: BLEDevice, 
    errorDetails: {
      errorType: string;
      errorCode: string;
      ttmSdkMessage: string;
      message: string;
      reason: string;
      timeoutDuration?: number;
    }
  ): Promise<void> {
    // Always log to console for debugging
    console.log('🔴 Connection Error Logged:', {
      device: device.name || device.id,
      errorType: errorDetails.errorType,
      errorCode: errorDetails.errorCode,
      ttmSdkMessage: errorDetails.ttmSdkMessage,
      message: errorDetails.message,
      reason: errorDetails.reason,
      timestamp: new Date().toISOString()
    });

    await this.log({
      deviceId: device.id,
      deviceName: device.name,
      deviceAddress: device.address,
      status: 'failed',
      eventType: 'error',
      errorMessage: errorDetails.message,
      errorCode: errorDetails.errorCode,
      eventData: {
        errorType: errorDetails.errorType,
        errorCode: errorDetails.errorCode,
        ttmSdkMessage: errorDetails.ttmSdkMessage,
        message: errorDetails.message,
        reason: errorDetails.reason,
        timeoutDuration: errorDetails.timeoutDuration,
        device_info: device,
        error_timestamp: new Date().toISOString(),
      }
    });
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
    await this.log({
      deviceId,
      deviceName,
      status: errorCode ? 'failed' : 'connecting',
      eventType: 'connection_step',
      errorCode,
      errorMessage,
      eventData: {
        step,
        step_data: stepData,
        timestamp: new Date().toISOString(),
        sdk_info: {
          version: '1.0.3',
          platform: 'android',
          manufacturer: 'Jimi IoT'
        }
      }
    });
  }

  /**
   * Log SDK initialization status
   */
  static async logSDKInitialization(
    success: boolean,
    errorMessage?: string,
    sdkVersion?: string
  ): Promise<void> {
    await this.log({
      deviceId: 'SDK_INIT',
      status: success ? 'connected' : 'failed',
      eventType: 'sdk_initialization',
      errorMessage,
      eventData: {
        initialization_success: success,
        sdk_version: sdkVersion || '1.0.3',
        timestamp: new Date().toISOString(),
        platform_info: {
          os: 'android',
          manufacturer: 'Jimi IoT',
          library: 'libble-native-lib.so'
        }
      }
    });
  }

  /**
   * Log permission request results
   */
  static async logPermissionRequest(
    permissionType: string,
    granted: boolean,
    deniedPermissions?: string[]
  ): Promise<void> {
    await this.log({
      deviceId: 'PERMISSIONS',
      status: granted ? 'connected' : 'failed',
      eventType: 'permission_request',
      eventData: {
        permission_type: permissionType,
        granted,
        denied_permissions: deniedPermissions,
        timestamp: new Date().toISOString(),
      }
    });
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
    await this.log({
      deviceId,
      status: status === 'error' ? 'failed' : 'connected',
      eventType: 'data_collection',
      errorCode,
      errorMessage: errorDetails,
      eventData: {
        collection_status: status,
        data_count: dataCount,
        last_data_received: lastDataReceived?.toISOString(),
        monitoring_timestamp: new Date().toISOString(),
        timeout_duration: status === 'timeout' ? '30_seconds' : undefined,
      }
    });
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
    await this.log({
      deviceId: diagnosticData.deviceInfo?.id || 'DIAGNOSTIC',
      deviceName: diagnosticData.deviceInfo?.name,
      deviceAddress: diagnosticData.deviceInfo?.address,
      status: 'failed',
      eventType: 'diagnostic_report',
      errorMessage: diagnosticData.errorMessage,
      eventData: {
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
      }
    });
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
    await this.log({
      deviceId: 'SDK_METHOD',
      status: error ? 'failed' : 'connected',
      eventType: 'sdk_method_call',
      errorMessage: error?.message,
      errorCode: error?.code,
      eventData: {
        method_name: methodName,
        parameters,
        result,
        error_details: error,
        execution_duration_ms: duration,
        timestamp: new Date().toISOString(),
      }
    });
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
    await this.log({
      deviceId,
      status: 'connected',
      eventType: 'connection_quality',
      eventData: {
        signal_strength_dbm: signalStrength,
        connection_latency_ms: connectionLatency,
        data_rate_bps: dataRate,
        connection_stability: connectionStability,
        quality_check_timestamp: new Date().toISOString(),
      }
    });
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
