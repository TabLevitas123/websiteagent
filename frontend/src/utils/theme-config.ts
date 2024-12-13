// src/styles/theme.ts
import { createTheme } from '@/lib/create-theme';

export interface ThemeConfig {
  colors: typeof defaultColors;
  animation: typeof defaultAnimation;
  breakpoints: typeof defaultBreakpoints;
}

const defaultColors = {
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1'
  },
  background: {
    primary: '#000000',
    secondary: '#111827',
    tertiary: '#1F2937'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    disabled: '#64748B'
  },
  accent: {
    blue: '#60A5FA',
    purple: '#A78BFA',
    cyan: '#67E8F9'
  }
};
  animation: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)'
    },
    duration: {
      fastest: '100ms',
      fast: '200ms',
      normal: '300ms',
      slow: '400ms',
      slowest: '500ms'
    }
  },
  breakpoints: {
    xs: '320px',    // Small phones
    sm: '640px',    // Large phones/Small tablets
    md: '768px',    // Tablets
    lg: '1024px',   // Laptops/Desktops
    xl: '1280px',   // Large Desktops
    '2xl': '1536px' // Extra Large Screens
  },
const defaultAnimation = {
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)'
  },
  duration: {
    fastest: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '400ms',
    slowest: '500ms'
  }
};

const defaultBreakpoints = {
  xs: '320px',    // Small phones
  sm: '640px',    // Large phones/Small tablets
  md: '768px',    // Tablets
  lg: '1024px',   // Laptops/Desktops
  xl: '1280px',   // Large Desktops
  '2xl': '1536px' // Extra Large Screens
};

export const defaultTheme = createTheme();
export default defaultTheme;