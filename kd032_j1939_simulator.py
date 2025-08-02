#!/usr/bin/env python3
"""
KD032 ELD Device Simulator using J1939 Protocol
This simulator creates a realistic KD032 ELD device that communicates via J1939/CAN bus.

Requirements:
- python-can: pip install python-can
- python-j1939: pip install python-j1939

Usage:
    python kd032_j1939_simulator.py

The simulator will:
- Create a virtual CAN bus interface
- Transmit realistic J1939 PGN messages
- Simulate engine data, vehicle speed, fuel consumption
- Generate ELD-compliant data structures
"""

import logging
import time
import random
import json
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List

try:
    import can
    import j1939
except ImportError:
    print("Error: Required libraries not found!")
    print("Install with: pip install python-can python-j1939")
    exit(1)

class KD032EldSimulator:
    """Simulates a KD032 ELD device using J1939 protocol."""
    
    def __init__(self):
        # KD032 device characteristics
        self.device_name = "KD032-43149A"
        self.device_address = "C4:A8:28:43:14:9A"
        self.ecu_address = 0x80  # Engine ECU address
        self.eld_address = 0x90  # ELD device address
        
        # J1939 PGN definitions for ELD data
        self.pgn_definitions = {
            'ENGINE_SPEED': 0x0CF00400,      # Engine Speed (RPM)
            'VEHICLE_SPEED': 0x0CF00401,     # Vehicle Speed (km/h)
            'ENGINE_HOURS': 0x0CF00402,      # Engine Hours
            'FUEL_CONSUMPTION': 0x0CF00403,  # Fuel Consumption
            'ODOMETER': 0x0CF00404,          # Odometer
            'DRIVER_STATUS': 0x0CF00405,     # Driver Duty Status
            'LOCATION': 0x0CF00406,          # GPS Location
            'ELD_DATA': 0x0CF00407,          # ELD-specific data
        }
        
        # Simulated vehicle data
        self.vehicle_data = {
            'engine_speed': 1200,      # RPM
            'vehicle_speed': 0,        # km/h
            'engine_hours': 2345.5,    # hours
            'fuel_consumption': 12.5,  # L/100km
            'odometer': 125000,        # km
            'driver_status': 'OFF_DUTY',
            'latitude': 40.7128,
            'longitude': -74.0060,
            'timestamp': datetime.now(),
        }
        
        # J1939 ECU and bus
        self.ecu = None
        self.bus = None
        self.is_running = False
        self.data_thread = None
        
        # ELD data transmission
        self.eld_data_interval = 2.0  # seconds
        self.last_eld_transmission = datetime.now()
        
        print(f"KD032 ELD Simulator initialized")
        print(f"Device: {self.device_name}")
        print(f"Address: {self.device_address}")
        print(f"ECU Address: 0x{self.ecu_address:02X}")
        print(f"ELD Address: 0x{self.eld_address:02X}")
    
    def setup_j1939_bus(self):
        """Setup J1939 bus and ECU."""
        try:
            # Create virtual CAN bus (use vcan0 for testing)
            self.bus = can.interface.Bus(channel='vcan0', bustype='socketcan')
            print("✅ Connected to CAN bus: vcan0")
            
            # Create J1939 ECU
            self.ecu = j1939.ElectronicControlUnit()
            self.ecu.connect(bustype='socketcan', channel='vcan0')
            print("✅ J1939 ECU initialized")
            
            return True
        except Exception as e:
            print(f"❌ Failed to setup J1939 bus: {e}")
            print("💡 Try creating virtual CAN interface:")
            print("   sudo modprobe vcan")
            print("   sudo ip link add dev vcan0 type vcan")
            print("   sudo ip link set up vcan0")
            return False
    
    def generate_engine_data(self) -> Dict[str, Any]:
        """Generate realistic engine data."""
        # Simulate engine running/idling
        if self.vehicle_data['vehicle_speed'] > 0:
            self.vehicle_data['engine_speed'] = 1500 + random.randint(-100, 300)
        else:
            self.vehicle_data['engine_speed'] = 800 + random.randint(-50, 100)
        
        # Update engine hours
        self.vehicle_data['engine_hours'] += random.uniform(0, 0.01)
        
        # Update odometer based on speed
        if self.vehicle_data['vehicle_speed'] > 0:
            distance = self.vehicle_data['vehicle_speed'] * 0.001  # km per second
            self.vehicle_data['odometer'] += distance
        
        # Simulate fuel consumption
        if self.vehicle_data['vehicle_speed'] > 0:
            consumption_rate = 0.02 + (self.vehicle_data['vehicle_speed'] / 100) * 0.01
            self.vehicle_data['fuel_consumption'] = max(8.0, 
                self.vehicle_data['fuel_consumption'] + random.uniform(-0.1, 0.1))
        
        return self.vehicle_data.copy()
    
    def generate_eld_data(self) -> Dict[str, Any]:
        """Generate ELD-compliant data structure."""
        now = datetime.now()
        
        # Generate driver duty status
        duty_statuses = ['OFF_DUTY', 'SLEEPER_BERTH', 'DRIVING', 'ON_DUTY_NOT_DRIVING']
        if random.random() < 0.1:  # 10% chance to change status
            self.vehicle_data['driver_status'] = random.choice(duty_statuses)
        
        # Generate location data (simulate movement)
        if self.vehicle_data['vehicle_speed'] > 0:
            # Simulate movement
            lat_change = random.uniform(-0.0001, 0.0001)
            lon_change = random.uniform(-0.0001, 0.0001)
            self.vehicle_data['latitude'] += lat_change
            self.vehicle_data['longitude'] += lon_change
        
        # Create ELD data structure
        eld_data = {
            'device_id': self.device_address,
            'device_name': self.device_name,
            'timestamp': now.isoformat(),
            'driver_id': f"{random.randint(100000, 999999)}",
            'vehicle_id': f"{random.randint(10000, 99999)}",
            'engine_data': {
                'speed_rpm': self.vehicle_data['engine_speed'],
                'hours': round(self.vehicle_data['engine_hours'], 1),
                'fuel_consumption': round(self.vehicle_data['fuel_consumption'], 1),
            },
            'vehicle_data': {
                'speed_kmh': self.vehicle_data['vehicle_speed'],
                'odometer_km': int(self.vehicle_data['odometer']),
            },
            'driver_status': self.vehicle_data['driver_status'],
            'location': {
                'latitude': round(self.vehicle_data['latitude'], 6),
                'longitude': round(self.vehicle_data['longitude'], 6),
                'accuracy': 5 + random.random() * 10,
            },
            'eld_events': self.generate_eld_events(now),
            'data_type': 'ELD_DATA'
        }
        
        return eld_data
    
    def generate_eld_events(self, timestamp: datetime) -> List[Dict[str, Any]]:
        """Generate realistic ELD events."""
        events = []
        
        # Generate 1-3 events in the last hour
        num_events = random.randint(1, 3)
        for i in range(num_events):
            event_time = timestamp - timedelta(minutes=random.randint(1, 60))
            events.append({
                'type': random.choice(['LOGIN', 'LOGOUT', 'DRIVING', 'ON_DUTY', 'OFF_DUTY', 'SLEEPER']),
                'timestamp': event_time.isoformat(),
                'location': {
                    'latitude': self.vehicle_data['latitude'] + random.uniform(-0.01, 0.01),
                    'longitude': self.vehicle_data['longitude'] + random.uniform(-0.01, 0.01),
                }
            })
        
        return events
    
    def transmit_j1939_message(self, pgn: int, data: bytes, source_address: int):
        """Transmit a J1939 message."""
        try:
            # Create J1939 message
            message = j1939.Message(
                priority=6,  # Normal priority
                pgn=pgn,
                source_address=source_address,
                data=data
            )
            
            # Send message
            self.ecu.send_message(message)
            
            # Log transmission
            print(f"📡 J1939 PGN 0x{pgn:08X} transmitted from 0x{source_address:02X}")
            print(f"   Data: {data.hex()}")
            
        except Exception as e:
            print(f"❌ Failed to transmit J1939 message: {e}")
    
    def transmit_engine_speed(self):
        """Transmit engine speed data."""
        rpm = self.vehicle_data['engine_speed']
        data = rpm.to_bytes(2, 'big') + b'\x00\x00\x00\x00\x00\x00'
        self.transmit_j1939_message(self.pgn_definitions['ENGINE_SPEED'], data, self.ecu_address)
    
    def transmit_vehicle_speed(self):
        """Transmit vehicle speed data."""
        speed = int(self.vehicle_data['vehicle_speed'] * 100)  # Convert to 0.01 km/h units
        data = speed.to_bytes(2, 'big') + b'\x00\x00\x00\x00\x00\x00'
        self.transmit_j1939_message(self.pgn_definitions['VEHICLE_SPEED'], data, self.ecu_address)
    
    def transmit_engine_hours(self):
        """Transmit engine hours data."""
        hours = int(self.vehicle_data['engine_hours'] * 100)  # Convert to 0.01 hour units
        data = hours.to_bytes(4, 'big') + b'\x00\x00\x00\x00'
        self.transmit_j1939_message(self.pgn_definitions['ENGINE_HOURS'], data, self.ecu_address)
    
    def transmit_odometer(self):
        """Transmit odometer data."""
        odometer = int(self.vehicle_data['odometer'])
        data = odometer.to_bytes(4, 'big') + b'\x00\x00\x00\x00'
        self.transmit_j1939_message(self.pgn_definitions['ODOMETER'], data, self.ecu_address)
    
    def transmit_eld_data(self):
        """Transmit ELD-specific data."""
        eld_data = self.generate_eld_data()
        
        # Convert ELD data to bytes
        data_json = json.dumps(eld_data).encode('utf-8')
        
        # Pad to 8 bytes (J1939 message size)
        if len(data_json) > 8:
            data_json = data_json[:8]
        else:
            data_json = data_json.ljust(8, b'\x00')
        
        self.transmit_j1939_message(self.pgn_definitions['ELD_DATA'], data_json, self.eld_address)
        
        # Log ELD data
        print(f"📊 ELD Data transmitted:")
        print(f"   Device: {eld_data['device_name']}")
        print(f"   Speed: {eld_data['vehicle_data']['speed_kmh']} km/h")
        print(f"   Engine: {eld_data['engine_data']['speed_rpm']} RPM")
        print(f"   Status: {eld_data['driver_status']}")
        print(f"   Location: {eld_data['location']['latitude']:.6f}, {eld_data['location']['longitude']:.6f}")
    
    def simulate_vehicle_operation(self):
        """Simulate realistic vehicle operation."""
        while self.is_running:
            try:
                # Update vehicle data
                engine_data = self.generate_engine_data()
                
                # Simulate vehicle movement
                if random.random() < 0.3:  # 30% chance to change speed
                    if self.vehicle_data['vehicle_speed'] == 0:
                        self.vehicle_data['vehicle_speed'] = random.randint(20, 80)
                    else:
                        self.vehicle_data['vehicle_speed'] = max(0, 
                            self.vehicle_data['vehicle_speed'] + random.randint(-10, 10))
                
                # Transmit J1939 messages
                self.transmit_engine_speed()
                time.sleep(0.1)
                
                self.transmit_vehicle_speed()
                time.sleep(0.1)
                
                self.transmit_engine_hours()
                time.sleep(0.1)
                
                self.transmit_odometer()
                time.sleep(0.1)
                
                # Transmit ELD data periodically
                now = datetime.now()
                if (now - self.last_eld_transmission).total_seconds() >= self.eld_data_interval:
                    self.transmit_eld_data()
                    self.last_eld_transmission = now
                
                # Wait before next cycle
                time.sleep(1.0)
                
            except Exception as e:
                print(f"❌ Error in vehicle simulation: {e}")
                time.sleep(1.0)
    
    def start_simulation(self):
        """Start the KD032 ELD simulation."""
        if not self.setup_j1939_bus():
            return False
        
        print("🚛 Starting KD032 ELD simulation...")
        print("📡 Transmitting J1939 messages...")
        print("📊 Generating ELD data...")
        print()
        print("Press Ctrl+C to stop simulation")
        print("=" * 60)
        
        self.is_running = True
        self.data_thread = threading.Thread(target=self.simulate_vehicle_operation)
        self.data_thread.daemon = True
        self.data_thread.start()
        
        return True
    
    def stop_simulation(self):
        """Stop the simulation."""
        print("\n🛑 Stopping KD032 ELD simulation...")
        self.is_running = False
        
        if self.data_thread:
            self.data_thread.join(timeout=2)
        
        if self.ecu:
            self.ecu.disconnect()
        
        if self.bus:
            self.bus.shutdown()
        
        print("✅ Simulation stopped")

