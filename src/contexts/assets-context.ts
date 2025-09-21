import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Asset, AssetDocument, AssetsState } from '@/types/assets';
import { useAuth } from '@/stores/authStore';

interface AssetsContextType extends AssetsState {
  addAsset: (asset: Omit<Asset, 'id' | 'documents'>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addDocument: (assetId: string, document: Omit<AssetDocument, 'id' | 'uploadedAt'>) => Promise<void>;
  removeDocument: (assetId: string, documentId: string) => Promise<void>;
}

const initialState: AssetsState = {
  assets: [],
  isLoading: false,
  error: null,
};

export const [AssetsProvider, useAssets] = createContextHook(() => {
  const [state, setState] = useState<AssetsState>(initialState);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadAssets = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const assetsJson = await AsyncStorage.getItem('assets');
        
        if (assetsJson) {
          const assets = JSON.parse(assetsJson);
          setState(prev => ({
            ...prev,
            assets,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to load assets:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load assets',
        }));
      }
    };

    loadAssets();
  }, [isAuthenticated]);

  const addAsset = async (assetData: Omit<Asset, 'id' | 'documents'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const newAsset: Asset = {
        ...assetData,
        id: Date.now().toString(),
        documents: [],
      };
      
      const updatedAssets = [...state.assets, newAsset];
      
      await AsyncStorage.setItem('assets', JSON.stringify(updatedAssets));
      
      setState(prev => ({
        ...prev,
        assets: updatedAssets,
        isLoading: false,
      }));
      
      Alert.alert('Success', 'Asset added successfully');
    } catch (error) {
      console.error('Failed to add asset:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to add asset',
      }));
    }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    try {
      const updatedAssets = (state.assets || []).map(asset =>
        asset.id === id ? { ...asset, ...updates } : asset
      );
      
      await AsyncStorage.setItem('assets', JSON.stringify(updatedAssets));
      
      setState(prev => ({
        ...prev,
        assets: updatedAssets,
      }));
    } catch (error) {
      console.error('Failed to update asset:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to update asset',
      }));
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      const updatedAssets = (state.assets || []).filter(asset => asset.id !== id);
      
      await AsyncStorage.setItem('assets', JSON.stringify(updatedAssets));
      
      setState(prev => ({
        ...prev,
        assets: updatedAssets,
      }));
      
      Alert.alert('Success', 'Asset deleted successfully');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to delete asset',
      }));
    }
  };

  const addDocument = async (assetId: string, documentData: Omit<AssetDocument, 'id' | 'uploadedAt'>) => {
    try {
      const newDocument: AssetDocument = {
        ...documentData,
        id: Date.now().toString(),
        uploadedAt: Date.now(),
      };

      const updatedAssets = (state.assets || []).map(asset =>
        asset.id === assetId
          ? { ...asset, documents: [...asset.documents, newDocument] }
          : asset
      );

      await AsyncStorage.setItem('assets', JSON.stringify(updatedAssets));

      setState(prev => ({
        ...prev,
        assets: updatedAssets,
      }));

      Alert.alert('Success', 'Document added successfully');
    } catch (error) {
      console.error('Failed to add document:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to add document',
      }));
    }
  };

  const removeDocument = async (assetId: string, documentId: string) => {
    try {
      const updatedAssets = (state.assets || []).map(asset =>
        asset.id === assetId
          ? { ...asset, documents: asset.documents.filter(doc => doc.id !== documentId) }
          : asset
      );

      await AsyncStorage.setItem('assets', JSON.stringify(updatedAssets));

      setState(prev => ({
        ...prev,
        assets: updatedAssets,
      }));

      Alert.alert('Success', 'Document removed successfully');
    } catch (error) {
      console.error('Failed to remove document:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to remove document',
      }));
    }
  };

  return {
    ...state,
    addAsset,
    updateAsset,
    deleteAsset,
    addDocument,
    removeDocument,
  };
});