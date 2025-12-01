import { create } from "zustand"

interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  isDisconnecting: boolean
  currentDevice: string | null
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setDisconnecting: (disconnecting: boolean) => void
  setCurrentDevice: (device: string | null) => void
  reset: () => void
}

export const useConnectionState = create<ConnectionState>((set) => ({
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  currentDevice: null,

  setConnected: (connected: boolean) => set({ isConnected: connected }),
  setConnecting: (connecting: boolean) => set({ isConnecting: connecting }),
  setDisconnecting: (disconnecting: boolean) => set({ isDisconnecting: disconnecting }),
  setCurrentDevice: (device: string | null) => set({ currentDevice: device }),

  reset: () =>
    set({
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      currentDevice: null,
    }),
}))
