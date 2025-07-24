// services/BluetoothService.ts
import { NativeModules, NativeEventEmitter } from "react-native";
import { TTMBLEManager, TTMBLEManagerEmitter, TTM_EVENTS } from "./TTMBLEManager";

// Define a type for devices returned by TTM SDK (simplified based on doc)
interface TTMDevice {
  id: string; // MAC address
  address: string; // MAC address
  name?: string; // Device name
  signal?: number; // Signal strength (RSSI)
}

class BluetoothService {
  private peripherals = new Map<string, TTMDevice>();

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
   * @param filters An optional array of UUID strings to filter by.
   */
  async scan(scanSeconds: number = 10, filters: string[] = []): Promise<void> {
    console.log("Starting TTM BLE scan...");
    try {
      // TTM SDK's startScan takes duration in milliseconds and optional filters (UUID strings)
      await TTMBLEManager.startScan(scanSeconds * 1000, filters);
      console.log("TTM Scan initiated.");
    } catch (error) {
      console.error("TTM Scan error:", error);
      throw error; // Re-throw to be handled by UI
    }
  }

  /**
   * Stops the ongoing Bluetooth scan.
   */
  stopScan(): void {
    // TTM SDK's stopScan method
    TTMBLEManager.stopScan()
      .then(() => console.log("TTM Scan stopped."))
      .catch((e: Error) => console.error("Failed to stop TTM scan:", e));
  }

  /**
   * Connects to an ELD device and handles the authentication/passcode flow.
   * @param deviceId The MAC address of the device to connect to.
   * @param imei The IMEI of the ELD device.
   * @param passcode The 8-digit passcode for ELD verification.
   */
  async connect(deviceId: string, imei: string, passcode: string): Promise<void> {
    console.log(`Attempting to connect to ${deviceId} with IMEI ${imei}`);
    try {
      // needPair is false as TTM SDK handles pairing internally after connection
      await TTMBLEManager.connect(deviceId, imei, false);
      console.log(`Successfully initiated connection to ${deviceId}. Waiting for authentication...`);

      // We'll handle the authentication/password flow via listeners
      return new Promise<void>((resolve, reject) => {
        const authPassedListener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_AUTHENTICATION_PASSED, async () => {
          console.log("Authentication passed, checking password status...");
          authPassedListener.remove(); // Remove listener after use

          try {
            // Check if password feature is enabled on the device
            await TTMBLEManager.checkPasswordEnable();

            const passwordStateListener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_PASSWORD_STATE_CHECKED, async (data) => {
              passwordStateListener.remove(); // Remove listener

              if (data.isSet) { // Password enabled on ELD
                console.log("Password enabled on ELD, verifying...");
                // Validate with provided passcode
                await TTMBLEManager.validatePassword(passcode);

                const passwordVerifyListener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_PASSWORD_VERIFY_RESULT, (verifyData) => {
                  passwordVerifyListener.remove(); // Remove listener

                  if (verifyData.success) { // Password verification successful
                    console.log("Password verification successful.");
                    resolve(); // Connection and authentication complete
                  } else { // Password verification failed
                    console.error("Password verification failed.");
                    reject(new Error("Incorrect password."));
                    // Disconnect on failure
                    TTMBLEManager.disconnect();
                  }
                });
              } else { // Password disabled on ELD
                console.log("Password disabled on ELD. Proceeding with data collection.");
                resolve(); // Connection and authentication complete
              }
            });
          } catch (e) {
            console.error("Error during password check/validation:", e);
            reject(e);
          }
        });

        const connectFailureListener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_CONNECT_FAILURE, (error) => {
          console.error("TTM Connect Failure:", error);
          authPassedListener.remove(); // Ensure listeners are cleaned
          connectFailureListener.remove();
          reject(new Error(`Connection failed: ${error.message}`));
        });

        const disconnectListener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_DISCONNECTED, () => {
            console.warn("TTM Device disconnected during connection/auth flow.");
            authPassedListener.remove();
            connectFailureListener.remove();
            disconnectListener.remove();
            reject(new Error("Device disconnected during connection or authentication."));
        });


        // Add a timeout for the entire connection/authentication process
        setTimeout(() => {
          authPassedListener.remove();
          connectFailureListener.remove();
          disconnectListener.remove();
          reject(new Error("Connection and authentication timed out."));
        }, 30000); // 30 seconds timeout
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
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_DEVICE_SCANNED, (device: TTMDevice) => {
      // Ensure the device object has expected properties
      if (device.name || device.address) {
        this.peripherals.set(device.id, device);
        handler(device);
      }
    });
    return () => listener.remove(); // Return a function to remove this specific listener
  }

  /**
   * Adds a listener for connection success.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addConnectListener(handler: () => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_CONNECTED, handler);
    return () => listener.remove();
  }

  /**
   * Adds a listener for disconnection events.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addDisconnectListener(handler: () => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_DISCONNECTED, handler);
    return () => listener.remove();
  }

  /**
   * Adds a listener for connection failure events.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addConnectFailureListener(handler: (error: { status: number, message: string }) => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_CONNECT_FAILURE, handler);
    return () => listener.remove();
  }

  /**
   * Adds a listener for successful authentication.
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addAuthenticationPassedListener(handler: () => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_AUTHENTICATION_PASSED, handler);
    return () => listener.remove();
  }

  /**
   * Adds a listener for various notifications received from the device (including ELD data).
   * @param handler Callback function.
   * @returns A function to remove the listener.
   */
  addNotifyReceivedListener(handler: (data: any) => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_NOTIFY_RECEIVED, handler);
    return () => listener.remove();
  }

  /**
   * Adds a listener for the result of checking password enable status.
   * @param handler Callback function with `isSet` boolean.
   * @returns A function to remove the listener.
   */
  addPasswordStateCheckedListener(handler: (data: { isSet: boolean }) => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_PASSWORD_STATE_CHECKED, handler);
    return () => listener.remove();
  }

  /**
   * Adds a listener for the result of password verification.
   * @param handler Callback function with `success` boolean.
   * @returns A function to remove the listener.
   */
  addPasswordVerifyResultListener(handler: (data: { success: boolean }) => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_PASSWORD_VERIFY_RESULT, handler);
    return () => listener.remove();
  }

  /**
   * Adds a listener for the result of setting/disabling password.
   * @param handler Callback function with `isSuccess` boolean.
   * @returns A function to remove the listener.
   */
  addPasswordSetResultListener(handler: (data: { isSuccess: boolean }) => void): () => void {
    const listener = TTMBLEManagerEmitter.addListener(TTM_EVENTS.ON_PASSWORD_SET_RESULT, handler);
    return () => listener.remove();
  }

  /**
   * Removes all registered listeners from the TTM Bluetooth SDK.
   */
  removeListeners(): void {
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_DEVICE_SCANNED);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_SCAN_STOP);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_SCAN_FINISH);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_CONNECTED);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_DISCONNECTED);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_CONNECT_FAILURE);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_AUTHENTICATION_PASSED);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_NOTIFY_RECEIVED);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_PASSWORD_STATE_CHECKED);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_PASSWORD_VERIFY_RESULT);
    TTMBLEManagerEmitter.removeAllListeners(TTM_EVENTS.ON_PASSWORD_SET_RESULT);
    console.log("All TTM BLE listeners removed.");
  }
}

// Export a singleton instance of the service
export const bluetoothService = new BluetoothService();