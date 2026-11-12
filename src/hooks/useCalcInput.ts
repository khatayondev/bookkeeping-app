// src/hooks/useCalcInput.ts
/**
 * React hook that manages calculator-expression state for the Amount field.
 *
 * Responsibilities:
 *  - Tracks the raw expression string.
 *  - Live-evaluates it on every change via `evaluate()`.
 *  - Exposes helpers for the on-screen keypad: append, backspace, collapse (=).
 *  - Tells the caller whether the expression is valid, purely numeric,
 *    and provides the result in pesewas + display format.
 */
import { useState, useMemo, useCallback } from "react";
import { evaluate } from "../lib/calc";

export interface CalcInputState {
  /** The raw expression string shown in the input. */
  expression: string;

  /** Whether the expression is valid (evaluates without error). */
  isValid: boolean;

  /** Whether the expression is just a plain number (no operators). */
  isPlain: boolean;

  /** Evaluated result in pesewas, or null if invalid. */
  valuePesewas: number | null;

  /** Formatted display string like "1,250.75", or null if invalid. */
  display: string | null;

  /** Error message when invalid, or null if valid. */
  error: string | null;

  /** Set the expression directly (e.g. from a native input change). */
  setExpression: (expr: string) => void;

  /** Append a character or string from the keypad. */
  append: (char: string) => void;

  /** Delete the last character. */
  backspace: () => void;

  /** Clear the entire expression. */
  clear: () => void;

  /** Collapse the expression to its evaluated result (the "=" key). */
  collapse: () => void;
}

/** Returns true if the expression contains only number characters (digits, dot, comma). */
function isPlainNumber(expr: string): boolean {
  const trimmed = expr.trim();
  if (trimmed.length === 0) return false;
  return /^[\d.,]+$/.test(trimmed);
}

export function useCalcInput(initialValue = ""): CalcInputState {
  const [expression, setExpression] = useState(initialValue);

  const result = useMemo(() => {
    const trimmed = expression.trim();
    if (trimmed.length === 0) {
      return { isValid: false, valuePesewas: null, display: null, error: null };
    }
    const r = evaluate(trimmed);
    if (r.ok) {
      return {
        isValid: true,
        valuePesewas: r.valuePesewas,
        display: r.display,
        error: null,
      };
    }
    return { isValid: false, valuePesewas: null, display: null, error: r.error };
  }, [expression]);

  const isPlain = useMemo(() => isPlainNumber(expression), [expression]);

  const append = useCallback((char: string) => {
    setExpression((prev) => prev + char);
  }, []);

  const backspace = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setExpression("");
  }, []);

  const collapse = useCallback(() => {
    setExpression((prev) => {
      const trimmed = prev.trim();
      if (trimmed.length === 0) return prev;
      const r = evaluate(trimmed);
      if (r.ok) {
        return r.display;
      }
      // If invalid, keep the expression unchanged
      return prev;
    });
  }, []);

  return {
    expression,
    isValid: result.isValid,
    isPlain,
    valuePesewas: result.valuePesewas,
    display: result.display,
    error: result.error,
    setExpression,
    append,
    backspace,
    clear,
    collapse,
  };
}

