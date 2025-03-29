import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePocketBase } from './pocketbase';
import { ClientResponseError, RecordModel } from 'pocketbase';
import { Platform } from 'react-native';

// Define types for our auth context
interface User {
  id: string;
  email: string;
  username: string;
  [key: string]: any; // For other user properties
}

interface AuthContextType {
  isLoggedIn: boolean;
  isInitialized: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ user?: any; error?: any }>;
  signUp: (data: { username: string; email: string; password: string; passwordConfirm: string }) => 
    Promise<{ user?: any; error?: any }>;
  signOut: () => Promise<{ error?: any }>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isInitialized: false,
  user: null,
  signIn: async () => ({ error: 'Not implemented' }),
  signUp: async () => ({ error: 'Not implemented' }),
  signOut: async () => ({ error: 'Not implemented' }),
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to convert PocketBase RecordModel to our User type
const convertToUser = (record: RecordModel): User => {
  const { id, ...otherProps } = record;
  return {
    id,
    email: record.email || '',
    username: record.username || '',
    ...otherProps,
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { pb } = usePocketBase();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check authentication status whenever PocketBase instance changes
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (pb) {
        try {
          const isValid = pb.authStore.isValid;
          setIsLoggedIn(isValid);
          
          if (isValid && pb.authStore.model) {
            setUser(convertToUser(pb.authStore.model));
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error checking auth status:', error);
          setIsLoggedIn(false);
          setUser(null);
        } finally {
          setIsInitialized(true);
        }
      }
    };

    checkAuthStatus();
  }, [pb]);

  // Sign in method
  const signIn = async (email: string, password: string) => {
    if (!pb) return { error: 'PocketBase not initialized' };

    try {
      console.log('Attempting to sign in with:', email);
      
      // Check network connection first
      try {
        const baseUrl = pb.baseUrl;
        console.log(`Testing connection to PocketBase at: ${baseUrl}`);
        
        // Simple fetch to test connectivity
        const response = await fetch(`${baseUrl}/api/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          console.error(`Connection test failed with status: ${response.status}`);
          return { 
            error: {
              message: `Cannot connect to PocketBase server. Status: ${response.status}`,
              networkError: true
            }
          };
        }
        
        console.log('Connection to PocketBase successful');
      } catch (netError) {
        console.error('Network connection error:', netError);
        return { 
          error: {
            message: Platform.OS === 'ios' || Platform.OS === 'android' 
              ? 'Cannot connect to PocketBase server. If using an emulator or physical device, make sure the server IP address is correct.'
              : 'Cannot connect to PocketBase server. Check your network connection.',
            networkError: true,
            details: netError
          }
        };
      }
      
      const response = await pb.collection('users').authWithPassword(email, password);
      console.log('Sign in successful:', response.record.id);
      
      const userData = convertToUser(response.record);
      setUser(userData);
      setIsLoggedIn(true);
      
      return { user: userData };
    } catch (error) {
      console.error('Sign in error:', error);
      
      if (error instanceof ClientResponseError) {
        return { 
          error: {
            message: error.message,
            data: error.data
          } 
        };
      }
      
      return { error: 'Authentication failed' };
    }
  };

  // Sign up method
  const signUp = async ({ 
    username, 
    email, 
    password, 
    passwordConfirm 
  }: { 
    username: string; 
    email: string; 
    password: string; 
    passwordConfirm: string 
  }) => {
    if (!pb) return { error: 'PocketBase not initialized' };

    try {
      console.log('Attempting to create account for:', email);
      
      // Check network connection first
      try {
        const baseUrl = pb.baseUrl;
        console.log(`Testing connection to PocketBase at: ${baseUrl}`);
        
        // Simple fetch to test connectivity
        const response = await fetch(`${baseUrl}/api/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          console.error(`Connection test failed with status: ${response.status}`);
          return { 
            error: {
              message: `Cannot connect to PocketBase server. Status: ${response.status}`,
              networkError: true
            }
          };
        }
        
        console.log('Connection to PocketBase successful');
      } catch (netError) {
        console.error('Network connection error:', netError);
        return { 
          error: {
            message: Platform.OS === 'ios' || Platform.OS === 'android' 
              ? 'Cannot connect to PocketBase server. If using an emulator or physical device, make sure the server IP address is correct.'
              : 'Cannot connect to PocketBase server. Check your network connection.',
            networkError: true,
            details: netError
          }
        };
      }
      
      // Create the user
      const userData = {
        username,
        email,
        password,
        passwordConfirm,
        emailVisibility: true,
      };
      
      const newUser = await pb.collection('users').create(userData);
      console.log('Account created successfully:', newUser.id);
      
      // Automatically sign in after successful registration
      const authResponse = await pb.collection('users').authWithPassword(email, password);
      console.log('Auto sign-in successful after registration');
      
      const userDataConverted = convertToUser(authResponse.record);
      setUser(userDataConverted);
      setIsLoggedIn(true);
      
      return { user: userDataConverted };
    } catch (error) {
      console.error('Sign up error:', error);
      
      if (error instanceof ClientResponseError) {
        return { 
          error: {
            message: error.message,
            data: error.data
          } 
        };
      }
      
      return { error: 'Registration failed' };
    }
  };

  // Sign out method
  const signOut = async () => {
    if (!pb) return { error: 'PocketBase not initialized' };

    try {
      pb.authStore.clear();
      setUser(null);
      setIsLoggedIn(false);
      return {};
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: 'Sign out failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isInitialized,
        user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
