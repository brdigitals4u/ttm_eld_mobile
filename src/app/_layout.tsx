import { useEffect, useState } from "react"
import { Platform } from "react-native"
import { useFonts } from "expo-font"
import { Slot } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { notificationsApi } from "@/api/notifications"
import { BackgroundServices } from "@/components/BackgroundServices"
import { AllContextsProvider } from "@/contexts"
import { initI18n } from "@/i18n"
import { QueryProvider } from "@/providers/QueryProvider"
import { ToastProvider } from "@/providers/ToastProvider"
import { analyticsService } from "@/services/AnalyticsService"
import { initFreshchat } from "@/services/freshchat"
import { NotificationService } from "@/services/NotificationService"
import { ThemeProvider } from "@/theme/context"
import { ThemeTransitionOverlay } from "@/components/ThemeTransitionOverlay"
import { customFontsToLoad } from "@/theme/typography"
import { loadDateFnsLocale } from "@/utils/formatDate"

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

  useEffect(() => {
    initFreshchat()

    // Initialize security services
    import("../services/SecurityService").then(({ securityService }) => {
      securityService.performSecurityCheck().catch(console.error)
      // Optionally start periodic checks
      // securityService.startPeriodicChecks(60000) // Check every minute
    })

    // Initialize secure config
    import("../services/SecureConfigService").then(({ secureConfigService }) => {
      secureConfigService.initialize().catch(console.error)
    })
  }, [])

  // Initialize push notifications (registration happens in BackgroundServices)
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await NotificationService.initialize()
        console.log("✅ Notification service initialized")
      } catch (error) {
        console.error("❌ Failed to setup notifications:", error)
      }
    }

    setupNotifications()

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup()
    }
  }, [])

  // Initialize Firebase Analytics
  useEffect(() => {
    const setupAnalytics = async () => {
      try {
        await analyticsService.initialize()
      } catch (error) {
        console.error("❌ Failed to initialize analytics:", error)
      }
    }

    setupAnalytics()
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <QueryProvider>
            <AllContextsProvider>
              <ThemeProvider>
                <ThemeTransitionOverlay />
                <ToastProvider>
                  <BackgroundServices />
                  <KeyboardProvider>
                    <Slot />
                  </KeyboardProvider>
                </ToastProvider>
              </ThemeProvider>
            </AllContextsProvider>
          </QueryProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}
