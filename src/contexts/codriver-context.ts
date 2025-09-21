import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { CoDriver, CoDriverState } from '@/types/codriver';
import { useAuth } from '@/stores/authStore';

interface CoDriverContextType extends CoDriverState {
  addCoDriver: (coDriver: Omit<CoDriver, 'id' | 'addedAt'>) => Promise<void>;
  removeCoDriver: (id: string) => Promise<void>;
  setActiveCoDriver: (id: string | null) => Promise<void>;
}

const initialState: CoDriverState = {
  coDrivers: [],
  activeCoDriver: null,
  isLoading: false,
  error: null,
};

export const [CoDriverProvider, useCoDriver] = createContextHook(() => {
  const [state, setState] = useState<CoDriverState>(initialState);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadCoDrivers = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const coDriversJson = await AsyncStorage.getItem('coDrivers');
        const activeCoDriverJson = await AsyncStorage.getItem('activeCoDriver');
        
        if (coDriversJson) {
          const coDrivers = JSON.parse(coDriversJson);
          let activeCoDriver = null;
          
          if (activeCoDriverJson) {
            const activeId = JSON.parse(activeCoDriverJson);
            activeCoDriver = coDrivers.find((cd: CoDriver) => cd.id === activeId) || null;
          }
          
          setState(prev => ({
            ...prev,
            coDrivers,
            activeCoDriver,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to load co-drivers:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load co-drivers',
        }));
      }
    };

    loadCoDrivers();
  }, [isAuthenticated]);

  const addCoDriver = async (coDriverData: Omit<CoDriver, 'id' | 'addedAt'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const newCoDriver: CoDriver = {
        ...coDriverData,
        id: Date.now().toString(),
        addedAt: Date.now(),
      };
      
      const updatedCoDrivers = [...state.coDrivers, newCoDriver];
      
      await AsyncStorage.setItem('coDrivers', JSON.stringify(updatedCoDrivers));
      
      setState(prev => ({
        ...prev,
        coDrivers: updatedCoDrivers,
        isLoading: false,
      }));
      
      Alert.alert('Success', 'Co-driver added successfully');
    } catch (error) {
      console.error('Failed to add co-driver:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to add co-driver',
      }));
    }
  };

  const removeCoDriver = async (id: string) => {
    try {
      const updatedCoDrivers = state.coDrivers.filter(cd => cd.id !== id);
      
      await AsyncStorage.setItem('coDrivers', JSON.stringify(updatedCoDrivers));
      
      // If removing active co-driver, clear it
      let activeCoDriver = state.activeCoDriver;
      if (activeCoDriver?.id === id) {
        activeCoDriver = null;
        await AsyncStorage.removeItem('activeCoDriver');
      }
      
      setState(prev => ({
        ...prev,
        coDrivers: updatedCoDrivers,
        activeCoDriver,
      }));
      
      Alert.alert('Success', 'Co-driver removed successfully');
    } catch (error) {
      console.error('Failed to remove co-driver:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to remove co-driver',
      }));
    }
  };

  const setActiveCoDriver = async (id: string | null) => {
    try {
      let activeCoDriver = null;
      
      if (id) {
        activeCoDriver = state.coDrivers.find(cd => cd.id === id) || null;
        await AsyncStorage.setItem('activeCoDriver', JSON.stringify(id));
      } else {
        await AsyncStorage.removeItem('activeCoDriver');
      }
      
      setState(prev => ({
        ...prev,
        activeCoDriver,
      }));
    } catch (error) {
      console.error('Failed to set active co-driver:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to set active co-driver',
      }));
    }
  };

  return {
    ...state,
    addCoDriver,
    removeCoDriver,
    setActiveCoDriver,
  };
});