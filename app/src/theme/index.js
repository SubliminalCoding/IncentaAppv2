import { DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976D2',
    accent: '#FF4081',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#212121',
    error: '#D32F2F',
    success: '#388E3C',
    warning: '#F57C00',
    info: '#0288D1',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    s: 4,
    m: 8,
    l: 16,
    xl: 24,
  },
  elevation: {
    small: 2,
    medium: 4,
    large: 8,
  },
};

export default theme; 