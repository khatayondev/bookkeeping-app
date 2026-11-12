// src/pages/Transactions.tsx
/**
 * Transactions list screen.
 *
 * Displays financial transactions sorted newest first.
 * Features:
 * - Virtualized rendering for high-performance with 5,000+ records
 * - Memoized row components & O(1) category/method Map lookups
 * - Transaction row with category, description, payment method, date, amount
 * - Small receipt thumbnail icon on rows with attached receipts (tap to view full-screen)
 * - Replace and remove actions on receipts
 * - Quick edit and delete actions (deleting cascades to receipt and linked debt)
 * - Search and filter by type (In / Out)
 */
import React, { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTransactions } from "../hooks/useTransactions";
import { useCategories } from "../hooks/useCategories";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { deleteTransaction, updateTransaction } from "../db/queries";
import { ReceiptThumbnailIcon } from "../components/ReceiptThumbnailIcon";
import { VirtualList } from "../components/VirtualList";
import { formatMoney } from "../lib/money";
import { formatDate } from "../lib/dates";
import type { Transaction } from "../db/db";

interface TransactionRowProps {
  tx: Transaction;
  categoryName: string;
  methodName: string;
  formattedDate: string;
  formattedAmount: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onRemoveReceipt: (tx: Transaction) => void;
}

const TransactionRow = React.memo(function TransactionRow({
  tx,
  categoryName,
  methodName,
  formattedDate,
  formattedAmount,
  onEdit,
  onDelete,
  onRemoveReceipt,
}: TransactionRowProps) {
  return (
    <div
      className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] p-4 shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-xs transition-all flex items-center justify-between gap-3 group mb-2.5"
    >
      {/* Left Column: Category Tag, Description, Date */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(tx)}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            {categoryName}
          </span>
          {tx.debtId && (
            <span className="text-[10px] bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 rounded-full font-bold">
              Debt
            </span>
          )}
        </div>

        <div className="font-extrabold text-sm text-neutral-900 dark:text-white truncate mb-0.5">
          {tx.description || categoryName}
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 flex-wrap font-medium">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{methodName}</span>
        </div>
      </div>

      {/* Middle: Receipt Thumbnail Icon (if receipt attached) */}
      {tx.receiptId && (
        <div className="shrink-0">
          <ReceiptThumbnailIcon
            receiptId={tx.receiptId}
            onReplace={() => onEdit(tx)}
            onRemove={() => onRemoveReceipt(tx)}
          />
        </div>
      )}

      {/* Right: Amount & Delete */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="text-right cursor-pointer"
          onClick={() => onEdit(tx)}
        >
          <span className="block font-mono font-bold text-base text-neutral-900 dark:text-white">
            {tx.type === "in" ? "+" : "-"}
            {formattedAmount}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onDelete(tx)}
          className="text-neutral-400 hover:text-black dark:text-neutral-500 dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center text-sm rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Delete transaction"
          aria-label="Delete transaction"
        >
          ✕
        </button>
      </div>
    </div>
  );
});

export default function Transactions() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");

  const filters = useMemo(() => {
    return {
      type: typeFilter === "all" ? undefined : typeFilter,
      search: search.trim() || undefined,
    };
  }, [typeFilter, search]);

  const transactions = useTransactions(filters);
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const methodMap = useMemo(() => {
    const map = new Map<string, string>();
    paymentMethods?.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [paymentMethods]);

  const handleEdit = useCallback(
    (tx: Transaction) => {
      navigate(`/add?edit=${tx.id}`, { state: { transaction: tx } });
    },
    [navigate]
  );

  const handleDelete = useCallback(async (tx: Transaction) => {
    const hasReceipt = !!tx.receiptId;
    const msg = hasReceipt
      ? `Delete this ${tx.type === "in" ? "income" : "expense"} transaction of ${formatMoney(tx.amountPesewas)}? Attached receipt will also be deleted.`
      : `Delete this ${tx.type === "in" ? "income" : "expense"} transaction of ${formatMoney(tx.amountPesewas)}?`;

    if (window.confirm(msg)) {
      await deleteTransaction(tx.id);
    }
  }, []);

  const handleRemoveReceipt = useCallback(async (tx: Transaction) => {
    await updateTransaction(tx.id, { receiptId: undefined });
  }, []);

  return (
    <div className="max-w-md mx-auto pb-24 space-y-4">
      {/* ── Header (Design Match: Screen 3 "My Trips") ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Transactions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {transactions?.length ?? 0} records total
          </p>
        </div>
        <Link
          to="/add"
          className="min-h-[44px] px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 text-sm font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          aria-label="Add transaction"
        >
          <span className="font-bold text-base leading-none">+</span> Add
        </Link>
      </div>

      {/* ── Filters (Design Match: Screen 3 Filter Pills) ── */}
      <div className="space-y-3">
        <label htmlFor="search-transactions" className="sr-only">
          Search transactions by description
        </label>
        <input
          id="search-transactions"
          type="search"
          placeholder="Search description…"
          aria-label="Search description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-h-[44px] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-2xs text-neutral-900 dark:text-white"
        />

        <div className="flex gap-2 text-xs font-semibold overflow-x-auto py-1" role="group" aria-label="Filter transactions by type">
          <button
            type="button"
            aria-pressed={typeFilter === "all"}
            className={`min-h-[44px] px-5 py-2 rounded-full transition-all shrink-0 ${
              typeFilter === "all"
                ? "bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs"
                : "bg-white dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
            }`}
            onClick={() => setTypeFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={typeFilter === "in"}
            className={`min-h-[44px] px-5 py-2 rounded-full transition-all shrink-0 ${
              typeFilter === "in"
                ? "bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs"
                : "bg-white dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
            }`}
            onClick={() => setTypeFilter("in")}
          >
            Money In
          </button>
          <button
            type="button"
            aria-pressed={typeFilter === "out"}
            className={`min-h-[44px] px-5 py-2 rounded-full transition-all shrink-0 ${
              typeFilter === "out"
                ? "bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs"
                : "bg-white dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
            }`}
            onClick={() => setTypeFilter("out")}
          >
            Money Out
          </button>
        </div>
      </div>

      {/* ── Transaction List (Virtualized) ─────────────────── */}
      {!transactions || transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center bg-white/50 dark:bg-neutral-900/50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No transactions found
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {search || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Tap '+ Add' to record your first transaction"}
          </p>
        </div>
      ) : (
        <VirtualList
          items={transactions}
          itemHeight={78}
          overscan={8}
          getItemKey={(tx) => tx.id}
          renderItem={(tx) => (
            <TransactionRow
              tx={tx}
              categoryName={categoryMap.get(tx.categoryId) ?? "Uncategorized"}
              methodName={methodMap.get(tx.paymentMethodId) ?? "Payment"}
              formattedDate={formatDate(new Date(tx.date))}
              formattedAmount={formatMoney(tx.amountPesewas)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRemoveReceipt={handleRemoveReceipt}
            />
          )}
        />
      )}
    </div>
  );
}
