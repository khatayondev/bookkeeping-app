// src/components/DebtSummaryStrip.tsx
/**
 * Summary strip component for debts.
 * Used on the Home dashboard and at the top of the Debts screen
 * to ensure numbers consistently match across the application.
 */
import React from "react";
import { Link } from "react-router-dom";
import { useDebtsSummary } from "../hooks/useDebts";
import { formatMoney } from "../lib/money";

export interface DebtSummaryStripProps {
  /** If true, clicking navigates to /debts. Defaults to false. */
  clickable?: boolean;
  className?: string;
}

export const DebtSummaryStrip: React.FC<DebtSummaryStripProps> = ({
  clickable = false,
  className = "",
}) => {
  const summary = useDebtsSummary();

  const totalOwedToMe = summary?.totalOwedToMe ?? 0;
  const totalIOwe = summary?.totalIOwe ?? 0;
  const overdueCount = summary?.overdueCount ?? 0;

  const content = (
    <div
      className={`rounded-2xl bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs ${
        clickable
          ? "hover:border-neutral-400 dark:hover:border-neutral-600 transition-all cursor-pointer group"
          : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <span>Debts &amp; Outstanding</span>
          {overdueCount > 0 && (
            <span className="bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {overdueCount} Overdue
            </span>
          )}
        </h2>
        {clickable && (
          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:underline">
            View all →
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 divide-x divide-neutral-200 dark:divide-neutral-800">
        <div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-0.5 font-medium">
            Owed to me
          </span>
          <span className="text-lg font-bold text-neutral-900 dark:text-white font-mono">
            {formatMoney(totalOwedToMe)}
          </span>
        </div>

        <div className="pl-3">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-0.5 font-medium">
            I owe
          </span>
          <span className="text-lg font-bold text-neutral-900 dark:text-white font-mono">
            {formatMoney(totalIOwe)}
          </span>
        </div>
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link
        to="/debts"
        className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 min-h-[48px]"
      >
        {content}
      </Link>
    );
  }

  return content;
};

