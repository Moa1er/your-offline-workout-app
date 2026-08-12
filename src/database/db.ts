// sqlite database initialization and connection helper

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { seedDefaultData } from './seed';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      // open local sqlite database
      const db = await SQLite.openDatabaseAsync('progressive_workout.db');
      // enable foreign keys and write ahead logging
      await db.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
      `);
      // execute ddl schemas
      await db.execAsync(CREATE_TABLES_SQL);

      // run schema migrations for rest timer columns if needed
      try {
        await db.execAsync('ALTER TABLE workout_session_exercises ADD COLUMN rest_between_sets_seconds INTEGER DEFAULT 120;');
      } catch {
        // column already exists
      }
      try {
        await db.execAsync('ALTER TABLE workout_session_exercises ADD COLUMN rest_after_exercise_seconds INTEGER DEFAULT 120;');
      } catch {
        // column already exists
      }

      // seed initial exercises and default template if needed
      await seedDefaultData(db);
      return db;
    })();
  }
  return dbPromise;
}
