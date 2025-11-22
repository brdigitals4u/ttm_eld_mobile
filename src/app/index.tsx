import React, { useEffect, useState } from "react"
import { View, ActivityIndicator } from "react-native"
import { Redirect } from "expo-router"

import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { settingsStorage } from "@/utils/storage"
import { BetaBanner } from "@/components/BetaBanner"

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

  console.log("🏠 Index component - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "hasSeenPermissions:", hasSeenPermissions, "hasSeenWelcome:", hasSeenWelcome)

  if (isLoading || hasSeenPermissions === null || hasSeenWelcome === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <BetaBanner />
      </View>
    )
  }

  if (isAuthenticated) {
    console.log("🎯 Redirecting to dashboard")
    return <Redirect href="/(tabs)/dashboard" />
  }

  // Check permissions first (after splash, before welcome)
  if (!hasSeenPermissions) {
    console.log("🔐 Redirecting to permissions")
    return <Redirect href="/permissions" />
  }

  if (!hasSeenWelcome) {
    console.log("👋 Redirecting to welcome")
    return <Redirect href="/welcome" />
  }

  console.log("🔑 Redirecting to login")
  return <Redirect href="/login" />
}
