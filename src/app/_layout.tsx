import { useEffect, useState } from "react"
import { useFonts } from "expo-font"
import { Slot } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"
import { Platform } from "react-native"

import { AllContextsProvider } from "@/contexts"
import { initI18n } from "@/i18n"
import { QueryProvider } from "@/providers/QueryProvider"
import { ToastProvider } from "@/providers/ToastProvider"
import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { loadDateFnsLocale } from "@/utils/formatDate"
import { NotificationService } from "@/services/NotificationService"
import { notificationsApi } from "@/api/notifications"
import { BackgroundServices } from "@/components/BackgroundServices"

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

// Optional: configure fade-out per Expo docs
SplashScreen.setOptions({
  duration: 800,
  fade: true,
})

if (__DEV__) {
  // Load Reactotron configuration in development. We don't want to
  // include this in our production bundle, so we are using `if (__DEV__)`
  // to only execute this in development.
  require("src/devtools/ReactotronConfig.ts")
}

export { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary"

export default function Root() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [splashSafeTimeoutDone, setSplashSafeTimeoutDone] = useState(false)

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  // Initialize push notifications (registration happens in BackgroundServices)
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await NotificationService.initialize()
        console.log('✅ Notification service initialized')
      } catch (error) {
        console.error('❌ Failed to setup notifications:', error)
      }
    }

    setupNotifications()

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup()
    }
  }, [])

  const loaded = fontsLoaded && isI18nInitialized

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])


  // Safety: ensure splash hides even if something hangs in dev
  useEffect(() => {
    const t = setTimeout(() => setSplashSafeTimeoutDone(true), 4000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (splashSafeTimeoutDone) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [splashSafeTimeoutDone])

  if (!loaded) {
    return null
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryProvider>
        <AllContextsProvider>
          <ThemeProvider>
            <ToastProvider>
              <BackgroundServices />
              <KeyboardProvider>
                <Slot />
              </KeyboardProvider>
            </ToastProvider>
          </ThemeProvider>
        </AllContextsProvider>
      </QueryProvider>
    </SafeAreaProvider>
  )
}
