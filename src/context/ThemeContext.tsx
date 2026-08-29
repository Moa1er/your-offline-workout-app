// theme context provider for dynamic dark/light mode and palette switching

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeColors, ThemeMode, ThemePalette, getThemeColors } from '../constants/theme';
import { useSettings } from './SettingsContext';

interface ThemeContextType {
  colors: ThemeColors;
  themeMode: ThemeMode;
  themePalette: ThemePalette;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setThemePalette: (palette: ThemePalette) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const systemScheme = useColorScheme();

  const themeMode: ThemeMode = settings.theme || 'dark';
  const themePalette: ThemePalette = settings.themePalette || 'cyber';

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => {
    return getThemeColors(isDark ? 'dark' : 'light', themePalette);
  }, [isDark, themePalette]);

  const setThemeMode = async (mode: ThemeMode) => {
    await updateSettings({ theme: mode });
  };

  const setThemePalette = async (palette: ThemePalette) => {
    await updateSettings({ themePalette: palette });
  };

  return (
    <ThemeContext.Provider
      value={{
        colors,
        themeMode,
        themePalette,
        isDark,
        setThemeMode,
        setThemePalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useAppTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // fallback if used outside provider
    const fallbackColors = getThemeColors('dark', 'cyber');
    return {
      colors: fallbackColors,
      themeMode: 'dark',
      themePalette: 'cyber',
      isDark: true,
      setThemeMode: async () => {},
      setThemePalette: async () => {},
    };
  }
  return ctx;
}
