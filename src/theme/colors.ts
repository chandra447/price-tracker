// Theme colors for the app

export const colors = {
  light: {
    background: '#F5F5DC', // Beige background for light mode
    accent: '#da7756',     // Accent color (same for both modes)
    text: '#333333',
    textSecondary: '#666666',
    card: '#ffffff',
    border: '#e0e0e0',
    input: '#f9f9f9',
    inputBorder: '#ebebeb',
    statusBar: 'dark-content',
    tabBar: '#ffffff',
    tabBarActive: '#da7756',
    tabBarInactive: 'rgba(218, 119, 86, 0.6)',
  },
  dark: {
    background: '#121212',  // Dark background for dark mode
    accent: '#da7756',      // Accent color (same for both modes)
    text: '#f5f5f5',
    textSecondary: '#aaaaaa',
    card: '#1e1e1e',
    border: '#333333',
    input: '#2a2a2a',
    inputBorder: '#3a3a3a',
    statusBar: 'light-content',
    tabBar: '#1a1a1a',
    tabBarActive: '#da7756',
    tabBarInactive: 'rgba(218, 119, 86, 0.6)',
  }
};

export type ThemeType = 'light' | 'dark';

export const getThemeColors = (theme: ThemeType) => {
  return colors[theme];
};
