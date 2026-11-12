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
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Good day,<br />
            <span className="text-[#C85600] dark:text-[#FF8A00]">Honey Palace</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            Today&apos;s Financial Overview
          </p>
        </div>
        <Link
          to="/more"
          aria-label="Profile and settings"
          className="p-1 rounded-full bg-gradient-to-tr from-[#FF6E00] to-amber-400 shadow-xs"
        >
          <img
            src="/honey-palace-badge.png"
            alt="Honey Palace"
            className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-zinc-900"
          />
        </Link>
      </div>

      {/* ── Dark Stats Card (Design Match: Screen 1 Dark Card) ── */}
      <div className="bg-[#111111] dark:bg-[#16171B] text-white rounded-3xl p-5 shadow-xl border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider">
          <span>Cashflow Summary</span>
          <span className="bg-[#222222] text-zinc-300 px-2 py-0.5 rounded-full text-[11px] font-mono">
            Offline Vault
          </span>
        </div>

        {/* 3 columns matching screen 1: Income / Expenses / Net */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div>
            <span className="block text-lg font-bold font-mono text-white truncate">
              {formatMoney(totalIn)}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Income</span>
          </div>
          <div>
            <span className="block text-lg font-bold font-mono text-white truncate">
              {formatMoney(totalOut)}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Expenses</span>
          </div>
          <div>
            <span className="block text-lg font-bold font-mono text-[#FF7A00] truncate">
              {formatMoney(netCash)}
            </span>
            <span className="text-[11px] text-orange-400 font-medium">Net Saved</span>
          </div>
        </div>

        {/* Orange Progress bar matching screen 1 */}
        <div className="pt-2 border-t border-zinc-800/80">
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className="bg-[#FF6E00] h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalIn > 0 ? Math.min(100, Math.max(8, Math.round((netCash / totalIn) * 100))) : 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-zinc-400">
            <span>Health: {totalIn > 0 ? `${Math.round((netCash / totalIn) * 100)}% retained` : "Ready"}</span>
            <Link to="/transactions" className="text-[#FF7A00] font-semibold hover:underline">
              View ledger →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Vibrant Orange Action Banner (Design Match: Screen 2 "Book a ride") ── */}
      <Link
        to="/add"
        className="bg-gradient-to-r from-[#FF6E00] via-[#FF7A00] to-[#FF8A00] hover:from-[#E66300] hover:to-[#FF6E00] text-white rounded-2xl p-4 shadow-lg shadow-orange-500/20 flex items-center justify-between transition-transform active:scale-[0.99] group block"
      >
        <div className="space-y-0.5">
          <span className="block font-black text-base text-white">
            Record Transaction
          </span>
          <span className="block text-xs text-orange-100 font-medium">
            Fast entry, calculator &amp; receipt photo
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg group-hover:translate-x-0.5 transition-transform shrink-0 shadow-md">
          →
        </div>
      </Link>

      {/* ── Bottom Split Cards (Design Match: Screen 2 bottom cards) ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Clean Card with Debts */}
        <Link
          to="/debts"
          className="bg-white dark:bg-[#16171B] rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 shadow-xs hover:border-[#FF6E00]/60 transition-all block group"
        >
          <span className="text-xl font-black font-mono block text-slate-900 dark:text-white truncate">
            {formatMoney(totalOwedToMe)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1 mt-1">
            <span>🤝</span> Owed to you
          </span>
        </Link>

        {/* Right: Black Badge Card */}
        <div className="bg-[#111111] dark:bg-[#16171B] text-white rounded-2xl p-4 shadow-xs border border-zinc-800 block">
          <div className="flex items-center gap-1 text-[#FF7A00] font-bold text-sm font-mono">
            <span>★</span>
            <span>100% Offline</span>
          </div>
          <span className="text-xs text-zinc-400 font-medium block mt-1">
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

