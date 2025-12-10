import React, { useEffect, useState } from "react"
import { View, ActivityIndicator } from "react-native"
import { Redirect } from "expo-router"

import { BetaBanner } from "@/components/BetaBanner"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { settingsStorage } from "@/utils/storage"

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth()
  const { theme } = useAppTheme()
  const [hasSeenPermissions, setHasSeenPermissions] = useState<boolean | null>(null)
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null)

  useEffect(() => {
    const checkScreens = async () => {
      const seenPermissions = await settingsStorage.getHasSeenPermissions()
      const seenWelcome = await settingsStorage.getHasSeenWelcome()
      setHasSeenPermissions(seenPermissions)
      setHasSeenWelcome(seenWelcome)
    }
    checkScreens()
  }, [])

  console.log(
    "🏠 Index component - isAuthenticated:",
    isAuthenticated,
    "isLoading:",
    isLoading,
    "hasSeenPermissions:",
    hasSeenPermissions,
    "hasSeenWelcome:",
    hasSeenWelcome,
  )

  // Safety check for theme
  const backgroundColor = theme?.colors?.background || "#FFFFFF"
  const tintColor = theme?.colors?.tint || "#0071ce"

  if (isLoading || hasSeenPermissions === null || hasSeenWelcome === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: backgroundColor,
        }}
      >
        <ActivityIndicator size="large" color={tintColor} />
      </View>
    )
  }

  if (isAuthenticated) {
    console.log("🎯 Redirecting to dashboard")
    return <Redirect href="/(tabs)/dashboard" />
  }

  // Flow: splash → welcome → login → privacy policy → location consent → permissions → device scan
  if (!hasSeenWelcome) {
    console.log("👋 Redirecting to welcome")
    return <Redirect href="/welcome" />
  }

  // REMOVED: Automatic redirect to /permissions screen
  // Permissions flow is now: Login → Privacy Policy → Location Consent → Permissions → Device Scan
  // Users will reach permissions through the proper consent flow

  console.log("🔑 Redirecting to login")
  return <Redirect href="/login" />
}
