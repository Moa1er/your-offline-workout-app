// root application layout with theme and context providers

import React, { useEffect, useRef, useCallback } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text } from 'react-native';
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
  const pathname = usePathname();
  const { activeSession } = useWorkout();
  const activeSessionRef = useRef(activeSession);
  const pendingNotificationTapRef = useRef(false);
  const lastHandledNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const navigateToActiveWorkout = useCallback(() => {
    // avoid stacking multiple active-workout instances on top of each other
    if (pathname === '/active-workout') return;
    router.navigate('/active-workout');
  }, [pathname, router]);

  // listen for notification clicks to bring user back to the workout page without duplicates
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const notifId = response?.notification?.request?.identifier;
      if (response && notifId && notifId !== lastHandledNotifIdRef.current) {
        lastHandledNotifIdRef.current = notifId;
        if (activeSessionRef.current) {
          navigateToActiveWorkout();
        } else {
          pendingNotificationTapRef.current = true;
        }
      }
    }).catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const notifId = response?.notification?.request?.identifier;
      if (notifId) {
        lastHandledNotifIdRef.current = notifId;
      }
      if (activeSessionRef.current) {
        navigateToActiveWorkout();
      } else {
        pendingNotificationTapRef.current = true;
      }
    });

    return () => subscription.remove();
  }, [navigateToActiveWorkout]);

  useEffect(() => {
    if (pendingNotificationTapRef.current && activeSession) {
      pendingNotificationTapRef.current = false;
      navigateToActiveWorkout();
    }
  }, [activeSession, navigateToActiveWorkout]);

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
          options={{
            title: 'Active Workout',
            headerBackVisible: false,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.navigate('/(tabs)')}
                style={{ paddingRight: 16, paddingVertical: 6 }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={{ fontSize: 22, color: colors.text, fontWeight: '700' }}>←</Text>
              </TouchableOpacity>
            ),
          }}
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
        <Stack.Screen
          name="workout-compare"
          options={{ title: 'Compare Workouts' }}
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
