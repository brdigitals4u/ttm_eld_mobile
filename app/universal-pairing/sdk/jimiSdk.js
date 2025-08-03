import { NativeModules, NativeEventEmitter } from 'react-native';

const { JimiBridge } = NativeModules;
const EventEmitter = new NativeEventEmitter(JimiBridge);

export function setupJimiBridgeListeners(onDeviceDiscovered, onDeviceConnected, onDeviceDisconnected, onDataReceived, onConnectionError) {
  EventEmitter.addListener('onDeviceDiscovered', onDeviceDiscovered);
  EventEmitter.addListener('onDeviceConnected', onDeviceConnected);
  EventEmitter.addListener('onDeviceDisconnected', onDeviceDisconnected);
  EventEmitter.addListener('onDataReceived', onDataReceived);
  EventEmitter.addListener('onConnectionError', onConnectionError);
}

export function removeJimiBridgeListeners() {
  EventEmitter.removeAllListeners('onDeviceDiscovered');
  EventEmitter.removeAllListeners('onDeviceConnected');
  EventEmitter.removeAllListeners('onDeviceDisconnected');
  EventEmitter.removeAllListeners('onDataReceived');
  EventEmitter.removeAllListeners('onConnectionError');
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
