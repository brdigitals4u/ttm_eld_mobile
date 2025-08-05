import { NativeModules, NativeEventEmitter } from 'react-native';

const { JimiBridge } = NativeModules;

export function setupJimiBridgeListeners(eventEmitter, handlers) {
  if (handlers.onDeviceDiscovered) {
    eventEmitter.addListener('onDeviceDiscovered', handlers.onDeviceDiscovered);
  }
  if (handlers.onDeviceConnected) {
    eventEmitter.addListener('onDeviceConnected', handlers.onDeviceConnected);
  }
  if (handlers.onDeviceDisconnected) {
    eventEmitter.addListener('onDeviceDisconnected', handlers.onDeviceDisconnected);
  }
  if (handlers.onDataReceived) {
    eventEmitter.addListener('onDataReceived', handlers.onDataReceived);
  }
  if (handlers.onConnectionError) {
    eventEmitter.addListener('onConnectionError', handlers.onConnectionError);
  }
  if (handlers.onPermissionError) {
    eventEmitter.addListener('onPermissionError', handlers.onPermissionError);
  }
  if (handlers.onProtocolUpdated) {
    eventEmitter.addListener('onProtocolUpdated', handlers.onProtocolUpdated);
  }
  if (handlers.onSupabaseLog) {
    eventEmitter.addListener('onSupabaseLog', handlers.onSupabaseLog);
  }
  if (handlers.onJimiBridgeRemoteLog) {
    eventEmitter.addListener('onJimiBridgeRemoteLog', handlers.onJimiBridgeRemoteLog);
  }
}

export function removeJimiBridgeListeners(eventEmitter) {
  if (eventEmitter) {
    eventEmitter.removeAllListeners('onDeviceDiscovered');
    eventEmitter.removeAllListeners('onDeviceConnected');
    eventEmitter.removeAllListeners('onDeviceDisconnected');
    eventEmitter.removeAllListeners('onDataReceived');
    eventEmitter.removeAllListeners('onConnectionError');
    eventEmitter.removeAllListeners('onPermissionError');
    eventEmitter.removeAllListeners('onProtocolUpdated');
    eventEmitter.removeAllListeners('onSupabaseLog');
    eventEmitter.removeAllListeners('onJimiBridgeRemoteLog');
  }
}

export async function startDeviceScan(scanOptions) {
  return JimiBridge.startUniversalScan(scanOptions);
}

export async function connectToDevice(options) {
  return JimiBridge.connectToDevice(options);
}

export async function disconnectDevice(deviceId) {
  return JimiBridge.disconnectDevice(deviceId);
}
