import { describe, it, expect } from "vitest";
import { evaluate } from "./calc";

// ── Helpers ─────────────────────────────────────────────

/** Assert a successful evaluation with expected pesewas and display. */
function expectOk(input: string, pesewas: number, display: string) {
  const r = evaluate(input);
  expect(r.ok, `Expected ok for "${input}", got error: ${!r.ok && r.error}`).toBe(true);
  if (!r.ok) return; // type guard
  expect(r.valuePesewas, `pesewas for "${input}"`).toBe(pesewas);
  expect(r.display, `display for "${input}"`).toBe(display);
}

/** Assert a failed evaluation. */
function expectErr(input: string, errorSubstring?: string) {
  const r = evaluate(input);
  expect(r.ok, `Expected error for "${input}"`).toBe(false);
  if (r.ok) return;
  if (errorSubstring) {
    expect(r.error.toLowerCase()).toContain(errorSubstring.toLowerCase());
  }
}

// ── Tests ───────────────────────────────────────────────

describe("calc – evaluate()", () => {
  // ── Basic arithmetic ─────────────────────────────────

  describe("basic arithmetic", () => {
    it("adds integers", () => {
      expectOk("2 + 3", 500, "5.00");
    });

    it("subtracts integers", () => {
      expectOk("10 - 4", 600, "6.00");
    });

    it("multiplies integers", () => {
      expectOk("3 * 4", 1200, "12.00");
    });

    it("divides integers evenly", () => {
      expectOk("10 / 2", 500, "5.00");
    });

    it("handles a single number", () => {
      expectOk("42", 4200, "42.00");
    });

    it("handles zero", () => {
      expectOk("0", 0, "0.00");
    });
  });

  // ── Operator synonyms ────────────────────────────────

  describe("operator synonyms", () => {
    it("accepts × for multiplication", () => {
      expectOk("3 × 4", 1200, "12.00");
    });

    it("accepts x for multiplication", () => {
      expectOk("3 x 4", 1200, "12.00");
    });

    it("accepts X for multiplication", () => {
      expectOk("3 X 4", 1200, "12.00");
    });

    it("accepts ÷ for division", () => {
      expectOk("12 ÷ 4", 300, "3.00");
    });

    it("accepts − (en dash minus)", () => {
      expectOk("10 − 3", 700, "7.00");
    });
  });

  // ── Decimal precision (the 0.1 + 0.2 test) ──────────

  describe("decimal precision", () => {
    it("0.1 + 0.2 = 0.30 exactly", () => {
      expectOk("0.1 + 0.2", 30, "0.30");
    });

    it("0.1 * 0.1 = 0.01", () => {
      expectOk("0.1 * 0.1", 1, "0.01");
    });

    it("1.005 rounds half up", () => {
      // 1.005 GHS → parseNumber rounds to pesewas:
      // intPart=1, frac="005" → firstTwo=0, third=5 → rounds up to 1
      expectOk("1.005", 101, "1.01");
    });

    it("handles long decimal like 9.999", () => {
      // 9.999 → intPart=9, frac="999" → firstTwo=99, third=9 → 100
      // pesewas = 900 + 100 = 1000
      expectOk("9.999", 1000, "10.00");
    });

    it("many decimal places: 1.234", () => {
      expectOk("1.234", 123, "1.23");
    });

    it("many decimal places: 1.235 rounds up", () => {
      expectOk("1.235", 124, "1.24");
    });
  });

  // ── Thousands separators ─────────────────────────────

  describe("thousands separators", () => {
    it("parses 1,000", () => {
      expectOk("1,000", 100000, "1,000.00");
    });

    it("parses 1,234,567.89", () => {
      expectOk("1,234,567.89", 123456789, "1,234,567.89");
    });

    it("rejects bad separators like 12,34", () => {
      expectErr("12,34", "malformed");
    });

    it("rejects leading comma", () => {
      expectErr(",123");
    });
  });

  // ── Parentheses ──────────────────────────────────────

  describe("parentheses", () => {
    it("respects grouping: (2 + 3) * 4 = 20", () => {
      expectOk("(2 + 3) * 4", 2000, "20.00");
    });

    it("nested parens: ((1 + 2) * (3 + 4))", () => {
      expectOk("((1 + 2) * (3 + 4))", 2100, "21.00");
    });

    it("parens around a single number", () => {
      expectOk("(5)", 500, "5.00");
    });
  });

  // ── Unary minus ──────────────────────────────────────

  describe("unary minus", () => {
    it("negates a number: -5", () => {
      expectOk("-5", -500, "-5.00");
    });

    it("double negation: --5 = 5", () => {
      expectOk("--5", 500, "5.00");
    });

    it("negation in expression: 3 + -2 = 1", () => {
      expectOk("3 + -2", 100, "1.00");
    });

    it("negation before parens: -(3 + 2) = -5", () => {
      expectOk("-(3 + 2)", -500, "-5.00");
    });

    it("unary plus is allowed", () => {
      expectOk("+5", 500, "5.00");
    });
  });

  // ── Percent ──────────────────────────────────────────

  describe("percent", () => {
    it("200 + 10% = 220 (percentage of left operand)", () => {
      expectOk("200 + 10%", 22000, "220.00");
    });

    it("200 - 10% = 180", () => {
      expectOk("200 - 10%", 18000, "180.00");
    });

    it("100 + 50% = 150", () => {
      expectOk("100 + 50%", 15000, "150.00");
    });

    it("standalone 50% = 0.50", () => {
      expectOk("50%", 50, "0.50");
    });

    it("standalone 100% = 1.00", () => {
      expectOk("100%", 100, "1.00");
    });

    it("1000 + 15% = 1150", () => {
      expectOk("1000 + 15%", 115000, "1,150.00");
    });
  });

  // ── Operator precedence ──────────────────────────────

  describe("operator precedence", () => {
    it("multiplication before addition: 2 + 3 * 4 = 14", () => {
      expectOk("2 + 3 * 4", 1400, "14.00");
    });

    it("division before subtraction: 10 - 6 / 3 = 8", () => {
      expectOk("10 - 6 / 3", 800, "8.00");
    });

    it("left-to-right multiplication: 2 * 3 * 4 = 24", () => {
      expectOk("2 * 3 * 4", 2400, "24.00");
    });
  });

  // ── Edge cases ───────────────────────────────────────

  describe("edge cases", () => {
    it("leading/trailing whitespace", () => {
      expectOk("  5 + 3  ", 800, "8.00");
    });

    it("lots of whitespace between tokens", () => {
      expectOk("5    +    3", 800, "8.00");
    });

    it("decimal without leading zero: .5", () => {
      expectOk(".5", 50, "0.50");
    });

    it("large numbers: 999,999.99", () => {
      expectOk("999,999.99", 99999999, "999,999.99");
    });

    it("result is exactly zero from subtraction", () => {
      expectOk("5 - 5", 0, "0.00");
    });

    it("complex expression", () => {
      // (10 + 5) * 2 - 3 = 30 - 3 = 27
      expectOk("(10 + 5) * 2 - 3", 2700, "27.00");
    });
  });

  // ── Error cases ──────────────────────────────────────

  describe("error cases", () => {
    it("rejects empty string", () => {
      expectErr("", "empty");
    });

    it("rejects whitespace-only", () => {
      expectErr("   ", "empty");
    });

    it("rejects trailing operator: '12 +'", () => {
      expectErr("12 +");
    });

    it("rejects leading operator without operand: '* 5'", () => {
      expectErr("* 5");
    });

    it("rejects mismatched parens: '((1)'", () => {
      expectErr("((1)");
    });

    it("rejects mismatched parens: '(1))'", () => {
      expectErr("(1))");
    });

    it("rejects empty parens: '()'", () => {
      expectErr("()");
    });

    it("rejects division by zero: '1/0'", () => {
      expectErr("1/0", "division by zero");
    });

    it("rejects division by zero in expression: '10 / (5 - 5)'", () => {
      expectErr("10 / (5 - 5)", "division by zero");
    });

    it("rejects alphabetic input: 'abc'", () => {
      expectErr("abc", "unexpected character");
    });

    it("rejects mixed alpha: '12 + abc'", () => {
      expectErr("12 + abc", "unexpected character");
    });

    it("rejects very long input", () => {
      const longInput = "1 + ".repeat(100) + "1";
      expectErr(longInput, "too long");
    });

    it("rejects multiple decimal points", () => {
      expectErr("1.2.3", "multiple decimal");
    });

    it("rejects adjacent operators: '5 + * 3'", () => {
      expectErr("5 + * 3");
    });

    it("rejects non-string input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = evaluate(42 as any);
      expect(r.ok).toBe(false);
    });

    it("rejects just an operator", () => {
      expectErr("+");
    });

    it("rejects just a percent sign", () => {
      expectErr("%");
    });
  });

  // ── No eval / Function ───────────────────────────────

  describe("security", () => {
    it("source code does not contain eval(", async () => {
      // Read the source file and verify no eval/Function usage
      const fs = await import("fs");
      const path = await import("path");
      const source = fs.readFileSync(
        path.resolve(__dirname, "calc.ts"),
        "utf-8",
      );
      // Match actual calls like eval(...) or Function(...), not comments mentioning the word
      expect(source).not.toMatch(/[^a-zA-Z]eval\s*\(/);
      expect(source).not.toMatch(/\bnew\s+Function\s*\(/);
    });
  });
});
