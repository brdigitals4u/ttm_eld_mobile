import React from 'react';
import { AssetsProvider } from './assets-context';
import { CarrierProvider } from './carrier-context';
import { CoDriverProvider } from './codriver-context';
import { FuelProvider } from './fuel-context';
import { InspectionProvider } from './inspection-context';
// import { LocationProvider } from './location-context'; // Temporarily disabled
import { StatusProvider } from './status-context';
import { ObdDataProvider } from './obd-data-context';

// Main Context Provider that wraps all contexts (except auth which is now handled by Zustand)
export const AllContextsProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    // <LocationProvider> // Temporarily disabled
      <AssetsProvider>
        <CarrierProvider>
          <CoDriverProvider>
            <FuelProvider>
              <InspectionProvider>
                <StatusProvider>
                  <ObdDataProvider>
                    {children}
                  </ObdDataProvider>
                </StatusProvider>
              </InspectionProvider>
            </FuelProvider>
          </CoDriverProvider>
        </CarrierProvider>
      </AssetsProvider>
    // </LocationProvider> // Temporarily disabled
  );
};
