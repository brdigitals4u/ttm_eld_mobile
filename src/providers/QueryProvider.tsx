import React, { useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { setDriverTeamQueryClient } from "@/stores/driverTeamStore"

// Create query client with optimized settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Network mode
      networkMode: "online",
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Network mode for mutations
      networkMode: "online",
    },
  },
})

interface QueryProviderProps {
  children: React.ReactNode
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Pass queryClient to stores that need to invalidate queries
  useEffect(() => {
    setDriverTeamQueryClient(queryClient)
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
