# KD032 J1939 ELD Device Simulator

A **professional-grade KD032 ELD simulator** that uses **J1939 protocol** and **CAN bus communication** to create a realistic ELD device for testing. This simulator implements the actual protocols used by real ELD devices, making it much more accurate than simple BLE simulators.

## 🎯 **Why J1939 Simulator?**

### **Realistic Protocol Implementation**
- ✅ **J1939 PGN messages** - Actual protocol used by ELD devices
- ✅ **CAN bus communication** - Real vehicle data bus
- ✅ **Engine data simulation** - RPM, speed, fuel consumption
- ✅ **ELD-compliant data** - Proper data structures
- ✅ **Vehicle operation simulation** - Realistic driving patterns

### **Professional Testing**
- ✅ **Protocol-level testing** - Test your SDK's J1939 parsing
- ✅ **Data integrity** - Verify ELD data accuracy
- ✅ **Performance testing** - High-frequency data transmission
- ✅ **Error simulation** - Corrupted messages, timeouts
- ✅ **Multi-device testing** - Multiple ECUs on same bus

## 🚀 **Quick Start**

### 1. **Setup Dependencies**
```bash
# Run the setup script
./setup_j1939_simulator.sh
```

### 2. **Start the Simulator**
```bash
# Activate virtual environment
source j1939_env/bin/activate

# Start J1939 simulator
python kd032_j1939_simulator.py
```

### 3. **Monitor CAN Traffic**
```bash
# In another terminal, monitor CAN messages
candump vcan0
```

## 📊 **What the Simulator Does**

### **J1939 PGN Messages Transmitted**
- **0x0CF00400** - Engine Speed (RPM)
- **0x0CF00401** - Vehicle Speed (km/h)
- **0x0CF00402** - Engine Hours
- **0x0CF00403** - Fuel Consumption
- **0x0CF00404** - Odometer
- **0x0CF00405** - Driver Duty Status
- **0x0CF00406** - GPS Location
- **0x0CF00407** - ELD-specific data

### **Realistic Data Generation**
```python
# Engine data simulation
engine_speed = 1200 + random.randint(-100, 300)  # RPM
vehicle_speed = random.randint(0, 80)            # km/h
engine_hours = 2345.5 + 0.01                     # hours
fuel_consumption = 12.5 + random.uniform(-0.1, 0.1)  # L/100km

# Location simulation
latitude = 40.7128 + random.uniform(-0.0001, 0.0001)
longitude = -74.0060 + random.uniform(-0.0001, 0.0001)
```

### **ELD Data Structure**
```json
{
  "device_id": "C4:A8:28:43:14:9A",
  "device_name": "KD032-43149A",
  "timestamp": "2025-08-02T18:30:00.000Z",
  "engine_data": {
    "speed_rpm": 1450,
    "hours": 2345.6,
    "fuel_consumption": 12.4
  },
  "vehicle_data": {
    "speed_kmh": 65,
    "odometer_km": 125045
  },
  "driver_status": "DRIVING",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 8.5
  },
  "eld_events": [...],
  "data_type": "ELD_DATA"
}
```

## 🔧 **Advanced Configuration**

### **Customize PGN Messages**
```python
# Modify PGN definitions in simulator
self.pgn_definitions = {
    'ENGINE_SPEED': 0x0CF00400,
    'VEHICLE_SPEED': 0x0CF00401,
    # Add custom PGNs here
}
```

### **Adjust Data Transmission**
```python
# Change transmission intervals
self.eld_data_interval = 2.0  # seconds
time.sleep(1.0)  # Main loop interval
```

### **Simulate Different Scenarios**
```python
# Engine failure simulation
if random.random() < 0.01:  # 1% chance
    self.vehicle_data['engine_speed'] = 0

# GPS signal loss
if random.random() < 0.05:  # 5% chance
    self.vehicle_data['latitude'] = None
```

## 📈 **Testing Scenarios**

### **Scenario 1: Normal Operation**
- **Expected**: Regular J1939 message flow
- **Test**: Monitor CAN traffic with `candump vcan0`
- **Result**: Should see consistent PGN messages

### **Scenario 2: High-Frequency Data**
- **Expected**: Rapid data transmission
- **Test**: Increase transmission rate
- **Result**: Test your app's data processing capacity

### **Scenario 3: Protocol Errors**
- **Expected**: Corrupted or invalid messages
- **Test**: Inject malformed PGN messages
- **Result**: Verify error handling in your SDK

### **Scenario 4: Multi-ECU Environment**
- **Expected**: Multiple devices on same bus
- **Test**: Run multiple simulator instances
- **Result**: Test device filtering and selection

## 🔍 **Monitoring and Debugging**

