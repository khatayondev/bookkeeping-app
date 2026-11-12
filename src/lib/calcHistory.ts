// src/lib/calcHistory.ts
/**
 * Types, constants, and pure helpers for the calculator history & change mode.
 * History is persisted in the Dexie `settings` table under the key
 * "calc_history" as a JSON-serialisable array of up to 10 entries.
 */

/** A single history entry. */
export interface CalcHistoryEntry {
  /** The expression the user typed (or change formula). */
  expression: string;
  /** Formatted result string, e.g. "1,250.75" */
  display: string;
  /** Result in pesewas (integer). */
  valuePesewas: number;
  /** ISO-8601 timestamp of when the calculation was performed. */
  timestamp: string;
}

/** Settings key used for persistence. */
export const CALC_HISTORY_KEY = "calc_history";

/** Maximum entries kept. */
export const MAX_HISTORY = 10;

/**
 * Pure function: Prepend a new entry to the existing list, keeping at most MAX_HISTORY entries.
 */
export function addHistoryEntry(
  current: CalcHistoryEntry[],
  entry: Omit<CalcHistoryEntry, "timestamp">,
  timestamp: string = new Date().toISOString(),
): CalcHistoryEntry[] {
  const newEntry: CalcHistoryEntry = {
    ...entry,
    timestamp,
  };
  return [newEntry, ...(current || [])].slice(0, MAX_HISTORY);
}

/**
 * Pure function: Calculate change from paid and bill amounts in pesewas.
 */
export function calculateChange(
  paidPesewas: number,
  billPesewas: number,
): {
  changePesewas: number;
  isExact: boolean;
  isShort: boolean;
} {
  const changePesewas = paidPesewas - billPesewas;
  return {
    changePesewas,
    isExact: changePesewas === 0,
    isShort: changePesewas < 0,
  };
}
