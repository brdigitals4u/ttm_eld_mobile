import { AssetsProvider } from "./assets-context"
import { CarrierProvider } from "./carrier-context"
import { ChatSupportProvider } from "./ChatSupportContext"
import { CoDriverProvider } from "./codriver-context"
import { FuelProvider } from "./fuel-context"
import { HOSStatusProvider } from "./hos-status-context"
import { InspectionProvider } from "./inspection-context"
import { LocationProvider } from "./location-context"
import { ObdDataProvider } from "./obd-data-context"
import { PermissionsProvider } from "./permissions-context"
import { StatusProvider } from "./status-context"
import { TokenRefreshProvider } from "./token-refresh-context"
import { ViolationNotificationProvider } from "./ViolationNotificationContext"
// Main Context Provider that wraps all contexts (except auth which is now handled by Zustand)
export const AllContextsProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <TokenRefreshProvider>
      <PermissionsProvider>
        <LocationProvider>
          <AssetsProvider>
            <CarrierProvider>
              <CoDriverProvider>
                <FuelProvider>
                  <InspectionProvider>
                    <StatusProvider>
                      <HOSStatusProvider>
                        <ObdDataProvider>
                          <ViolationNotificationProvider>
                            <ChatSupportProvider>{children}</ChatSupportProvider>
                          </ViolationNotificationProvider>
                        </ObdDataProvider>
                      </HOSStatusProvider>
                    </StatusProvider>
                  </InspectionProvider>
                </FuelProvider>
              </CoDriverProvider>
            </CarrierProvider>
          </AssetsProvider>
        </LocationProvider>
      </PermissionsProvider>
    </TokenRefreshProvider>
  )
}
