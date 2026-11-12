import { describe, it, expect } from "vitest";
import {
  calculateRemaining,
  isDebtOverdue,
  sortDebts,
  validateAndApplyPayment,
  reversePayment,
  calculateDebtsSummary,
} from "./debts";
import type { Debt } from "../db/db";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  const now = new Date();
  return {
    id: "test-debt-1",
    kind: "owed_to_me",
    personName: "Kwame Mensah",
    phone: "0241234567",
    amountPesewas: 10000, // GHS 100.00
    paidPesewas: 0,
    status: "open",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Debt Payment & Settlement Logic", () => {
  it("handles partial payment correctly", () => {
    const debt = makeDebt({ amountPesewas: 10000, paidPesewas: 0 }); // 100 GHS
    const payment = 4000; // 40 GHS

    const result = validateAndApplyPayment(debt, payment, "pm-cash");

    expect(result.debt.paidPesewas).toBe(4000);
    expect(result.remainingPesewas).toBe(6000);
    expect(result.isSettled).toBe(false);
    expect(result.debt.status).toBe("open");

    // Creates matching transaction for 'owed_to_me' -> type: 'in'
    expect(result.transaction.amountPesewas).toBe(4000);
    expect(result.transaction.type).toBe("in");
    expect(result.transaction.debtId).toBe(debt.id);
    expect(result.transaction.paymentMethodId).toBe("pm-cash");
    expect(result.transaction.description).toContain("Kwame Mensah");
  });

  it("handles payment for 'i_owe' as Money Out transaction", () => {
    const debt = makeDebt({
      kind: "i_owe",
      personName: "Supplier Makola",
      amountPesewas: 50000,
      paidPesewas: 0,
    });

    const result = validateAndApplyPayment(debt, 20000, "pm-momo");

    expect(result.debt.paidPesewas).toBe(20000);
    expect(result.remainingPesewas).toBe(30000);
    expect(result.transaction.type).toBe("out");
    expect(result.transaction.debtId).toBe(debt.id);
  });

  it("handles full payment and marks debt as paid", () => {
    // Already paid 4000 of 10000
    const debt = makeDebt({
      amountPesewas: 10000,
      paidPesewas: 4000,
      status: "open",
    });

    const result = validateAndApplyPayment(debt, 6000, "pm-cash");

    expect(result.debt.paidPesewas).toBe(10000);
    expect(result.remainingPesewas).toBe(0);
    expect(result.isSettled).toBe(true);
    expect(result.debt.status).toBe("paid");
  });

  it("prevents overpayment when amount exceeds remaining balance", () => {
    const debt = makeDebt({
      amountPesewas: 10000,
      paidPesewas: 6000, // Remaining: 4000
    });

    // Attempting to pay 4001 or 5000 should throw
    expect(() => {
      validateAndApplyPayment(debt, 4500, "pm-cash");
    }).toThrow(/overpayment not allowed/i);

    // Negative or zero payments should also be rejected
    expect(() => {
      validateAndApplyPayment(debt, 0, "pm-cash");
    }).toThrow(/greater than zero/i);
    expect(() => {
      validateAndApplyPayment(debt, -100, "pm-cash");
    }).toThrow(/greater than zero/i);
  });

  it("reverses payment and reopens a paid debt", () => {
    // Fully paid debt of 10000
    const settledDebt = makeDebt({
      amountPesewas: 10000,
      paidPesewas: 10000,
      status: "paid",
    });

    // Reverse a partial payment of 4000
    const reversed = reversePayment(settledDebt, 4000);

    expect(reversed.paidPesewas).toBe(6000);
    expect(calculateRemaining(reversed)).toBe(4000);
    expect(reversed.status).toBe("open"); // Reopened!
  });

  it("reverses payment on open debt without dropping below zero", () => {
    const debt = makeDebt({
      amountPesewas: 10000,
      paidPesewas: 3000,
      status: "open",
    });

    const reversed = reversePayment(debt, 5000);
    expect(reversed.paidPesewas).toBe(0);
    expect(reversed.status).toBe("open");
  });
});

