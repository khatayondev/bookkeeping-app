// src/pages/Add.tsx
/**
 * Add / Edit Transaction screen.
 *
 * Features:
 * - Clean, streamlined Amount input with currency indicator.
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
import { ReceiptPicker } from "../components/ReceiptPicker";
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

  const [amount, setAmount] = useState(prefillAmount);

  useEffect(() => {
    if (prefillAmount) {
      setAmount(prefillAmount);
    }
  }, [prefillAmount]);

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
      setAmount((initialTx.amountPesewas / 100).toFixed(2));
    }
  }, [initialTx]);

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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and at most one decimal point
    if (/^[0-9]*\.?[0-9]*$/.test(val)) {
      setAmount(val);
    }
  };

  const parsedAmount = parseFloat(amount || "0");
  const amountPesewas = isNaN(parsedAmount) ? 0 : Math.round(parsedAmount * 100);

  const canSave =
    amountPesewas > 0 &&
    categoryId !== "" &&
    paymentMethodId !== "" &&
    date !== "" &&
    !saving;

  const handleSave = async () => {
    if (!canSave || amountPesewas <= 0) return;
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
          amountPesewas,
          type,
          categoryId,
          paymentMethodId,
          description: description.trim() || undefined,
          receiptId: finalReceiptId,
        });
      } else {
        await addTransaction({
          date: new Date(date + "T00:00:00"),
          amountPesewas,
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
            className="min-h-[44px] px-2 flex items-center text-sm font-medium text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white underline"
          >
            Cancel
          </button>
        )}
      </div>

      {/* ── Type toggle ──────────────────────── */}
      <div className="flex gap-2.5 mb-4 p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl" role="group" aria-label="Transaction type">
        <button
          type="button"
          aria-pressed={type === "out"}
          className={`flex-1 min-h-[48px] py-2.5 rounded-xl font-bold text-sm transition-all ${
            type === "out"
              ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
              : "text-neutral-700 dark:text-neutral-300 hover:bg-white/80 dark:hover:bg-neutral-800"
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
              ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
              : "text-neutral-700 dark:text-neutral-300 hover:bg-white/80 dark:hover:bg-neutral-800"
          }`}
          onClick={() => setType("in")}
        >
          Money In
        </button>
      </div>

      {/* ── Clean Amount Input (No on-screen keypad) ── */}
      <div className="mb-4">
        <label htmlFor="amount-input" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-300 font-bold text-base select-none pointer-events-none">
            GHS
          </span>
          <input
            id="amount-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            aria-label="Amount in GHS"
            className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] pl-16 pr-4 py-3.5 text-right text-2xl font-bold font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-2xs"
          />
        </div>
      </div>

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
        placeholder="e.g. Honey jars wholesale, bottling"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* ── Attach Receipt (Commented out for now) ── */}
      {/*
      <ReceiptPicker
        existingReceiptId={existingReceiptId}
        currentBlob={receiptBlob}
        onReceiptChange={(blob) => setReceiptBlob(blob)}
        disabled={saving}
      />
      */}

      {/* ── Save button ──────────────────────── */}
      <Button
        variant="primary"
        className="w-full min-h-[52px] py-3.5 text-lg font-bold rounded-2xl shadow-sm mt-4 flex items-center justify-center gap-2"
        disabled={!canSave}
        onClick={handleSave}
      >
        {saving ? (
          <svg className="w-5 h-5 animate-spin text-white dark:text-black shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white dark:text-black shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span>
          {saving
            ? "Saving…"
            : isEditing
              ? "Save Changes"
              : "Save Transaction"}
        </span>
      </Button>

      {/* Validation hint when save is blocked */}
      {amount.trim().length > 0 && amountPesewas <= 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 text-center font-medium">
          Amount must be greater than zero
        </p>
      )}
    </div>
  );
}
