-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users/drivers table
CREATE TABLE drivers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_state VARCHAR(2) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vin VARCHAR(17) UNIQUE NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ELD devices table
CREATE TABLE eld_devices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    mac_address VARCHAR(17) UNIQUE,
    firmware_version VARCHAR(20),
    vehicle_id UUID REFERENCES vehicles(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_connection TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create device connections log table
CREATE TABLE device_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES eld_devices(id) NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('bluetooth', 'wifi', 'cellular')),
    connection_status VARCHAR(20) NOT NULL CHECK (connection_status IN ('connected', 'disconnected', 'failed', 'timeout')),
    signal_strength INTEGER CHECK (signal_strength BETWEEN -100 AND 0),
    error_code VARCHAR(10),
    error_message TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ELD data logs table (for driving records)
CREATE TABLE eld_data_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES eld_devices(id) NOT NULL,
    driver_id UUID REFERENCES drivers(id) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
    log_date DATE NOT NULL,
    duty_status VARCHAR(20) NOT NULL CHECK (duty_status IN ('off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name VARCHAR(255),
    odometer_start INTEGER,
    odometer_end INTEGER,
    distance_miles DECIMAL(10, 2),
    notes TEXT,
    is_automatic BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system error logs table
CREATE TABLE system_error_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID REFERENCES eld_devices(id),
    driver_id UUID REFERENCES drivers(id),
    error_level VARCHAR(20) NOT NULL CHECK (error_level IN ('info', 'warning', 'error', 'critical')),
    error_code VARCHAR(20),
    error_message TEXT NOT NULL,
    error_details JSONB,
    stack_trace TEXT,
    user_agent TEXT,
    ip_address INET,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES drivers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicle diagnostics table
CREATE TABLE vehicle_diagnostics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
    device_id UUID REFERENCES eld_devices(id) NOT NULL,
    diagnostic_code VARCHAR(10) NOT NULL,
    diagnostic_message TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    first_occurred TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_occurred TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_device_connections_device_id ON device_connections(device_id);
CREATE INDEX idx_device_connections_timestamp ON device_connections(timestamp);
CREATE INDEX idx_eld_data_logs_device_id ON eld_data_logs(device_id);
CREATE INDEX idx_eld_data_logs_driver_id ON eld_data_logs(driver_id);
CREATE INDEX idx_eld_data_logs_log_date ON eld_data_logs(log_date);
CREATE INDEX idx_system_error_logs_device_id ON system_error_logs(device_id);
CREATE INDEX idx_system_error_logs_created_at ON system_error_logs(created_at);
CREATE INDEX idx_system_error_logs_error_level ON system_error_logs(error_level);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eld_devices_updated_at BEFORE UPDATE ON eld_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eld_data_logs_updated_at BEFORE UPDATE ON eld_data_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE eld_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE eld_data_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_diagnostics ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (you can customize these based on your needs)
CREATE POLICY "Users can view their own driver record" ON drivers
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own driver record" ON drivers
    FOR UPDATE USING (auth.uid()::text = id::text);

-- For now, allow all authenticated users to access ELD data
-- You should customize these policies based on your business logic
CREATE POLICY "Authenticated users can access device connections" ON device_connections
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access ELD data logs" ON eld_data_logs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access error logs" ON system_error_logs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access vehicle diagnostics" ON vehicle_diagnostics
    FOR ALL USING (auth.role() = 'authenticated');
