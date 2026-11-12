// src/components/AmountField.tsx
/**
 * Calculator-enabled Amount field for transaction entry.
 *
 * Features:
 * - Read-only input that captures from the on-screen CalcKeypad.
 * - Live result line ("= GHS 570.00") shown when the expression contains operators.
 * - Plain numeric input shows no extra UI – identical feel to a normal field.
 * - Invalid expressions show an error hint.
 */
import React, { useRef, useEffect } from "react";
import { CalcKeypad } from "./CalcKeypad";
import type { CalcInputState } from "../hooks/useCalcInput";

export interface AmountFieldProps {
  calc: CalcInputState;
  /** Whether to show the keypad (the parent controls visibility). */
  showKeypad?: boolean;
}

export const AmountField: React.FC<AmountFieldProps> = ({
  calc,
  showKeypad = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep cursor at the end of the field whenever expression changes
  useEffect(() => {
    if (inputRef.current) {
      const len = calc.expression.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [calc.expression]);

  const hasOperators = !calc.isPlain && calc.expression.trim().length > 0;

  return (
    <div className="mb-4">
      <label htmlFor="amount-input" className="block mb-1 font-medium">
        Amount
      </label>

      {/* Expression input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium select-none pointer-events-none">
          GHS
        </span>
        <input
          id="amount-input"
          ref={inputRef}
          type="text"
          inputMode="none"
          autoComplete="off"
          className={`
            w-full rounded-lg border pl-14 pr-3 py-3 text-right text-xl font-mono
            focus:outline-none focus:ring-2 focus:ring-primary
            bg-white dark:bg-gray-800
            ${
              calc.expression.trim().length > 0 && !calc.isValid
                ? "border-red-400 dark:border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }
          `}
          value={calc.expression}
          readOnly
          placeholder="0.00"
          aria-label="Amount expression"
          aria-invalid={calc.expression.trim().length > 0 && !calc.isValid}
        />
      </div>

      {/* Live result line – only for expressions with operators */}
      {hasOperators && (
        <div className="mt-1.5 text-right pr-1 text-sm min-h-[1.25rem]">
          {calc.isValid ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              = GHS {calc.display}
            </span>
          ) : (
            <span className="text-red-700 dark:text-red-400 font-medium">
              {calc.error || "Invalid expression"}
            </span>
          )}
        </div>
      )}

      {/* Error for simple numbers that fail (shouldn't normally happen) */}
      {calc.isPlain &&
        calc.expression.trim().length > 0 &&
        !calc.isValid && (
          <div className="mt-1 text-right pr-1 text-sm text-red-700 dark:text-red-400 font-medium">
            {calc.error || "Invalid number"}
          </div>
        )}

      {/* Keypad */}
      {showKeypad && (
        <div className="mt-3">
          <CalcKeypad
            onDigit={calc.append}
            onOperator={calc.append}
            onBackspace={calc.backspace}
            onEquals={calc.collapse}
            onClear={calc.clear}
          />
        </div>
      )}
    </div>
  );
};