### **CAN Bus Monitoring**
```bash
# Monitor all CAN messages
candump vcan0

# Monitor specific PGN
candump vcan0 | grep "0CF00400"

# Monitor with timestamps
candump vcan0 -t z
```

### **J1939 Message Analysis**
```bash
# Use can-utils for detailed analysis
canbusload vcan0@1000000

# Decode J1939 messages
candump vcan0 | python j1939_decoder.py
```

### **Performance Monitoring**
```bash
# Monitor system resources
htop

# Monitor CAN interface
ip -d link show vcan0
```

## 🛠️ **Troubleshooting**

### **CAN Interface Issues**
```bash
# Check if vcan0 exists
ip link show vcan0

# Recreate if needed
sudo ip link del vcan0
sudo ip link add dev vcan0 type vcan
sudo ip link set up vcan0
```

### **Permission Issues**
```bash
# Add user to can group
sudo usermod -a -G can $USER

# Set permissions
sudo chmod 666 /dev/vcan0
```

### **Python Environment Issues**
```bash
# Recreate virtual environment
rm -rf j1939_env
python3 -m venv j1939_env
source j1939_env/bin/activate
pip install python-can python-j1939
```

## 🎯 **Integration with Your App**

### **1. J1939 Message Parsing**
Your SDK should parse J1939 messages:
```python
# Example J1939 message parsing
def parse_j1939_message(can_id, data):
    priority = (can_id >> 26) & 0x07
    pgn = (can_id >> 8) & 0xFFFF
    source_address = can_id & 0xFF
    
    if pgn == 0x0CF00400:  # Engine Speed
        rpm = int.from_bytes(data[0:2], 'big')
        return {'type': 'engine_speed', 'rpm': rpm}
```

### **2. ELD Data Processing**
Process ELD-specific PGN messages:
```python
def process_eld_data(pgn, data):
    if pgn == 0x0CF00407:  # ELD Data
        eld_json = data.decode('utf-8').rstrip('\x00')
        return json.loads(eld_json)
```

### **3. Real-time Data Handling**
Handle high-frequency data:
```python
def handle_engine_data(rpm, speed, hours):
    # Update UI in real-time
    update_engine_display(rpm, speed, hours)
    
    # Log to Supabase
    log_engine_data(rpm, speed, hours)
```

## 📋 **J1939 Protocol Details**

### **Message Format**
```
CAN ID: [Priority(3)][PGN(16)][Source Address(8)]
Data: [8 bytes of payload]
```

### **PGN Definitions**
- **0x0CF00400**: Engine Speed (RPM)
- **0x0CF00401**: Vehicle Speed (km/h)
- **0x0CF00402**: Engine Hours
- **0x0CF00403**: Fuel Consumption
- **0x0CF00404**: Odometer
- **0x0CF00405**: Driver Status
- **0x0CF00406**: GPS Location
- **0x0CF00407**: ELD Data

### **Address Assignment**
- **0x80**: Engine ECU
- **0x90**: ELD Device
- **0x00-0xEF**: Other devices

## 🔄 **Advanced Features**

### **Custom PGN Messages**
Add your own PGN definitions:
```python
# Add custom PGN
self.pgn_definitions['CUSTOM_DATA'] = 0x0CF00408

# Transmit custom data
def transmit_custom_data(self, data):
    self.transmit_j1939_message(
        self.pgn_definitions['CUSTOM_DATA'],
        data.encode(),
        self.eld_address
    )
```

### **Error Simulation**
Simulate real-world issues:
```python
# Simulate message corruption
if random.random() < 0.01:
    data = data[:4] + b'\xFF\xFF\xFF\xFF'  # Corrupt data

# Simulate bus errors
if random.random() < 0.005:
    raise can.CanError("Bus error simulated")
```

### **Multi-Device Testing**
Run multiple simulators:
```bash
# Terminal 1: Engine ECU
python kd032_j1939_simulator.py --ecu-engine

# Terminal 2: ELD Device
python kd032_j1939_simulator.py --eld-device

# Terminal 3: GPS Module
python kd032_j1939_simulator.py --gps-module
```

## 📞 **Support**

If you encounter issues:

1. **Check CAN interface**: `ip link show vcan0`
2. **Verify permissions**: `ls -la /dev/vcan0`
3. **Monitor traffic**: `candump vcan0`
4. **Check Python env**: `pip list | grep can`
5. **Review logs**: Check simulator output for errors

## 🔄 **Updates**

The J1939 simulator is designed to be easily extended:

- **Add new PGNs**: Modify `pgn_definitions`
- **Custom data**: Add new transmission methods
- **Error simulation**: Implement error injection
- **Multi-device**: Support multiple ECUs

---

**Happy Testing with Real J1939 Protocol! 🚛📡** 