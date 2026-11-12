// src/lib/debts.ts
/**
 * Business logic and pure helper functions for Debt management.
 * Handles calculation of remaining balances, payment validation,
 * overpayment prevention, reversal, sorting (overdue first), and summary statistics.
 */
import type { Debt, Transaction } from "../db/db";
import { formatMoney } from "./money";

export interface DebtPaymentResult {
  debt: Debt;
  transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">;
  isSettled: boolean;
  remainingPesewas: number;
}

export interface DebtsSummary {
  /** Sum of remaining unpaid amounts where kind === 'owed_to_me' */
  totalOwedToMe: number;
  /** Sum of remaining unpaid amounts where kind === 'i_owe' */
  totalIOwe: number;
  /** Net balance (totalOwedToMe - totalIOwe) */
  netBalance: number;
  /** Count of open debts that are past their due date */
  overdueCount: number;
  /** Total count of open debts */
  openCount: number;
}

/**
 * Strip time from a date, setting to midnight local time.
 */
export function stripTime(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate the remaining unpaid balance in pesewas for a debt.
 */
export function calculateRemaining(
  debt: Pick<Debt, "amountPesewas" | "paidPesewas">,
): number {
  return Math.max(0, debt.amountPesewas - (debt.paidPesewas || 0));
}

/**
 * Check whether an open debt is past its due date.
 */
export function isDebtOverdue(
  debt: Pick<Debt, "dueDate" | "status" | "amountPesewas" | "paidPesewas">,
  referenceDate: Date = new Date(),
): boolean {
  if (debt.status === "paid" || calculateRemaining(debt) <= 0) {
    return false;
  }
  if (!debt.dueDate) {
    return false;
  }
  const due = stripTime(new Date(debt.dueDate));
  const ref = stripTime(referenceDate);
  return due.getTime() < ref.getTime();
}

/**
 * Sort debts according to business rules:
 * 1. Overdue open debts first (sorted by due date ascending, oldest first)
 * 2. Due soon / regular open debts with due dates (sorted by due date ascending)
 * 3. Open debts without due dates
 * 4. Paid / settled debts at the bottom
 */
export function sortDebts(
  debts: Debt[],
  referenceDate: Date = new Date(),
): Debt[] {
  return [...debts].sort((a, b) => {
    const aRemaining = calculateRemaining(a);
    const bRemaining = calculateRemaining(b);
    const aIsOpen = a.status !== "paid" && aRemaining > 0;
    const bIsOpen = b.status !== "paid" && bRemaining > 0;

    // Open debts before paid debts
    if (aIsOpen && !bIsOpen) return -1;
    if (!aIsOpen && bIsOpen) return 1;

    // Both are open: check overdue
    if (aIsOpen && bIsOpen) {
      const aOverdue = isDebtOverdue(a, referenceDate);
      const bOverdue = isDebtOverdue(b, referenceDate);

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Both overdue or neither overdue: sort by due date if available
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
    }

    // Default tie-break: newer debts first
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Validate and apply a payment to a debt.
 * Prevents overpayments and generates the matching transaction record.
 * - Money In for 'owed_to_me' (debtor pays me)
 * - Money Out for 'i_owe' (I pay creditor)
 */
export function validateAndApplyPayment(
  debt: Debt,
  paymentAmountPesewas: number,
  paymentMethodId: string,
  options?: {
    date?: Date;
    categoryId?: string;
    description?: string;
  },
): DebtPaymentResult {
  if (
    typeof paymentAmountPesewas !== "number" ||
    !Number.isFinite(paymentAmountPesewas) ||
    paymentAmountPesewas <= 0
  ) {
    throw new Error("Payment amount must be greater than zero");
  }

  const remaining = calculateRemaining(debt);

  if (paymentAmountPesewas > remaining) {
    throw new Error(
      `Overpayment not allowed: payment of ${formatMoney(paymentAmountPesewas)} exceeds remaining balance of ${formatMoney(remaining)}`,
    );
  }

  const newPaidPesewas = debt.paidPesewas + paymentAmountPesewas;
  const isSettled = newPaidPesewas >= debt.amountPesewas;
  const newStatus: "open" | "paid" = isSettled ? "paid" : "open";
  const now = new Date();

  const updatedDebt: Debt = {
    ...debt,
    paidPesewas: newPaidPesewas,
    status: newStatus,
    updatedAt: now,
  };

  const txType: "in" | "out" = debt.kind === "owed_to_me" ? "in" : "out";
  const defaultDesc =
    debt.kind === "owed_to_me"
      ? `Debt payment from ${debt.personName}`
      : `Debt payment to ${debt.personName}`;

  const transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt"> = {
    date: options?.date ?? now,
    amountPesewas: paymentAmountPesewas,
    type: txType,
    categoryId: options?.categoryId ?? "",
    description: options?.description?.trim() || defaultDesc,
    paymentMethodId,
    debtId: debt.id,
  };

  return {
    debt: updatedDebt,
    transaction,
    isSettled,
    remainingPesewas: calculateRemaining(updatedDebt),
  };
}

/**
 * Reverses a previously recorded payment on a debt.
 * Decreases paidPesewas and transitions 'paid' debts back to 'open' if balance remains.
 */
export function reversePayment(
  debt: Debt,
  paymentAmountPesewas: number,
): Debt {
  const amountToReverse = Math.max(0, paymentAmountPesewas || 0);
  const newPaidPesewas = Math.max(0, debt.paidPesewas - amountToReverse);
  const isStillPaid = newPaidPesewas >= debt.amountPesewas;
  const newStatus: "open" | "paid" = isStillPaid ? "paid" : "open";

  return {
    ...debt,
    paidPesewas: newPaidPesewas,
    status: newStatus,
    updatedAt: new Date(),
  };
}

/**
 * Computes debt totals for dashboard strips and tab badges.
 * Totals are based on the remaining balance of all open (unsettled) debts.
 */
export function calculateDebtsSummary(
  debts: Debt[],
  referenceDate: Date = new Date(),
): DebtsSummary {
  let totalOwedToMe = 0;
  let totalIOwe = 0;
  let overdueCount = 0;
  let openCount = 0;

  for (const debt of debts) {
    const remaining = calculateRemaining(debt);
    const isOpen = debt.status !== "paid" && remaining > 0;

    if (isOpen) {
      openCount++;
      if (debt.kind === "owed_to_me") {
        totalOwedToMe += remaining;
      } else if (debt.kind === "i_owe") {
        totalIOwe += remaining;
      }

      if (isDebtOverdue(debt, referenceDate)) {
        overdueCount++;
      }
    }
  }

  return {
    totalOwedToMe,
    totalIOwe,
    netBalance: totalOwedToMe - totalIOwe,
    overdueCount,
    openCount,
  };
}

