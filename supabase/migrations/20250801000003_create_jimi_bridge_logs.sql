-- Create jimi_bridge_logs table for remote logging from JimiBridgeModule.kt
CREATE TABLE IF NOT EXISTS jimi_bridge_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    module TEXT NOT NULL DEFAULT 'JimiBridgeModule',
    platform TEXT NOT NULL DEFAULT 'android',
    device_id TEXT,
    device_name TEXT,
    device_address TEXT,
    protocol TEXT,
    platform_id INTEGER,
    detection_method TEXT,
    scan_record TEXT,
    service_uuids TEXT,
    manufacturer_data TEXT,
    device_class TEXT,
    device_type TEXT,
    error TEXT,
    error_code TEXT,
    error_stack TEXT,
    success BOOLEAN DEFAULT false,
    duration_ms BIGINT,
    data_size INTEGER,
    connection_state TEXT,
    scan_result TEXT,
    gatt_status TEXT,
    characteristic_uuid TEXT,
    raw_data TEXT,
    parsed_data TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jimi_bridge_logs_event_type ON jimi_bridge_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_jimi_bridge_logs_device_id ON jimi_bridge_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_jimi_bridge_logs_timestamp ON jimi_bridge_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_jimi_bridge_logs_success ON jimi_bridge_logs(success);
CREATE INDEX IF NOT EXISTS idx_jimi_bridge_logs_protocol ON jimi_bridge_logs(protocol);
CREATE INDEX IF NOT EXISTS idx_jimi_bridge_logs_error_code ON jimi_bridge_logs(error_code);

-- Create a function to clean up old logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_jimi_bridge_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM jimi_bridge_logs 
    WHERE timestamp < EXTRACT(EPOCH FROM (NOW() - INTERVAL '30 days')) * 1000;
END;
$$ LANGUAGE plpgsql;

-- Create a view for recent errors
CREATE OR REPLACE VIEW jimi_bridge_recent_errors AS
SELECT 
    id,
    event_type,
    timestamp,
    device_id,
    device_name,
    error,
    error_code,
    success,
    created_at
FROM jimi_bridge_logs 
WHERE success = false 
ORDER BY timestamp DESC;

-- Create a view for device connection statistics
CREATE OR REPLACE VIEW jimi_bridge_device_stats AS
SELECT 
    device_id,
    device_name,
    protocol,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE success = true) as successful_events,
    COUNT(*) FILTER (WHERE success = false) as failed_events,
    MAX(timestamp) as last_event_timestamp,
    MIN(timestamp) as first_event_timestamp
FROM jimi_bridge_logs 
GROUP BY device_id, device_name, protocol
ORDER BY last_event_timestamp DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON jimi_bridge_logs TO authenticated;
GRANT SELECT ON jimi_bridge_recent_errors TO authenticated;
GRANT SELECT ON jimi_bridge_device_stats TO authenticated;

-- Insert a dummy record for testing
INSERT INTO jimi_bridge_logs (
    event_type,
    timestamp,
    module,
    platform,
    device_id,
    device_name,
    device_address,
    protocol,
    platform_id,
    detection_method,
    scan_record,
    service_uuids,
    manufacturer_data,
    device_class,
    device_type,
    error,
    error_code,
    error_stack,
    success,
    duration_ms,
    data_size,
    connection_state,
    scan_result,
    gatt_status,
    characteristic_uuid,
    raw_data,
    parsed_data,
    metadata
) VALUES (
    'test_event',
    EXTRACT(EPOCH FROM NOW()) * 1000,
    'JimiBridgeModule',
    'android',
    '43:15:81:test:device:01',
    'KD032-431581-TEST',
    '43:15:81:test:device:01',
    'ELD_DEVICE',
    108,
    'name_pattern',
    '[1, 2, 3, 4, 5]',
    'FFE0,181',
    '[0x00, 0x75]',
    'COMPUTER',
    '181',
    '',
    '',
    '',
    true,
    150,
    64,
    'connected',
    'SUCCESS',
    '0',
    '0000FFE0-0000-1000-8000-00805F9B34FB',
    '[0x01, 0x02, 0x03, 0x04]',
    '{"rpm": 2500, "speed": 65, "temp": 23.5}',
    '{"test": true, "dummy": true, "timestamp": "2025-08-05T08:55:00Z"}'
); 