// src/hooks/useCalcHistory.ts
/**
 * React hook for reading and writing calculator history.
 * History is stored in the Dexie `settings` table so it survives reloads.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { getSetting, setSetting } from "../db/queries";
import type { CalcHistoryEntry } from "../lib/calcHistory";
import { CALC_HISTORY_KEY, addHistoryEntry } from "../lib/calcHistory";

export interface CalcHistoryHook {
  /** The history entries, newest first. May be undefined while loading. */
  history: CalcHistoryEntry[] | undefined;

  /** Add an entry (trims to MAX_HISTORY). */
  addEntry: (entry: Omit<CalcHistoryEntry, "timestamp">) => Promise<void>;

  /** Clear all history. */
  clearHistory: () => Promise<void>;
}

export function useCalcHistory(): CalcHistoryHook {
  const raw = useLiveQuery(() => getSetting(CALC_HISTORY_KEY), []);
  const history = (Array.isArray(raw) ? raw : []) as CalcHistoryEntry[];

  const addEntry = useCallback(
    async (entry: Omit<CalcHistoryEntry, "timestamp">) => {
      const current = ((await getSetting(CALC_HISTORY_KEY)) ?? []) as CalcHistoryEntry[];
      const updated = addHistoryEntry(current, entry);
      await setSetting(CALC_HISTORY_KEY, updated);
    },
    [],
  );

  const clearHistory = useCallback(async () => {
    await setSetting(CALC_HISTORY_KEY, []);
  }, []);

  return { history, addEntry, clearHistory };
}

