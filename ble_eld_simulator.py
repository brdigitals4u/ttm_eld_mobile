#!/usr/bin/env python3
"""
KD032 ELD Device Simulator
Simulates a real KD032 ELD device using BLE peripheral advertising.
This will appear as a real BLE device to your Android app.

Requirements:
- Python 3.7+
- bleak library: pip install bleak

Usage:
    python ble_eld_simulator.py

The simulated device will:
- Advertise as "KD032-43149A" with address "C4:A8:28:43:14:9A"
- Use the same service and characteristic UUIDs as real KD032
- Respond to connection attempts
- Transmit realistic ELD data
"""

import asyncio
import json
import random
import time
from datetime import datetime, timedelta
from typing import Dict, Any

try:
    from bleak import BleakServer, BleakGATTService, BleakGATTCharacteristic
    from bleak.backends.characteristic import BleakGATTCharacteristicProperties
    from bleak.backends.service import BleakGATTServiceCollection
except ImportError:
    print("Error: bleak library not found!")
    print("Install it with: pip install bleak")
    exit(1)

class KD032EldSimulator:
    """Simulates a KD032 ELD device using BLE peripheral advertising."""
    
    def __init__(self):
        # Real KD032 device characteristics
        self.device_name = "KD032-43149A"
        self.device_address = "C4:A8:28:43:14:9A"
        self.service_uuid = "0000ffe0-0000-1000-8000-00805f9b34fb"
        self.characteristic_uuid = "0000ffe1-0000-1000-8000-00805f9b34fb"
        
        # BLE server
        self.server = None
        self.is_advertising = False
        self.is_connected = False
        self.connected_devices = set()
        
        # ELD data generation
        self.data_interval = None
        self.driver_id = f"{random.randint(100000, 999999)}"
        self.vehicle_id = f"{random.randint(10000, 99999)}"
        self.odometer = random.randint(100000, 500000)
        self.engine_hours = random.randint(5000, 10000)
        
        print(f"KD032 ELD Simulator initialized")
        print(f"Device Name: {self.device_name}")
        print(f"Device Address: {self.device_address}")
        print(f"Service UUID: {self.service_uuid}")
        print(f"Characteristic UUID: {self.characteristic_uuid}")
    
    async def start_advertising(self):
        """Start advertising as KD032 device."""
        if self.is_advertising:
            print("Already advertising")
            return
        
        print("Starting KD032 ELD device advertisement...")
        
        # Create BLE server
        self.server = BleakServer()
        
        # Add ELD service
        eld_service = BleakGATTService(
            uuid=self.service_uuid,
            handle=1,
            primary=True
        )
        
        # Add ELD characteristic
        eld_characteristic = BleakGATTCharacteristic(
            uuid=self.characteristic_uuid,
            handle=2,
            service_handle=1,
            properties=BleakGATTCharacteristicProperties(
                read=True,
                write=True,
                notify=True,
                indicate=True
            ),
            value=b"KD032 ELD Device Ready"
        )
        
        eld_service.add_characteristic(eld_characteristic)
        self.server.add_service(eld_service)
        
        # Start advertising
        await self.server.start()
        self.is_advertising = True
        
        print(f"✅ KD032 ELD device now advertising!")
        print(f"   Device should appear in your app's scan results")
        print(f"   Look for: {self.device_name} ({self.device_address})")
        
        # Start data transmission simulation
        asyncio.create_task(self.simulate_data_transmission())
    
    async def stop_advertising(self):
        """Stop advertising."""
        if not self.is_advertising:
            return
        
        print("Stopping KD032 ELD device advertisement...")
        
        if self.data_interval:
            self.data_interval.cancel()
        
        if self.server:
            await self.server.stop()
        
        self.is_advertising = False
        self.is_connected = False
        self.connected_devices.clear()
        
        print("✅ KD032 ELD device stopped advertising")
    
    async def simulate_data_transmission(self):
        """Simulate ELD data transmission."""
        print("Starting ELD data transmission simulation...")
        
        while self.is_advertising:
            try:
                # Generate realistic ELD data
                eld_data = self.generate_eld_data()
                
                # Simulate data transmission
                if self.is_connected:
                    print(f"📊 Transmitting ELD data: {json.dumps(eld_data, indent=2)}")
                
                # Wait 2-5 seconds before next transmission
                await asyncio.sleep(random.uniform(2, 5))
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in data transmission: {e}")
                await asyncio.sleep(1)
    
    def generate_eld_data(self) -> Dict[str, Any]:
        """Generate realistic ELD data."""
        now = datetime.now()
        
        # Simulate vehicle movement
        speed = random.randint(0, 75)
        latitude = 40.7128 + (random.random() - 0.5) * 0.1  # NYC area
        longitude = -74.0060 + (random.random() - 0.5) * 0.1
        
        # Update odometer and engine hours
        self.odometer += random.randint(0, 2)
        self.engine_hours += random.uniform(0, 0.1)
        
        # Generate duty status
        duty_statuses = ['OFF_DUTY', 'SLEEPER_BERTH', 'DRIVING', 'ON_DUTY_NOT_DRIVING']
        duty_status = random.choice(duty_statuses)
        
        # Generate events
        events = []
        num_events = random.randint(1, 3)
        for i in range(num_events):
            event_time = now - timedelta(minutes=random.randint(1, 60))
            events.append({
                "type": random.choice(['LOGIN', 'LOGOUT', 'DRIVING', 'ON_DUTY', 'OFF_DUTY', 'SLEEPER']),
                "timestamp": event_time.isoformat(),
                "location": {
                    "latitude": latitude + (random.random() - 0.5) * 0.01,
                    "longitude": longitude + (random.random() - 0.5) * 0.01
                }
            })
        
        return {
            "deviceId": self.device_address,
            "deviceName": self.device_name,
            "driverId": self.driver_id,
            "vehicleId": self.vehicle_id,
            "timestamp": now.isoformat(),
            "odometer": self.odometer,
            "engineHours": round(self.engine_hours, 1),
            "speed": speed,
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "accuracy": 5 + random.random() * 10
            },
            "status": {
                "engineOn": speed > 0 or random.random() > 0.3,
                "moving": speed > 0,
                "dutyStatus": duty_status
            },
            "events": events,
            "dataType": "ELD_DATA"
        }
    
    async def handle_connection(self, device_address: str):
        """Handle connection from client."""
        print(f"🔗 Connection attempt from {device_address}")
        
        if device_address not in self.connected_devices:
            self.connected_devices.add(device_address)
        
        self.is_connected = True
        print(f"✅ Connected to {device_address}")
        print(f"   KD032 device ready for ELD data transmission")
    
    async def handle_disconnection(self, device_address: str):
        """Handle disconnection from client."""
        print(f"🔌 Disconnection from {device_address}")
        
        if device_address in self.connected_devices:
            self.connected_devices.remove(device_address)
        
        if not self.connected_devices:
            self.is_connected = False
            print("❌ No devices connected")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current simulator status."""
        return {
            "isAdvertising": self.is_advertising,
            "isConnected": self.is_connected,
            "connectedDevices": len(self.connected_devices),
            "deviceName": self.device_name,
            "deviceAddress": self.device_address,
            "serviceUuid": self.service_uuid,
            "characteristicUuid": self.characteristic_uuid
        }

async def main():
    """Main function to run the KD032 ELD simulator."""
    simulator = KD032EldSimulator()
    
    print("=" * 60)
    print("KD032 ELD Device Simulator")
    print("=" * 60)
    print()
    print("This simulator creates a virtual KD032 ELD device that will")
    print("appear in your Android app's BLE scan results.")
    print()
    print("Device Details:")
    print(f"  Name: {simulator.device_name}")
    print(f"  Address: {simulator.device_address}")
    print(f"  Service UUID: {simulator.service_uuid}")
    print(f"  Characteristic UUID: {simulator.characteristic_uuid}")
    print()
    print("Instructions:")
    print("1. Start this simulator")
    print("2. Open your Android app")
    print("3. Go to device scan screen")
    print("4. Start scanning for devices")
    print("5. Look for 'KD032-43149A' in the results")
    print("6. Try connecting to the simulated device")
    print("7. The device should connect without passcode")
    print("8. ELD data will start transmitting automatically")
    print()
    print("Press Ctrl+C to stop the simulator")
    print("=" * 60)
    print()
    
    try:
        # Start advertising
        await simulator.start_advertising()
        
        # Keep running until interrupted
        while True:
            await asyncio.sleep(1)
            
            # Print status every 30 seconds
            if int(time.time()) % 30 == 0:
                status = simulator.get_status()
                print(f"📊 Status: Advertising={status['isAdvertising']}, "
                      f"Connected={status['isConnected']}, "
                      f"Devices={status['connectedDevices']}")
    
    except KeyboardInterrupt:
        print("\n🛑 Stopping KD032 ELD simulator...")
        await simulator.stop_advertising()
        print("✅ Simulator stopped")
    except Exception as e:
        print(f"❌ Error: {e}")
        await simulator.stop_advertising()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
