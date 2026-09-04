// local notifications and haptics wrapper for rest timers with live notification bar countdown

import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform, Vibration, NativeModules } from 'react-native';

const { TimerNotificationModule } = NativeModules;

export const REST_TIMER_NOTIFICATION_ID = 'ACTIVE_REST_TIMER';
export const REST_TIMER_COMPLETE_ID = 'REST_TIMER_COMPLETE';

const LIVE_CHANNEL_ID = 'rest_timer_live_v9';
const ALERTS_CHANNEL_ID = 'rest_timer_alerts_v10';

// configure notification handler for local alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * requests notification permissions and initializes fresh android notification channels
 */
export async function setupNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    // clear legacy cached channels from previous app runs
    try {
      await Notifications.deleteNotificationChannelAsync('rest_timer_channel');
      await Notifications.deleteNotificationChannelAsync('rest_timer_countdown');
      await Notifications.deleteNotificationChannelAsync('rest_timer_live_v2');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v2');
      await Notifications.deleteNotificationChannelAsync('rest_timer_live_v3');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v3');
      await Notifications.deleteNotificationChannelAsync('rest_timer_live_v4');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v4');
      await Notifications.deleteNotificationChannelAsync('rest_timer_live_v5');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v5');
      await Notifications.deleteNotificationChannelAsync('rest_timer_live_v6');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v6');
      await Notifications.deleteNotificationChannelAsync('rest_timer_live_v7');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v7');
      await Notifications.deleteNotificationChannelAsync('rest_timer_live_v8');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v8');
      await Notifications.deleteNotificationChannelAsync('rest_timer_alerts_v9');
    } catch {}

    await Notifications.setNotificationChannelAsync(LIVE_CHANNEL_ID, {
      name: 'Rest Timer Live Countdown',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: false,
      sound: undefined,
      lightColor: '#FF2D95',
      showBadge: false,
    });

    await Notifications.setNotificationChannelAsync(ALERTS_CHANNEL_ID, {
      name: 'Rest Timer Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: undefined,
      vibrationPattern: [0, 100, 70, 100, 70, 250],
      lightColor: '#FF2D95',
      enableVibrate: true,
      showBadge: false,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * updates live countdown in android notification bar every second
 */
export async function updateRestTimerLiveNotification(
  remainingSeconds: number,
  exerciseName?: string
): Promise<void> {
  if (Platform.OS === 'web' || remainingSeconds <= 0) return;

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_NOTIFICATION_ID,
      content: {
        title: `Rest Timer: ${timeStr}`,
        body: exerciseName ? `${exerciseName} • Next set coming up` : 'Resting before next set...',
        sticky: true,
        autoDismiss: false,
        sound: false,
        color: '#FF2D95',
        priority: Notifications.AndroidNotificationPriority.LOW,
        data: { channelId: LIVE_CHANNEL_ID },
      },
      trigger: {
        channelId: LIVE_CHANNEL_ID,
      } as any,
    });
  } catch (err) {
    // silent catch for background rate limits
  }
}

/**
 * shows notification when rest timer is finished
 */
export async function showRestTimerFinishedNotification(
  exerciseName?: string,
  options?: { sound?: boolean; vibrate?: boolean }
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // clear active ticker first
    await Notifications.dismissNotificationAsync(REST_TIMER_NOTIFICATION_ID);

    const title = 'REST COMPLETE! 🔔';
    const body = exerciseName
      ? `${exerciseName} - Timer is done! Start your next set!`
      : 'Timer is done! Start your next set!';

    await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_COMPLETE_ID,
      content: {
        title,
        body,
        color: '#FF2D95',
        sound: undefined,
        ...(options?.vibrate !== false ? { vibrate: [0, 100, 70, 100, 70, 250] } : {}),
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { channelId: ALERTS_CHANNEL_ID },
      },
      trigger: {
        channelId: ALERTS_CHANNEL_ID,
      } as any,
    });
  } catch (error) {
    console.error('failed to show timer completion notification:', error);
  }
}

/**
 * cancels any active or completed rest timer notifications
 */
export function startNativeRestTimer(
  endsAtMillis: number,
  exerciseName?: string,
  options?: { sound?: boolean; vibrate?: boolean }
): void {
  if (Platform.OS === 'android' && TimerNotificationModule?.startTimerNotification) {
    try {
      TimerNotificationModule.startTimerNotification(
        endsAtMillis,
        exerciseName || '',
        options?.sound !== false,
        options?.vibrate !== false
      );
    } catch (err) {
      // ignore native module error and fallback
    }
  }
}

export function stopNativeAlarmSound(): void {
  if (Platform.OS === 'android' && TimerNotificationModule?.stopAlarmSound) {
    try {
      TimerNotificationModule.stopAlarmSound();
    } catch (err) {
      // ignore native stop error
    }
  }
}

export function stopNativeRestTimer(): void {
  if (Platform.OS === 'android' && TimerNotificationModule?.stopTimerNotification) {
    try {
      TimerNotificationModule.stopTimerNotification();
    } catch (err) {
      // ignore native module error
    }
  }
  stopNativeAlarmSound();
}

export function playNativeCompletionSound(sound: boolean = true, vibrate: boolean = true): void {
  if (Platform.OS === 'android' && TimerNotificationModule?.playCompletionSound) {
    try {
      TimerNotificationModule.playCompletionSound(sound, vibrate);
    } catch (err) {
      // ignore native sound error
    }
  }
}

/**
 * cancels any active or completed rest timer notifications
 */
export async function cancelNotification(notificationId?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissNotificationAsync(REST_TIMER_NOTIFICATION_ID);
    await Notifications.dismissNotificationAsync(REST_TIMER_COMPLETE_ID);
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  } catch (error) {
    console.error('failed to cancel notification:', error);
  }
}

/**
 * cancels all notifications and scheduled alerts across the entire app
 */
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissNotificationAsync(REST_TIMER_NOTIFICATION_ID);
    await Notifications.dismissNotificationAsync(REST_TIMER_COMPLETE_ID);
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('failed to clear notifications:', error);
  }
}

/**
 * schedules a local rest timer completion notification for background fallback
 */
export async function scheduleRestNotification(
  seconds: number,
  exerciseName?: string,
  options?: { sound?: boolean; vibrate?: boolean }
): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;

  try {
    // cancel existing scheduled alert to prevent piling up notifications
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_COMPLETE_ID).catch(() => {});

    const title = 'REST COMPLETE! 🔔';
    const body = exerciseName ? `${exerciseName} - Timer is done! Start your next set!` : 'Timer is done! Start your next set!';
    const vibrate = options?.vibrate === false ? undefined : [0, 100, 70, 100, 70, 250];

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_COMPLETE_ID,
      content: {
        title,
        body,
        color: '#FF2D95',
        sound: undefined,
        ...(vibrate ? { vibrate } : {}),
        data: { channelId: ALERTS_CHANNEL_ID },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: ALERTS_CHANNEL_ID,
      } as any,
    });
    return notificationId;
  } catch (error) {
    console.error('failed to schedule notification:', error);
    return null;
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
    // 3-pulse vibration matching 0.6s gym timer beep
    Vibration.vibrate([0, 100, 70, 100, 70, 250]);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    console.log('haptics unavailable');
  }
}
