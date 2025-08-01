// services/BluetoothService.ts
import { NativeModules, NativeEventEmitter } from "react-native";
import TTMBLEManager, { BLEDevice, ConnectionFailure, NotifyData } from "../src/utils/TTMBLEManager";

// Define a type for devices returned by TTM SDK (simplified based on doc)
interface TTMDevice {
  id: string; // MAC address
  address: string; // MAC address
  name?: string; // Device name
  signal?: number; // Signal strength (RSSI)
}

class BluetoothService {
  private peripherals = new Map<string, TTMDevice>();
  private listeners: Array<{ remove: () => void }> = [];

  constructor() {
    // Initialize your TTM SDK through the bridge
    // This calls the initSDK method defined in your native module
    TTMBLEManager.initSDK()
      .then(() => console.log("TTM BLE SDK initialized successfully."))
      .catch((e: Error) => console.error("Failed to initialize TTM BLE SDK:", e));
  }

  /**
   * Starts scanning for nearby Bluetooth devices using the TTM SDK.
   * @param scanSeconds The duration to scan in seconds.
   */
  async scan(scanSeconds: number = 10): Promise<void> {
    console.log("Starting TTM BLE scan...");
    try {
      // TTM SDK's startScan takes duration in milliseconds
      await TTMBLEManager.startScan(scanSeconds * 1000);
      console.log("TTM Scan initiated.");
    } catch (error) {
      console.error("TTM Scan error:", error);
      throw error; // Re-throw to be handled by UI
    }
  }

  /**
   * Stops the ongoing Bluetooth scan.
   */
  async stopScan(): Promise<void> {
    try {
      await TTMBLEManager.stopScan();
      console.log("TTM Scan stopped.");
    } catch (error) {
      console.error("Failed to stop TTM scan:", error);
      throw error;
    }
  }

  /**
   * Connects to an ELD device and handles the authentication/passcode flow.
   * @param deviceId The device ID to connect to.
   * @param passcode The 8-digit passcode for ELD verification.
   */
  async connect(deviceId: string, passcode: string): Promise<void> {
    console.log(`Attempting to connect to ${deviceId} with passcode`);
    try {
      // Connect using device ID and passcode
      await TTMBLEManager.connect(deviceId, passcode);
      console.log(`Successfully initiated connection to ${deviceId}`);
      
      // Return a promise that resolves when connected or rejects on failure
      return new Promise<void>((resolve, reject) => {
        let isResolved = false;
        
        const connectedListener = TTMBLEManager.onConnected(() => {
          if (!isResolved) {
            isResolved = true;
            connectedListener.remove();
            connectFailureListener.remove();
            disconnectedListener.remove();
            console.log("Connection successful");
            resolve();
          }
        });

        const connectFailureListener = TTMBLEManager.onConnectFailure((error: ConnectionFailure) => {
          if (!isResolved) {
            isResolved = true;
            connectedListener.remove();
            connectFailureListener.remove();
            disconnectedListener.remove();
            console.error("Connection failed:", error);
            reject(new Error(`Connection failed: ${error.message}`));
          }
        });

        const disconnectedListener = TTMBLEManager.onDisconnected(() => {
          if (!isResolved) {
            isResolved = true;
            connectedListener.remove();
            connectFailureListener.remove();
            disconnectedListener.remove();
            console.warn("Device disconnected during connection");
            reject(new Error("Device disconnected during connection"));
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            connectedListener.remove();
            connectFailureListener.remove();
            disconnectedListener.remove();
            reject(new Error("Connection timed out"));
          }
        }, 30000);
      });

    } catch (error) {
      console.error(`Initial connect call to ${deviceId} failed`, error);
      throw error;
    }
  }

  /**
   * Disconnects from the currently connected ELD device.
   * @param deviceId The ID of the device to disconnect (currently not used by TTM SDK's disconnect method directly, but kept for consistency).
   */
  async disconnect(deviceId: string): Promise<void> {
    try {
      // TTM SDK's disconnect method
      await TTMBLEManager.disconnect();
      console.log(`Disconnected from ${deviceId} using TTM SDK.`);
    } catch (error) {
      console.error(`Disconnection from ${deviceId} failed`, error);
      throw error;
    }
  }

  /**
   * Initiates ELD data collection from the connected device.
   */
  async startELDDataCollection(): Promise<void> {
    try {
      // TTM SDK's startReportEldData method
      await TTMBLEManager.startReportEldData();
      console.log("Initiated ELD data collection.");
    } catch (error) {
      console.error("Failed to start ELD data collection:", error);
      throw error;
    }
  }

  /**
   * Acknowledges the receipt of ELD data to the device.
   */
  async replyReceivedEldData(): Promise<void> {
    try {
      // TTM SDK's replyReceivedEldData method
      await TTMBLEManager.replyReceivedEldData();
      console.log("Acknowledged received ELD data.");
    } catch (error) {
      console.error("Failed to reply received ELD data:", error);
      throw error;
    }
  }

  /**
   * Adds a listener for scanned devices.
   * @param handler Callback function to execute when a device is scanned.
   * @returns A function to remove the listener.
   */
  addScanListener(handler: (device: TTMDevice) => void): () => void {
    const listener = TTMBLEManager.onDeviceScanned((device: BLEDevice) => {
      // Convert BLEDevice to TTMDevice format
      const ttmDevice: TTMDevice = {
        id: device.address,
        address: device.address,
        name: device.name,
        signal: device.signal
      };
      
      // Ensure the device object has expected properties
      if (ttmDevice.name || ttmDevice.address) {
        this.peripherals.set(ttmDevice.id, ttmDevice);
        handler(ttmDevice);
      }
    });
    this.listeners.push(listener);
    return () => listener.remove();
  }

  /**
   * Adds a listener for connection success.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addConnectListener(handler: () => void): () => void {
    const listener = TTMBLEManager.onConnected(handler);
    this.listeners.push(listener);
    return () => listener.remove();
  }

  /**
   * Adds a listener for disconnection events.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addDisconnectListener(handler: () => void): () => void {
    const listener = TTMBLEManager.onDisconnected(handler);
    this.listeners.push(listener);
    return () => listener.remove();
  }

  /**
   * Adds a listener for connection failure events.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addConnectFailureListener(handler: (error: { status: number, message: string }) => void): () => void {
    const listener = TTMBLEManager.onConnectFailure(handler);
    this.listeners.push(listener);
    return () => listener.remove();
  }

  /**
   * Adds a listener for successful authentication.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addAuthenticationPassedListener(handler: () => void): () => void {
    const listener = TTMBLEManager.onAuthenticationPassed(handler);
    this.listeners.push(listener);
    return () => listener.remove();
  }

  /**
   * Adds a listener for various notifications received from the device (including ELD data).
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addNotifyReceivedListener(handler: (data: any) => void): () => void {
    const listener = TTMBLEManager.onNotifyReceived(handler);
    this.listeners.push(listener);
    return () => listener.remove();
  }

  /**
   * Removes all registered listeners from the TTM Bluetooth SDK.
   */
  removeListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener.remove();
      } catch (error) {
        console.warn('Error removing listener:', error);
      }
    });
    this.listeners = [];
    console.log("All TTM BLE listeners removed.");
  }
}

// Export a singleton instance of the service
export const bluetoothService = new BluetoothService();