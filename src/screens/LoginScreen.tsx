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
import { useAuth } from '../context/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/theme';
import PriceTrackerLogo from '../components/PriceTrackerLogo';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { z } from 'zod';
import type { LoginScreenNavigationProp, RootStackParamList } from '../types/navigation';

// Define validation schemas
const emailSchema = z.string().email('Invalid email format');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: emailSchema,
  password: passwordSchema,
  passwordConfirm: z.string()
}).refine(data => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"]
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

type ValidationErrors = {
  username?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
};

export default function LoginScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signIn, signUp, isLoggedIn } = useAuth();
  const { colors, theme } = useTheme();

  // Redirect to Main if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigation.navigate('Main');
    }
  }, [isLoggedIn, navigation]);

  // Check if passwords match whenever either password field changes
  useEffect(() => {
    if (isSignup && password && passwordConfirm) {
      setPasswordsMatch(password === passwordConfirm);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, passwordConfirm, isSignup]);

  // Validate form fields as they change
  useEffect(() => {
    if (isSignup) {
      try {
        // Validate each field individually to provide specific error messages
        if (username) {
          z.string().min(3, 'Username must be at least 3 characters').parse(username);
          setValidationErrors(prev => ({ ...prev, username: undefined }));
        }
        
        if (email) {
          emailSchema.parse(email);
          setValidationErrors(prev => ({ ...prev, email: undefined }));
        }
        
        if (password) {
          passwordSchema.parse(password);
          setValidationErrors(prev => ({ ...prev, password: undefined }));
        }
        
        if (password && passwordConfirm) {
          if (password !== passwordConfirm) {
            setValidationErrors(prev => ({ ...prev, passwordConfirm: "Passwords don't match" }));
          } else {
            setValidationErrors(prev => ({ ...prev, passwordConfirm: undefined }));
          }
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          const fieldErrors: ValidationErrors = {};
          err.errors.forEach(error => {
            const path = error.path[0] as keyof ValidationErrors;
            fieldErrors[path] = error.message;
          });
          setValidationErrors(prev => ({ ...prev, ...fieldErrors }));
        }
      }
    } else {
      // Login validation is simpler
      setValidationErrors({});
    }
  }, [username, email, password, passwordConfirm, isSignup]);

  const handleAuth = async () => {
    // Validate the entire form before submission
    setError('');
    
    if (isSignup) {
      try {
        signupSchema.parse({ username, email, password, passwordConfirm });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const fieldErrors: ValidationErrors = {};
          err.errors.forEach(error => {
            const path = error.path[0] as keyof ValidationErrors;
            fieldErrors[path] = error.message;
          });
          setValidationErrors(fieldErrors);
          setError('Please fix the validation errors');
          return;
        }
      }
    } else {
      try {
        loginSchema.parse({ email, password });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const fieldErrors: ValidationErrors = {};
          err.errors.forEach(error => {
            const path = error.path[0] as keyof ValidationErrors;
            fieldErrors[path] = error.message;
          });
          setValidationErrors(fieldErrors);
          setError('Please fix the validation errors');
          return;
        }
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
          navigation.navigate('Main');
        }
      } else {
        console.log('Attempting login with:', { email });
        const result = await signIn(email, password);

        if (result.error) {
          console.error('Login error:', result.error);
          let errorMessage = 'Login failed. Please check your credentials.';

          if (typeof result.error === 'object' && result.error.message) {
            errorMessage = result.error.message;
          }

          setError(errorMessage);
        } else {
          console.log('Login successful');
          navigation.navigate('Main');
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
            <View style={styles.logoContainer}>
              <PriceTrackerLogo size={120} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Price Tracker App</Text>

            {isSignup && (
              <TextInput
                style={[styles.input, { 
                  borderColor: validationErrors.username ? '#e74c3c' : colors.border, 
                  color: colors.text 
                }]}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                selectionColor={colors.accent}
              />
            )}
            {isSignup && validationErrors.username && (
              <Text style={styles.fieldError}>{validationErrors.username}</Text>
            )}

            <TextInput
              style={[styles.input, { 
                borderColor: validationErrors.email ? '#e74c3c' : colors.border, 
                color: colors.text 
              }]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor={colors.accent}
            />
            {validationErrors.email && (
              <Text style={styles.fieldError}>{validationErrors.email}</Text>
            )}

            <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      borderColor: validationErrors.password ? '#e74c3c' : colors.border, 
                      color: colors.text, 
                      paddingRight: 50 
                    }
                  ]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  selectionColor={colors.accent}
                />
                <TouchableOpacity 
                  style={styles.passwordToggle} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={24} 
                    color={colors.accent} 
                  />
                </TouchableOpacity>
            </View>
            {validationErrors.password && (
              <Text style={styles.fieldError}>{validationErrors.password}</Text>
            )}

            {isSignup && (
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      borderColor: validationErrors.passwordConfirm ? '#e74c3c' : colors.border, 
                      color: colors.text, 
                      paddingRight: 50 
                    }
                  ]}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.textSecondary}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  secureTextEntry={!showConfirmPassword}
                  selectionColor={colors.accent}
                />
                <TouchableOpacity 
                  style={styles.passwordToggle} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon 
                    name={showConfirmPassword ? 'eye-off' : 'eye'} 
                    size={24} 
                    color={colors.accent} 
                  />
                </TouchableOpacity>
              </View>
            )}
            {isSignup && validationErrors.passwordConfirm && (
              <Text style={styles.fieldError}>{validationErrors.passwordConfirm}</Text>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.accent }]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isSignup ? 'Sign Up' : 'Login'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
            >
              <Text style={[styles.toggleText, { color: colors.accent }]}>
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  formContainer: {
    padding: 20,
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
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
    top: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  fieldError: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    paddingHorizontal: 2,
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
    fontSize: 14,
  },
  authButton: {
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
