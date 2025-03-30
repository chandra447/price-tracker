import 'react-native-reanimated';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { PocketBaseProvider } from './src/context/pocketbase';
import { AuthProvider } from './src/context/auth';
import { StatusBar } from 'react-native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AccountScreen from './src/screens/AccountScreen';
import { ThemeProvider, useTheme } from './src/context/theme';

const Tab = createBottomTabNavigator();
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

// Add this type definition at the top of App.tsx
type TabIconProps = {
  color: string;
  size: number;
};

function MainTabs() {
  const { colors, theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: colors.tabBar,
          height: 85,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 3,
          marginBottom: Platform.OS === 'ios' ? 1 : 1,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        }
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Icon name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <PaperProvider>
          <PocketBaseProvider>
            <AuthProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </AuthProvider>
          </PocketBaseProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { colors, theme } = useTheme();

  return (
    <>
      <StatusBar barStyle={colors.statusBar as any} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              presentation: 'modal'
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
