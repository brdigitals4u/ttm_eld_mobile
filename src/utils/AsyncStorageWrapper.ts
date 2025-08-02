import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Check if we're in a browser environment at module load time
const isBrowser = typeof window !== 'undefined';
const isReactNative = Platform.OS !== 'web';

// Platform-safe AsyncStorage wrapper
class AsyncStorageWrapper {
  private isAvailable: boolean;

  constructor() {
    // Check if we're in a browser environment
    this.isAvailable = isBrowser || isReactNative;
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return null;
    }
    
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return;
    }
    
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return;
    }
    
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return keys.map(key => [key, null]);
    }
    
    try {
      const result = await AsyncStorage.multiGet(keys);
      return result as [string, string | null][];
    } catch (error) {
      console.error('AsyncStorage multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  }

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return;
    }
    
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('AsyncStorage multiSet error:', error);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return;
    }
    
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('AsyncStorage multiRemove error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return;
    }
    
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    if (!this.isAvailable) {
      console.warn('AsyncStorage not available in this environment');
      return [];
    }
    
    try {
      const result = await AsyncStorage.getAllKeys();
      return result as string[];
    } catch (error) {
      console.error('AsyncStorage getAllKeys error:', error);
      return [];
    }
  }
}

// Create a mock storage for server-side rendering
const mockStorage = {
  _data: new Map<string, string>(),
  
  async getItem(key: string): Promise<string | null> {
    return this._data.get(key) || null;
  },
  
  async setItem(key: string, value: string): Promise<void> {
    this._data.set(key, value);
  },
  
  async removeItem(key: string): Promise<void> {
    this._data.delete(key);
  },
  
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return keys.map(key => [key, this._data.get(key) || null]);
  },
  
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    for (const [key, value] of keyValuePairs) {
      this._data.set(key, value);
    }
  },
  
  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      this._data.delete(key);
    }
  },
  
  async clear(): Promise<void> {
    this._data.clear();
  },
  
  async getAllKeys(): Promise<string[]> {
    return Array.from(this._data.keys());
  }
};

// Export the appropriate storage based on environment
export const SafeAsyncStorage = isBrowser || isReactNative ? new AsyncStorageWrapper() : mockStorage; 