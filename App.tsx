import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { PocketBaseProvider } from './src/context/pocketbase';
import { AuthProvider } from './src/context/auth';
import { StatusBar } from 'react-native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';

const Stack = createNativeStackNavigator();

// Define a theme for React Native Paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007AFF',
    accent: '#f1c40f',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <PaperProvider theme={theme}>
        <PocketBaseProvider>
          <AuthProvider>
            <NavigationContainer>
              <Stack.Navigator 
                initialRouteName="Login"
                screenOptions={{
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: '#f8f9fa',
                  },
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                  contentStyle: {
                    backgroundColor: '#ffffff',
                  }
                }}
              >
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen} 
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Analytics" component={AnalyticsScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </AuthProvider>
        </PocketBaseProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
