// settings context provider for managing user preferences and unit settings

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSettings } from '../types/workout';
import { useDatabase } from './DatabaseContext';
import { DEFAULT_SETTINGS, getUserSettings, saveUserSettings } from '../database/queries/settingsQueries';

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  reloadSettings: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { db, isReady } = useDatabase();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const reloadSettings = async () => {
    if (!db || !isReady) return;
    try {
      const loaded = await getUserSettings(db);
      setSettings(loaded);
    } catch (err) {
      console.error('error loading user settings:', err);
    }
  };

  useEffect(() => {
    if (!isReady || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await getUserSettings(db);
        if (!cancelled) setSettings(loaded);
      } catch (err) {
        console.error('error loading user settings:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, db]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (db) {
      await saveUserSettings(db, newSettings);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextType {
  return useContext(SettingsContext);
}
