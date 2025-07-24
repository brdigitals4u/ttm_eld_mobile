// NativeModules/TTMBLEManager.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

// Get your custom native module
const { TTMBLEManager } = NativeModules;

// Create an event emitter to listen for events from native
const TTMBLEManagerEmitter = new NativeEventEmitter(TTMBLEManager);

// Define event names (must match constants in native modules)
// Note: The '|| "eventName"' provides a fallback if constants are not correctly exported,
// but they SHOULD be exported via getConstants() in native modules for robustness.
export const TTM_EVENTS = {
  ON_DEVICE_SCANNED: TTMBLEManager.ON_DEVICE_SCANNED || "onDeviceScanned",
  ON_SCAN_STOP: TTMBLEManager.ON_SCAN_STOP || "onScanStop",
  ON_SCAN_FINISH: TTMBLEManager.ON_SCAN_FINISH || "onScanFinish",
  ON_CONNECTED: TTMBLEManager.ON_CONNECTED || "onConnected",
  ON_DISCONNECTED: TTMBLEManager.ON_DISCONNECTED || "onDisconnected",
  ON_CONNECT_FAILURE: TTMBLEManager.ON_CONNECT_FAILURE || "onConnectFailure",
  ON_AUTHENTICATION_PASSED: TTMBLEManager.ON_AUTHENTICATION_PASSED || "onAuthenticationPassed",
  ON_NOTIFY_RECEIVED: TTMBLEManager.ON_NOTIFY_RECEIVED || "onNotifyReceived",
  ON_PASSWORD_STATE_CHECKED: TTMBLEManager.ON_PASSWORD_STATE_CHECKED || "onPasswordStateChecked",
  ON_PASSWORD_VERIFY_RESULT: TTMBLEManager.ON_PASSWORD_VERIFY_RESULT || "onPasswordVerifyResult",
  ON_PASSWORD_SET_RESULT: TTMBLEManager.ON_PASSWORD_SET_RESULT || "onPasswordSetResult",
};

export { TTMBLEManager, TTMBLEManagerEmitter };

// Note: The `TTMBLEManager` object will contain the exposed native methods
// e.g., `TTMBLEManager.startScan(duration)`
// The `TTMBLEManagerEmitter` will be used to `addListener` for events emitted from native.