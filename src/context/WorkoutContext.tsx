// active workout context for state logging, auto saving, and rest timers

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { WorkoutSession, WorkoutSet } from '../types/workout';
import { useDatabase } from './DatabaseContext';
import { useSettings } from './SettingsContext';
import { useAppAlert } from './AlertContext';
import {
  getActiveWorkoutSession,
  createActiveWorkoutFromTemplate,
  saveSetUpdate,
  addSetToSessionExercise,
  deleteSetFromSessionExercise,
  saveSessionExerciseUpdate,
  finishWorkoutSession,
  discardActiveWorkout,
} from '../database/queries/sessionQueries';
import { calculateRemainingSeconds, ActiveTimerState, createRestTimer } from '../utils/timer';
import {
  scheduleRestNotification,
  updateRestTimerLiveNotification,
  showRestTimerFinishedNotification,
  cancelNotification,
  cancelAllNotifications,
  triggerSetHaptic,
  triggerTimerFinishedHaptic,
  startNativeRestTimer,
  stopNativeRestTimer,
  stopNativeAlarmSound,
  playNativeCompletionSound,
} from '../services/notifications';

interface WorkoutContextType {
  activeSession: WorkoutSession | null;
  isLoading: boolean;
  timerState: ActiveTimerState | null;
  remainingSeconds: number;
  startWorkout: (templateId?: string) => Promise<WorkoutSession | null>;
  updateSet: (setId: string, updates: Partial<WorkoutSet>) => Promise<void>;
  toggleSetCompleted: (setId: string, exerciseName?: string) => Promise<void>;
  addSet: (sessionExerciseId: string, defaultWeight?: number, defaultReps?: number) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  updateExerciseNotes: (sessionExerciseId: string, notes: string) => Promise<void>;
  updateExerciseRestTimers: (sessionExerciseId: string, restBetweenSetsSeconds?: number, restAfterExerciseSeconds?: number) => Promise<void>;
  toggleExerciseIncludeInVolume: (sessionExerciseId: string) => Promise<void>;
  finishCurrentWorkout: (notes?: string) => Promise<void>;
  discardCurrentWorkout: () => Promise<void>;
  addTimerSeconds: (seconds: number) => void;
  skipTimer: () => void;
  finishTimer: () => Promise<void>;
  refreshActiveSession: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType>({
  activeSession: null,
  isLoading: true,
  timerState: null,
  remainingSeconds: 0,
  startWorkout: async () => null,
  updateSet: async () => {},
  toggleSetCompleted: async () => {},
  addSet: async () => {},
  deleteSet: async () => {},
  updateExerciseNotes: async () => {},
  updateExerciseRestTimers: async () => {},
  toggleExerciseIncludeInVolume: async () => {},
  finishCurrentWorkout: async () => {},
  discardCurrentWorkout: async () => {},
  addTimerSeconds: () => {},
  skipTimer: () => {},
  finishTimer: async () => {},
  refreshActiveSession: async () => {},
});

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();
  const { showAlert, showConfirm } = useAppAlert();

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // rest timer state
  const [timerState, setTimerState] = useState<ActiveTimerState | null>(null);
  const timerStateRef = useRef<ActiveTimerState | null>(null);
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const notificationIdRef = useRef<string | null>(null);

  // synchronous mirror of activeSession so rapid interactions never read stale state
  const activeSessionRef = useRef<WorkoutSession | null>(null);
  const setActiveSessionRef = (next: WorkoutSession | null) => {
    activeSessionRef.current = next;
    setActiveSession(next);
  };

  // debounced database writes for set and exercise edits
  const setSaveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingSetSavesRef = useRef(new Map<string, WorkoutSet>());
  const exerciseSaveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingExerciseSavesRef = useRef(
    new Map<string, {
      notes?: string | null;
      restBetweenSetsSeconds?: number;
      restAfterExerciseSeconds?: number;
      includeInVolume?: boolean;
    }>()
  );

