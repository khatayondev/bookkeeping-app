// src/hooks/useCategories.ts
/** Hook for live‑querying category list (non‑archived by default). */
import { useLiveQuery } from 'dexie-react-hooks';
import type { Category } from '../db/db';
import { listCategories } from '../db/queries';

export function useCategories(includeArchived = false): Category[] | undefined {
  return useLiveQuery(() => listCategories(includeArchived), [includeArchived]);
}

