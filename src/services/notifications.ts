// local notifications and haptics wrapper for rest timers

import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// configure notification handler for local alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * requests notification permissions if not already granted
 */
export async function setupNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * schedules a local rest timer completion notification
 */
export async function scheduleRestNotification(
  seconds: number,
  exerciseName?: string,
  options?: { sound?: boolean; vibrate?: boolean }
): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;

  try {
    const title = 'REST COMPLETE';
    const body = exerciseName ? `${exerciseName} - Start your next set!` : 'Start your next set!';
    const sound = options?.sound !== false;
    const vibrate = options?.vibrate === false ? undefined : [0, 250, 250, 250];

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound,
        ...(vibrate ? { vibrate } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    return notificationId;
  } catch (error) {
    console.error('failed to schedule notification:', error);
    return null;
  }
}

/**
 * cancels a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === 'web' || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('failed to cancel notification:', error);
  }
}

/**
 * triggers light haptic feedback on set completed
 */
export async function triggerSetHaptic(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    console.log('haptics unavailable');
  }
}

/**
 * triggers heavy haptic feedback on rest timer finish
 */
export async function triggerTimerFinishedHaptic(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    console.log('haptics unavailable');
  }
}
