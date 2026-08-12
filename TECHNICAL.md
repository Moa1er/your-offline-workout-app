# Progressive Workout Tracker — Technical Reference

This document covers the architecture, data model, and build workflow for developers. For user-facing information, see [README.md](README.md).

## Overview

The app is a single-package Expo (SDK 57) / React Native application using `expo-router` file-based routing. All data is stored locally in one SQLite database (`progressive_workout.db`) via `expo-sqlite`'s async API. There is no backend, no accounts, and no network dependency.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19 |
| Navigation | `expo-router` (typed routes, stack + tabs) |
| Database | `expo-sqlite` (async API, WAL, foreign keys) |
| Charts | `react-native-svg` (custom line/bar charts) |
| Notifications | `expo-notifications` (local rest-timer alerts) |
| Haptics | `expo-haptics` |
| File handling | `expo-file-system` (new `File`/`Paths` API) |
| Language | TypeScript (strict) |
| Tests | Jest + ts-jest |
| Lint | ESLint + `eslint-config-expo` (flat config) |

## Project structure

```text
app/                          # expo-router routes
  _layout.tsx                 # providers, status bar, notification permission
  (tabs)/                     # Workout, History, Progress, Templates, Settings
  active-workout.tsx          # live workout logging screen
  workout-summary.tsx         # post-workout summary
  session-detail.tsx          # historical session viewer/deleter
  template-editor.tsx         # routine builder (with exercise picker modal)
  exercise-picker.tsx         # searchable exercise picker (active session)
src/
  components/                 # set table, rest timer overlay, PR toasts, charts
  context/                    # Database, Settings, Workout providers
  database/
    schema.ts                 # SQL DDL
    db.ts                     # connection + migrations
    seed.ts                   # default exercises + demo history auto-import
    queries/                  # sessions, exercises, templates, stats, PRs, settings
  services/
    hevyImporter.ts           # Hevy CSV import (superset-aware)
    importExport.ts           # JSON backup + CSV export
    backupValidator.ts        # deep JSON backup validation
    notifications.ts          # local notifications + haptics wrapper
  utils/                      # timer math, e1RM/volume, PR detection, id generation
  types/                      # workout + backup TypeScript models
docs/
  IMPORT_FORMAT.md            # JSON backup schema specification
  screenshots/                # README screenshots
```

## Data model

```text
exercises
  id, name, primary_muscle, secondary_muscles_json, equipment, category,
  tracking_type, notes, archived, created_at, updated_at

workout_templates
  id, name, description, created_at, updated_at

workout_template_exercises
  id, template_id, exercise_id, exercise_order, target_sets, rep_min, rep_max,
  target_rir, rest_between_sets_seconds, rest_after_exercise_seconds, notes

workout_sessions
  id, template_id, name, started_at, finished_at, notes, is_active

workout_session_exercises
  id, session_id, exercise_id, exercise_order, notes,
  rest_between_sets_seconds, rest_after_exercise_seconds

sets
  id, session_exercise_id, set_number, type (WORKING/WARMUP/FAILURE/DROP_SET),
  weight_kg, reps, rir, completed, completed_at

personal_records
  id, exercise_id, record_type (MAX_WEIGHT/MAX_REPS_AT_WEIGHT/MAX_E1RM),
  value, weight_kg, reps, set_id, session_id, achieved_at

settings
  key, value  (key/value preferences)
```

Weights are always stored in kilograms; the UI converts to pounds when the user selects `lb`.

## Key flows

### Active workout recovery

`workout_sessions.is_active = 1` marks the in-progress workout. On app start, `WorkoutContext` loads the active session via `getActiveWorkoutSession()`, so an interrupted workout can be resumed. Starting a new workout while one is active requires an explicit discard confirmation; the query layer refuses to silently abandon an active session.

### Set logging and debounced persistence

Weight/reps/RIR/notes updates are applied to React state immediately and persisted to SQLite after a short debounce (350–400 ms). Pending writes are flushed when a set is completed or the workout is finished, so a rapid-tap session never loses data.

### Rest timers

Rest timers use absolute timestamps (`endsAt`), so they survive app backgrounding. When a set is completed, the timer starts automatically (set rest, or exercise rest after the final set). Notification permissions are requested at app startup, and extending the timer reschedules the local notification.

### Personal records

`recalculateAllPersonalRecords()` is invoked when a session finishes or is deleted (and after imports). It scans all completed, non-warmup sets and derives:

- `MAX_WEIGHT` — heaviest successful lift per exercise
- `MAX_REPS_AT_WEIGHT` — most reps at each weight
- `MAX_E1RM` — best estimated 1RM (Epley formula, capped at 15 reps)

Live PR detection compares newly completed sets against these records and shows celebration toasts.

### Hevy import/export

The Hevy CSV parser is written from scratch (quoted fields, CRLF, escaped quotes). Rows are grouped into sessions by start time + title + end time, and sets are inserted in original row order so superset execution order is preserved. Exercise names are normalized for fuzzy matching against the local library.

### JSON backup

Settings → *Export Everything to JSON* produces a versioned backup (schema v1, see [docs/IMPORT_FORMAT.md](docs/IMPORT_FORMAT.md)). Imports are validated deeply (structure, numeric fields, set types) and applied inside a SQLite transaction.

## Development

Prerequisites: Node.js, and for native builds the Android SDK + JDK 17.

```bash
npm install
npm start          # Expo dev server
npm run web        # run in browser
npm test           # jest unit tests
npm run lint       # eslint (eslint-config-expo)
```

### Android release APK

The repository includes a generated `android/` project (Expo prebuild). To build and install a standalone release APK:

```bash
cd android
./gradlew installRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Note: the generated project signs release builds with the debug keystore — fine for personal installs, but configure a real keystore before distributing on a store.

## Testing

Jest covers the pure-logic layers: timer math, e1RM/volume/unit conversions, CSV parsing/date parsing/normalization, and backup validation.

```bash
npm test
```

TypeScript and lint gates:

```bash
npx tsc --noEmit
npm run lint
```
