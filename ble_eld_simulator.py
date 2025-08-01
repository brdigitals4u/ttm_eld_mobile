#!/usr/bin/env python3
"""
Advanced BLE ELD Device Simulator
This script creates a BLE peripheral that mimics a PT30-ELD device for testing.
Uses the system's Bluetooth capabilities through subprocess commands.
"""

import asyncio
import subprocess
import time
import json
from datetime import datetime

class BLEELDSimulator:
    def __init__(self):
        self.device_name = "PT30-ELD"
        self.device_address = "AA:BB:CC:DD:EE:FF"
        self.is_running = False
        self.process = None
        
    def start_bluetooth_advertising(self):
        """Start Bluetooth Low Energy advertising to make device discoverable"""
        print(f"🔵 Starting BLE advertising for device: {self.device_name}")
        
        # On macOS, we can use system commands to make the device discoverable
        try:
            # Make sure Bluetooth is on
            subprocess.run(["sudo", "blueutil", "--power", "1"], check=False)
            print("📱 Bluetooth power enabled")
            
            # Make device discoverable
            subprocess.run(["sudo", "blueutil", "--discoverable", "1"], check=False)
            print("🔍 Device is now discoverable")
            
        except FileNotFoundError:
            print("⚠️  blueutil not found. Install with: brew install blueutil")
            print("💡 Continuing simulation without system-level advertising...")
        except Exception as e:
            print(f"⚠️  Could not enable Bluetooth advertising: {e}")
            print("💡 Continuing simulation without system-level advertising...")
    
    def stop_bluetooth_advertising(self):
        """Stop BLE advertising"""
        try:
            subprocess.run(["sudo", "blueutil", "--discoverable", "0"], check=False)
            print("🔴 Stopped BLE advertising")
        except:
            pass
    
    async def simulate_eld_data_stream(self):
        """Simulate continuous ELD data transmission"""
        print("📊 Starting ELD data stream simulation...")
        print("=" * 60)
        
        counter = 0
        start_time = time.time()
        
        while self.is_running:
            current_time = datetime.now()
            elapsed = time.time() - start_time
            
            # Simulate realistic ELD data patterns
            vehicle_data = {
                "timestamp": current_time.isoformat(),
                "device_id": "PT30-ELD-001",
                "vin": "1HGBH41JXMN109186",
                "driver_id": "DEMO_DRIVER",
                "location": {
                    "latitude": 37.7749 + (counter * 0.0001),
                    "longitude": -122.4194 + (counter * 0.0001),
                    "speed_mph": 45 + (counter % 20),
                },
                "engine": {
                    "rpm": 1500 + (counter % 500),
                    "hours": 2345.5 + (elapsed / 3600),
                    "coolant_temp": 190 + (counter % 10),
                    "fuel_level": max(10, 75 - (counter * 0.1)),
                },
                "odometer_miles": 125000 + counter,
                "duty_status": ["off_duty", "sleeper", "driving", "on_duty"][counter % 4],
                "diagnostic_codes": [] if counter % 10 != 0 else ["P0001"],
            }
            
            # Format output similar to what the TTM SDK would log
            timestamp_str = current_time.strftime("%H:%M:%S.%f")[:-3]
            
            print(f"[{timestamp_str}] ELD Data Packet #{counter + 1}")
            print(f"  📍 Location: ({vehicle_data['location']['latitude']:.4f}, {vehicle_data['location']['longitude']:.4f})")
            print(f"  🚗 Speed: {vehicle_data['location']['speed_mph']} mph")
            print(f"  🔧 RPM: {vehicle_data['engine']['rpm']}")
            print(f"  ⛽ Fuel: {vehicle_data['engine']['fuel_level']:.1f}%")
            print(f"  📊 Status: {vehicle_data['duty_status'].replace('_', ' ').title()}")
            print(f"  🛣️  Odometer: {vehicle_data['odometer_miles']:,} miles")
            
            if vehicle_data['diagnostic_codes']:
                print(f"  ⚠️  Diagnostic Codes: {', '.join(vehicle_data['diagnostic_codes'])}")
            
            # Simulate raw data bytes that would be sent over BLE
            raw_bytes = self.generate_raw_eld_data(vehicle_data)
            hex_data = ' '.join(f'{b:02x}' for b in raw_bytes)
            print(f"  📡 Raw Data: {hex_data}")
            print("-" * 60)
            
            counter += 1
            await asyncio.sleep(3)  # Send data every 3 seconds
    
    def generate_raw_eld_data(self, data):
        """Generate raw byte data similar to what ELD devices transmit"""
        # This is a simplified simulation of ELD data format
        # Real ELD devices use J1939 or similar protocols
        raw_data = bytearray()
        
        # Header (2 bytes)
        raw_data.extend([0x7E, 0x01])  # Start flag + packet type
        
        # Speed (2 bytes, mph * 10)
        speed = int(data['location']['speed_mph'] * 10)
        raw_data.extend(speed.to_bytes(2, 'big'))
        
        # RPM (2 bytes)
        rpm = int(data['engine']['rpm'])
        raw_data.extend(rpm.to_bytes(2, 'big'))
        
        # Fuel level (1 byte, percentage)
        fuel = int(data['engine']['fuel_level'])
        raw_data.append(fuel)
        
        # Odometer (4 bytes, miles)
        odometer = int(data['odometer_miles'])
        raw_data.extend(odometer.to_bytes(4, 'big'))
        
        # Duty status (1 byte)
        status_map = {"off_duty": 1, "sleeper": 2, "driving": 3, "on_duty": 4}
        raw_data.append(status_map.get(data['duty_status'], 1))
        
        # Checksum (1 byte)
        checksum = sum(raw_data) % 256
        raw_data.append(checksum)
        
        # End flag (1 byte)
        raw_data.append(0x7F)
        
        return raw_data
    
    async def start_simulation(self):
        """Start the complete ELD simulation"""
        print("🚛" * 20)
        print("    BLE ELD Device Simulator Started")
        print("🚛" * 20)
        print(f"Device Name: {self.device_name}")
        print(f"Simulated MAC: {self.device_address}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        print("📋 Instructions:")
        print("1. Keep this simulator running")
        print("2. Open your TruckLogELD app in Android Studio")
        print("3. Navigate to the select-vehicle screen")
        print("4. Start BLE scan in your app") 
        print("5. Look for 'PT30-ELD' in the discovered devices")
        print("6. Check Android logs for TTMBLEManager events")
        print("7. Use IMEI: 123456789012345 and Passcode: 12345678 for testing")
        print()
        print("Press Ctrl+C to stop simulation")
        print("=" * 60)
        
        self.is_running = True
        
        # Start BLE advertising
        self.start_bluetooth_advertising()
        
        # Start data simulation
        await self.simulate_eld_data_stream()
    
    def stop_simulation(self):
        """Stop the simulation"""
        print("\n🛑 Stopping ELD Device Simulation...")
        self.is_running = False
        self.stop_bluetooth_advertising()
        print("✅ Simulation stopped successfully")

async def main():
    simulator = BLEELDSimulator()
    
    try:
        await simulator.start_simulation()
    except KeyboardInterrupt:
        simulator.stop_simulation()
    except Exception as e:
        print(f"❌ Error in simulation: {e}")
        simulator.stop_simulation()

if __name__ == "__main__":
    asyncio.run(main())
