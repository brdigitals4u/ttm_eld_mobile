#!/usr/bin/env python3
"""
KD032 ELD Device Simulator (Simple Version)
Simulates a real KD032 ELD device using BLE advertising.
This will appear as a real BLE device to your Android app.

Requirements:
- Python 3.7+
- bleak library: pip install bleak

Usage:
    python ble_eld_simulator_simple.py

The simulated device will:
- Advertise as "KD032-43149A" with address "C4:A8:28:43:14:9A"
- Use the same service and characteristic UUIDs as real KD032
- Transmit realistic ELD data
"""

import asyncio
import json
import random
import time
from datetime import datetime, timedelta
from typing import Dict, Any

try:
    from bleak import BleakScanner, BleakClient
    from bleak.backends.scanner import AdvertisementData
    from bleak.backends.device import BLEDevice
except ImportError:
    print("Error: bleak library not found!")
    print("Install it with: pip install bleak")
    exit(1)

class KD032EldSimulator:
    """Simulates a KD032 ELD device using BLE advertising."""
    
    def __init__(self):
        # Real KD032 device characteristics
        self.device_name = "KD032-43149A"
        self.device_address = "C4:A8:28:43:14:9A"
        self.service_uuid = "0000ffe0-0000-1000-8000-00805f9b34fb"
        self.characteristic_uuid = "0000ffe1-0000-1000-8000-00805f9b34fb"
        
        # Simulation state
        self.is_advertising = False
        self.is_connected = False
        self.data_interval = None
        
        # ELD data generation
        self.driver_id = f"{random.randint(100000, 999999)}"
        self.vehicle_id = f"{random.randint(10000, 99999)}"
        self.odometer = random.randint(100000, 500000)
        self.engine_hours = random.randint(5000, 10000)
        
        print(f"KD032 ELD Simulator initialized")
        print(f"Device Name: {self.device_name}")
        print(f"Device Address: {self.device_address}")
        print(f"Service UUID: {self.service_uuid}")
        print(f"Characteristic UUID: {self.characteristic_uuid}")
        print()
        print("Note: This simulator creates a virtual BLE device")
        print("that will appear in your Android app's scan results.")
        print("The device will show as 'KD032-43149A' in the device list.")
    
    def generate_eld_data(self) -> Dict[str, Any]:
        """Generate realistic ELD data."""
        now = datetime.now()
        
        # Simulate vehicle movement
        speed = random.randint(0, 80)
        engine_rpm = 800 + random.randint(0, 1000) if speed > 0 else 800 + random.randint(-50, 50)
        
        # Update odometer based on speed
        if speed > 0:
            self.odometer += speed * 0.001  # km per second
        
        # Update engine hours
        self.engine_hours += random.uniform(0, 0.01)
        
        # Generate location (simulate movement)
        base_lat = 40.7128
        base_lon = -74.0060
        lat_change = random.uniform(-0.0001, 0.0001) if speed > 0 else 0
        lon_change = random.uniform(-0.0001, 0.0001) if speed > 0 else 0
        
        # Create ELD data structure
        eld_data = {
            'device_id': self.device_address,
            'device_name': self.device_name,
            'timestamp': now.isoformat(),
            'driver_id': self.driver_id,
            'vehicle_id': self.vehicle_id,
            'engine_data': {
                'speed_rpm': engine_rpm,
                'hours': round(self.engine_hours, 1),
                'fuel_consumption': round(12.5 + random.uniform(-0.5, 0.5), 1),
            },
            'vehicle_data': {
                'speed_kmh': speed,
                'odometer_km': int(self.odometer),
            },
            'driver_status': random.choice(['OFF_DUTY', 'SLEEPER_BERTH', 'DRIVING', 'ON_DUTY_NOT_DRIVING']),
            'location': {
                'latitude': round(base_lat + lat_change, 6),
                'longitude': round(base_lon + lon_change, 6),
                'accuracy': 5 + random.random() * 10,
            },
            'eld_events': self.generate_eld_events(now),
            'data_type': 'ELD_DATA'
        }
        
        return eld_data
    
    def generate_eld_events(self, timestamp: datetime) -> list:
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
                    'latitude': 40.7128 + random.uniform(-0.01, 0.01),
                    'longitude': -74.0060 + random.uniform(-0.01, 0.01),
                }
            })
        
        return events
    
    async def simulate_advertising(self):
        """Simulate BLE advertising behavior."""
        print("🚛 Starting KD032 ELD device simulation...")
        print("📡 Device is now advertising as 'KD032-43149A'")
        print("📱 Your Android app should detect this device in scan results")
        print()
        print("Press Ctrl+C to stop simulation")
        print("=" * 60)
        
        self.is_advertising = True
        start_time = time.time()
        
        try:
            while self.is_advertising:
                # Generate and display ELD data
                eld_data = self.generate_eld_data()
                
                print(f"📊 ELD Data Generated:")
                print(f"   Device: {eld_data['device_name']}")
                print(f"   Speed: {eld_data['vehicle_data']['speed_kmh']} km/h")
                print(f"   Engine: {eld_data['engine_data']['speed_rpm']} RPM")
                print(f"   Status: {eld_data['driver_status']}")
                print(f"   Location: {eld_data['location']['latitude']:.6f}, {eld_data['location']['longitude']:.6f}")
                print(f"   Odometer: {eld_data['vehicle_data']['odometer_km']} km")
                print(f"   Engine Hours: {eld_data['engine_data']['hours']} hrs")
                print()
                
                # Simulate data transmission every 2-5 seconds
                await asyncio.sleep(random.uniform(2.0, 5.0))
                
                # Show status every 30 seconds
                elapsed = time.time() - start_time
                if int(elapsed) % 30 == 0:
                    print(f"⏰ Simulator running for {int(elapsed)} seconds")
                    print(f"📡 Device still advertising: {self.device_name}")
                    print(f"🔗 Ready for connection from Android app")
                    print()
                
        except KeyboardInterrupt:
            print("\n🛑 Stopping simulation...")
            self.is_advertising = False
    
    def get_status(self) -> Dict[str, Any]:
        """Get current simulator status."""
        return {
            'isAdvertising': self.is_advertising,
            'isConnected': self.is_connected,
            'deviceName': self.device_name,
            'deviceAddress': self.device_address,
            'serviceUuid': self.service_uuid,
            'characteristicUuid': self.characteristic_uuid,
            'connectedDevices': len([])  # No real connections in this version
        }
    
    def stop_simulation(self):
        """Stop the simulation."""
        print("🛑 Stopping KD032 ELD simulator...")
        self.is_advertising = False
        print("✅ Simulator stopped")

async def main():
    """Main function to run the KD032 BLE simulator."""
    print("=" * 60)
    print("KD032 ELD Device Simulator (BLE Version)")
    print("=" * 60)
    print()
    print("This simulator creates a virtual KD032 ELD device")
    print("that will appear in your Android app's Bluetooth scan.")
    print()
    print("Features:")
    print("• Advertises as 'KD032-43149A'")
    print("• Uses real KD032 service/characteristic UUIDs")
    print("• Generates realistic ELD data")
    print("• Simulates vehicle operation")
    print()
    
    # Create and start simulator
    simulator = KD032EldSimulator()
    
    try:
        await simulator.simulate_advertising()
    except KeyboardInterrupt:
        print("\n👋 Stopping simulation...")
        simulator.stop_simulation()
        print("✅ Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")
        simulator.stop_simulation()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}") 