import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Inspection, InspectionItem, InspectionState } from '@/types/inspection';
import { useAuth } from './auth-context';

interface InspectionContextType extends InspectionState {
  startInspection: (type: 'pre-trip' | 'post-trip' | 'dot') => Promise<void>;
  updateInspectionItem: (itemId: string, status: 'pass' | 'fail' | 'na', notes?: string) => Promise<void>;
  completeInspection: (signature: string) => Promise<void>;
  getInspectionTemplate: (type: 'pre-trip' | 'post-trip' | 'dot') => InspectionItem[];
}

const PRE_TRIP_TEMPLATE: InspectionItem[] = [
  { id: '1', category: 'Engine Compartment', item: 'Engine oil level', isRequired: true, status: 'pending' },
  { id: '2', category: 'Engine Compartment', item: 'Coolant level', isRequired: true, status: 'pending' },
  { id: '3', category: 'Engine Compartment', item: 'Power steering fluid', isRequired: true, status: 'pending' },
  { id: '4', category: 'Engine Compartment', item: 'Windshield washer fluid', isRequired: false, status: 'pending' },
  { id: '5', category: 'Engine Compartment', item: 'Battery condition', isRequired: true, status: 'pending' },
  { id: '6', category: 'Lights', item: 'Headlights', isRequired: true, status: 'pending' },
  { id: '7', category: 'Lights', item: 'Tail lights', isRequired: true, status: 'pending' },
  { id: '8', category: 'Lights', item: 'Turn signals', isRequired: true, status: 'pending' },
  { id: '9', category: 'Lights', item: 'Hazard lights', isRequired: true, status: 'pending' },
  { id: '10', category: 'Tires', item: 'Tire condition and tread depth', isRequired: true, status: 'pending' },
  { id: '11', category: 'Tires', item: 'Tire pressure', isRequired: true, status: 'pending' },
  { id: '12', category: 'Brakes', item: 'Brake system', isRequired: true, status: 'pending' },
  { id: '13', category: 'Brakes', item: 'Air brake system (if applicable)', isRequired: false, status: 'pending' },
  { id: '14', category: 'Safety Equipment', item: 'Fire extinguisher', isRequired: true, status: 'pending' },
  { id: '15', category: 'Safety Equipment', item: 'Emergency triangles', isRequired: true, status: 'pending' },
  { id: '16', category: 'Safety Equipment', item: 'First aid kit', isRequired: false, status: 'pending' },
];

const initialState: InspectionState = {
  inspections: [],
  currentInspection: null,
  isLoading: false,
  error: null,
};

export const [InspectionProvider, useInspection] = createContextHook(() => {
  const [state, setState] = useState<InspectionState>(initialState);
  const { isAuthenticated, user, vehicleInfo } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadInspections = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const inspectionsJson = await AsyncStorage.getItem('inspections');
        
        if (inspectionsJson) {
          const inspections = JSON.parse(inspectionsJson);
          setState(prev => ({
            ...prev,
            inspections,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to load inspections:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load inspections',
        }));
      }
    };

    loadInspections();
  }, [isAuthenticated]);

  const getInspectionTemplate = (type: 'pre-trip' | 'post-trip' | 'dot'): InspectionItem[] => {
    // For now, using the same template for all types
    // In a real app, you'd have different templates
    return PRE_TRIP_TEMPLATE.map(item => ({ ...item, status: 'pending' }));
  };

  const startInspection = async (type: 'pre-trip' | 'post-trip' | 'dot') => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const newInspection: Inspection = {
        id: Date.now().toString(),
        type,
        vehicleId: vehicleInfo?.vehicleNumber || 'unknown',
        driverId: user?.id || 'unknown',
        startTime: Date.now(),
        items: getInspectionTemplate(type),
        overallStatus: 'pending',
      };
      
      setState(prev => ({
        ...prev,
        currentInspection: newInspection,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to start inspection:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to start inspection',
      }));
    }
  };

  const updateInspectionItem = async (itemId: string, status: 'pass' | 'fail' | 'na', notes?: string) => {
    if (!state.currentInspection) return;

    try {
      const updatedItems = state.currentInspection.items.map(item =>
        item.id === itemId ? { ...item, status, notes } : item
      );

      const updatedInspection = {
        ...state.currentInspection,
        items: updatedItems,
      };

      setState(prev => ({
        ...prev,
        currentInspection: updatedInspection,
      }));
    } catch (error) {
      console.error('Failed to update inspection item:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to update inspection item',
      }));
    }
  };

  const completeInspection = async (signature: string) => {
    if (!state.currentInspection) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Determine overall status
      const hasFailures = state.currentInspection.items.some(item => item.status === 'fail');
      const allCompleted = state.currentInspection.items.every(item => 
        item.status !== 'pending' || !item.isRequired
      );

      const completedInspection: Inspection = {
        ...state.currentInspection,
        endTime: Date.now(),
        signature,
        overallStatus: hasFailures ? 'fail' : allCompleted ? 'pass' : 'pending',
      };

      const updatedInspections = [...state.inspections, completedInspection];

      await AsyncStorage.setItem('inspections', JSON.stringify(updatedInspections));

      setState(prev => ({
        ...prev,
        inspections: updatedInspections,
        currentInspection: null,
        isLoading: false,
      }));

      Alert.alert(
        'Inspection Complete',
        `Inspection ${completedInspection.overallStatus === 'pass' ? 'passed' : 'completed with issues'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to complete inspection:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to complete inspection',
      }));
    }
  };

  return {
    ...state,
    startInspection,
    updateInspectionItem,
    completeInspection,
    getInspectionTemplate,
  };
});