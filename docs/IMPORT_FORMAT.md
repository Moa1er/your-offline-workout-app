# Progressive Workout Tracker - JSON Import/Export Format Specification

This document defines the schema specification for backup and import files (`.json`) for the Progressive Workout Tracker application. External AI tools (such as ChatGPT, Claude, or custom scripts) can generate valid JSON files following this schema to populate workout templates, custom exercises, and historical workout sessions.

## 1. File & Schema Basics

- **Format**: UTF-8 encoded JSON
- **Naming Convention**: `camelCase` for keys
- **Timestamps**: ISO-8601 strings (e.g., `2026-08-11T17:15:00-04:00` or `2026-08-11T21:15:00Z`)
- **Weight Units**: All weights internally in kilograms (`kg`). Converting to pounds (`lb`) is handled dynamically by the app.
- **Current Schema Version**: `1`

---

## 2. Root Structure

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-08-11T22:00:00Z",
  "app": {
    "name": "Progressive Workout Tracker",
    "version": "1.0.0"
  },
  "settings": {
    "weightUnit": "kg",
    "theme": "dark",
    "defaultSetRestSeconds": 120,
    "defaultExerciseRestSeconds": 120,
    "keepScreenAwake": true,
    "hapticFeedback": true,
    "timerVibration": true,
    "timerSound": true,
    "showRir": true
  },
  "exercises": [],
  "workoutTemplates": [],
  "workoutSessions": []
}
```

### Fields Definition

| Field | Type | Required | Description |
|---|---|---|---|
| `schemaVersion` | `number` | Yes | Must be integer `1`. |
| `exportedAt` | `string` | Yes | ISO-8601 timestamp. |
| `app` | `object` | Yes | Metadata containing `name` and `version`. |
| `settings` | `object` | No | App user preferences. |
| `exercises` | `array` | Yes | Array of exercise objects. |
| `workoutTemplates` | `array` | Yes | Array of template objects. |
| `workoutSessions` | `array` | Yes | Array of workout session objects. |

---

## 3. Exercise Schema (`exercises[]`)

Each exercise represents a movement in the database.

```json
{
  "id": "exercise_chest_press_machine",
  "name": "Chest Press - Machine",
  "primaryMuscle": "CHEST",
  "secondaryMuscles": ["TRICEPS", "FRONT_DELTS"],
  "equipment": "MACHINE",
  "category": "HORIZONTAL_PUSH",
  "trackingType": "WEIGHT_REPS",
  "notes": "Adjust seat height to chest line",
  "archived": false
}
```

### Allowed Enums

- **`primaryMuscle` & `secondaryMuscles`**:
  `"CHEST"`, `"BACK"`, `"LATS"`, `"TRAPS"`, `"FRONT_DELTS"`, `"SIDE_DELTS"`, `"REAR_DELTS"`, `"BICEPS"`, `"TRICEPS"`, `"FOREARMS"`, `"QUADS"`, `"HAMSTRINGS"`, `"GLUTES"`, `"CALVES"`, `"CORE"`, `"OTHER"`

- **`equipment`**:
  `"BARBELL"`, `"DUMBBELL"`, `"CABLE"`, `"MACHINE"`, `"BODYWEIGHT"`, `"SMITH_MACHINE"`, `"KETTLEBELL"`, `"BAND"`, `"OTHER"`

- **`category`**:
  `"HORIZONTAL_PUSH"`, `"VERTICAL_PUSH"`, `"HORIZONTAL_PULL"`, `"VERTICAL_PULL"`, `"ELBOW_FLEXION"`, `"ELBOW_EXTENSION"`, `"SHOULDER_ISOLATION"`, `"KNEE_EXTENSION"`, `"KNEE_FLEXION"`, `"HIP_DOMINANT"`, `"CORE"`, `"OTHER"`

- **`trackingType`**:
  `"WEIGHT_REPS"`, `"REPS_ONLY"`, `"BODYWEIGHT_REPS"`, `"BODYWEIGHT_PLUS_WEIGHT"`, `"ASSISTED_BODYWEIGHT"`, `"TIME"`, `"DISTANCE"`, `"OTHER"`

---

## 4. Workout Template Schema (`workoutTemplates[]`)

Templates contain standard routines that users perform regularly.

```json
{
  "id": "template_full_upper_body",
  "name": "Full Upper Body",
  "description": "Upper body routine targeted for hypertrophy",
  "exercises": [
    {
      "exerciseId": "exercise_chest_press_machine",
      "order": 1,
      "targetSets": 3,
      "repMin": 6,
      "repMax": 10,
      "targetRir": 2,
      "restBetweenSetsSeconds": 150,
      "restAfterExerciseSeconds": 120,
      "notes": "Control the eccentric phase"
    }
  ]
}
```

---

## 5. Workout Session Schema (`workoutSessions[]`)

Sessions represent completed or historical workouts performed by the user.

```json
{
  "id": "session_2026_08_11_001",
  "templateId": "template_full_upper_body",
  "name": "Full Upper Body",
  "startedAt": "2026-08-11T17:15:00-04:00",
  "finishedAt": "2026-08-11T18:18:00-04:00",
  "notes": "Felt great today",
  "exercises": [
    {
      "exerciseId": "exercise_chest_press_machine",
      "order": 1,
      "notes": "Seat position 4",
      "sets": [
        {
          "id": "set_001",
          "setNumber": 1,
          "type": "WORKING",
          "weightKg": 61.0,
          "reps": 10,
          "rir": 2,
          "completed": true
        },
        {
          "id": "set_002",
          "setNumber": 2,
          "type": "WORKING",
          "weightKg": 61.0,
          "reps": 9,
          "rir": 1,
          "completed": true
        }
      ]
    }
  ]
}
```

### Set Types (`sets[].type`)
- `"WARMUP"`: Warmup sets (excluded from PRs and working volume calculations)
- `"WORKING"`: Standard working sets
- `"FAILURE"`: Sets pushed to muscular failure
- `"DROP_SET"`: Drop sets

---

## 6. Duplicate & ID Handling

1. **Exercise IDs**: Stable string format (e.g. `exercise_lat_pulldown` or UUID). If an existing exercise ID is imported, metadata is updated safely without deleting linked workout logs.
2. **Template IDs**: Existing template IDs will be overwritten with the imported definition.
3. **Session IDs**: Session IDs are authoritative. If a session ID already exists in the local database, it will be skipped to prevent duplicate historical entries.
