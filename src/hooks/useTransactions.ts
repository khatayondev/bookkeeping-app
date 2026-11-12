// src/hooks/useTransactions.ts
/**
 * React hooks for live-querying transactions and cashflow totals.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import type { Transaction } from '../db/db';
import { listTransactions, getCashflowTotals, type CashflowTotals } from '../db/queries';
import type { TransactionFilters } from '../db/queries';

export function useTransactions(filters?: TransactionFilters): Transaction[] | undefined {
  const fromTime = filters?.dateFrom instanceof Date ? filters.dateFrom.getTime() : filters?.dateFrom;
  const toTime = filters?.dateTo instanceof Date ? filters.dateTo.getTime() : filters?.dateTo;

  return useLiveQuery(
    () => listTransactions(filters ?? {}),
    [
      filters?.type,
      filters?.categoryId,
      filters?.paymentMethodId,
      filters?.search,
      fromTime,
      toTime,
    ]
  );
}

export function useCashflowTotals(): CashflowTotals | undefined {
  return useLiveQuery(() => getCashflowTotals(), []);
}

