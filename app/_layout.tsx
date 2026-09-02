// root application layout with theme and context providers

import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { DatabaseProvider } from '../src/context/DatabaseContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { ThemeProvider, useAppTheme } from '../src/context/ThemeContext';
import { WorkoutProvider, useWorkout } from '../src/context/WorkoutContext';
import { setupNotificationPermissions } from '../src/services/notifications';

import { AlertProvider } from '../src/context/AlertContext';

function ThemedStatusBar() {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AppNavigator() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { activeSession } = useWorkout();
  const activeSessionRef = useRef(activeSession);
  const pendingNotificationTapRef = useRef(false);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // listen for notification clicks to bring user back to the workout page
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        if (activeSessionRef.current) {
          router.push('/active-workout');
        } else {
          pendingNotificationTapRef.current = true;
        }
      }
    }).catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      if (activeSessionRef.current) {
        router.push('/active-workout');
      } else {
        pendingNotificationTapRef.current = true;
      }
    });

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (pendingNotificationTapRef.current && activeSession) {
      pendingNotificationTapRef.current = false;
      router.push('/active-workout');
    }
  }, [activeSession, router]);

  return (
    <>
      <ThemedStatusBar />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
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
    </>
  );
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
          <ThemeProvider>
            <AlertProvider>
              <WorkoutProvider>
                <AppNavigator />
              </WorkoutProvider>
            </AlertProvider>
          </ThemeProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
