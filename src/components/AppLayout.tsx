import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/theme';
import PriceTrackerLogo from './PriceTrackerLogo';

type AppLayoutProps = {
  children: React.ReactNode;
  title?: string;
  style?: any;
};

const AppLayout = ({ children, title, style }: AppLayoutProps) => {
  const { colors, theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <PriceTrackerLogo size={32} />
            <Text style={[styles.headerTitle, { color: colors.accent }]}>Price Tracker</Text>
          </View>
          {title && (
            <Text style={[styles.screenTitle, { color: colors.accent }]}>{title}</Text>
          )}
        </View>
        <View style={[styles.content, style]}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 10,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
});

console.log(styles.header); // Check the AppLayout component to see if it's adding any extra padding

export default AppLayout;
