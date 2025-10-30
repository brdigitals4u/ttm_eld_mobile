import { useEffect, useState } from "react"
import { Slot } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useFonts } from "@expo-google-fonts/space-grotesk"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { initI18n } from "@/i18n"
import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { loadDateFnsLocale } from "@/utils/formatDate"
import { QueryProvider } from "@/providers/QueryProvider"
import { AllContextsProvider } from "@/contexts"
import { ToastProvider } from "@/providers/ToastProvider"

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