// theme color tokens and palette configurations
// includes cyber pink/teal from user reference image and minimal neutral

export type ThemeMode = 'dark' | 'light' | 'system';
export type ThemePalette = 'cyber' | 'neutral';

export interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  border: string;
  primary: string;
  primaryText: string;
  secondary: string;
  accent: string;
  accentPink: string;
  accentTeal: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  inputBg: string;
  inputBorder: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  success: string;
  danger: string;
  warning: string;
  isDark: boolean;
}

export const CYBER_LIGHT: ThemeColors = {
  background: '#fcf8fa',
  card: '#ffffff',
  cardAlt: '#f6eff3',
  border: '#ebdbe4',
  primary: '#ff2d95',
  primaryText: '#ffffff',
  secondary: '#008c9e',
  accent: '#00d4c7',
  accentPink: '#ff95d5',
  accentTeal: '#008c9e',
  text: '#171216',
  textMuted: '#6e616b',
  textSubtle: '#998b95',
  inputBg: '#f6eff3',
  inputBorder: '#ebdbe4',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#ebdbe4',
  tabActive: '#ff2d95',
  tabInactive: '#998b95',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  isDark: false,
};

export const CYBER_DARK: ThemeColors = {
  background: '#0c0a0e',
  card: '#161219',
  cardAlt: '#211c26',
  border: '#2c2433',
  primary: '#ff2d95',
  primaryText: '#ffffff',
  secondary: '#00d4c7',
  accent: '#ff95d5',
  accentPink: '#ff95d5',
  accentTeal: '#008c9e',
  text: '#fdfbfe',
  textMuted: '#a396a2',
  textSubtle: '#6d616c',
  inputBg: '#0c0a0e',
  inputBorder: '#2c2433',
  headerBg: '#0c0a0e',
  tabBarBg: '#0c0a0e',
  tabBarBorder: '#1c1622',
  tabActive: '#ff2d95',
  tabInactive: '#6d616c',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  isDark: true,
};

export const NEUTRAL_LIGHT: ThemeColors = {
  background: '#f8f9fa',
  card: '#ffffff',
  cardAlt: '#f1f3f5',
  border: '#e4e7eb',
  primary: '#111827',
  primaryText: '#ffffff',
  secondary: '#059669',
  accent: '#0d9488',
  accentPink: '#ec4899',
  accentTeal: '#0d9488',
  text: '#111827',
  textMuted: '#4b5563',
  textSubtle: '#9ca3af',
  inputBg: '#f1f3f5',
  inputBorder: '#e4e7eb',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e4e7eb',
  tabActive: '#111827',
  tabInactive: '#9ca3af',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  isDark: false,
};

export const NEUTRAL_DARK: ThemeColors = {
  background: '#09090b',
  card: '#18181b',
  cardAlt: '#27272a',
  border: '#27272a',
  primary: '#10b981',
  primaryText: '#ffffff',
  secondary: '#14b8a6',
  accent: '#f43f5e',
  accentPink: '#f43f5e',
  accentTeal: '#14b8a6',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  textSubtle: '#71717a',
  inputBg: '#09090b',
  inputBorder: '#27272a',
  headerBg: '#09090b',
  tabBarBg: '#09090b',
  tabBarBorder: '#18181b',
  tabActive: '#10b981',
  tabInactive: '#71717a',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  isDark: true,
};

export function getThemeColors(mode: 'dark' | 'light', palette: ThemePalette = 'cyber'): ThemeColors {
  if (palette === 'neutral') {
    return mode === 'light' ? NEUTRAL_LIGHT : NEUTRAL_DARK;
  }
  return mode === 'light' ? CYBER_LIGHT : CYBER_DARK;
}
