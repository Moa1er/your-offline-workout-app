// root application layout with theme and context providers

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '../src/context/DatabaseContext';
import { SettingsProvider, useSettings } from '../src/context/SettingsContext';
import { WorkoutProvider } from '../src/context/WorkoutContext';
import { PrToastBanner } from '../src/components/PrToastBanner';
import { setupNotificationPermissions } from '../src/services/notifications';

function ThemedStatusBar() {
  const { settings } = useSettings();
  const style =
    settings.theme === 'light' ? 'dark' : settings.theme === 'system' ? 'auto' : 'light';
  return <StatusBar style={style} />;
}

export default function RootLayout() {
  // request notification permission once at startup so rest timers can alert
  useEffect(() => {
    setupNotificationPermissions().catch((err) =>
      console.error('failed to request notification permissions:', err)
    );
  }, []);

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <SettingsProvider>
          <WorkoutProvider>
            <ThemedStatusBar />
            <PrToastBanner />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: '#0f172a' },
                headerTintColor: '#f8fafc',
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: '#0f172a' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="active-workout"
                options={{ title: 'Active Workout', headerBackVisible: false }}
              />
              <Stack.Screen
                name="workout-summary"
                options={{ title: 'Workout Complete', headerLeft: () => null }}
              />
              <Stack.Screen
                name="session-detail"
                options={{ title: 'Session Detail' }}
              />
              <Stack.Screen
                name="template-editor"
                options={{ title: 'Template Editor' }}
              />
              <Stack.Screen
                name="exercise-detail"
                options={{ title: 'Exercise Analytics' }}
              />
              <Stack.Screen
                name="exercise-picker"
                options={{ title: 'Select Exercise', presentation: 'modal' }}
              />
            </Stack>
          </WorkoutProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
