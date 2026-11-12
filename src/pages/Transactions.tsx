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
      className={`relative rounded-2xl border bg-white dark:bg-gray-850 p-3.5 pl-4 shadow-xs hover:border-orange-400/80 hover:shadow-sm transition-all flex items-center justify-between gap-3 group mb-2.5 overflow-hidden ${
        tx.type === "in"
          ? "border-emerald-100/80 dark:border-gray-800"
          : "border-amber-100/80 dark:border-gray-800"
      }`}
    >
      {/* Left accent indicator bar inspired by appointment cards */}
      <span
        className={`absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full ${
          tx.type === "in"
            ? "bg-emerald-500"
            : "bg-gradient-to-b from-amber-500 to-orange-500"
        }`}
      />

      {/* Left Column: Category, Description, Date */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(tx)}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm text-slate-900 dark:text-gray-100 truncate">
            {tx.description || categoryName}
          </span>
          {tx.debtId && (
            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded-md font-bold">
              Debt payment
            </span>
          )}
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5 flex-wrap font-medium">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{categoryName}</span>
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
          <span
            className={`block font-mono font-bold text-base ${
              tx.type === "in"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {tx.type === "in" ? "+" : "-"}
            {formattedAmount}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onDelete(tx)}
          className="text-gray-500 hover:text-red-700 dark:text-gray-400 dark:hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
      {/* ── Header ───────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Transactions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            History of income, expenses, and payments
          </p>
        </div>
        <Link
          to="/add"
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 active:scale-95"
          aria-label="Add transaction"
        >
          <span>➕</span> Add
        </Link>
      </div>

      {/* ── Filters ──────────────────────────── */}
      <div className="space-y-2.5">
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
          className="w-full min-h-[44px] rounded-xl border border-amber-200/70 dark:border-gray-700 bg-white dark:bg-gray-850 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
        />

        <div className="flex gap-1.5 p-1 bg-amber-50/70 dark:bg-gray-900 border border-amber-200/50 dark:border-gray-800 rounded-2xl text-xs font-semibold" role="group" aria-label="Filter transactions by type">
          <button
            type="button"
            aria-pressed={typeFilter === "all"}
            className={`flex-1 min-h-[44px] py-2 rounded-xl transition-all ${
              typeFilter === "all"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm font-bold shadow-orange-500/25"
                : "text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white"
            }`}
            onClick={() => setTypeFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={typeFilter === "in"}
            className={`flex-1 min-h-[44px] py-2 rounded-xl transition-all ${
              typeFilter === "in"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white"
            }`}
            onClick={() => setTypeFilter("in")}
          >
            Money In
          </button>
          <button
            type="button"
            aria-pressed={typeFilter === "out"}
            className={`flex-1 min-h-[44px] py-2 rounded-xl transition-all ${
              typeFilter === "out"
                ? "bg-red-600 text-white shadow-sm font-bold"
                : "text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white"
            }`}
            onClick={() => setTypeFilter("out")}
          >
            Money Out
          </button>
        </div>
      </div>

      {/* ── Transaction List (Virtualized) ─────────────────── */}
      {!transactions || transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center bg-white/50 dark:bg-gray-800/50">
          <span className="text-3xl block mb-2">🧾</span>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
