import '../src/utils/GlobalPolyfills';
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GlobalProvider } from "@/src/contexts/GlobalContext";
import { initSentry } from "@/src/services/SentryService";
import { initFirebase } from "@/src/services/FirebaseService";
import { AuthProvider } from "@/context/auth-context";
import { EldProvider } from "@/context/eld-context";
import { StatusProvider } from "@/context/status-context";
import { ThemeProvider } from "@/context/theme-context";
import { CoDriverProvider } from "@/context/codriver-context";
import { FuelProvider } from "@/context/fuel-context";
import { InspectionProvider } from "@/context/inspection-context";
import { AssetsProvider } from "@/context/assets-context";
import { CarrierProvider } from "@/context/carrier-context";
import { AnalyticsProvider } from "@/src/context/analytics-context";
import { VehicleSetupProvider } from "@/context/vehicle-setup-context";


export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(app)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}


export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Initialize services after fonts are loaded
      const initializeApp = async () => {
        try {
          // Initialize Sentry
          initSentry();
          
          // Initialize Firebase
          await initFirebase();
          
          // Hide splash screen after everything is ready
          await SplashScreen.hideAsync();
        } catch (err) {
          console.error('App initialization failed:', err);
          await SplashScreen.hideAsync();
        }
      };
      
      initializeApp();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" translucent backgroundColor="transparent" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GlobalProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <CarrierProvider>
                  <EldProvider>
                    <StatusProvider>
                      <CoDriverProvider>
                        <FuelProvider>
                          <InspectionProvider>
                            <AssetsProvider>
                              <AnalyticsProvider>
                                <VehicleSetupProvider>
                                  <RootLayoutNav />
                                </VehicleSetupProvider>
                              </AnalyticsProvider>
                            </AssetsProvider>
                          </InspectionProvider>
                        </FuelProvider>
                      </CoDriverProvider>
                    </StatusProvider>
                  </EldProvider>
                </CarrierProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </GlobalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
