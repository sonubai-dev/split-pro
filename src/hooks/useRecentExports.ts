import { useState, useEffect, useCallback } from 'react';

export interface RecentExport {
  id: string;
  filename: string;
  timestamp: number;
  count: number;
}

export function useRecentExports() {
  const [recentExports, setRecentExports] = useState<RecentExport[]>(() => {
    try {
      const saved = localStorage.getItem('splitpro_recent_exports');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('splitpro_recent_exports', JSON.stringify(recentExports));
  }, [recentExports]);

  const addRecentExport = useCallback((entry: Omit<RecentExport, 'id' | 'timestamp'>) => {
    setRecentExports((prev) => {
      const newEntry: RecentExport = {
        ...entry,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      // Keep last 15 exports
      return [newEntry, ...prev].slice(0, 15);
    });
  }, []);

  const clearRecentExports = useCallback(() => {
    setRecentExports([]);
  }, []);

  return { recentExports, addRecentExport, clearRecentExports };
}
