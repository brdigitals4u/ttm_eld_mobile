// Debug Data Parsing Script
// This script helps analyze the data parsing issues in your ELD application

const debugDataParsing = {
    // Test different data formats
    testDataFormats() {
        console.log('🧪 Testing Data Format Detection...');
        
        // Test JSON data
        const jsonData = Buffer.from(JSON.stringify({
            vin: "SALYK2EX2LA257358",
            can_data: {
                engine_rpm: 2200,
                speed: 65.0,
                engine_temp: 85.0
            },
            gps_data: {
                latitude: 40.7128,
                longitude: -74.0060
            }
        }));
        
        // Test OBD-II data (RPM response)
        const obdData = Buffer.from([0x41, 0x0C, 0x08, 0x98]); // RPM = 2200
        
        // Test J1939 data (Engine Speed PGN)
        const j1939Data = Buffer.from([0x0C, 0xF0, 0x04, 0x00, 0x08, 0x98, 0x00, 0x00]);
        
        // Test binary sensor data
        const binaryData = Buffer.from([0x55]); // Temperature = 85°C
        
        console.log('📄 JSON Data:', jsonData.toString('hex'));
        console.log('🚗 OBD-II Data:', obdData.toString('hex'));
        console.log('🚛 J1939 Data:', j1939Data.toString('hex'));
        console.log('🔢 Binary Data:', binaryData.toString('hex'));
        
        return {
            json: jsonData,
            obd: obdData,
            j1939: j1939Data,
            binary: binaryData
        };
    },
    
    // Simulate data reception
    simulateDataReception(data, format) {
        console.log(`📡 Simulating ${format} data reception...`);
        console.log(`📊 Data size: ${data.length} bytes`);
        console.log(`🔢 Hex: ${data.toString('hex')}`);
        console.log(`📋 ASCII: ${data.toString('ascii')}`);
        
        // Try to parse as JSON
        try {
            const jsonString = data.toString('utf8');
            if (jsonString.trim().startsWith('{') || jsonString.trim().startsWith('[')) {
                const jsonObj = JSON.parse(jsonString);
                console.log('✅ Valid JSON detected!');
                console.log('📋 Keys:', Object.keys(jsonObj));
                return { type: 'JSON', data: jsonObj };
            }
        } catch (e) {
            console.log('❌ Not valid JSON');
        }
        
        // Try to parse as OBD-II
        if (data.length >= 2 && data[0] === 0x41) {
            const pid = data[1];
            console.log(`🚗 OBD-II response detected! PID: 0x${pid.toString(16).padStart(2, '0')}`);
            
            const obdData = this.parseOBDData(data);
            return { type: 'OBD-II', data: obdData };
        }
        
        // Try to parse as J1939
        if (data.length >= 3 && (data[0] === 0x0C || data[0] === 0x0D)) {
            console.log('🚛 J1939 message detected!');
            const j1939Data = this.parseJ1939Data(data);
            return { type: 'J1939', data: j1939Data };
        }
        
        // Try to parse as binary sensor
        if (data.length <= 8) {
            console.log('🔢 Binary sensor data detected!');
            const sensorData = this.parseBinarySensorData(data);
            return { type: 'BINARY', data: sensorData };
        }
        
        console.log('❓ Unknown data format');
        return { type: 'UNKNOWN', data: data.toString('hex') };
    },
    
    // Parse OBD-II data
    parseOBDData(data) {
        const pid = data[1];
        const result = { pid: `0x${pid.toString(16).padStart(2, '0')}` };
        
        switch (pid) {
            case 0x0C: // Engine RPM
                if (data.length >= 4) {
                    const rpm = (data[2] << 8) | data[3];
                    result.rpm = rpm / 4.0;
                    console.log(`🚗 Engine RPM: ${result.rpm}`);
                }
                break;
            case 0x0D: // Vehicle Speed
                if (data.length >= 3) {
                    result.speed = data[2];
                    console.log(`🚗 Vehicle Speed: ${result.speed} km/h`);
                }
                break;
            case 0x05: // Engine Coolant Temperature
                if (data.length >= 3) {
                    result.temperature = data[2] - 40;
                    console.log(`🚗 Engine Temperature: ${result.temperature}°C`);
                }
                break;
            default:
                console.log(`🚗 Unknown PID: 0x${pid.toString(16).padStart(2, '0')}`);
        }
        
        return result;
    },
    
    // Parse J1939 data
    parseJ1939Data(data) {
        const result = {};
        
        if (data.length >= 8) {
            // PGN 0x0CF00400 - Engine Speed (RPM)
            if (data[0] === 0x0C && data[1] === 0xF0 && data[2] === 0x04 && data[3] === 0x00) {
                const rpm = (data[4] << 8) | data[5];
                result.engineRPM = rpm / 4.0;
                console.log(`🚛 Engine RPM: ${result.engineRPM}`);
            }
            
            // PGN 0x0CF00401 - Vehicle Speed (km/h)
            if (data[0] === 0x0C && data[1] === 0xF0 && data[2] === 0x04 && data[3] === 0x01) {
                const speed = (data[4] << 8) | data[5];
                result.vehicleSpeed = speed / 100.0;
                console.log(`🚛 Vehicle Speed: ${result.vehicleSpeed} km/h`);
            }
        }
        
        return result;
    },
    
    // Parse binary sensor data
    parseBinarySensorData(data) {
        const result = {};
        
        switch (data.length) {
            case 1:
                result.value = data[0];
                result.type = 'single_byte';
                console.log(`📊 Single byte sensor value: ${result.value}`);
                break;
            case 2:
                result.value = (data[0] << 8) | data[1];
                result.type = 'two_byte';
                console.log(`📊 Two byte sensor value: ${result.value}`);
                break;
            case 4:
                result.value = data.readFloatBE(0);
                result.type = 'four_byte_float';
                console.log(`📊 Four byte float sensor value: ${result.value}`);
                break;
            default:
                result.rawBytes = data.toString('hex');
                result.type = 'unknown_format';
                console.log(`📊 Unknown binary format: ${result.rawBytes}`);
        }
        
        return result;
    },
    
    // Run comprehensive test
    runTest() {
        console.log('🚀 Starting Data Parsing Debug Test...\n');
        
        const testData = this.testDataFormats();
        
        console.log('\n📡 Testing JSON Data Parsing:');
        this.simulateDataReception(testData.json, 'JSON');
        
        console.log('\n📡 Testing OBD-II Data Parsing:');
        this.simulateDataReception(testData.obd, 'OBD-II');
        
        console.log('\n📡 Testing J1939 Data Parsing:');
        this.simulateDataReception(testData.j1939, 'J1939');
        
        console.log('\n📡 Testing Binary Sensor Data Parsing:');
        this.simulateDataReception(testData.binary, 'BINARY');
        
        console.log('\n✅ Data Parsing Debug Test Complete!');
    }
};

// Export for use in React Native
if (typeof module !== 'undefined' && module.exports) {
    module.exports = debugDataParsing;
}

// Run test if called directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
    debugDataParsing.runTest();
} 