/* ═══════════════════════════════════════════════════════════════
   HisabX — useStore hook: reactive bridge to the Supabase store
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react';
import { store } from '../store.js';

/**
 * Subscribes to the global store and returns a shallow-copied snapshot.
 * React will re-render components that call this hook whenever the store
 * emits a change — but only the *components* that use the changed data
 * will actually repaint (React diffing), eliminating full-page flicker.
 */
export function useStore() {
  const [, forceUpdate] = useState(0);
  const dataRef = useRef(store.data);

  useEffect(() => {
    const unsub = store.subscribe((newData) => {
      dataRef.current = newData;
      forceUpdate(n => n + 1);
    });
    return unsub;
  }, []);

  return dataRef.current;
}

/**
 * Returns the store singleton for imperative access (mutations, getters).
 * Does NOT subscribe — use useStore() when you need reactive re-renders.
 */
export function useStoreActions() {
  return store;
}
