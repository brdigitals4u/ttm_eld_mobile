import { AssetsProvider } from "./assets-context"
import { CarrierProvider } from "./carrier-context"
import { ChatSupportProvider } from "./ChatSupportContext"
import { CoDriverProvider } from "./codriver-context"
import { FuelProvider } from "./fuel-context"
import { InspectionProvider } from "./inspection-context"
import { LocationProvider } from "./location-context"
import { ObdDataProvider } from "./obd-data-context"
import { StatusProvider } from "./status-context"
import { TokenRefreshProvider } from "./token-refresh-context"
// Main Context Provider that wraps all contexts (except auth which is now handled by Zustand)
export const AllContextsProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <TokenRefreshProvider>
      <LocationProvider>
        <AssetsProvider>
          <CarrierProvider>
            <CoDriverProvider>
              <FuelProvider>
                <InspectionProvider>
                  <StatusProvider>
                    <ObdDataProvider>
                      <ChatSupportProvider>{children}</ChatSupportProvider>
                    </ObdDataProvider>
                  </StatusProvider>
                </InspectionProvider>
              </FuelProvider>
            </CoDriverProvider>
          </CarrierProvider>
        </AssetsProvider>
      </LocationProvider>
    </TokenRefreshProvider>
  )
}
