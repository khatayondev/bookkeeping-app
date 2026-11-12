// src/pages/Home.tsx
import React from "react";
import { Link } from "react-router-dom";
import { DebtSummaryStrip } from "../components/DebtSummaryStrip";
import { InstallPrompt } from "../components/InstallPrompt";
import { useCashflowTotals } from "../hooks/useTransactions";
import { formatMoney } from "../lib/money";

export default function Home() {
  const cashflow = useCashflowTotals();

  const totalIn = cashflow?.totalIn ?? 0;
  const totalOut = cashflow?.totalOut ?? 0;
  const netCash = cashflow?.netCash ?? 0;

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* ── Install App Prompt (Hidden if installed) ── */}
      <InstallPrompt variant="banner" />

      {/* ── Cashflow Summary Strip ─────────── */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white p-6 shadow-xl shadow-orange-500/20 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-amber-300/20 blur-lg pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-100 uppercase tracking-wider block">
              Net Cashflow
            </span>
            <span className="text-[11px] bg-white/20 text-white font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              Live Balance
            </span>
          </div>

          <div className="text-3xl font-extrabold font-mono mb-4 tracking-tight drop-shadow-xs">
            {formatMoney(netCash)}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20 text-sm">
            <div>
              <span className="text-xs text-amber-100 block font-medium">Total In</span>
              <span className="font-bold font-mono text-base text-white">
                {formatMoney(totalIn)}
              </span>
            </div>
            <div>
              <span className="text-xs text-amber-100 block font-medium">Total Out</span>
              <span className="font-bold font-mono text-base text-white">
                {formatMoney(totalOut)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dashboard Debts Strip (Links to /debts) ── */}
      <div>
        <DebtSummaryStrip clickable />
      </div>

      {/* ── Quick Links ──────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 pt-1" role="navigation" aria-label="Quick actions">
        <Link
          to="/add"
          aria-label="Add Entry"
          className="bg-white dark:bg-gray-850 border border-amber-100 dark:border-gray-800 rounded-2xl min-h-[56px] p-3.5 text-center shadow-xs hover:border-orange-400 hover:shadow-sm transition-all block group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg mx-auto mb-1.5 shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform">
            ➕
          </div>
          <span className="text-xs font-bold block text-gray-800 dark:text-gray-200">
            Add Entry
          </span>
        </Link>
        <Link
          to="/debts"
          aria-label="Debts & Credit"
          className="bg-white dark:bg-gray-850 border border-amber-100 dark:border-gray-800 rounded-2xl min-h-[56px] p-3.5 text-center shadow-xs hover:border-orange-400 hover:shadow-sm transition-all block group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center text-lg mx-auto mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
            🤝
          </div>
          <span className="text-xs font-bold block text-gray-800 dark:text-gray-200">
            Debts
          </span>
        </Link>
        <Link
          to="/more/calculator"
          aria-label="Calculator"
          className="bg-white dark:bg-gray-850 border border-amber-100 dark:border-gray-800 rounded-2xl min-h-[56px] p-3.5 text-center shadow-xs hover:border-orange-400 hover:shadow-sm transition-all block group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800 flex items-center justify-center text-lg mx-auto mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
            🔢
          </div>
          <span className="text-xs font-bold block text-gray-800 dark:text-gray-200">
            Calculator
          </span>
        </Link>
      </div>
    </div>
  );
}
