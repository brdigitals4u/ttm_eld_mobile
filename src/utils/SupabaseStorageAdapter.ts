// Custom storage adapter for Supabase that handles server-side rendering
class SupabaseStorageAdapter {
  private _data: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return this._data.get(key) || null;
      }
      
      // Use AsyncStorage if available
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('Storage getItem failed, using fallback:', error);
      return this._data.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        this._data.set(key, value);
        return;
      }
      
      // Use AsyncStorage if available
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('Storage setItem failed, using fallback:', error);
      this._data.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        this._data.delete(key);
        return;
      }
      
      // Use AsyncStorage if available
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('Storage removeItem failed, using fallback:', error);
      this._data.delete(key);
    }
  }
}

export const supabaseStorage = new SupabaseStorageAdapter(); 