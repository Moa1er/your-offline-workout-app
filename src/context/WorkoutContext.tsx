// active workout context for state logging, auto saving, rest timers, and pr notifications

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { WorkoutSession, WorkoutSet } from '../types/workout';
import { useDatabase } from './DatabaseContext';
import { useSettings } from './SettingsContext';
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
import { getAllPersonalRecords } from '../database/queries/prQueries';
import { checkSetForPrs } from '../utils/prDetector';
import { calculateRemainingSeconds, ActiveTimerState, createRestTimer } from '../utils/timer';
import {
  scheduleRestNotification,
  cancelNotification,
  triggerSetHaptic,
  triggerTimerFinishedHaptic,
} from '../services/notifications';
import { generateId } from '../utils/uuid';

export interface PrToastMessage {
  id: string;
  exerciseName: string;
  description: string;
}

interface WorkoutContextType {
  activeSession: WorkoutSession | null;
  isLoading: boolean;
  timerState: ActiveTimerState | null;
  remainingSeconds: number;
  prToasts: PrToastMessage[];
  startWorkout: (templateId?: string) => Promise<WorkoutSession | null>;
  updateSet: (setId: string, updates: Partial<WorkoutSet>) => Promise<void>;
  toggleSetCompleted: (setId: string, exerciseName?: string) => Promise<void>;
  addSet: (sessionExerciseId: string, defaultWeight?: number, defaultReps?: number) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  updateExerciseNotes: (sessionExerciseId: string, notes: string) => Promise<void>;
  updateExerciseRestTimers: (sessionExerciseId: string, restBetweenSetsSeconds?: number, restAfterExerciseSeconds?: number) => Promise<void>;
  finishCurrentWorkout: (notes?: string) => Promise<void>;
  discardCurrentWorkout: () => Promise<void>;
  addTimerSeconds: (seconds: number) => void;
  skipTimer: () => void;
  clearPrToast: (id: string) => void;
  refreshActiveSession: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType>({
  activeSession: null,
  isLoading: true,
  timerState: null,
  remainingSeconds: 0,
  prToasts: [],
  startWorkout: async () => null,
  updateSet: async () => {},
  toggleSetCompleted: async () => {},
  addSet: async () => {},
  deleteSet: async () => {},
  updateExerciseNotes: async () => {},
  updateExerciseRestTimers: async () => {},
  finishCurrentWorkout: async () => {},
  discardCurrentWorkout: async () => {},
  addTimerSeconds: () => {},
  skipTimer: () => {},
  clearPrToast: () => {},
  refreshActiveSession: async () => {},
});

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { db, isReady } = useDatabase();
  const { settings } = useSettings();

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // rest timer state
  const [timerState, setTimerState] = useState<ActiveTimerState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const notificationIdRef = useRef<string | null>(null);

