import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import PocketBase, { AsyncAuthStore } from 'pocketbase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Create a context for PocketBase
const PocketBaseContext = createContext<{ pb: PocketBase | null }>({ pb: null });

// Custom hook to use PocketBase context
export const usePocketBase = () => useContext(PocketBaseContext);

interface PocketBaseProviderProps {
  children: ReactNode;
}

export const PocketBaseProvider: React.FC<PocketBaseProviderProps> = ({ children }) => {
  const [pb, setPb] = useState<PocketBase | null>(null);

  useEffect(() => {
    const initializePocketBase = async () => {
      try {
        // Get PocketBase URL from app.config.js
        const pocketbaseUrl = Constants.expoConfig?.extra?.pocketbaseUrl || 'http://localhost:8090';
        console.log('Initializing PocketBase connection to:', pocketbaseUrl);

        // Get the initial auth data from AsyncStorage
        const initialAuth = await AsyncStorage.getItem('pb_auth') || '';

        // Create an AsyncAuthStore to persist authentication
        const store = new AsyncAuthStore({
          save: async (serialized) => {
            console.log('Saving auth session to AsyncStorage');
            await AsyncStorage.setItem('pb_auth', serialized);
          },
          initial: initialAuth,
          clear: async () => {
            console.log('Clearing auth session from AsyncStorage');
            await AsyncStorage.removeItem('pb_auth');
          },
        });

        // Create a new PocketBase instance with the AsyncAuthStore
        const pbInstance = new PocketBase(pocketbaseUrl, store);
        
        // Check if we have a valid session
        if (pbInstance.authStore.isValid) {
          console.log('Found valid auth session:', pbInstance.authStore.model?.id);
        } else {
          console.log('No valid auth session found');
        }
        
        setPb(pbInstance);
      } catch (error) {
        console.error('Error initializing PocketBase:', error);
      }
    };

    initializePocketBase();
  }, []);

  return (
    <PocketBaseContext.Provider value={{ pb }}>
      {children}
    </PocketBaseContext.Provider>
  );
};

export default PocketBaseProvider;
