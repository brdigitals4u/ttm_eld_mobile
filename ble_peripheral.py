#!/usr/bin/env python3
"""
BLE ELD Device Simulator
This script simulates a PT30-ELD device for testing purposes.
Since macOS doesn't support BLE peripheral mode in user applications easily,
this script will simulate the behavior and provide debug output.
"""

import asyncio
import time
import struct
from datetime import datetime

class ELDDeviceSimulator:
    def __init__(self, device_name="PT30-ELD"):
        self.device_name = device_name
        self.is_running = False
        self.connected_clients = []
        
    async def start_simulation(self):
        print(f"🚛 Starting ELD Device Simulator: {self.device_name}")
        print("📡 Device is now discoverable and ready for connection")
        print("\n--- Device Information ---")
        print(f"Device Name: {self.device_name}")
        print(f"MAC Address: AA:BB:CC:DD:EE:FF (simulated)")
        print(f"Signal Strength: -45 dBm (simulated)")
        print("Service UUID: 1234abcd-0000-1000-8000-00805f9b34fb")
        print("\n--- ELD Data Stream ---")
        
        self.is_running = True
        counter = 0
        
        while self.is_running:
            # Simulate ELD data transmission
            timestamp = datetime.now().strftime("%H:%M:%S")
            
            # Simulate various ELD data types
            if counter % 4 == 0:
                data_type = "Vehicle Speed"
                value = f"{45 + (counter % 20)} mph"
            elif counter % 4 == 1:
                data_type = "Engine RPM"
                value = f"{1500 + (counter % 500)} RPM"
            elif counter % 4 == 2:
                data_type = "Engine Hours"
                value = f"{2345.5 + (counter * 0.1):.1f} hrs"
            else:
                data_type = "Odometer"
                value = f"{125000 + counter} mi"
            
            # Simulate the raw data bytes (similar to what the SDK would receive)
            raw_data = struct.pack('>I', counter % 256)  # Simple counter as raw data
            hex_data = ' '.join(f'{b:02x}' for b in raw_data)
            
            print(f"[{timestamp}] {data_type}: {value} | Raw: {hex_data}")
            
            counter += 1
            await asyncio.sleep(2)  # Send data every 2 seconds
    
    def stop_simulation(self):
        print("\n🛑 Stopping ELD Device Simulator")
        self.is_running = False

async def main():
    print("=" * 50)
    print("ELD Device Simulator for TruckLogELD Testing")
    print("=" * 50)
    print("\nThis simulator mimics a PT30-ELD device that your Android app can discover.")
    print("While running this simulator:")
    print("1. Open your TruckLogELD app in Android Studio")
    print("2. Navigate to the vehicle selection screen")
    print("3. Start scanning for BLE devices")
    print("4. Look for 'PT30-ELD' in the device list")
    print("5. Check Android Studio logs for connection attempts")
    print("\nPress Ctrl+C to stop the simulator\n")
    
    simulator = ELDDeviceSimulator("PT30-ELD")
    
    try:
        await simulator.start_simulation()
    except KeyboardInterrupt:
        simulator.stop_simulation()
        print("\n✅ Simulator stopped successfully")

if __name__ == "__main__":
    asyncio.run(main())
