// src/pages/Debts.tsx
/**
 * Debts screen with two tabs: "Owed to me" and "I owe".
 * Features:
 * - Summary strip matching the Home dashboard
 * - Overdue first sorting, then by due date
 * - Row: person name, amount remaining, due date, Overdue badge, Call button (tel:)
 * - Tap row for full details and partial payments list
 * - Record payment modal (creates matching transaction linked by debtId, prevents overpayment, auto-settles)
 * - Deleting a payment reverses the paid balance
 * - Add/Edit debt modal (name, optional phone, amount, due date, note)
 */
import React, { useState } from "react";
import type { Debt, Transaction } from "../db/db";
import {
  addDebt,
  updateDebt,
  deleteDebt,
  recordDebtPayment,
  deleteTransaction,
} from "../db/queries";
import { useDebts, useDebtPayments } from "../hooks/useDebts";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { DebtSummaryStrip } from "../components/DebtSummaryStrip";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import {
  calculateRemaining,
  isDebtOverdue,
  sortDebts,
} from "../lib/debts";
import { formatMoney, toPesewas } from "../lib/money";
import { formatDate } from "../lib/dates";

type TabKind = "owed_to_me" | "i_owe";

export default function Debts() {
  const [activeTab, setActiveTab] = useState<TabKind>("owed_to_me");
  const [showSettled, setShowSettled] = useState(false);

  // Modals state
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Queries
  const allDebts = useDebts(activeTab);
  const paymentMethods = usePaymentMethods();

  // Filter and sort
  const debts = React.useMemo(() => {
    if (!allDebts) return [];
    let filtered = allDebts;
    if (!showSettled) {
      filtered = filtered.filter(
        (d) => d.status !== "paid" && calculateRemaining(d) > 0,
      );
    }
    return sortDebts(filtered);
  }, [allDebts, showSettled]);

  const openAddModal = () => {
    setEditingDebt(null);
    setIsAddEditOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setIsAddEditOpen(true);
  };

  const handleDebtSaved = (debt: Debt) => {
    // If currently inspecting this debt, update selectedDebt
    if (selectedDebt && selectedDebt.id === debt.id) {
      setSelectedDebt(debt);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-24 space-y-4">
      {/* ── Page Header ───────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Debts &amp; Credit
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Track money owed to you and money you owe
          </p>
        </div>
        <button
          type="button"
          className="min-h-[44px] px-4 py-2 text-sm font-bold rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          onClick={openAddModal}
        >
          <span>➕</span> New Debt
        </button>
      </div>

      {/* ── Summary Strip (Matches Dashboard) ─── */}
      <DebtSummaryStrip />

      {/* ── Tabs: Owed to me vs I owe (Design Match: Capsule Pills) ─────────── */}
      <div className="flex gap-2 text-xs font-semibold overflow-x-auto py-1" role="tablist" aria-label="Debt categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "owed_to_me"}
          className={`min-h-[44px] px-5 py-2 rounded-full transition-all shrink-0 font-bold ${
            activeTab === "owed_to_me"
              ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
              : "bg-white dark:bg-[#16171B] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-800 hover:border-gray-400"
          }`}
          onClick={() => setActiveTab("owed_to_me")}
        >
          Owed to me
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "i_owe"}
          className={`min-h-[44px] px-5 py-2 rounded-full transition-all shrink-0 font-bold ${
            activeTab === "i_owe"
              ? "bg-[#FF6E00] text-white shadow-xs"
              : "bg-white dark:bg-[#16171B] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-800 hover:border-gray-400"
          }`}
          onClick={() => setActiveTab("i_owe")}
        >
          I owe
        </button>
      </div>

      {/* ── Filter bar ───────────────────────── */}
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 px-1">
        <span>
          Showing {debts.length} {showSettled ? "total" : "open"} debt
          {debts.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => setShowSettled(!showSettled)}
          className="hover:underline font-bold text-[#C85600] dark:text-[#FF8A00] min-h-[44px] py-2 px-1 flex items-center"
        >
          {showSettled ? "Hide settled debts" : "Show settled debts"}
        </button>
      </div>

      {/* ── Debt List ─────────────────────────── */}
      {debts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center bg-white/50 dark:bg-gray-800/50">
          <span className="text-3xl block mb-2">🤝</span>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No {activeTab === "owed_to_me" ? "money owed to you" : "debts you owe"}
            {!showSettled ? " currently open" : ""}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Tap &ldquo;New Debt&rdquo; above to record a new debt
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {debts.map((debt) => {
            const remaining = calculateRemaining(debt);
            const overdue = isDebtOverdue(debt);
            const isSettled = debt.status === "paid" || remaining <= 0;

            return (
              <div
                key={debt.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDebt(debt)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedDebt(debt);
                  }
                }}
                className={`w-full text-left rounded-2xl p-4 border transition-all shadow-2xs flex items-center justify-between gap-3 bg-white dark:bg-[#16171B] cursor-pointer ${
                  overdue
                    ? "border-red-300 dark:border-red-800/80 bg-red-50/20 dark:bg-red-950/10"
                    : "border-gray-100 dark:border-zinc-800 hover:border-[#FF6E00]/60"
                }`}
              >
                {/* Left: Person Name & Due Date */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base">
                      {debt.personName}
                    </span>
                    {overdue && (
                      <span className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                        Overdue
                      </span>
                    )}
                    {isSettled && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                        Paid
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    {debt.dueDate ? (
                      <span
                        className={
                          overdue ? "text-red-700 dark:text-red-400 font-medium" : ""
                        }
                      >
                        Due: {formatDate(new Date(debt.dueDate))}
                      </span>
                    ) : (
                      <span>No due date</span>
                    )}

                    {debt.paidPesewas > 0 && !isSettled && (
                      <span>
                        • Paid: {formatMoney(debt.paidPesewas)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Remaining Amount & Call Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <span
                      className={`block font-mono font-bold text-base ${
                        activeTab === "owed_to_me"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      {formatMoney(remaining)}
                    </span>
                    {debt.paidPesewas > 0 && (
                      <span className="text-[10px] text-gray-600 dark:text-gray-400 block font-mono">
                        of {formatMoney(debt.amountPesewas)}
                      </span>
                    )}
                  </div>

                  {debt.phone && (
                    <a
                      href={`tel:${debt.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="min-h-[44px] px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      title={`Call ${debt.personName}`}
                      aria-label={`Call ${debt.personName}`}
                    >
                      <span>📞</span>
                      <span>Call</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Add / Edit Debt ────────────── */}
      {isAddEditOpen && (
        <AddEditDebtModal
          isOpen={isAddEditOpen}
          initialKind={activeTab}
          debt={editingDebt}
          onClose={() => setIsAddEditOpen(false)}
          onSaved={handleDebtSaved}
        />
      )}

      {/* ── Modal: Debt Details & Payments ────── */}
      {selectedDebt && (
        <DebtDetailsModal
          debt={selectedDebt}
          paymentMethods={paymentMethods ?? []}
          onClose={() => setSelectedDebt(null)}
          onEdit={() => {
            openEditModal(selectedDebt);
          }}
          onRecordPayment={() => {
            setIsRecordPaymentOpen(true);
          }}
          onDebtUpdated={(updated) => setSelectedDebt(updated)}
          onDebtDeleted={() => setSelectedDebt(null)}
        />
      )}

      {/* ── Modal: Record Payment ─────────────── */}
      {isRecordPaymentOpen && selectedDebt && (
        <RecordPaymentModal
          debt={selectedDebt}
          paymentMethods={paymentMethods ?? []}
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          onPaymentRecorded={(updatedDebt) => {
            setSelectedDebt(updatedDebt);
            setIsRecordPaymentOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subcomponent: Add / Edit Debt Modal
// ─────────────────────────────────────────────────────────
interface AddEditDebtModalProps {
  isOpen: boolean;
  initialKind: TabKind;
  debt: Debt | null;
  onClose: () => void;
  onSaved: (debt: Debt) => void;
}

function AddEditDebtModal({
  initialKind,
  debt,
  onClose,
  onSaved,
}: AddEditDebtModalProps) {
  const isEditing = !!debt;

  const [kind, setKind] = useState<TabKind>(debt?.kind ?? initialKind);
  const [personName, setPersonName] = useState(debt?.personName ?? "");
  const [phone, setPhone] = useState(debt?.phone ?? "");
  const [amountStr, setAmountStr] = useState(() => {
    if (debt) {
      return (debt.amountPesewas / 100).toFixed(2);
    }
    return "";
  });
  const [dueDate, setDueDate] = useState(() => {
    if (debt?.dueDate) {
      const d = new Date(debt.dueDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return "";
  });
  const [note, setNote] = useState(debt?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = personName.trim();
    if (!trimmedName) {
      setError("Please enter the person's name");
      return;
    }

    const pesewas = toPesewas(amountStr);
    if (isNaN(pesewas) || pesewas <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }

    if (isEditing && debt && pesewas < debt.paidPesewas) {
      setError(
        `Amount cannot be less than already paid (${formatMoney(debt.paidPesewas)})`,
      );
      return;
    }

    setSaving(true);
    try {
      const due = dueDate ? new Date(dueDate + "T00:00:00") : undefined;

      if (isEditing && debt) {
        const isSettled = debt.paidPesewas >= pesewas;
        await updateDebt(debt.id, {
          kind,
          personName: trimmedName,
          phone: phone.trim() || undefined,
          amountPesewas: pesewas,
          dueDate: due,
          note: note.trim() || undefined,
          status: isSettled ? "paid" : "open",
        });
        onSaved({
          ...debt,
          kind,
          personName: trimmedName,
          phone: phone.trim() || undefined,
          amountPesewas: pesewas,
          dueDate: due,
          note: note.trim() || undefined,
          status: isSettled ? "paid" : "open",
        });
      } else {
        const id = await addDebt({
          kind,
          personName: trimmedName,
          phone: phone.trim() || undefined,
          amountPesewas: pesewas,
          dueDate: due,
          note: note.trim() || undefined,
        });
        onSaved({
          id,
          kind,
          personName: trimmedName,
          phone: phone.trim() || undefined,
          amountPesewas: pesewas,
          paidPesewas: 0,
          dueDate: due,
          note: note.trim() || undefined,
          status: "open",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save debt");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold">
            {isEditing ? "Edit Debt" : "Add New Debt"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Kind Toggle */}
          <div className="flex gap-2" role="group" aria-label="Debt type">
            <button
              type="button"
              aria-pressed={kind === "owed_to_me"}
              className={`flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-lg transition-colors ${
                kind === "owed_to_me"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setKind("owed_to_me")}
            >
              Owed to me
            </button>
            <button
              type="button"
              aria-pressed={kind === "i_owe"}
              className={`flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-lg transition-colors ${
                kind === "i_owe"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setKind("i_owe")}
            >
              I owe
            </button>
          </div>

          <Input
            label="Person or Business Name"
            placeholder="e.g. Kwame Mensah"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Phone Number (optional)"
            type="tel"
            placeholder="e.g. 0241234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Total Amount (GHS)"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />

          <Input
            label="Due Date (optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div>
            <label htmlFor="debt-note" className="block mb-1 font-medium text-sm">
              Note (optional)
            </label>
            <textarea
              id="debt-note"
              className="w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              placeholder="e.g. For goods supplied on credit"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 min-h-[44px] py-2.5"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 min-h-[44px] py-2.5 font-semibold"
              disabled={saving}
            >
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Debt"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subcomponent: Debt Details & Partial Payments Modal
// ─────────────────────────────────────────────────────────
interface DebtDetailsModalProps {
  debt: Debt;
  paymentMethods: { id: string; name: string }[];
  onClose: () => void;
  onEdit: () => void;
  onRecordPayment: () => void;
  onDebtUpdated: (debt: Debt) => void;
  onDebtDeleted: () => void;
}

function DebtDetailsModal({
  debt,
  paymentMethods,
  onClose,
  onEdit,
  onRecordPayment,
  onDebtUpdated,
  onDebtDeleted,
}: DebtDetailsModalProps) {
  const payments = useDebtPayments(debt.id);
  const remaining = calculateRemaining(debt);
  const overdue = isDebtOverdue(debt);
  const isSettled = debt.status === "paid" || remaining <= 0;

  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [isDeletingDebt, setIsDeletingDebt] = useState(false);

  const getMethodName = (id: string) => {
    return paymentMethods.find((m) => m.id === id)?.name ?? "Payment";
  };

  const handleDeletePayment = async (tx: Transaction) => {
    if (!window.confirm(`Delete this payment of ${formatMoney(tx.amountPesewas)}? This will reverse the debt balance.`)) {
      return;
    }
    setDeletingPaymentId(tx.id);
    try {
      await deleteTransaction(tx.id);
      // Re-fetch updated debt
      const updated = {
        ...debt,
        paidPesewas: Math.max(0, debt.paidPesewas - tx.amountPesewas),
        status: (debt.paidPesewas - tx.amountPesewas >= debt.amountPesewas ? "paid" : "open") as "open" | "paid",
      };
      onDebtUpdated(updated);
    } catch {
      alert("Failed to delete payment");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleDeleteDebt = async () => {
    if (!window.confirm(`Delete the debt for ${debt.personName}? All history will be removed.`)) {
      return;
    }
    setIsDeletingDebt(true);
    try {
      await deleteDebt(debt.id);
      onDebtDeleted();
    } catch {
      alert("Failed to delete debt");
      setIsDeletingDebt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {debt.personName}
              </h3>
              {overdue && (
                <span className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                  Overdue
                </span>
              )}
              {isSettled && (
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                  Settled
                </span>
              )}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
              {debt.kind === "owed_to_me" ? "Owed to me" : "I owe this person"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Balance Card */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">
              Remaining Balance
            </span>
            <span
              className={`text-2xl font-mono font-bold ${
                debt.kind === "owed_to_me"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {formatMoney(remaining)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
            <div>
              <span className="text-gray-500 block">Total Debt:</span>
              <span className="font-mono font-semibold">
                {formatMoney(debt.amountPesewas)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Paid So Far:</span>
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                {formatMoney(debt.paidPesewas)}
              </span>
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="space-y-2 mb-5 text-sm text-gray-600 dark:text-gray-300">
          {debt.dueDate && (
            <div className="flex justify-between">
              <span className="text-gray-400">Due Date:</span>
              <span className={`font-medium ${overdue ? "text-red-600 font-bold" : ""}`}>
                {formatDate(new Date(debt.dueDate))}
              </span>
            </div>
          )}

          {debt.phone && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Phone:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{debt.phone}</span>
                <a
                  href={`tel:${debt.phone}`}
                  className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20"
                >
                  Call 📞
                </a>
              </div>
            </div>
          )}

          {debt.note && (
            <div className="pt-1">
              <span className="text-gray-400 block text-xs">Note:</span>
              <p className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mt-0.5 italic">
                {debt.note}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          {!isSettled && (
            <Button
              variant="primary"
              className="flex-1 min-h-[44px] py-2.5 font-semibold text-sm bg-emerald-600 hover:bg-emerald-700"
              onClick={onRecordPayment}
            >
              Record Payment 💵
            </Button>
          )}
          <Button
            variant="secondary"
            className="px-4 min-h-[44px] py-2.5 text-sm font-medium"
            onClick={onEdit}
          >
            Edit
          </Button>
          <button
            type="button"
            onClick={handleDeleteDebt}
            disabled={isDeletingDebt}
            className="px-3 min-h-[44px] py-2.5 text-xs text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded font-semibold transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Partial Payments Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-between">
            <span>Payment History</span>
            <span className="font-normal text-gray-400">
              {payments?.length ?? 0} payment{payments?.length === 1 ? "" : "s"}
            </span>
          </h4>

          {payments && payments.length > 0 ? (
            <ul className="space-y-2">
              {payments.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100 block font-mono text-sm">
                      {formatMoney(tx.amountPesewas)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatDate(new Date(tx.date))} • {getMethodName(tx.paymentMethodId)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePayment(tx)}
                    disabled={deletingPaymentId === tx.id}
                    className="text-red-500 hover:text-red-700 px-2 py-1 text-xs font-medium hover:underline"
                    title="Reverse this payment"
                  >
                    {deletingPaymentId === tx.id ? "Reversing…" : "Reverse"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-3 bg-gray-50/30 rounded">
              No payments recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subcomponent: Record Payment Modal
// ─────────────────────────────────────────────────────────
interface RecordPaymentModalProps {
  debt: Debt;
  paymentMethods: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: (updatedDebt: Debt) => void;
}

function RecordPaymentModal({
  debt,
  paymentMethods,
  onClose,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const remainingPesewas = calculateRemaining(debt);

  const [amountStr, setAmountStr] = useState(() =>
    (remainingPesewas / 100).toFixed(2),
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    paymentMethods[0]?.id ?? "",
  );
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pesewas = toPesewas(amountStr);
    if (isNaN(pesewas) || pesewas <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }

    if (pesewas > remainingPesewas) {
      setError(
        `Overpayment not allowed: amount cannot exceed remaining balance of ${formatMoney(remainingPesewas)}`,
      );
      return;
    }

    if (!paymentMethodId) {
      setError("Please select a payment method");
      return;
    }

    setSaving(true);
    try {
      await recordDebtPayment({
        debtId: debt.id,
        amountPesewas: pesewas,
        paymentMethodId,
        date: date ? new Date(date + "T00:00:00") : new Date(),
        description: note.trim() || undefined,
      });

      const newPaid = debt.paidPesewas + pesewas;
      const isSettled = newPaid >= debt.amountPesewas;
      const updatedDebt: Debt = {
        ...debt,
        paidPesewas: newPaid,
        status: isSettled ? "paid" : "open",
        updatedAt: new Date(),
      };

      onPaymentRecorded(updatedDebt);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record payment",
      );
      setSaving(false);
    }
  };

  const paymentMethodOptions = paymentMethods.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold">Record Payment</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              For {debt.personName} ({debt.kind === "owed_to_me" ? "Money In" : "Money Out"})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="record-payment-amount" className="font-medium text-sm">
                Payment Amount (GHS)
              </label>
              <button
                type="button"
                className="text-xs text-primary font-bold hover:underline min-h-[44px] py-2 px-1 flex items-center"
                onClick={() => setAmountStr((remainingPesewas / 100).toFixed(2))}
              >
                Pay Full ({formatMoney(remainingPesewas)})
              </button>
            </div>
            <input
              id="record-payment-amount"
              type="text"
              inputMode="decimal"
              className="w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
              Remaining balance: {formatMoney(remainingPesewas)}
            </span>
          </div>

          {paymentMethodOptions.length > 0 && (
            <Select
              label="Payment Method"
              options={paymentMethodOptions}
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
            />
          )}

          <Input
            label="Payment Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Input
            label="Note / Reference (optional)"
            type="text"
            placeholder="e.g. Paid via MoMo transfer"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 py-2.5"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 py-2.5 font-semibold bg-green-600 hover:bg-green-700"
              disabled={saving}
            >
              {saving ? "Recording…" : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