  // pr toasts
  const [prToasts, setPrToasts] = useState<PrToastMessage[]>([]);

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
    updates: { notes?: string | null; restBetweenSetsSeconds?: number; restAfterExerciseSeconds?: number }
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
  const refreshActiveSession = async () => {
    if (!db || !isReady) return;
    try {
      const active = await getActiveWorkoutSession(db);
      setActiveSessionRef(active);
    } catch (err) {
      console.error('error checking active session:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  // timer tick interval
  useEffect(() => {
    if (!timerState) {
      return;
    }

    const updateTimer = () => {
      const remaining = calculateRemainingSeconds(timerState.endsAt);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        if (settings.hapticFeedback) {
          triggerTimerFinishedHaptic();
        }
        if (notificationIdRef.current) {
          cancelNotification(notificationIdRef.current);
          notificationIdRef.current = null;
        }
        setTimerState(null);
      }
    };

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timerState, settings.hapticFeedback]);

  // recover timer when app state changes (e.g. background -> active)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && timerState) {
        const remaining = calculateRemainingSeconds(timerState.endsAt);
        setRemainingSeconds(remaining);
        if (remaining <= 0) {
          if (notificationIdRef.current) {
            cancelNotification(notificationIdRef.current);
            notificationIdRef.current = null;
          }
          setTimerState(null);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [timerState]);

  const startWorkout = async (templateId?: string): Promise<WorkoutSession | null> => {
    if (!db) return null;

    // never silently abandon an in-progress workout
    const existing = activeSessionRef.current;
    if (existing) {
      return new Promise<WorkoutSession | null>((resolve) => {
        Alert.alert(
          'Workout in Progress',
          'You already have an active workout. Discard it and start a new one?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            {
              text: 'Discard & Start New',
              style: 'destructive',
              onPress: async () => {
                try {
                  await discardActiveWorkout(db, existing.id);
                  setActiveSessionRef(null);
                  skipTimer();
                  const newSession = await createActiveWorkoutFromTemplate(db, templateId);
                  setActiveSessionRef(newSession);
                  resolve(newSession);
                } catch (err: any) {
                  console.error('error starting workout:', err);
                  Alert.alert('Start Workout Error', err?.message || 'Failed to start workout session');
                  resolve(null);
                }
              },
            },
          ]
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
      Alert.alert('Start Workout Error', err?.message || 'Failed to start workout session');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const startRestTimer = async (durationSeconds: number, exerciseName?: string, type: 'SET_REST' | 'EXERCISE_REST' = 'SET_REST') => {
    if (durationSeconds <= 0) return;

    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
    }

    const newTimer = createRestTimer(durationSeconds, type, exerciseName);
    setTimerState(newTimer);
    setRemainingSeconds(durationSeconds);

    const notifId = await scheduleRestNotification(durationSeconds, exerciseName, {
      sound: settings.timerSound,
      vibrate: settings.timerVibration,
    });
    notificationIdRef.current = notifId;
  };

  const addTimerSeconds = async (sec: number) => {
    if (!timerState) return;
    const newEndsAt = timerState.endsAt + sec * 1000;
    const newDuration = Math.max(1, timerState.durationSeconds + sec);
    setTimerState({
      ...timerState,
      endsAt: newEndsAt,
      durationSeconds: newDuration,
    });
    setRemainingSeconds(calculateRemainingSeconds(newEndsAt));

    // keep the local notification in sync with the extended end time
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    const remaining = calculateRemainingSeconds(newEndsAt);
    if (remaining > 0) {
      const notifId = await scheduleRestNotification(remaining, timerState.exerciseName, {
        sound: settings.timerSound,
        vibrate: settings.timerVibration,
      });
      notificationIdRef.current = notifId;
    }
  };

  const skipTimer = async () => {
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    setTimerState(null);
    setRemainingSeconds(0);
  };

  const toggleSetCompleted = async (setId: string, exerciseName?: string) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    let targetSet: WorkoutSet | null = null;
    let exerciseId = '';
    let isAllSetsCompleteInExercise = false;
    let exerciseRestSet: number | undefined;
    let exerciseRestAfter: number | undefined;

    // update state locally and identify target set
    const updatedExercises = session.exercises.map((se) => {
      const setIndex = se.sets.findIndex((s) => s.id === setId);
      if (setIndex !== -1) {
        exerciseId = se.exerciseId;
        exerciseRestSet = se.restBetweenSetsSeconds;
        exerciseRestAfter = se.restAfterExerciseSeconds;
        const current = se.sets[setIndex];
        const nextCompleted = !current.completed;
        let updatedItem: WorkoutSet = { ...current, completed: nextCompleted };

        // if the user completed a set without typing values, use the previous performance
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

    // cancel any pending debounced write so this full set state wins immediately
    cancelPendingSetSave(setId);
    setActiveSessionRef({ ...session, exercises: updatedExercises });

    // save set update to sqlite immediately
    await saveSetUpdate(db, completedSet);

    if (completedSet.completed) {
      if (settings.hapticFeedback) {
        triggerSetHaptic();
      }

      // check PRs
      try {
        const prs = await getAllPersonalRecords(db);
        const prCheck = checkSetForPrs(exerciseId, completedSet, prs);
        if (prCheck.isPr) {
          prCheck.records.forEach((rec) => {
            setPrToasts((prev) => [
              ...prev,
              {
                id: generateId(),
                exerciseName: exerciseName || 'Exercise',
                description: rec.description,
              },
            ]);
          });
        }
      } catch (err) {
        console.error('error checking PR:', err);
      }

      // start rest timer automatically
      const setRestDuration = exerciseRestSet || settings.defaultSetRestSeconds;
      const exerciseRestDuration = exerciseRestAfter || settings.defaultExerciseRestSeconds;
      const restDuration = isAllSetsCompleteInExercise ? exerciseRestDuration : setRestDuration;
      const restType = isAllSetsCompleteInExercise ? 'EXERCISE_REST' : 'SET_REST';
      if (restDuration > 0) {
        startRestTimer(restDuration, exerciseName, restType);
      }
    }
  };

  const updateSet = async (setId: string, updates: Partial<WorkoutSet>) => {
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
  };

  const addSet = async (sessionExerciseId: string, defaultWeight: number = 0, defaultReps: number = 10) => {
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
  };

  const deleteSet = async (setId: string) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    cancelPendingSetSave(setId);
    await deleteSetFromSessionExercise(db, setId);

    const updatedExercises = session.exercises.map((e) => ({
      ...e,
      sets: e.sets.filter((s) => s.id !== setId),
    }));

    setActiveSessionRef({ ...session, exercises: updatedExercises });
  };

  const updateExerciseNotes = async (sessionExerciseId: string, notes: string) => {
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
  };

  const updateExerciseRestTimers = async (
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
  };

  const finishCurrentWorkout = async (notes?: string) => {
    const session = activeSessionRef.current;
    if (!session || !db) return;

    // persist any debounced edits before closing the session
    await flushPendingSaves();
    await finishWorkoutSession(db, session.id, notes);
    setActiveSessionRef(null);
    skipTimer();
  };

  const discardCurrentWorkout = async () => {
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
  };

  const clearPrToast = (id: string) => {
    setPrToasts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        isLoading,
        timerState,
        remainingSeconds,
        prToasts,
        startWorkout,
        updateSet,
        toggleSetCompleted,
        addSet,
        deleteSet,
        updateExerciseNotes,
        updateExerciseRestTimers,
        finishCurrentWorkout,
        discardCurrentWorkout,
        addTimerSeconds,
        skipTimer,
        clearPrToast,
        refreshActiveSession,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export function useWorkout(): WorkoutContextType {
  return useContext(WorkoutContext);
}
