import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { tokenRefreshService } from '@/services/token-refresh-service'

interface TokenRefreshContextType {
  isRefreshing: boolean
  refreshToken: () => Promise<boolean>
  checkAndRefreshToken: () => Promise<boolean>
}

const TokenRefreshContext = createContext<TokenRefreshContextType | undefined>(undefined)

export const TokenRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Refresh token function (wraps service)
  const refreshToken = useCallback(async (): Promise<boolean> => {
    setIsRefreshing(true)
    try {
      return await tokenRefreshService.refreshToken()
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Check and refresh token if needed
  const checkAndRefreshToken = useCallback(async (): Promise<boolean> => {
    return await tokenRefreshService.checkAndRefreshToken()
  }, [])

  // Set up periodic token refresh check (every 8 minutes)
  useEffect(() => {
    const checkInterval = 8 * 60 * 1000 // 8 minutes

    const checkToken = async () => {
      try {
        await checkAndRefreshToken()
      } catch (error) {
        console.error('❌ TokenRefresh: Error in periodic check:', error)
      }
    }

    // Initial check
    checkToken()

    // Set up interval
    intervalRef.current = setInterval(checkToken, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [checkAndRefreshToken])

  // Handle app state changes (refresh when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 TokenRefresh: App became active, checking token...')
        await checkAndRefreshToken()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [checkAndRefreshToken])

  const value: TokenRefreshContextType = {
    isRefreshing,
    refreshToken,
    checkAndRefreshToken,
  }

  return (
    <TokenRefreshContext.Provider value={value}>
      {children}
    </TokenRefreshContext.Provider>
  )
}

export const useTokenRefresh = (): TokenRefreshContextType => {
  const context = useContext(TokenRefreshContext)
  if (!context) {
    throw new Error('useTokenRefresh must be used within TokenRefreshProvider')
  }
  return context
}

