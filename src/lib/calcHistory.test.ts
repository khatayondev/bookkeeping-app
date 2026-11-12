import { describe, it, expect } from "vitest";
import {
  addHistoryEntry,
  calculateChange,
  MAX_HISTORY,
  CalcHistoryEntry,
} from "./calcHistory";
import { evaluate } from "./calc";

describe("calcHistory – helpers & persistence structure", () => {
  it("addHistoryEntry prepends new entries", () => {
    const list: CalcHistoryEntry[] = [];
    const r1 = addHistoryEntry(
      list,
      { expression: "10 + 20", display: "30.00", valuePesewas: 3000 },
      "2026-11-11T10:00:00Z",
    );
    expect(r1).toHaveLength(1);
    expect(r1[0].expression).toBe("10 + 20");
    expect(r1[0].display).toBe("30.00");

    const r2 = addHistoryEntry(
      r1,
      { expression: "50 * 2", display: "100.00", valuePesewas: 10000 },
      "2026-11-11T10:01:00Z",
    );
    expect(r2).toHaveLength(2);
    // Newest first
    expect(r2[0].expression).toBe("50 * 2");
    expect(r2[1].expression).toBe("10 + 20");
  });

  it("addHistoryEntry caps at MAX_HISTORY (10 items)", () => {
    let list: CalcHistoryEntry[] = [];
    for (let i = 1; i <= 15; i++) {
      list = addHistoryEntry(list, {
        expression: `${i} + 1`,
        display: `${i + 1}.00`,
        valuePesewas: (i + 1) * 100,
      });
    }

    expect(list).toHaveLength(MAX_HISTORY);
    expect(list).toHaveLength(10);
    // Newest should be 15 + 1
    expect(list[0].expression).toBe("15 + 1");
    // Oldest kept should be 6 + 1
    expect(list[9].expression).toBe("6 + 1");
  });

  it("handles empty or null current list gracefully", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = addHistoryEntry(null as any, {
      expression: "5 + 5",
      display: "10.00",
      valuePesewas: 1000,
    });
    expect(r).toHaveLength(1);
    expect(r[0].expression).toBe("5 + 5");
  });
});

describe("calculateChange – change mode math", () => {
  it("calculates positive change when customer overpays", () => {
    // Bill: GHS 45.00 (4500 pesewas), Paid: GHS 50.00 (5000 pesewas)
    const result = calculateChange(5000, 4500);
    expect(result.changePesewas).toBe(500); // GHS 5.00
    expect(result.isExact).toBe(false);
    expect(result.isShort).toBe(false);
  });

  it("handles exact payment (0 change)", () => {
    const result = calculateChange(3000, 3000);
    expect(result.changePesewas).toBe(0);
    expect(result.isExact).toBe(true);
    expect(result.isShort).toBe(false);
  });

  it("detects underpayment (customer paid less than bill)", () => {
    // Bill: GHS 50.00 (5000 pesewas), Paid: GHS 40.00 (4000 pesewas)
    const result = calculateChange(4000, 5000);
    expect(result.changePesewas).toBe(-1000);
    expect(result.isExact).toBe(false);
    expect(result.isShort).toBe(true);
  });

  it("handles decimal-accurate pesewas change", () => {
    // Bill: GHS 12.35 (1235 pesewas), Paid: GHS 20.00 (2000 pesewas)
    const result = calculateChange(2000, 1235);
    expect(result.changePesewas).toBe(765); // GHS 7.65
  });
});

describe("Use as amount prefill flow", () => {
  it("evaluates calculation and prefill string parses correctly", () => {
    // 1. User calculates on Calculator screen
    const calc = evaluate("12 x 45 + 30");
    expect(calc.ok).toBe(true);
    if (!calc.ok) return;

    expect(calc.display).toBe("570.00");
    expect(calc.valuePesewas).toBe(57000);

    // 2. Add Transaction receives prefillAmount = calc.display ("570.00")
    const prefilledEval = evaluate(calc.display);
    expect(prefilledEval.ok).toBe(true);
    if (!prefilledEval.ok) return;

    expect(prefilledEval.valuePesewas).toBe(57000);
    expect(prefilledEval.display).toBe("570.00");
  });

  it("prefills formatted currency with thousands separators without losing value", () => {
    const calc = evaluate("1000 x 2.5");
    expect(calc.ok).toBe(true);
    if (!calc.ok) return;

    expect(calc.display).toBe("2,500.00");
    expect(calc.valuePesewas).toBe(250000);

    // Passed as prefillAmount
    const prefilled = evaluate(calc.display);
    expect(prefilled.ok).toBe(true);
    if (!prefilled.ok) return;

    expect(prefilled.valuePesewas).toBe(250000);
    expect(prefilled.display).toBe("2,500.00");
  });
});

