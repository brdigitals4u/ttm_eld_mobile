/**
 * HOS Status Context
 *
 * Provides global HOS status to all screens using the new driver API.
 * Polls every 30 seconds when authenticated.
 */

import React, { createContext, useContext, ReactNode } from "react"

import { useHOSCurrentStatus } from "@/api/driver-hooks"
import { useAuth } from "@/stores/authStore"

interface HOSStatusContextType {
  hosStatus: any // HOSCurrentStatus from driver API
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const HOSStatusContext = createContext<HOSStatusContextType | undefined>(undefined)

interface HOSStatusProviderProps {
  children: ReactNode
}

export const HOSStatusProvider: React.FC<HOSStatusProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth()

  const {
    data: hosStatus,
    isLoading,
    error,
    refetch,
  } = useHOSCurrentStatus({
    enabled: isAuthenticated,
    refetchInterval: 30000, // 30 seconds per spec
  })

  return (
    <HOSStatusContext.Provider value={{ hosStatus, isLoading, error, refetch }}>
      {children}
    </HOSStatusContext.Provider>
  )
}

export const useHOSStatusContext = () => {
  const context = useContext(HOSStatusContext)
  if (!context) {
    throw new Error("useHOSStatusContext must be used within HOSStatusProvider")
  }
  return context
}
