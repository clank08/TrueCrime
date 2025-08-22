import { Platform } from 'react-native';

// Create a storage interface that works across all platforms
interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Web storage implementation
const webStorage: Storage = {
  getItem: async (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail
    }
  },
  removeItem: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
};

// React Native storage implementation
let nativeStorage: Storage;
try {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  nativeStorage = AsyncStorage;
} catch {
  // Fallback for web
  nativeStorage = webStorage;
}

// Export the appropriate storage based on platform
export const storage: Storage = Platform.OS === 'web' ? webStorage : nativeStorage;