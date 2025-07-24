// services/BluetoothService.ts

import { NativeModules, NativeEventEmitter } from "react-native";
import BleManager, {
  BleDisconnectPeripheralEvent,
  BleManagerDidUpdateValueForCharacteristicEvent,
  Peripheral,
} from "react-native-ble-manager";

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

class BluetoothService {
  private peripherals = new Map<string, Peripheral>();

  constructor() {
    BleManager.start({ showAlert: false }).then(() => {
      console.log("BLE Manager initialized");
    });
  }

  // As per Section 2.5 of the Android guide, we need to scan for devices
  async scan(scanSeconds: number = 5): Promise<void> {
    console.log("Starting BLE scan...");
    try {
      await BleManager.scan([], scanSeconds, true);
    } catch (error) {
      console.error("Scan error:", error);
    }
  }

  stopScan(): void {
    BleManager.stopScan().then(() => {
      console.log("Scan stopped");
    });
  }

  // As per Section 3.1 of the Android guide, we connect with a MAC address
  async connect(peripheralId: string): Promise<void> {
    console.log(`Attempting to connect to ${peripheralId}`);
    try {
      await BleManager.connect(peripheralId);
      console.log(`Successfully connected to ${peripheralId}`);
      
      // After connecting, retrieve services to discover characteristics
      await BleManager.retrieveServices(peripheralId);
      console.log("Services retrieved");

      // Here you would start notifications on the required characteristic
      // This will be specific to the TTM device's service/characteristic UUIDs
      // e.g., await BleManager.startNotification(peripheralId, serviceUUID, charUUID);

    } catch (error) {
      console.error(`Connection to ${peripheralId} failed`, error);
      throw error;
    }
  }

  async disconnect(peripheralId: string): Promise<void> {
    try {
      await BleManager.disconnect(peripheralId);
      console.log(`Disconnected from ${peripheralId}`);
    } catch (error) {
      console.error(`Disconnection from ${peripheralId} failed`, error);
    }
  }

  // This function would send commands like 'startReportEldData' (Android Guide Section 3.2)
  async writeCommand(peripheralId: string, serviceUUID: string, characteristicUUID: string, command: number[]): Promise<void> {
    try {
      await BleManager.write(peripheralId, serviceUUID, characteristicUUID, command);
      console.log(`Wrote command: ${command} to ${characteristicUUID}`);
    } catch (error) {
      console.error("Write command error:", error);
    }
  }

  // Add listeners for different BLE events
  addScanListener(handler: (peripheral: Peripheral) => void): void {
    bleManagerEmitter.addListener("BleManagerDiscoverPeripheral", (peripheral: Peripheral) => {
      if (peripheral.name) { // Filter for named devices
        this.peripherals.set(peripheral.id, peripheral);
        handler(peripheral);
      }
    });
  }
  
  addDataListener(handler: (data: BleManagerDidUpdateValueForCharacteristicEvent) => void): void {
    bleManagerEmitter.addListener(
      "BleManagerDidUpdateValueForCharacteristic",
      handler
    );
  }

  addDisconnectListener(handler: (data: BleDisconnectPeripheralEvent) => void): void {
    bleManagerEmitter.addListener("BleManagerDisconnectPeripheral", handler);
  }

  // Remember to remove listeners when they are no longer needed
  removeListeners(): void {
    bleManagerEmitter.removeAllListeners("BleManagerDiscoverPeripheral");
    bleManagerEmitter.removeAllListeners("BleManagerDidUpdateValueForCharacteristic");
    bleManagerEmitter.removeAllListeners("BleManagerDisconnectPeripheral");
  }
}

// Export a singleton instance of the service
export const bluetoothService = new BluetoothService();
