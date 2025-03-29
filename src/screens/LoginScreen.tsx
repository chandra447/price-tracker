import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { LoginScreenNavigationProp } from '../types/navigation';
import { useAuth } from '../context/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signIn, signUp, isLoggedIn } = useAuth();

  // Redirect to Dashboard if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigation.navigate('Dashboard');
    }
  }, [isLoggedIn, navigation]);

  const handleAuth = async () => {
    // Input validation
    if (isSignup) {
      if (!username || !email || !password || !passwordConfirm) {
        setError('All fields are required');
        return;
      }
      if (password !== passwordConfirm) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    } else {
      if (!email || !password) {
        setError('Email and password are required');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      if (isSignup) {
        console.log('Attempting signup with:', { username, email });
        const result = await signUp({ username, email, password, passwordConfirm });
        
        if (result.error) {
          console.error('Signup error:', result.error);
          let errorMessage = 'Registration failed. Please try again.';
          
          if (typeof result.error === 'object' && result.error.message) {
            errorMessage = result.error.message;
            
            // Handle specific PocketBase error messages
            if (errorMessage.includes('email already exists')) {
              errorMessage = 'Email already registered. Please use a different email or login.';
            } else if (errorMessage.includes('validation')) {
              errorMessage = 'Validation error: ' + errorMessage;
            }
          }
          
          setError(errorMessage);
        } else {
          console.log('Signup successful');
          navigation.navigate('Dashboard');
        }
      } else {
        console.log('Attempting login with:', { email });
        const result = await signIn(email, password);
        
        if (result.error) {
          console.error('Login error:', result.error);
          let errorMessage = 'Authentication failed. Please try again.';
          
          if (typeof result.error === 'object' && result.error.message) {
            errorMessage = result.error.message;
            
            // Handle specific PocketBase error messages
            if (errorMessage.includes('invalid credentials') || errorMessage.includes('authentication failed')) {
              errorMessage = 'Invalid email or password. Please try again.';
            } else if (errorMessage.includes('failed to fetch')) {
              errorMessage = 'Network error. Please check your connection and ensure PocketBase server is running.';
            }
          }
          
          setError(errorMessage);
        } else {
          console.log('Login successful');
          navigation.navigate('Dashboard');
        }
      }
    } catch (err) {
      console.error('Unexpected authentication error:', err);
      
      let errorMessage = 'Authentication failed. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      
      // For debugging in development
      if (__DEV__) {
        Alert.alert('Debug Info', `Error type: ${err instanceof Error ? err.constructor.name : typeof err}\nMessage: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>{isSignup ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>Price Tracker App</Text>

            {isSignup && (
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {isSignup && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry
              />
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {isLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <TouchableOpacity
                style={styles.authButton}
                onPress={handleAuth}
                disabled={isLoading}
              >
                <Text style={styles.authButtonText}>{isSignup ? 'Sign Up' : 'Login'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
            >
              <Text style={styles.toggleText}>
                {isSignup ? 'Already have an account? Login' : 'Need an account? Sign up'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    height: 50,
    borderColor: '#e1e1e1',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  error: {
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 14,
  },
  authButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
