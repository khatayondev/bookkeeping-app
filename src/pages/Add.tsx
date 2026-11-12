// src/pages/Add.tsx
/**
 * Add / Edit Transaction screen.
 *
 * Features:
 * - Calculator-enabled Amount field with on-screen keypad.
 * - Type toggle (Money In / Money Out).
 * - Category and Payment Method selectors.
 * - Optional description.
 * - Date picker (defaults to today).
 * - "Attach receipt" button with client-side image compression:
 *   (max 1280px, quality 0.7 JPEG, under ~300KB)
 * - Thumbnail display with full-screen viewer, replace, and remove actions
 * - Object URLs revoked to avoid memory leaks
 * - Save stores receipt in receipts table and links by receiptId
 */
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/Button";
import { Select } from "../components/Select";
import { Input } from "../components/Input";
import { AmountField } from "../components/AmountField";
import { ReceiptPicker } from "../components/ReceiptPicker";
import { useCalcInput } from "../hooks/useCalcInput";
import { useCategories } from "../hooks/useCategories";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { addTransaction, updateTransaction, addReceipt, getTransactionById } from "../db/queries";
import type { Transaction } from "../db/db";

export default function Add() {
  const navigate = useNavigate();
  const location = useLocation();

  const stateData = location.state as {
    prefillAmount?: string;
    transaction?: Transaction;
  } | null;

  const searchParams = new URLSearchParams(location.search);
  const editIdParam = searchParams.get("edit");
  const editId = stateData?.transaction?.id || editIdParam || null;
  const isEditing = !!editId;

  const [initialTx, setInitialTx] = useState<Transaction | null>(
    stateData?.transaction ?? null,
  );

  // If editing by query param and transaction not in state, fetch it
  useEffect(() => {
    if (editIdParam && !initialTx) {
      getTransactionById(editIdParam).then((tx) => {
        if (tx) setInitialTx(tx);
      });
    }
  }, [editIdParam, initialTx]);

  const queryParamAmount = searchParams.get("amount");
  const prefillAmount =
    stateData?.prefillAmount ||
    queryParamAmount ||
    (initialTx ? (initialTx.amountPesewas / 100).toFixed(2) : "");

  const calc = useCalcInput(prefillAmount);

  const setExpression = calc.setExpression;
  useEffect(() => {
    if (prefillAmount) {
      setExpression(prefillAmount);
    }
  }, [prefillAmount, setExpression]);

  // Form fields
  const [type, setType] = useState<"in" | "out">("out");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Receipt state
  const [existingReceiptId, setExistingReceiptId] = useState<string | null>(null);
  const [receiptBlob, setReceiptBlob] = useState<Blob | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Populate initial values when editing an existing transaction
  useEffect(() => {
    if (initialTx) {
      setType(initialTx.type);
      setCategoryId(initialTx.categoryId);
      setPaymentMethodId(initialTx.paymentMethodId);
      setDescription(initialTx.description ?? "");
      setExistingReceiptId(initialTx.receiptId ?? null);
      if (initialTx.date) {
        const d = new Date(initialTx.date);
        setDate(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        );
      }
      setExpression((initialTx.amountPesewas / 100).toFixed(2));
    }
  }, [initialTx, setExpression]);

  const allCategories = useCategories();
  const paymentMethods = usePaymentMethods();

  // Filter categories by selected type
  const categories = useMemo(() => {
    if (!allCategories) return [];
    return allCategories.filter(
      (c) => c.type === type || c.type === "both",
    );
  }, [allCategories, type]);

  // Set first category when type changes and categories load
  useEffect(() => {
    if (categories.length > 0 && !categories.find((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Set first payment method on load
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !paymentMethodId) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, paymentMethodId]);

  const canSave =
    calc.isValid &&
    calc.valuePesewas !== null &&
    calc.valuePesewas > 0 &&
    categoryId !== "" &&
    paymentMethodId !== "" &&
    date !== "" &&
    !saving;

  const handleSave = async () => {
    if (!canSave || calc.valuePesewas === null) return;
    setSaving(true);
    try {
      // Determine final receiptId
      let finalReceiptId: string | undefined = existingReceiptId ?? undefined;

      if (receiptBlob instanceof Blob) {
        // A new receipt photo was captured/picked
        finalReceiptId = await addReceipt(receiptBlob);
      } else if (receiptBlob === null) {
        // Receipt was explicitly removed
        finalReceiptId = undefined;
      }

      if (isEditing && editId) {
        await updateTransaction(editId, {
          date: new Date(date + "T00:00:00"),
          amountPesewas: calc.valuePesewas,
          type,
          categoryId,
          paymentMethodId,
          description: description.trim() || undefined,
          receiptId: finalReceiptId,
        });
      } else {
        await addTransaction({
          date: new Date(date + "T00:00:00"),
          amountPesewas: calc.valuePesewas,
          type,
          categoryId,
          paymentMethodId,
          description: description.trim() || undefined,
          receiptId: finalReceiptId,
        });
      }

      navigate("/transactions");
    } catch {
      setSaving(false);
    }
  };

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const paymentMethodOptions = (paymentMethods ?? []).map((m) => ({
    value: m.id,
    label: m.name,
  }));

  return (
    <div className="max-w-md mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {isEditing ? "Edit Transaction" : "Add Transaction"}
        </h2>
        {isEditing && (
          <button
            type="button"
            onClick={() => navigate("/transactions")}
            className="min-h-[44px] px-2 flex items-center text-sm font-medium text-gray-700 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white underline"
          >
            Cancel
          </button>
        )}
      </div>

      {/* ── Type toggle ──────────────────────── */}
      <div className="flex gap-2.5 mb-4 p-1 bg-amber-50/80 dark:bg-gray-900 border border-amber-200/50 dark:border-gray-800 rounded-2xl" role="group" aria-label="Transaction type">
        <button
          type="button"
          aria-pressed={type === "out"}
          className={`flex-1 min-h-[48px] py-2.5 rounded-xl font-bold text-sm transition-all ${
            type === "out"
              ? "bg-red-600 text-white shadow-md shadow-red-600/20"
              : "text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800"
          }`}
          onClick={() => setType("out")}
        >
          Money Out
        </button>
        <button
          type="button"
          aria-pressed={type === "in"}
          className={`flex-1 min-h-[48px] py-2.5 rounded-xl font-bold text-sm transition-all ${
            type === "in"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800"
          }`}
          onClick={() => setType("in")}
        >
          Money In
        </button>
      </div>

      {/* ── Amount with calculator ────────────── */}
      <AmountField calc={calc} />

      {/* ── Category ─────────────────────────── */}
      {categoryOptions.length > 0 && (
        <Select
          label="Category"
          options={categoryOptions}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        />
      )}

      {/* ── Payment Method ───────────────────── */}
      {paymentMethodOptions.length > 0 && (
        <Select
          label="Payment Method"
          options={paymentMethodOptions}
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(e.target.value)}
        />
      )}

      {/* ── Date ─────────────────────────────── */}
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {/* ── Description ──────────────────────── */}
      <Input
        label="Description (optional)"
        type="text"
        placeholder="e.g. Bought stock from Makola"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* ── Attach Receipt (Client-Side Compression) ── */}
      <ReceiptPicker
        existingReceiptId={existingReceiptId}
        currentBlob={receiptBlob}
        onReceiptChange={(blob) => setReceiptBlob(blob)}
        disabled={saving}
      />

      {/* ── Save button ──────────────────────── */}
      <Button
        variant="primary"
        className="w-full min-h-[52px] py-3.5 text-lg font-bold rounded-2xl shadow-lg shadow-orange-500/25 mt-4 flex items-center justify-center gap-2"
        disabled={!canSave}
        onClick={handleSave}
      >
        <span>{saving ? "⏳" : "💾"}</span>
        <span>
          {saving
            ? "Saving…"
            : isEditing
              ? "Save Changes"
              : "Save Transaction"}
        </span>
      </Button>

      {/* Validation hint when save is blocked */}
      {calc.expression.trim().length > 0 && !calc.isValid && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center font-medium">
          Fix the expression before saving
        </p>
      )}
      {calc.isValid && calc.valuePesewas !== null && calc.valuePesewas <= 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-2 text-center font-medium">
          Amount must be greater than zero
        </p>
      )}
    </div>
  );
}
