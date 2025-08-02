import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
  initialRouteName: "(tabs)",
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


  useEffect(() => {
    // Initialize Sentry
    initSentry();
    
    // Initialize Firebase
    initFirebase();
    
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
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
