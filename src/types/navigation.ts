import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Analytics: undefined;
};

export type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

export type DashboardScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

export type AnalyticsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Analytics'
>;
