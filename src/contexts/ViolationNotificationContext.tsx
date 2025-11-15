/**
 * Violation Notification Context
 * 
 * Provides violation state management and WebSocket integration
 * for real-time violation notifications.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { violationWebSocketService, ViolationNotificationData, ViolationResolvedData } from '@/services/ViolationWebSocketService'
import { useAuth } from '@/stores/authStore'
import { VIOLATION_PRIORITY } from '@/api/constants'

export interface ActiveViolation extends ViolationNotificationData {
  receivedAt: string
}

interface ViolationNotificationContextValue {
  // State
  activeViolations: ActiveViolation[]
  criticalViolations: ActiveViolation[]
  highPriorityViolations: ActiveViolation[]
  mediumPriorityViolations: ActiveViolation[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  
  // Actions
  removeViolation: (violationId: string) => void
  clearAllViolations: () => void
}

const ViolationNotificationContext = createContext<ViolationNotificationContextValue | undefined>(undefined)

interface ViolationNotificationProviderProps {
  children: React.ReactNode
}

export const ViolationNotificationProvider: React.FC<ViolationNotificationProviderProps> = ({ children }) => {
  const { isAuthenticated, user, driverProfile, token } = useAuth()
  const [activeViolations, setActiveViolations] = useState<ActiveViolation[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Filter violations by priority
  const criticalViolations = activeViolations.filter(v => v.priority === VIOLATION_PRIORITY.CRITICAL)
  const highPriorityViolations = activeViolations.filter(v => v.priority === VIOLATION_PRIORITY.HIGH)
  const mediumPriorityViolations = activeViolations.filter(v => v.priority === VIOLATION_PRIORITY.MEDIUM)

  /**
   * Connect to WebSocket when authenticated
   */
  useEffect(() => {
    if (!isAuthenticated || !user?.organizationId || !driverProfile?.driver_id || !token) {
      console.log('⏭️ Skipping WebSocket connection - not authenticated or missing credentials')
      return
    }

    console.log('🔌 Initializing WebSocket connection...')
    setConnectionStatus('connecting')

    // Connect to WebSocket
    violationWebSocketService.connect(
      user.organizationId,
      driverProfile.driver_id,
      token
    )

    // Subscribe to WebSocket events
    const unsubscribe = violationWebSocketService.subscribe((event) => {
      switch (event.type) {
        case 'connected':
          setConnectionStatus('connected')
          console.log('✅ Violation WebSocket connected')
          break

        case 'disconnected':
          setConnectionStatus('disconnected')
          console.log('🔌 Violation WebSocket disconnected')
          break

        case 'error':
          setConnectionStatus('error')
          console.error('❌ Violation WebSocket error:', event.error)
          
          // Handle auth errors - disconnect and let user re-login
          if (event.data?.code === 'AUTH_ERROR') {
            console.log('🔐 Authentication error - disconnecting WebSocket')
            violationWebSocketService.disconnect()
          }
          break

        case 'violation':
          handleNewViolation(event.data as ViolationNotificationData)
          break

        case 'violation_resolved':
          handleViolationResolved(event.data as ViolationResolvedData)
          break
      }
    })

    unsubscribeRef.current = unsubscribe

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = violationWebSocketService.getConnectionStatus()
      setConnectionStatus(status)
    }, 5000)

    // Cleanup on unmount or when auth changes
    return () => {
      console.log('🧹 Cleaning up WebSocket connection...')
      unsubscribe()
      clearInterval(statusInterval)
      violationWebSocketService.disconnect()
      setActiveViolations([])
      setConnectionStatus('disconnected')
    }
  }, [isAuthenticated, user?.organizationId, driverProfile?.driver_id, token])

  /**
   * Handle new violation notification
   */
  const handleNewViolation = useCallback((data: ViolationNotificationData) => {
    console.log('🚨 New violation received:', data.violation_id)
    
    setActiveViolations((prev) => {
      // Check if violation already exists
      const exists = prev.some(v => v.violation_id === data.violation_id)
      if (exists) {
        console.log('⚠️ Violation already exists, skipping:', data.violation_id)
        return prev
      }

      // Add new violation
      const newViolation: ActiveViolation = {
        ...data,
        receivedAt: new Date().toISOString(),
      }

      return [...prev, newViolation]
    })
  }, [])

  /**
   * Handle violation resolved
   */
  const handleViolationResolved = useCallback((data: ViolationResolvedData) => {
    console.log('✅ Violation resolved:', data.violation_id)
    
    setActiveViolations((prev) => 
      prev.filter(v => v.violation_id !== data.violation_id)
    )
  }, [])

  /**
   * Remove violation manually
   */
  const removeViolation = useCallback((violationId: string) => {
    setActiveViolations((prev) => 
      prev.filter(v => v.violation_id !== violationId)
    )
  }, [])

  /**
   * Clear all violations
   */
  const clearAllViolations = useCallback(() => {
    setActiveViolations([])
  }, [])

  const value: ViolationNotificationContextValue = {
    activeViolations,
    criticalViolations,
    highPriorityViolations,
    mediumPriorityViolations,
    connectionStatus,
    removeViolation,
    clearAllViolations,
  }

  return (
    <ViolationNotificationContext.Provider value={value}>
      {children}
    </ViolationNotificationContext.Provider>
  )
}

/**
 * Hook to use violation notifications
 */
export const useViolationNotifications = (): ViolationNotificationContextValue => {
  const context = useContext(ViolationNotificationContext)
  
  if (context === undefined) {
    throw new Error('useViolationNotifications must be used within ViolationNotificationProvider')
  }
  
  return context
}

