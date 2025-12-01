import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"

import { RealmService } from "@/database/realm"
import { UserType, AuthSessionType } from "@/database/schemas"
import { tokenStorage, userStorage } from "@/utils/storage"

interface AuthContextType {
  user: UserType | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: UserType) => void
  logout: () => void
  updateUser: (user: Partial<UserType>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user
  console.log("isAuthenticated:", isAuthenticated, "user:", user ? "exists" : "null")

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Debug user state changes
  useEffect(() => {
    console.log("User state changed:", user ? "User exists" : "User is null")
  }, [user])

  const checkAuthStatus = async () => {
    try {
      console.log("checkAuthStatus called")
      setIsLoading(true)

      // Check if we have stored tokens (only accessToken for organization API)
      const { accessToken } = await tokenStorage.getTokens()

      if (!accessToken) {
        console.log("No access token found, setting user to null")
        setUser(null)
        setIsLoading(false)
        return
      }

      console.log("Access token found:", accessToken)

      // Note: Organization API tokens don't have expiration in our current setup

      // Get user ID from storage
      const userId = await userStorage.getUserId()
      if (!userId) {
        console.log("No user ID found, setting user to null")
        setUser(null)
        setIsLoading(false)
        return
      }

      console.log("User ID found:", userId)

      // Get driver data from Realm (using the new DriverData schema)
      const driverData = RealmService.getDriverData()
      if (driverData && driverData.driver_profile) {
        console.log("Driver data found, setting user")
        setUser({
          _id: driverData.user_id,
          email: driverData.email,
          firstName: driverData.firstName,
          lastName: driverData.lastName,
          avatar: undefined,
          phoneNumber: (driverData.driver_profile as any).phone,
          dateOfBirth: undefined,
          isEmailVerified: true,
          createdAt: driverData.created_at,
          updatedAt: driverData.updated_at,
        })
      } else {
        console.log("No driver data found, setting user to null")
        setUser(null)
      }
    } catch (error) {
      console.error("Error checking auth status:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = (userData: UserType) => {
    console.log("AuthContext login called with userData:", userData)
    setUser(userData)
    setIsLoading(false) // Ensure loading is false after login
    console.log("User state set, isAuthenticated should be:", !!userData)
  }

  const logout = async () => {
    try {
      // Clear tokens and user data
      await tokenStorage.removeTokens()
      await userStorage.removeUserId()

      // Clear Realm data
      await RealmService.deleteAuthSession()
      await RealmService.deleteAllUsers() // Clear all users on logout
      await RealmService.clearDriverData() // Clear all driver data on logout

      // Clear user state
      setUser(null)
    } catch (error) {
      console.error("Error during logout:", error)
      // Still clear user state even if cleanup fails
      setUser(null)
    }
  }

  const updateUser = (userData: Partial<any>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)

      // Update user in Realm
      if (user._id) {
        RealmService.updateUser(user._id as string, userData)
      }
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
