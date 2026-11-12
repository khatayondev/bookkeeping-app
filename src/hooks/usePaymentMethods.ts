// src/hooks/usePaymentMethods.ts
/** Hook for live‑querying payment methods (non‑archived by default). */
import { useLiveQuery } from 'dexie-react-hooks';
import type { PaymentMethod } from '../db/db';
import { listPaymentMethods } from '../db/queries';

export function usePaymentMethods(includeArchived = false): PaymentMethod[] | undefined {
  return useLiveQuery(() => listPaymentMethods(includeArchived), [includeArchived]);
}

