// src/pages/Home.tsx
import React from "react";
import { Link } from "react-router-dom";
import { DebtSummaryStrip } from "../components/DebtSummaryStrip";
import { InstallPrompt } from "../components/InstallPrompt";
import { useCashflowTotals } from "../hooks/useTransactions";
import { useDebtsSummary } from "../hooks/useDebts";
import { formatMoney } from "../lib/money";

export default function Home() {
  const cashflow = useCashflowTotals();
  const debtsSummary = useDebtsSummary();

  const totalIn = cashflow?.totalIn ?? 0;
  const totalOut = cashflow?.totalOut ?? 0;
  const netCash = cashflow?.netCash ?? 0;
  const totalOwedToMe = debtsSummary?.totalOwedToMe ?? 0;

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* ── Install App Prompt (Hidden if installed) ── */}
      <InstallPrompt variant="banner" />

      {/* ── Mobile Greeting (Design Match: Screen 2) ── */}
      <div className="pt-1 pb-1 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
            Good day,<br />
            <span className="text-black dark:text-white font-black">Honey Palace</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
            Today&apos;s Financial Overview
          </p>
        </div>
        <Link
          to="/more"
          aria-label="Profile and settings"
          className="p-0.5 rounded-full bg-neutral-900 dark:bg-white shadow-xs"
        >
          <img
            src="/honey-palace-badge.png"
            alt="Honey Palace"
            className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-neutral-900"
          />
        </Link>
      </div>

      {/* ── Dark Stats Card (Design Match: Screen 1 Dark Card) ── */}
      <div className="bg-black dark:bg-[#121212] text-white rounded-3xl p-5 shadow-xl border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold uppercase tracking-wider">
          <span>Cashflow Summary</span>
          <span className="bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
            Offline Vault
          </span>
        </div>

        {/* 3 columns matching screen 1: Income / Expenses / Net */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div>
            <span className="block text-lg font-bold font-mono text-white truncate">
              {formatMoney(totalIn)}
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">Income</span>
          </div>
          <div>
            <span className="block text-lg font-bold font-mono text-white truncate">
              {formatMoney(totalOut)}
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">Expenses</span>
          </div>
          <div>
            <span className="block text-lg font-bold font-mono text-white truncate">
              {formatMoney(netCash)}
            </span>
            <span className="text-[11px] text-neutral-300 font-semibold">Net Saved</span>
          </div>
        </div>

        {/* Monochromatic Progress bar */}
        <div className="pt-2 border-t border-neutral-800">
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className="bg-white dark:bg-neutral-200 h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalIn > 0 ? Math.min(100, Math.max(8, Math.round((netCash / totalIn) * 100))) : 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-neutral-400">
            <span>Health: {totalIn > 0 ? `${Math.round((netCash / totalIn) * 100)}% retained` : "Ready"}</span>
            <Link to="/transactions" className="text-white font-semibold hover:underline">
              View ledger →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Monochromatic Action Banner (Design Match: Screen 2 "Book a ride") ── */}
      <Link
        to="/add"
        className="bg-black text-white hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-2xl p-4 shadow-lg flex items-center justify-between transition-transform active:scale-[0.99] group block border border-neutral-800 dark:border-neutral-200"
      >
        <div className="space-y-0.5">
          <span className="block font-black text-base">
            Record Transaction
          </span>
          <span className="block text-xs text-neutral-400 dark:text-neutral-600 font-medium">
            Fast entry, calculator &amp; receipt photo
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-white text-black dark:bg-black dark:text-white flex items-center justify-center font-bold text-lg group-hover:translate-x-0.5 transition-transform shrink-0 shadow-md">
          →
        </div>
      </Link>

      {/* ── Bottom Split Cards (Design Match: Screen 2 bottom cards) ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Clean Card with Debts */}
        <Link
          to="/debts"
          className="bg-white dark:bg-[#121212] rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-black dark:hover:border-white transition-all block group"
        >
          <span className="text-xl font-black font-mono block text-neutral-900 dark:text-white truncate">
            {formatMoney(totalOwedToMe)}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold flex items-center gap-1 mt-1">
            <span>🤝</span> Owed to you
          </span>
        </Link>

        {/* Right: Black Badge Card */}
        <div className="bg-black dark:bg-[#121212] text-white rounded-2xl p-4 shadow-xs border border-neutral-800 block">
          <div className="flex items-center gap-1 text-white font-bold text-sm font-mono">
            <span>★</span>
            <span>100% Offline</span>
          </div>
          <span className="text-xs text-neutral-400 font-medium block mt-1">
            Local Dexie DB
          </span>
        </div>
      </div>

      {/* ── Dashboard Debts Strip (Links to /debts) ── */}
      <div>
        <DebtSummaryStrip clickable />
      </div>
    </div>
  );
}

