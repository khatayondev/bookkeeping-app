// src/components/CalcKeypad.tsx
/**
 * On-screen calculator keypad for the Amount field.
 *
 * Layout (4 columns × 5 rows):
 *   ( ) %  ⌫
 *   7 8 9  ÷
 *   4 5 6  ×
 *   1 2 3  −
 *   0 .    +  =
 *
 * Designed to be fast for plain numeric entry (digits + dot are prominent)
 * while also providing operator keys for expression mode.
 */
import React from "react";

export interface CalcKeypadProps {
  onDigit: (d: string) => void;
  onOperator: (op: string) => void;
  onBackspace: () => void;
  onEquals: () => void;
  onClear: () => void;
  /** "compact" for the AmountField, "large" for the standalone Calculator. */
  size?: "compact" | "large";
}

interface KeyDef {
  label: string;
  /** Character to emit, or special action: "backspace" | "equals" | "clear" */
  action: string;
  /** "digit" | "op" | "action" */
  type: "digit" | "op" | "action";
  /** Column span, default 1 */
  span?: number;
}

const keys: KeyDef[] = [
  { label: "(", action: "(", type: "op" },
  { label: ")", action: ")", type: "op" },
  { label: "%", action: "%", type: "op" },
  { label: "⌫", action: "backspace", type: "action" },

  { label: "7", action: "7", type: "digit" },
  { label: "8", action: "8", type: "digit" },
  { label: "9", action: "9", type: "digit" },
  { label: "÷", action: " ÷ ", type: "op" },

  { label: "4", action: "4", type: "digit" },
  { label: "5", action: "5", type: "digit" },
  { label: "6", action: "6", type: "digit" },
  { label: "×", action: " × ", type: "op" },

  { label: "1", action: "1", type: "digit" },
  { label: "2", action: "2", type: "digit" },
  { label: "3", action: "3", type: "digit" },
  { label: "−", action: " - ", type: "op" },

  { label: "0", action: "0", type: "digit" },
  { label: ".", action: ".", type: "digit" },
  { label: "+", action: " + ", type: "op" },
  { label: "=", action: "equals", type: "action" },
];

export const CalcKeypad: React.FC<CalcKeypadProps> = ({
  onDigit,
  onOperator,
  onBackspace,
  onEquals,
  size = "compact",
}) => {
  const handlePress = (key: KeyDef) => {
    if (key.action === "backspace") {
      onBackspace();
    } else if (key.action === "equals") {
      onEquals();
    } else if (key.type === "digit") {
      onDigit(key.action);
    } else {
      onOperator(key.action);
    }
  };

  const btnPadding = size === "large" ? "py-4 text-xl min-h-[56px]" : "py-3 text-lg min-h-[48px]";

  return (
    <div
      className="grid grid-cols-4 gap-1.5 select-none"
      role="group"
      aria-label="Calculator keypad"
    >
      {keys.map((key) => {
        const isEquals = key.action === "equals";
        const isBackspace = key.action === "backspace";

        let bg: string;
        if (isEquals) {
          bg = "bg-primary text-white active:bg-primary/80";
        } else if (isBackspace) {
          bg =
            "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 active:bg-red-200 dark:active:bg-red-900/60 font-semibold";
        } else if (key.type === "op") {
          bg =
            "bg-gray-200 dark:bg-gray-700 text-blue-700 dark:text-blue-300 active:bg-gray-300 dark:active:bg-gray-600 font-bold";
        } else {
          bg =
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 active:bg-gray-100 dark:active:bg-gray-700 font-semibold";
        }

        return (
          <button
            key={key.label}
            type="button"
            className={`
              ${bg}
              ${key.span === 2 ? "col-span-2" : ""}
              rounded-lg ${btnPadding}
              flex items-center justify-center
              shadow-sm border border-gray-200 dark:border-gray-700
              transition-colors duration-75
              focus:outline-none focus:ring-2 focus:ring-primary/50
              touch-manipulation
            `}
            onClick={() => handlePress(key)}
            aria-label={
              isBackspace ? "Delete" : isEquals ? "Equals" : key.label
            }
          >
            {key.label}
          </button>
        );
      })}
    </div>
  );
};
