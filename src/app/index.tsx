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
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null)

  useEffect(() => {
    const checkWelcomeScreen = async () => {
      const seen = await settingsStorage.getHasSeenWelcome()
      setHasSeenWelcome(seen)
    }
    checkWelcomeScreen()
  }, [])

  console.log("🏠 Index component - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "hasSeenWelcome:", hasSeenWelcome)

  if (isLoading || hasSeenWelcome === null) {
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

  if (!hasSeenWelcome) {
    console.log("👋 Redirecting to welcome")
    return <Redirect href="/welcome" />
  }

  console.log("🔑 Redirecting to login")
  return <Redirect href="/login" />
}