def setup_virtual_can():
    """Setup virtual CAN interface for testing."""
    import subprocess
    import sys
    
    print("🔧 Setting up virtual CAN interface...")
    
    try:
        # Load vcan module
        subprocess.run(['sudo', 'modprobe', 'vcan'], check=True)
        print("✅ vcan module loaded")
        
        # Create vcan0 interface
        subprocess.run(['sudo', 'ip', 'link', 'add', 'dev', 'vcan0', 'type', 'vcan'], check=True)
        print("✅ vcan0 interface created")
        
        # Bring interface up
        subprocess.run(['sudo', 'ip', 'link', 'set', 'up', 'vcan0'], check=True)
        print("✅ vcan0 interface activated")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to setup virtual CAN: {e}")
        return False
    except FileNotFoundError:
        print("❌ sudo command not found. Run manually:")
        print("   sudo modprobe vcan")
        print("   sudo ip link add dev vcan0 type vcan")
        print("   sudo ip link set up vcan0")
        return False

def main():
    """Main function to run the KD032 J1939 simulator."""
    print("=" * 60)
    print("KD032 ELD Device Simulator (J1939 Protocol)")
    print("=" * 60)
    print()
    print("This simulator creates a realistic KD032 ELD device")
    print("that communicates via J1939/CAN bus protocol.")
    print()
    print("Features:")
    print("• J1939 PGN message transmission")
    print("• Realistic engine and vehicle data")
    print("• ELD-compliant data structures")
    print("• CAN bus communication")
    print()
    
    # Setup virtual CAN interface
    if not setup_virtual_can():
        print("⚠️  Continuing without virtual CAN setup...")
    
    # Create and start simulator
    simulator = KD032EldSimulator()
    
    try:
        if simulator.start_simulation():
            # Keep running until interrupted
            while True:
                time.sleep(1)
        else:
            print("❌ Failed to start simulation")
            return 1
    
    except KeyboardInterrupt:
        print("\n👋 Stopping simulation...")
        simulator.stop_simulation()
        print("✅ Goodbye!")
        return 0
    
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        simulator.stop_simulation()
        return 1

if __name__ == "__main__":
    exit(main()) 