describe("Debt Overdue & Sorting Rules", () => {
  it("identifies overdue debts accurately", () => {
    const ref = new Date("2026-11-15T12:00:00Z");

    const pastDue = makeDebt({
      dueDate: new Date("2026-11-10T00:00:00Z"),
      status: "open",
    });
    expect(isDebtOverdue(pastDue, ref)).toBe(true);

    const futureDue = makeDebt({
      dueDate: new Date("2026-11-20T00:00:00Z"),
      status: "open",
    });
    expect(isDebtOverdue(futureDue, ref)).toBe(false);

    // Today is not overdue
    const dueToday = makeDebt({
      dueDate: new Date("2026-11-15T00:00:00Z"),
      status: "open",
    });
    expect(isDebtOverdue(dueToday, ref)).toBe(false);

    // Settled debts are never considered overdue
    const paidPastDue = makeDebt({
      dueDate: new Date("2026-11-10T00:00:00Z"),
      amountPesewas: 10000,
      paidPesewas: 10000,
      status: "paid",
    });
    expect(isDebtOverdue(paidPastDue, ref)).toBe(false);
  });

  it("sorts overdue debts first, then by due date ascending", () => {
    const ref = new Date("2026-11-15T00:00:00Z");

    const d1_future = makeDebt({
      id: "d1",
      personName: "Future Due",
      dueDate: new Date("2026-11-25"),
      status: "open",
    });
    const d2_overdueRecent = makeDebt({
      id: "d2",
      personName: "Overdue Recent",
      dueDate: new Date("2026-11-14"),
      status: "open",
    });
    const d3_overdueOld = makeDebt({
      id: "d3",
      personName: "Overdue Old",
      dueDate: new Date("2026-11-01"),
      status: "open",
    });
    const d4_noDueDate = makeDebt({
      id: "d4",
      personName: "No Due Date",
      status: "open",
    });
    const d5_paid = makeDebt({
      id: "d5",
      personName: "Paid",
      dueDate: new Date("2026-11-05"),
      amountPesewas: 5000,
      paidPesewas: 5000,
      status: "paid",
    });

    const sorted = sortDebts(
      [d1_future, d4_noDueDate, d5_paid, d2_overdueRecent, d3_overdueOld],
      ref,
    );

    // Expected order:
    // 1. Overdue oldest: d3 (Nov 1)
    // 2. Overdue recent: d2 (Nov 14)
    // 3. Open upcoming: d1 (Nov 25)
    // 4. Open without due date: d4
    // 5. Settled: d5
    expect(sorted.map((d) => d.id)).toEqual(["d3", "d2", "d1", "d4", "d5"]);
  });
});

describe("Debts Summary calculations", () => {
  it("calculates totals matching dashboard strip & debts page", () => {
    const ref = new Date("2026-11-15T00:00:00Z");

    const debts: Debt[] = [
      // Owed to me: 100 GHS total, 40 paid -> 60 remaining (overdue)
      makeDebt({
        id: "1",
        kind: "owed_to_me",
        amountPesewas: 10000,
        paidPesewas: 4000,
        dueDate: new Date("2026-11-10"),
        status: "open",
      }),
      // Owed to me: 50 GHS remaining (not overdue)
      makeDebt({
        id: "2",
        kind: "owed_to_me",
        amountPesewas: 5000,
        paidPesewas: 0,
        dueDate: new Date("2026-11-20"),
        status: "open",
      }),
      // I owe: 80 GHS total, 30 paid -> 50 remaining (overdue)
      makeDebt({
        id: "3",
        kind: "i_owe",
        amountPesewas: 8000,
        paidPesewas: 3000,
        dueDate: new Date("2026-11-08"),
        status: "open",
      }),
      // I owe: 20 GHS remaining (not overdue)
      makeDebt({
        id: "4",
        kind: "i_owe",
        amountPesewas: 2000,
        paidPesewas: 0,
        dueDate: new Date("2026-11-30"),
        status: "open",
      }),
      // Fully paid: should not count towards remaining balances
      makeDebt({
        id: "5",
        kind: "owed_to_me",
        amountPesewas: 15000,
        paidPesewas: 15000,
        status: "paid",
      }),
    ];

    const summary = calculateDebtsSummary(debts, ref);

    // Total Owed To Me = 6000 + 5000 = 11000 pesewas (GHS 110.00)
    expect(summary.totalOwedToMe).toBe(11000);

    // Total I Owe = 5000 + 2000 = 7000 pesewas (GHS 70.00)
    expect(summary.totalIOwe).toBe(7000);

    // Net Balance = 11000 - 7000 = 4000 pesewas (GHS 40.00)
    expect(summary.netBalance).toBe(4000);

    // Overdue count = debt #1 and debt #3 = 2
    expect(summary.overdueCount).toBe(2);

    // Open count = 4
    expect(summary.openCount).toBe(4);
  });
});

