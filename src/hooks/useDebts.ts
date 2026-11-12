// src/hooks/useDebts.ts
/**
 * React hooks for reactive live queries of Debts, Payments, and Summary statistics.
 */
import { useLiveQuery } from "dexie-react-hooks";
import type { Debt, Transaction } from "../db/db";
import {
  listDebts,
  getDebtById,
  listDebtPayments,
  getDebtsSummary,
} from "../db/queries";
import { sortDebts, type DebtsSummary } from "../lib/debts";

/**
 * Live-query a list of debts with optional filters for kind ('owed_to_me' | 'i_owe')
 * and status ('open' | 'paid'). Returns sorted debts (overdue first, then by due date).
 */
export function useDebts(
  kind?: "owed_to_me" | "i_owe",
  status?: "open" | "paid",
): Debt[] | undefined {
  return useLiveQuery(async () => {
    const raw = await listDebts(kind, status);
    return sortDebts(raw);
  }, [kind, status]);
}

/**
 * Live-query a single debt by its ID.
 */
export function useDebt(id: string | null | undefined): Debt | undefined | null {
  return useLiveQuery(async () => {
    if (!id) return null;
    return (await getDebtById(id)) ?? null;
  }, [id]);
}

/**
 * Live-query transactions (payments) associated with a debt.
 */
export function useDebtPayments(
  debtId: string | null | undefined,
): Transaction[] | undefined {
  return useLiveQuery(async () => {
    if (!debtId) return [];
    return listDebtPayments(debtId);
  }, [debtId]);
}

/**
 * Live-query summary statistics across all debts (totalOwedToMe, totalIOwe, etc.).
 */
export function useDebtsSummary(): DebtsSummary | undefined {
  return useLiveQuery(() => getDebtsSummary(), []);
}

