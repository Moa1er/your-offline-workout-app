// sqlite database tables schema definitions and indexes

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles_json TEXT,
    equipment TEXT NOT NULL,
    category TEXT NOT NULL,
    tracking_type TEXT NOT NULL DEFAULT 'WEIGHT_REPS',
    notes TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_order INTEGER NOT NULL,
    target_sets INTEGER NOT NULL DEFAULT 3,
    rep_min INTEGER NOT NULL DEFAULT 6,
    rep_max INTEGER NOT NULL DEFAULT 10,
    target_rir INTEGER,
    rest_between_sets_seconds INTEGER NOT NULL DEFAULT 120,
    rest_after_exercise_seconds INTEGER NOT NULL DEFAULT 120,
    notes TEXT,
    FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT,
    name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_order INTEGER NOT NULL,
    notes TEXT,
    rest_between_sets_seconds INTEGER NOT NULL DEFAULT 120,
    rest_after_exercise_seconds INTEGER NOT NULL DEFAULT 120,
    FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'WORKING',
    weight_kg REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    rir INTEGER,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS personal_records (
    id TEXT PRIMARY KEY NOT NULL,
    exercise_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    value REAL NOT NULL,
    weight_kg REAL,
    reps INTEGER,
    set_id TEXT,
    session_id TEXT,
    achieved_at TEXT NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON workout_sessions(started_at);
  CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON workout_session_exercises(session_id);
  CREATE INDEX IF NOT EXISTS idx_sets_session_exercise ON sets(session_exercise_id);
  CREATE INDEX IF NOT EXISTS idx_pr_exercise ON personal_records(exercise_id);
`;
