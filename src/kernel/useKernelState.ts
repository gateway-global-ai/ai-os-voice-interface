import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';
import type { OsStateSnapshot } from './types';

const OS_STATE_CHANGED_EVENT = 'os_state_changed';

/** True only when running inside the Tauri desktop shell. */
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useKernelState() {
  const [osState, setOsState] = useState<OsStateSnapshot | null>(null);

  /** Apply snapshot from `process_intent` / `get_os_state` when events do not fire (e.g. timing). */
  const applySnapshot = useCallback((snapshot: OsStateSnapshot) => {
    setOsState(snapshot);
  }, []);

  useEffect(() => {
    let active = true;

    if (!isTauri) {
      // Browser mode — skip Tauri kernel state
      return;
    }

    void invoke<OsStateSnapshot>('get_os_state')
      .then((snapshot) => {
        if (active) setOsState(snapshot);
      })
      .catch((error) => {
        console.error('Failed to bootstrap kernel state:', error);
      });

    const unlistenPromise = listen<OsStateSnapshot>(OS_STATE_CHANGED_EVENT, (event) => {
      setOsState(event.payload);
    });

    return () => {
      active = false;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return { osState, applySnapshot };
}
