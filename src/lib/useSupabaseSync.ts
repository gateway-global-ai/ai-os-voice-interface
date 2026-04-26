/**
 * useSupabaseSync — Generic localStorage ↔ Supabase bidirectional sync hook.
 *
 * Behaviour:
 *  1. On mount: reads from localStorage immediately (synchronous, zero-flash).
 *  2. After mount: fetches from Supabase and merges (remote wins for defined fields).
 *  3. On write: updates localStorage first (optimistic), then upserts to Supabase async.
 *  4. Offline fallback: if Supabase is unavailable, stays localStorage-only.
 *
 * Usage:
 *   const [prefs, setPrefs] = useSupabaseSync<ShellPrefs>({
 *     lsKey: 'aios_shell_theme',
 *     table: 'shell_preferences',
 *     userId,
 *     defaults: SHELL_DEFAULTS,
 *   });
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

export type SupabaseSyncMergePolicy<T extends object> =
  | 'remote-over-local'
  | 'local-over-remote'
  | ((local: T, remote: Partial<T>, defaults: T) => T);

export interface UseSupabaseSyncOptions<T extends object> {
  /** localStorage key for offline/immediate reads */
  lsKey: string;
  /** Supabase table name */
  table: string;
  /** Supabase column to filter/upsert by when userId is set */
  userIdColumn?: string;
  /** Current authenticated user ID (null = guest, skips remote sync) */
  userId?: string | null;
  /** Default value when nothing is stored */
  defaults: T;
  /**
   * Conflict policy for the initial remote hydrate:
   * - remote-over-local: remote values replace local values for matching keys
   * - local-over-remote: local values stay authoritative; remote only fills gaps
   */
  mergePolicy?: SupabaseSyncMergePolicy<T>;
  /** Optional transform: remote row → local state (e.g. extract a JSONB column) */
  fromRow?: (row: Record<string, unknown>) => Partial<T>;
  /** Optional transform: local state → upsert row */
  toRow?: (state: T, userId: string) => Record<string, unknown>;
}

export function useSupabaseSync<T extends object>(
  opts: UseSupabaseSyncOptions<T>,
): [T, (patch: Partial<T>) => void, boolean] {
  const {
    lsKey,
    table,
    userIdColumn = 'user_id',
    userId,
    defaults,
    mergePolicy = 'remote-over-local',
    fromRow,
    toRow,
  } = opts;

  // 1. Synchronous read from localStorage
  const readLocal = (): T => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return defaults;
      return { ...defaults, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return defaults;
    }
  };

  const [state, setStateRaw] = useState<T>(readLocal);
  const [syncing, setSyncing] = useState(false);
  const queuedRowRef = useRef<Record<string, unknown> | null>(null);
  const inFlightRef = useRef(false);

  const mergeState = useCallback((local: T, remote: Partial<T>): T => {
    if (typeof mergePolicy === 'function') {
      return mergePolicy(local, remote, defaults);
    }
    if (mergePolicy === 'local-over-remote') {
      return { ...defaults, ...remote, ...local };
    }
    return { ...defaults, ...local, ...remote };
  }, [defaults, mergePolicy]);

  const flushQueuedWrite = useCallback(() => {
    if (!supabase || !userId || inFlightRef.current || !queuedRowRef.current) return;
    const row = queuedRowRef.current;
    queuedRowRef.current = null;
    inFlightRef.current = true;
    void (async () => {
      try {
        const { error } = await supabase
          .from(table)
          .upsert(row as never, { onConflict: userIdColumn });
        if (error) {
          console.warn(`[useSupabaseSync] upsert ${table} failed:`, error.message);
        }
      } finally {
        inFlightRef.current = false;
        if (queuedRowRef.current) {
          flushQueuedWrite();
        }
      }
    })();
  }, [table, userId, userIdColumn]);

  // 2. On mount + userId change: fetch from Supabase
  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;

    (async () => {
      setSyncing(true);
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(userIdColumn, userId)
          .maybeSingle();

        if (error || !data || cancelled) return;

        const remotePartial = fromRow ? fromRow(data as Record<string, unknown>) : (data as Partial<T>);
        setStateRaw((prev) => {
          const merged = mergeState(prev, remotePartial);
          try { localStorage.setItem(lsKey, JSON.stringify(merged)); } catch { /* ignore */ }
          return merged;
        });
      } catch {
        // offline or network error — keep localStorage value
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fromRow, lsKey, mergeState, table, userId, userIdColumn]);

  useEffect(() => {
    if (!userId || !queuedRowRef.current) return;
    flushQueuedWrite();
  }, [flushQueuedWrite, userId]);

  // 3. Write function — optimistic local + async remote
  const setState = useCallback(
    (patch: Partial<T>) => {
      setStateRaw((prev) => {
        const next = { ...prev, ...patch };
        try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch { /* ignore */ }

        if (supabase && userId) {
          const row = toRow ? toRow(next, userId) : { ...next, [userIdColumn]: userId };
          queuedRowRef.current = row;
          flushQueuedWrite();
        }

        return next;
      });
    },
    [flushQueuedWrite, lsKey, toRow, userId, userIdColumn],
  );

  return [state, setState, syncing];
}

