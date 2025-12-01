import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

import { identifyFreshchatUser, resetFreshchatUser } from "@/services/freshchat"
import { useAuthStore } from "@/stores/authStore"

export interface ChatSupportUser {
  identifier?: string
  name?: string
  email?: string
  customAttributes?: Record<string, any>
}

interface ChatSupportContextType {
  user: ChatSupportUser | null
  setUser: (user: ChatSupportUser) => void
  clearUser: () => void
  isChatOpen: boolean
  setIsChatOpen: (open: boolean) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  unreadCount: number
  setUnreadCount: (count: number) => void
}

const ChatSupportContext = createContext<ChatSupportContextType | undefined>(undefined)

export const ChatSupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<ChatSupportUser | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const authUser = useAuthStore((state) => state.user)
  const driverProfile = useAuthStore((state) => state.driverProfile)

  useEffect(() => {
    if (!authUser && !driverProfile) {
      resetFreshchatUser()
      return
    }

    const externalId = driverProfile?.driver_id || authUser?.id
    const email = driverProfile?.email || authUser?.email
    const firstName = authUser?.firstName || driverProfile?.name?.split(" ")?.[0]
    const lastName = authUser?.lastName || driverProfile?.name?.split(" ")?.slice(1).join(" ")

    if (externalId || email) {
      identifyFreshchatUser({
        externalId,
        email: email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      })
    }
  }, [
    authUser?.id,
    authUser?.firstName,
    authUser?.lastName,
    authUser?.email,
    driverProfile?.driver_id,
    driverProfile?.name,
    driverProfile?.email,
  ])

  const setUser = useCallback((newUser: ChatSupportUser) => {
    setUserState(newUser)
    setError(null)
    if (newUser.identifier || newUser.email) {
      const [firstName, ...lastNameParts] = (newUser.name || "").trim().split(" ").filter(Boolean)
      identifyFreshchatUser({
        externalId: newUser.identifier,
        email: newUser.email,
        firstName: firstName || undefined,
        lastName: lastNameParts.length ? lastNameParts.join(" ") : undefined,
      })
    }
  }, [])

  const clearUser = useCallback(() => {
    setUserState(null)
    setIsChatOpen(false)
    setError(null)
    setUnreadCount(0)
  }, [])

  const value: ChatSupportContextType = {
    user,
    setUser,
    clearUser,
    isChatOpen,
    setIsChatOpen,
    isLoading,
    setIsLoading,
    error,
    setError,
    unreadCount,
    setUnreadCount,
  }

  return <ChatSupportContext.Provider value={value}>{children}</ChatSupportContext.Provider>
}

export const useChatSupport = (): ChatSupportContextType => {
  const context = useContext(ChatSupportContext)
  if (!context) {
    throw new Error("useChatSupport must be used within ChatSupportProvider")
  }
  return context
}
