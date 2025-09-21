import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { FuelReceipt, FuelState } from '@/types/fuel';
import { useAuth } from '@/stores/authStore';

interface FuelContextType extends FuelState {
  addFuelReceipt: (receipt: Omit<FuelReceipt, 'id' | 'createdAt'>) => Promise<void>;
  updateFuelReceipt: (id: string, updates: Partial<FuelReceipt>) => Promise<void>;
  deleteFuelReceipt: (id: string) => Promise<void>;
}

const initialState: FuelState = {
  receipts: [],
  isLoading: false,
  error: null,
};

export const [FuelProvider, useFuel] = createContextHook(() => {
  const [state, setState] = useState<FuelState>(initialState);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadFuelReceipts = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const receiptsJson = await AsyncStorage.getItem('fuelReceipts');
        
        if (receiptsJson) {
          const receipts = JSON.parse(receiptsJson);
          setState(prev => ({
            ...prev,
            receipts,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to load fuel receipts:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load fuel receipts',
        }));
      }
    };

    loadFuelReceipts();
  }, [isAuthenticated]);

  const addFuelReceipt = async (receiptData: Omit<FuelReceipt, 'id' | 'createdAt'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const newReceipt: FuelReceipt = {
        ...receiptData,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };
      
      const updatedReceipts = [...state.receipts, newReceipt];
      
      await AsyncStorage.setItem('fuelReceipts', JSON.stringify(updatedReceipts));
      
      setState(prev => ({
        ...prev,
        receipts: updatedReceipts,
        isLoading: false,
      }));
      
      Alert.alert('Success', 'Fuel receipt added successfully');
    } catch (error) {
      console.error('Failed to add fuel receipt:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to add fuel receipt',
      }));
    }
  };

  const updateFuelReceipt = async (id: string, updates: Partial<FuelReceipt>) => {
    try {
      const updatedReceipts = state.receipts.map(receipt =>
        receipt.id === id ? { ...receipt, ...updates } : receipt
      );
      
      await AsyncStorage.setItem('fuelReceipts', JSON.stringify(updatedReceipts));
      
      setState(prev => ({
        ...prev,
        receipts: updatedReceipts,
      }));
    } catch (error) {
      console.error('Failed to update fuel receipt:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to update fuel receipt',
      }));
    }
  };

  const deleteFuelReceipt = async (id: string) => {
    try {
      const updatedReceipts = state.receipts.filter(receipt => receipt.id !== id);
      
      await AsyncStorage.setItem('fuelReceipts', JSON.stringify(updatedReceipts));
      
      setState(prev => ({
        ...prev,
        receipts: updatedReceipts,
      }));
      
      Alert.alert('Success', 'Fuel receipt deleted successfully');
    } catch (error) {
      console.error('Failed to delete fuel receipt:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to delete fuel receipt',
      }));
    }
  };

  return {
    ...state,
    addFuelReceipt,
    updateFuelReceipt,
    deleteFuelReceipt,
  };
});