// ─── Convenience: single-value sync (non-object values) ──────────────────────

export interface UseSupabaseValueSyncOptions<T> {
  lsKey: string;
  table: string;
  column: string;
  userIdColumn?: string;
  userId?: string | null;
  defaultValue: T;
}

export function useSupabaseValueSync<T>(
  opts: UseSupabaseValueSyncOptions<T>,
): [T, (value: T) => void, boolean] {
  const { lsKey, table, column, userIdColumn = 'user_id', userId, defaultValue } = opts;

  const readLocal = (): T => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  };

  const [value, setValueRaw] = useState<T>(readLocal);
  const [syncing, setSyncing] = useState(false);
  const queuedRowRef = useRef<Record<string, unknown> | null>(null);
  const inFlightRef = useRef(false);

  const flushQueuedWrite = useCallback(() => {
    if (!supabase || !userId || inFlightRef.current || !queuedRowRef.current) return;
    const row = queuedRowRef.current;
    queuedRowRef.current = null;
    inFlightRef.current = true;
    void (async () => {
      try {
        const { error } = await supabase
          .from(table)
          .upsert(row as never, { onConflict: userIdColumn });
        if (error) {
          console.warn(`[useSupabaseValueSync] upsert ${table}.${column} failed:`, error.message);
        }
      } finally {
        inFlightRef.current = false;
        if (queuedRowRef.current) {
          flushQueuedWrite();
        }
      }
    })();
  }, [column, table, userId, userIdColumn]);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;

    (async () => {
      setSyncing(true);
      try {
        const { data, error } = await supabase
          .from(table)
          .select(column)
          .eq(userIdColumn, userId)
          .maybeSingle();

        if (error || !data || cancelled) return;
        const remoteVal = (data as Record<string, unknown>)[column] as T | undefined;
        if (remoteVal !== undefined) {
          setValueRaw(remoteVal);
          try { localStorage.setItem(lsKey, JSON.stringify(remoteVal)); } catch { /* ignore */ }
        }
      } catch { /* offline */ }
      finally { if (!cancelled) setSyncing(false); }
    })();

    return () => { cancelled = true; };
  }, [userId, table, column, userIdColumn, lsKey]);

  useEffect(() => {
    if (!userId || !queuedRowRef.current) return;
    flushQueuedWrite();
  }, [flushQueuedWrite, userId]);

  const setValue = useCallback(
    (val: T) => {
      setValueRaw(val);
      try { localStorage.setItem(lsKey, JSON.stringify(val)); } catch { /* ignore */ }
      if (supabase && userId) {
        queuedRowRef.current = { [userIdColumn]: userId, [column]: val };
        flushQueuedWrite();
      }
    },
    [column, flushQueuedWrite, lsKey, table, userId, userIdColumn],
  );

  return [value, setValue, syncing];
}