  const scheduleSetSave = (set: WorkoutSet) => {
    pendingSetSavesRef.current.set(set.id, set);
    const existing = setSaveTimersRef.current.get(set.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setSaveTimersRef.current.delete(set.id);
      const latest = pendingSetSavesRef.current.get(set.id);
      pendingSetSavesRef.current.delete(set.id);
      if (latest && db) {
        saveSetUpdate(db, latest).catch((err) => console.error('error saving set:', err));
      }
    }, 350);
    setSaveTimersRef.current.set(set.id, timer);
  };

  const cancelPendingSetSave = (setId: string) => {
    const timer = setSaveTimersRef.current.get(setId);
    if (timer) clearTimeout(timer);
    setSaveTimersRef.current.delete(setId);
    pendingSetSavesRef.current.delete(setId);
  };

  const scheduleExerciseSave = (
    sessionExerciseId: string,
    updates: {
      notes?: string | null;
      restBetweenSetsSeconds?: number;
      restAfterExerciseSeconds?: number;
      includeInVolume?: boolean;
    }
  ) => {
    const current = pendingExerciseSavesRef.current.get(sessionExerciseId) || {};
    pendingExerciseSavesRef.current.set(sessionExerciseId, { ...current, ...updates });
    const existing = exerciseSaveTimersRef.current.get(sessionExerciseId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      exerciseSaveTimersRef.current.delete(sessionExerciseId);
      const latest = pendingExerciseSavesRef.current.get(sessionExerciseId);
      pendingExerciseSavesRef.current.delete(sessionExerciseId);
      if (latest && db) {
        saveSessionExerciseUpdate(db, sessionExerciseId, latest).catch((err) =>
          console.error('error saving exercise update:', err)
        );
      }
    }, 400);
    exerciseSaveTimersRef.current.set(sessionExerciseId, timer);
  };

  const flushPendingSaves = async () => {
    const jobs: Promise<void>[] = [];
    for (const [setId, latest] of [...pendingSetSavesRef.current.entries()]) {
      cancelPendingSetSave(setId);
      if (latest && db) {
        jobs.push(saveSetUpdate(db, latest));
      }
    }
    for (const [seId, updates] of [...pendingExerciseSavesRef.current.entries()]) {
      const timer = exerciseSaveTimersRef.current.get(seId);
      if (timer) clearTimeout(timer);
      exerciseSaveTimersRef.current.delete(seId);
      pendingExerciseSavesRef.current.delete(seId);
      if (db) {
        jobs.push(saveSessionExerciseUpdate(db, seId, updates));
      }
    }
    await Promise.all(jobs);
  };

  // load active workout session on startup (workout recovery!)
  const refreshActiveSession = useCallback(async () => {
    if (!db || !isReady) return;
    try {
      const active = await getActiveWorkoutSession(db);
      setActiveSessionRef(active);
    } catch (err) {
      console.error('error checking active session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db, isReady]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    if (!isReady || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const active = await getActiveWorkoutSession(db);
        if (!cancelled) setActiveSessionRef(active);
      } catch (err) {
        console.error('error checking active session:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, db]);

  const finishTimer = useCallback(async () => {
    const current = timerStateRef.current;
    if (!current) return;
    setTimerState(null);
    timerStateRef.current = null;
    stopNativeRestTimer();
    playNativeCompletionSound(settings.timerSound, settings.timerVibration);
    if (settings.timerVibration) {
      triggerTimerFinishedHaptic();
    }
    await showRestTimerFinishedNotification(current.exerciseName, {
      sound: settings.timerSound,
      vibrate: settings.timerVibration,
    });
  }, [settings.timerSound, settings.timerVibration]);

  // recover timer when app state changes (e.g. background -> active)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // stop any playing alarm sound when app is focused
        stopNativeAlarmSound();
        if (timerStateRef.current) {
          const remaining = calculateRemainingSeconds(timerStateRef.current.endsAt);
          if (remaining <= 0) {
            finishTimer();
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [finishTimer]);

  const skipTimer = useCallback(async () => {
    stopNativeRestTimer();
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    await cancelAllNotifications();
    setTimerState(null);
    timerStateRef.current = null;
  }, []);

  const startWorkout = useCallback(async (templateId?: string): Promise<WorkoutSession | null> => {
    if (!db) return null;

    // never silently abandon an in-progress workout
    const existing = activeSessionRef.current;
    if (existing) {
      return new Promise<WorkoutSession | null>((resolve) => {
        showConfirm(
          'Workout in Progress',
          'You already have an active workout in progress. Discard it and start a new one?',
          async () => {
            try {
              await discardActiveWorkout(db, existing.id);
              setActiveSessionRef(null);
              skipTimer();
              const newSession = await createActiveWorkoutFromTemplate(db, templateId);
              setActiveSessionRef(newSession);
              resolve(newSession);
            } catch (err: any) {
              console.error('error starting workout:', err);
              showAlert({
                title: 'Start Workout Error',
                message: err?.message || 'Failed to start workout session',
                icon: '⚠️',
              });
              resolve(null);
            }
          },
          {
            confirmText: 'Discard & Start New',
            cancelText: 'Resume Active',
            isDestructive: true,
            icon: '⚠️',
          }
        );
      });
    }

    setIsLoading(true);
    try {
      const newSession = await createActiveWorkoutFromTemplate(db, templateId);
      setActiveSessionRef(newSession);
      return newSession;
    } catch (err: any) {
      console.error('error starting workout:', err);
      showAlert({
        title: 'Start Workout Error',
        message: err?.message || 'Failed to start workout session',
        icon: '⚠️',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [db, showConfirm, showAlert, skipTimer]);

  const startRestTimer = useCallback((
    durationSeconds: number,
    exerciseName?: string,
    type: 'SET_REST' | 'EXERCISE_REST' = 'SET_REST'
  ) => {
    if (durationSeconds <= 0) return;

    // update UI state synchronously in frame 0
    const newTimer = createRestTimer(durationSeconds, type, exerciseName);
    setTimerState(newTimer);
    timerStateRef.current = newTimer;

    // start native status bar chronometer and alarm immediately
    startNativeRestTimer(newTimer.endsAt, exerciseName, {
      sound: settings.timerSound,
      vibrate: settings.timerVibration,
    });

    // schedule background fallback notification asynchronously
    (async () => {
      try {
        const notifId = await scheduleRestNotification(durationSeconds, exerciseName, {
          sound: settings.timerSound,
          vibrate: settings.timerVibration,
        });
        notificationIdRef.current = notifId;
      } catch (err) {
        // notification scheduling fallback
      }
    })();
  }, [settings.timerSound, settings.timerVibration]);

  const addTimerSeconds = useCallback(async (sec: number) => {
    const current = timerStateRef.current;
    if (!current) return;
    const newEndsAt = current.endsAt + sec * 1000;
    const remaining = calculateRemainingSeconds(newEndsAt);

    if (remaining <= 0) {
      await finishTimer();
      return;
    }

    const newDuration = Math.max(1, current.durationSeconds + sec);
    const newTimer = {
      ...current,
      endsAt: newEndsAt,
      durationSeconds: newDuration,
    };
    setTimerState(newTimer);
    timerStateRef.current = newTimer;

    startNativeRestTimer(newEndsAt, current.exerciseName, {
      sound: settings.timerSound,
      vibrate: settings.timerVibration,
    });

    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    const notifId = await scheduleRestNotification(remaining, current.exerciseName, {
      sound: settings.timerSound,
      vibrate: settings.timerVibration,
    });
    notificationIdRef.current = notifId;
  }, [finishTimer, settings.timerSound, settings.timerVibration]);

  const toggleSetCompleted = useCallback(async (setId: string, exerciseName?: string) => {
    // silence any lingering alarm immediately
    stopNativeAlarmSound();
    const session = activeSessionRef.current;
    if (!session || !db) return;

    let targetSet: WorkoutSet | null = null;
    let isAllSetsCompleteInExercise = false;
    let exerciseRestSet: number | undefined;
    let exerciseRestAfter: number | undefined;

    // update state locally and identify target set
    const updatedExercises = session.exercises.map((se) => {
      const setIndex = se.sets.findIndex((s) => s.id === setId);
      if (setIndex !== -1) {
        exerciseRestSet = se.restBetweenSetsSeconds;
        exerciseRestAfter = se.restAfterExerciseSeconds;
        const current = se.sets[setIndex];
        const nextCompleted = !current.completed;
        let updatedItem: WorkoutSet = { ...current, completed: nextCompleted };

        // if the user completed a set without typing values, use previous performance
        if (nextCompleted && (updatedItem.weightKg <= 0 || updatedItem.reps <= 0)) {
          const prev = se.previousPerformance?.[setIndex];
          if (prev) {
            updatedItem = {
              ...updatedItem,
              weightKg: updatedItem.weightKg <= 0 ? prev.weightKg : updatedItem.weightKg,
              reps: updatedItem.reps <= 0 ? prev.reps : updatedItem.reps,
            };
          }
        }

        targetSet = updatedItem;

        const newSets = se.sets.map((s, idx) => (idx === setIndex ? updatedItem : s));
        isAllSetsCompleteInExercise = newSets.every((s) => s.completed);

        return { ...se, sets: newSets };
      }
      return se;
    });

    if (!targetSet) return;
    const completedSet: WorkoutSet = targetSet;

    // cancel any pending debounced write and apply session update immediately
    cancelPendingSetSave(setId);
    setActiveSessionRef({ ...session, exercises: updatedExercises });

    // trigger instant haptic feedback
    if (completedSet.completed && settings.hapticFeedback) {
      triggerSetHaptic();
    }

    // save set update to sqlite in background without blocking UI thread
    saveSetUpdate(db, completedSet).catch((err) =>
      console.error('error saving set update:', err)
    );

    if (completedSet.completed) {
      // start rest timer automatically
      const setRestDuration = exerciseRestSet || settings.defaultSetRestSeconds;
      const exerciseRestDuration = exerciseRestAfter || settings.defaultExerciseRestSeconds;
      const restDuration = isAllSetsCompleteInExercise ? exerciseRestDuration : setRestDuration;
      const restType = isAllSetsCompleteInExercise ? 'EXERCISE_REST' : 'SET_REST';
      if (restDuration > 0) {
        startRestTimer(restDuration, exerciseName, restType);
      }
    } else {
      // cancel running rest timer if set was unchecked
      skipTimer();
    }
  }, [db, settings.hapticFeedback, settings.defaultSetRestSeconds, settings.defaultExerciseRestSeconds, startRestTimer, skipTimer]);

  const updateSet = useCallback(async (setId: string, updates: Partial<WorkoutSet>) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    let updatedTargetSet: WorkoutSet | null = null;

    const updatedExercises = session.exercises.map((se) => {
      const idx = se.sets.findIndex((s) => s.id === setId);
      if (idx !== -1) {
        const current = se.sets[idx];
        const updatedItem: WorkoutSet = { ...current, ...updates };
        updatedTargetSet = updatedItem;
        const newSets = se.sets.map((s, i) => (i === idx ? updatedItem : s));
        return { ...se, sets: newSets };
      }
      return se;
    });

    if (!updatedTargetSet) return;
    const saveSet: WorkoutSet = updatedTargetSet;

    setActiveSessionRef({ ...session, exercises: updatedExercises });
    scheduleSetSave(saveSet);
  }, [db]);

  const addSet = useCallback(async (sessionExerciseId: string, defaultWeight: number = 0, defaultReps: number = 10) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    // derive the next set number from the database so rapid taps cannot create duplicates
    const nextRow = await db.getFirstAsync<{ next: number }>(
      'SELECT COALESCE(MAX(set_number), 0) + 1 as next FROM sets WHERE session_exercise_id = ?;',
      [sessionExerciseId]
    );
    const setNumber = nextRow ? nextRow.next : 1;
    const newSet = await addSetToSessionExercise(db, sessionExerciseId, setNumber, defaultWeight, defaultReps);

    const updatedExercises = session.exercises.map((e) => {
      if (e.id === sessionExerciseId) {
        return { ...e, sets: [...e.sets, newSet] };
      }
      return e;
    });

    setActiveSessionRef({ ...session, exercises: updatedExercises });
  }, [db]);

  const deleteSet = useCallback(async (setId: string) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    cancelPendingSetSave(setId);
    await deleteSetFromSessionExercise(db, setId);

    const updatedExercises = session.exercises.map((e) => ({
      ...e,
      sets: e.sets.filter((s) => s.id !== setId),
    }));

    setActiveSessionRef({ ...session, exercises: updatedExercises });
  }, [db]);

  const updateExerciseNotes = useCallback(async (sessionExerciseId: string, notes: string) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    const updatedExercises = session.exercises.map((e) => {
      if (e.id === sessionExerciseId) {
        return { ...e, notes };
      }
      return e;
    });

    setActiveSessionRef({ ...session, exercises: updatedExercises });
    scheduleExerciseSave(sessionExerciseId, { notes });
  }, [db]);

  const updateExerciseRestTimers = useCallback(async (
    sessionExerciseId: string,
    restBetweenSetsSeconds?: number,
    restAfterExerciseSeconds?: number
  ) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    const updatedExercises = session.exercises.map((e) => {
      if (e.id === sessionExerciseId) {
        return {
          ...e,
          restBetweenSetsSeconds: restBetweenSetsSeconds !== undefined ? restBetweenSetsSeconds : e.restBetweenSetsSeconds,
          restAfterExerciseSeconds: restAfterExerciseSeconds !== undefined ? restAfterExerciseSeconds : e.restAfterExerciseSeconds,
        };
      }
      return e;
    });

    setActiveSessionRef({ ...session, exercises: updatedExercises });
    scheduleExerciseSave(sessionExerciseId, {
      ...(restBetweenSetsSeconds !== undefined ? { restBetweenSetsSeconds } : {}),
      ...(restAfterExerciseSeconds !== undefined ? { restAfterExerciseSeconds } : {}),
    });
  }, [db]);

  const toggleExerciseIncludeInVolume = useCallback(async (sessionExerciseId: string) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    let nextVal = true;
    const updatedExercises = session.exercises.map((e) => {
      if (e.id === sessionExerciseId) {
        nextVal = e.includeInVolume === false;
        return { ...e, includeInVolume: nextVal };
      }
      return e;
    });

    setActiveSessionRef({ ...session, exercises: updatedExercises });
    scheduleExerciseSave(sessionExerciseId, { includeInVolume: nextVal });
  }, [db]);

  const finishCurrentWorkout = useCallback(async (notes?: string) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    // persist any debounced edits before closing the session
    await flushPendingSaves();
    await finishWorkoutSession(db, session.id, notes);
    setActiveSessionRef(null);
    skipTimer();
  }, [db, skipTimer]);

  const discardCurrentWorkout = useCallback(async () => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    // pending writes target rows that are about to be deleted; drop them
    for (const timer of setSaveTimersRef.current.values()) clearTimeout(timer);
    setSaveTimersRef.current.clear();
    pendingSetSavesRef.current.clear();
    for (const timer of exerciseSaveTimersRef.current.values()) clearTimeout(timer);
    exerciseSaveTimersRef.current.clear();
    pendingExerciseSavesRef.current.clear();

    await discardActiveWorkout(db, session.id);
    setActiveSessionRef(null);
    skipTimer();
  }, [db, skipTimer]);

  const contextValue = useMemo(
    () => ({
      activeSession,
      isLoading,
      timerState,
      remainingSeconds,
      startWorkout,
      updateSet,
      toggleSetCompleted,
      addSet,
      deleteSet,
      updateExerciseNotes,
      updateExerciseRestTimers,
      toggleExerciseIncludeInVolume,
      finishCurrentWorkout,
      discardCurrentWorkout,
      addTimerSeconds,
      skipTimer,
      finishTimer,
      refreshActiveSession,
    }),
    [
      activeSession,
      isLoading,
      timerState,
      remainingSeconds,
      startWorkout,
      updateSet,
      toggleSetCompleted,
      addSet,
      deleteSet,
      updateExerciseNotes,
      updateExerciseRestTimers,
      toggleExerciseIncludeInVolume,
      finishCurrentWorkout,
      discardCurrentWorkout,
      addTimerSeconds,
      skipTimer,
      finishTimer,
      refreshActiveSession,
    ]
  );

  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  );
};

export function useWorkout(): WorkoutContextType {
  return useContext(WorkoutContext);
}
