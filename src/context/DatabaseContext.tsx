// database context provider for sqlite instance initialization

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../database/db';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;
  error: Error | null;
  dataVersion: number;
  notifyDataChanged: () => void;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  error: null,
  dataVersion: 0,
  notifyDataChanged: () => {},
});

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataVersion, setDataVersion] = useState<number>(0);

  const notifyDataChanged = () => {
    setDataVersion((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;
    getDatabase()
      .then((database) => {
        if (isMounted) {
          setDb(database);
          setIsReady(true);
        }
      })
      .catch((err) => {
        console.error('failed to initialize sqlite database:', err);
        if (isMounted) {
          setError(err);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady, error, dataVersion, notifyDataChanged }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export function useDatabase(): DatabaseContextType {
  return useContext(DatabaseContext);
}
