import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"

export enum SetupStep {
  SCAN_DEVICES = "scan_devices",
  DEVICE_SELECTED = "device_selected",
  CONNECTING = "connecting",
  SUCCESS = "success",
  ERROR = "error",
  DATA_COLLECTION = "data_collection",
}

export enum ConnectionStage {
  CONNECTING = "connecting",
  IDENTIFY_DEVICE = "identify_device",
  GATHERING_INFO = "gathering_info", // Device connected, starting authentication
  CAPTURING_ID = "capturing_id", // Authentication passed
  PAIRING = "pairing", // Password verification (if required)
  CONNECTED = "connected",
}

export interface ErrorInfo {
  type: string
  message: string
  details?: string
  code?: string | number
}

export interface VehicleSetupState {
  currentStep: SetupStep
  connectionStage: any | null
  selectedDevice: any | null
  scannedDevices: any[]
  isScanning: boolean
  isConnecting: boolean
  error: ErrorInfo | null
  progress: number
  logs: string[]
}

interface VehicleSetupContextType extends VehicleSetupState {
  // Actions
  setStep: (step: SetupStep) => void
  setConnectionStage: (stage: string | null) => void
  setSelectedDevice: (device: any | null) => void
  setScannedDevices: (devices: any[]) => void
  addScannedDevice: (device: any) => void
  setIsScanning: (scanning: boolean) => void
  setIsConnecting: (connecting: boolean) => void
  setError: (error: ErrorInfo | null) => void
  setProgress: (progress: number) => void
  addLog: (log: string) => void
  clearLogs: () => void
  resetState: () => void
}

const initialState: VehicleSetupState = {
  currentStep: SetupStep.SCAN_DEVICES,
  connectionStage: null,
  selectedDevice: null,
  scannedDevices: [],
  isScanning: false,
  isConnecting: false,
  error: null,
  progress: 0,
  logs: [],
}

const VehicleSetupContext = createContext<VehicleSetupContextType | undefined>(undefined)

export const useVehicleSetup = () => {
  const context = useContext(VehicleSetupContext)
  if (!context) {
    throw new Error("useVehicleSetup must be used within a VehicleSetupProvider")
  }
  return context
}

interface VehicleSetupProviderProps {
  children: ReactNode
}

export const VehicleSetupProvider: React.FC<VehicleSetupProviderProps> = ({ children }) => {
  const [state, setState] = useState<VehicleSetupState>(initialState)

  const setStep = useCallback((step: SetupStep) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const setConnectionStage = useCallback((stage: any | null) => {
    setState((prev) => ({ ...prev, connectionStage: stage }))
  }, [])

  const setSelectedDevice = useCallback((device: any | null) => {
    setState((prev) => ({ ...prev, selectedDevice: device }))
  }, [])

  const setScannedDevices = useCallback((devices: any[]) => {
    setState((prev) => ({ ...prev, scannedDevices: devices }))
  }, [])

  const addScannedDevice = useCallback((device: any) => {
    setState((prev) => {
      const existingIndex = prev.scannedDevices.findIndex((d) => d.id === device.id)
      if (existingIndex !== -1) {
        const updatedDevices = [...prev.scannedDevices]
        updatedDevices[existingIndex] = device
        return { ...prev, scannedDevices: updatedDevices }
      }
      return { ...prev, scannedDevices: [...prev.scannedDevices, device] }
    })
  }, [])

  const setIsScanning = useCallback((scanning: boolean) => {
    setState((prev) => ({ ...prev, isScanning: scanning }))
  }, [])

  const setIsConnecting = useCallback((connecting: boolean) => {
    setState((prev) => ({ ...prev, isConnecting: connecting }))
  }, [])

  const setError = useCallback((error: ErrorInfo | null) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  const setProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, progress }))
  }, [])

  const addLog = useCallback((log: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, `[${timestamp}] ${log}`],
    }))
  }, [])

  const clearLogs = useCallback(() => {
    setState((prev) => ({ ...prev, logs: [] }))
  }, [])

  const resetState = useCallback(() => {
    setState(initialState)
  }, [])

  const contextValue: VehicleSetupContextType = {
    ...state,
    setStep,
    setConnectionStage,
    setSelectedDevice,
    setScannedDevices,
    addScannedDevice,
    setIsScanning,
    setIsConnecting,
    setError,
    setProgress,
    addLog,
    clearLogs,
    resetState,
  }

  return (
    <VehicleSetupContext.Provider value={contextValue}>{children}</VehicleSetupContext.Provider>
  )
}
