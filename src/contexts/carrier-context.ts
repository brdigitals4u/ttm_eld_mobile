import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { CarrierInfo, CarrierState } from '@/types/carrier';
import { useAuth } from '@/stores/authStore';

interface CarrierContextType extends CarrierState {
  updateCarrierInfo: (info: CarrierInfo) => Promise<void>;
}

const initialState: CarrierState = {
  carrierInfo: null,
  isLoading: false,
  error: null,
};

export const [CarrierProvider, useCarrier] = createContextHook(() => {
  const [state, setState] = useState<CarrierState>(initialState);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadCarrierInfo = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const carrierJson = await AsyncStorage.getItem('carrierInfo');
        
        if (carrierJson) {
          const carrierInfo = JSON.parse(carrierJson);
          setState(prev => ({
            ...prev,
            carrierInfo,
            isLoading: false,
          }));
        } else {
          // Set default carrier info for demo
          const defaultCarrier: CarrierInfo = {
            id: '1',
            name: 'Acme Trucking Co.',
            dotNumber: '123456',
            mcNumber: 'MC-789012',
            address: {
              street: '123 Trucking Way',
              city: 'Transport City',
              state: 'TX',
              zipCode: '75001',
            },
            phone: '(555) 123-4567',
            email: 'dispatch@acmetrucking.com',
            contactPerson: 'John Smith',
            timeZone: 'America/Chicago',
            cycleType: '70-8',
            restartHours: 34,
          };
          
          setState(prev => ({
            ...prev,
            carrierInfo: defaultCarrier,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error('Failed to load carrier info:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load carrier info',
        }));
      }
    };

    loadCarrierInfo();
  }, [isAuthenticated]);

  const updateCarrierInfo = async (info: CarrierInfo) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await AsyncStorage.setItem('carrierInfo', JSON.stringify(info));
      
      setState(prev => ({
        ...prev,
        carrierInfo: info,
        isLoading: false,
      }));
      
      toast.success('Carrier information updated successfully');
    } catch (error) {
      console.error('Failed to update carrier info:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to update carrier info',
      }));
    }
  };

  return {
    ...state,
    updateCarrierInfo,
  };
});