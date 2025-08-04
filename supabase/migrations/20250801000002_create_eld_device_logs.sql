-- Create enum types for better data consistency
CREATE TYPE device_status AS ENUM ('connected', 'disconnected', 'connecting', 'failed');
CREATE TYPE event_type AS ENUM ('connection', 'disconnection', 'data_received', 'error', 'authentication');

-- ELD Device Tracking Table
CREATE TABLE eld_device_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Device Information
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_address VARCHAR(255),
    
    -- Connection Information
    status device_status NOT NULL DEFAULT 'disconnected',
    connection_attempt_id UUID DEFAULT uuid_generate_v4(),
    
    -- Event Information
    event_type event_type NOT NULL,
    event_data JSONB,
    raw_data TEXT,
    
    -- Error Information
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Authentication Information
    passcode_length INTEGER,
    authentication_passed BOOLEAN DEFAULT FALSE,
    
    -- ELD Data Information
    data_type VARCHAR(100),
    ack_received BOOLEAN DEFAULT FALSE,
    ack_data TEXT,
    
    -- Location and Context
    user_id UUID, -- For multi-user support
    session_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_eld_device_logs_device_id ON eld_device_logs(device_id);
CREATE INDEX idx_eld_device_logs_status ON eld_device_logs(status);
CREATE INDEX idx_eld_device_logs_event_type ON eld_device_logs(event_type);
CREATE INDEX idx_eld_device_logs_created_at ON eld_device_logs(created_at);
CREATE INDEX idx_eld_device_logs_user_id ON eld_device_logs(user_id);
CREATE INDEX idx_eld_device_logs_session_id ON eld_device_logs(session_id);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_eld_device_logs_updated_at 
    BEFORE UPDATE ON eld_device_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for recent device activity
CREATE VIEW recent_device_activity AS
SELECT 
    device_id,
    device_name,
    status,
    event_type,
    error_message,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY created_at DESC) as rn
FROM eld_device_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Create RLS (Row Level Security) policies if needed
ALTER TABLE eld_device_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own logs (if using user_id)
CREATE POLICY "Users can view their own device logs" ON eld_device_logs
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own device logs" ON eld_device_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL); 