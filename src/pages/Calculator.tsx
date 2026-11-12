// src/pages/Calculator.tsx
/**
 * Standalone Calculator screen (under More).
 *
 * Features:
 *  - Large on-screen keypad using the same calc engine.
 *  - Live expression display with result preview.
 *  - History of the last 10 calculations (persisted in Dexie settings).
 *  - "Use as amount" button → navigates to Add Transaction with amount pre-filled.
 *  - "Change" mode: amount paid minus bill = change to give.
 */
import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalcKeypad } from "../components/CalcKeypad";
import { useCalcInput } from "../hooks/useCalcInput";
import { useCalcHistory } from "../hooks/useCalcHistory";
import { formatMoney } from "../lib/money";
import { calculateChange } from "../lib/calcHistory";

type Mode = "calc" | "change";

export default function Calculator() {
  const navigate = useNavigate();
  const calc = useCalcInput();
  const { history, addEntry, clearHistory } = useCalcHistory();
  const [mode, setMode] = useState<Mode>("calc");

  // ── Change-mode state ───────────────────────────────
  const [changeStep, setChangeStep] = useState<"bill" | "paid">("bill");
  const [billPesewas, setBillPesewas] = useState<number | null>(null);
  const [billDisplay, setBillDisplay] = useState<string>("");

  // ── Equals handler (records to history) ─────────────
  const handleEquals = useCallback(() => {
    if (mode === "calc") {
      // Record expression + result before collapsing if valid and non-trivial
      if (calc.isValid && calc.valuePesewas !== null) {
        addEntry({
          expression: calc.expression.trim(),
          display: calc.display!,
          valuePesewas: calc.valuePesewas,
        });
      }
      calc.collapse();
    } else {
      // Change mode
      if (changeStep === "bill") {
        if (calc.isValid && calc.valuePesewas !== null && calc.valuePesewas > 0) {
          setBillPesewas(calc.valuePesewas);
          setBillDisplay(calc.display!);
          calc.clear();
          setChangeStep("paid");
        }
      } else {
        // "paid" step
        if (calc.isValid && calc.valuePesewas !== null && billPesewas !== null) {
          const { changePesewas } = calculateChange(calc.valuePesewas, billPesewas);
          addEntry({
            expression: `Paid ${calc.display} − Bill ${billDisplay}`,
            display: formatMoney(changePesewas).replace("GHS ", ""),
            valuePesewas: changePesewas,
          });
          calc.collapse();
        }
      }
    }
  }, [mode, calc, changeStep, billPesewas, billDisplay, addEntry]);

  // ── Use as amount → navigate to Add ────────────────
  const handleUseAsAmount = () => {
    if (mode === "change" && billPesewas !== null && billPesewas > 0) {
      navigate("/add", {
        state: { prefillAmount: billDisplay },
      });
      return;
    }
    if (calc.isValid && calc.valuePesewas !== null && calc.valuePesewas > 0) {
      navigate("/add", {
        state: { prefillAmount: calc.display },
      });
    }
  };

  // ── Use history entry as amount ────────────────────
  const handleUseHistoryEntry = (entry: { display: string }) => {
    navigate("/add", {
      state: { prefillAmount: entry.display },
    });
  };

  // ── Tap history entry to reload into display ───────
  const handleTapHistory = (entry: { expression: string; display: string }) => {
    // If expression was recorded as "Paid X - Bill Y", load the display value
    if (entry.expression.startsWith("Paid ")) {
      calc.setExpression(entry.display);
    } else {
      calc.setExpression(entry.expression);
    }
  };

  // ── Reset change mode ─────────────────────────────
  const resetChangeMode = () => {
    setBillPesewas(null);
    setBillDisplay("");
    setChangeStep("bill");
    calc.clear();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    calc.clear();
    if (m === "change") {
      resetChangeMode();
    }
  };

  // ── Derived change calculations ───────────────────
  const changeInfo =
    mode === "change" &&
    changeStep === "paid" &&
    billPesewas !== null &&
    calc.isValid &&
    calc.valuePesewas !== null
      ? calculateChange(calc.valuePesewas, billPesewas)
      : null;

  const canUseAsAmount =
    mode === "change"
      ? billPesewas !== null && billPesewas > 0
      : calc.isValid && calc.valuePesewas !== null && calc.valuePesewas > 0;

  return (
    <div className="max-w-md mx-auto pb-24">
      {/* ── Header with Back link ──────────────── */}
      <div className="flex items-center justify-between mb-3">
        <Link
          to="/more"
          className="text-neutral-900 dark:text-neutral-100 text-sm font-bold hover:underline inline-flex items-center gap-1 min-h-[44px] px-1"
          aria-label="Back to More"
        >
          ← More
        </Link>
        <h2 className="text-lg font-bold">Calculator</h2>
        <div className="w-12" /> {/* spacer for alignment */}
      </div>

      {/* ── Mode toggle ─────────────────────── */}
      <div className="flex gap-2 mb-4" role="group" aria-label="Calculator mode">
        <button
          type="button"
          aria-pressed={mode === "calc"}
          className={`flex-1 min-h-[48px] py-2 rounded-xl font-bold text-sm transition-colors ${
            mode === "calc"
              ? "bg-[#111111] text-white dark:bg-white dark:text-black shadow-xs"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
          onClick={() => switchMode("calc")}
        >
          Calculator
        </button>
        <button
          type="button"
          aria-pressed={mode === "change"}
          className={`flex-1 min-h-[48px] py-2 rounded-xl font-bold text-sm transition-colors ${
            mode === "change"
              ? "bg-[#111111] text-white dark:bg-white dark:text-black shadow-xs"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
          onClick={() => switchMode("change")}
        >
          Change
        </button>
      </div>

      {/* ── Change mode: 2-step banner ──────── */}
      {mode === "change" && (
        <div className="mb-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setChangeStep("bill");
                  if (billDisplay) calc.setExpression(billDisplay);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  changeStep === "bill"
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                1. Bill: {billDisplay ? `GHS ${billDisplay}` : "Enter Bill"}
              </button>
              <button
                type="button"
                disabled={billPesewas === null}
                onClick={() => {
                  if (billPesewas !== null) {
                    setChangeStep("paid");
                    calc.clear();
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40 transition-all ${
                  changeStep === "paid"
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                2. Paid
              </button>
            </div>
            <button
              type="button"
              onClick={resetChangeMode}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 underline"
            >
              Reset
            </button>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-300">
            {changeStep === "bill"
              ? "Type bill amount, then press = (or tap 2. Paid)"
              : `Bill is GHS ${billDisplay}. Now type amount customer paid.`}
          </div>
        </div>
      )}

      {/* ── Display ──────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 min-h-[5.5rem] flex flex-col justify-end shadow-sm">
        {/* Label for change mode */}
        {mode === "change" && (
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            {changeStep === "bill" ? "Bill Total" : "Amount Customer Paid"}
          </div>
        )}

        {/* Expression */}
        <div
          className="text-right text-gray-500 dark:text-gray-400 text-base font-mono break-all min-h-[1.5rem] overflow-x-auto"
          aria-live="polite"
        >
          {calc.expression || "\u00A0"}
        </div>

        {/* Result */}
        <div className="text-right text-3xl font-bold font-mono mt-1 min-h-[2.5rem]">
          {calc.isValid && calc.valuePesewas !== null ? (
            <span className="text-gray-900 dark:text-gray-100">
              {calc.display}
            </span>
          ) : calc.expression.trim().length > 0 ? (
            <span className="text-red-600 dark:text-red-400 text-lg font-semibold">{calc.error}</span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">0.00</span>
          )}
        </div>

        {/* Change mode: Change calculation banner */}
        {changeInfo !== null && (
          <div className="text-right text-lg font-bold mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white">
            {changeInfo.changePesewas >= 0
              ? `Change to Give: ${formatMoney(changeInfo.changePesewas)}`
              : `Short by: ${formatMoney(Math.abs(changeInfo.changePesewas))}`}
          </div>
        )}
      </div>

      {/* ── Keypad ───────────────────────────── */}
      <div className="mb-4">
        <CalcKeypad
          size="large"
          onDigit={calc.append}
          onOperator={calc.append}
          onBackspace={calc.backspace}
          onEquals={handleEquals}
          onClear={calc.clear}
        />
      </div>

      {/* ── Action buttons ───────────────────── */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          className="flex-1 min-h-[48px] py-3 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-base font-bold active:bg-neutral-300 dark:active:bg-neutral-700 transition-colors"
          onClick={calc.clear}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!canUseAsAmount}
          className="flex-1 min-h-[48px] py-3 rounded-xl bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-base font-bold active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          onClick={handleUseAsAmount}
        >
          {mode === "change" && billPesewas
            ? `Use Bill (GHS ${billDisplay}) →`
            : "Use as Amount →"}
        </button>
      </div>

      {/* ── History (Last 10 calculations) ── */}
      {history && history.length > 0 && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Recent Calculations (Last {history.length})
            </h3>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-red-700 dark:text-red-400 font-semibold hover:underline min-h-[44px] px-2 flex items-center"
            >
              Clear History
            </button>
          </div>
          <ul className="space-y-2">
            {history.map((entry, i) => (
              <li
                key={entry.timestamp + i}
                className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 shadow-sm"
              >
                <button
                  type="button"
                  className="text-left flex-1 min-w-0 mr-2 min-h-[44px] py-1"
                  onClick={() => handleTapHistory(entry)}
                  title="Load into calculator"
                  aria-label={`Load calculation ${entry.expression} into calculator`}
                >
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate font-mono">
                    {entry.expression}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    = GHS {entry.display}
                  </div>
                </button>
                <button
                  type="button"
                  className="text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-bold shrink-0 min-h-[44px] px-3 py-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center"
                  onClick={() => handleUseHistoryEntry(entry)}
                  title="Use as transaction amount in Add Transaction"
                  aria-label={`Use amount GHS ${entry.display} in Add Transaction`}
                >
                  Use as Amount →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
