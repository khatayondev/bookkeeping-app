// src/db/queries.ts
/**
 * Typed query helpers for RecodsDB.
 * All data access should go through these functions; UI components use the React hooks below.
 */
import { db } from './db';
import type {
  Transaction,
  Category,
  PaymentMethod,
  Debt,
  Receipt,
} from './db';
import {
  validateAndApplyPayment,
  reversePayment,
  calculateDebtsSummary,
} from '../lib/debts';

/** Utility to generate UUIDs */
function uuid(): string {
  // Crypto API is available in modern browsers and Node (v15+).
  return crypto.randomUUID();
}

/** Transactions */
export interface TransactionFilters {
  dateFrom?: Date;
  dateTo?: Date;
  categoryId?: string;
  type?: 'in' | 'out';
  paymentMethodId?: string;
  search?: string; // searches description (case‑insensitive)
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  const tx: Transaction = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    ...data,
  } as Transaction;
  await db.transactions.add(tx);
  return tx.id;
}

export async function updateTransaction(id: string, changes: Partial<Omit<Transaction, 'id' | 'createdAt'>>){
  const now = new Date();
  const current = await db.transactions.get(id);
  // If receipt is being replaced or removed, delete the old receipt
  if (
    current &&
    current.receiptId &&
    'receiptId' in changes &&
    changes.receiptId !== current.receiptId
  ) {
    await db.receipts.delete(current.receiptId);
  }
  await db.transactions.update(id, { ...changes, updatedAt: now });
}

export async function deleteTransaction(id: string) {
  const tx = await db.transactions.get(id);
  if (tx) {
    // If debt payment, reverse on debt
    if (tx.debtId) {
      const debt = await db.debts.get(tx.debtId);
      if (debt) {
        const updatedDebt = reversePayment(debt, tx.amountPesewas);
        await db.debts.update(debt.id, {
          paidPesewas: updatedDebt.paidPesewas,
          status: updatedDebt.status,
          updatedAt: updatedDebt.updatedAt,
        });
      }
    }
    // If receipt attached, cascade delete receipt
    if (tx.receiptId) {
      await db.receipts.delete(tx.receiptId);
    }
  }
  await db.transactions.delete(id);
}

export async function getTransactionById(id: string) {
  return db.transactions.get(id);
}

export async function listTransactions(filters: TransactionFilters = {}) {
  let items: Transaction[];

  // Use Dexie index if a primary filter matches an indexed field
  if (filters.type) {
    items = await db.transactions.where('type').equals(filters.type).toArray();
  } else if (filters.categoryId) {
    items = await db.transactions.where('categoryId').equals(filters.categoryId).toArray();
  } else if (filters.paymentMethodId) {
    items = await db.transactions.where('paymentMethodId').equals(filters.paymentMethodId).toArray();
  } else if (filters.dateFrom && filters.dateTo) {
    items = await db.transactions.where('date').between(filters.dateFrom, filters.dateTo, true, true).toArray();
  } else {
    items = await db.transactions.toArray();
  }

  const searchLower = filters.search ? filters.search.toLowerCase() : null;
  const fromTime = filters.dateFrom
    ? (filters.dateFrom instanceof Date ? filters.dateFrom.getTime() : Number(filters.dateFrom))
    : null;
  const toTime = filters.dateTo
    ? (filters.dateTo instanceof Date ? filters.dateTo.getTime() : Number(filters.dateTo))
    : null;

  const filtered = items.filter((t) => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters.paymentMethodId && t.paymentMethodId !== filters.paymentMethodId) return false;
    if (fromTime !== null) {
      const tTime = t.date instanceof Date ? t.date.getTime() : Number(t.date);
      if (tTime < fromTime) return false;
    }
    if (toTime !== null) {
      const tTime = t.date instanceof Date ? t.date.getTime() : Number(t.date);
      if (tTime > toTime) return false;
    }
    if (searchLower) {
      const txt = (t.description ?? '').toLowerCase();
      if (!txt.includes(searchLower)) return false;
    }
    return true;
  });

  // newest first (fast numeric compare)
  filtered.sort((a, b) => {
    const bTime = b.date instanceof Date ? b.date.getTime() : Number(b.date);
    const aTime = a.date instanceof Date ? a.date.getTime() : Number(a.date);
    return bTime - aTime;
  });

  return filtered;
}

/** Categories */
export async function listCategories(includeArchived = false) {
  const all = await db.categories.toArray();
  if (includeArchived) return all;
  return all.filter((c) => !c.isArchived);
}

export async function addCategory(data: Omit<Category, 'id'>) {
  const cat: Category = { id: uuid(), ...data };
  await db.categories.add(cat);
  return cat.id;
}

export async function renameCategory(id: string, newName: string) {
  await db.categories.update(id, { name: newName });
}

export async function archiveCategory(id: string) {
  // Instead of deleting, just mark archived.
  await db.categories.update(id, { isArchived: true });
}

/** Payment Methods */
export async function listPaymentMethods(includeArchived = false) {
  const all = await db.paymentMethods.toArray();
  if (includeArchived) return all;
  return all.filter((m) => !m.isArchived);
}

export async function addPaymentMethod(data: Omit<PaymentMethod, 'id'>) {
  const pm: PaymentMethod = { id: uuid(), ...data };
  await db.paymentMethods.add(pm);
  return pm.id;
}

export async function renamePaymentMethod(id: string, newName: string) {
  await db.paymentMethods.update(id, { name: newName });
}

export async function archivePaymentMethod(id: string) {
  await db.paymentMethods.update(id, { isArchived: true });
}

export async function setOpeningBalance(id: string, openingBalancePesewas: number) {
  await db.paymentMethods.update(id, { openingBalancePesewas });
}

/** Cashflow Totals for Dashboard */
export interface CashflowTotals {
  totalIn: number;
  totalOut: number;
  netCash: number;
}

export async function getCashflowTotals(): Promise<CashflowTotals> {
  let totalIn = 0;
  let totalOut = 0;

  // Stream records without constructing large arrays or sorting
  await db.transactions.each((t) => {
    if (t.type === 'in') {
      totalIn += t.amountPesewas;
    } else {
      totalOut += t.amountPesewas;
    }
  });

  return {
    totalIn,
    totalOut,
    netCash: totalIn - totalOut,
  };
}

/** Summary */
export interface Summary {
  totalIn: number;
  totalOut: number;
  profit: number;
  byCategory: { categoryId: string; totalPesewas: number }[];
}

export async function getSummary(dateFrom?: Date, dateTo?: Date): Promise<Summary> {
  const filters: TransactionFilters = {};
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  const txs = await listTransactions(filters);
  let totalIn = 0;
  let totalOut = 0;
  const byCatMap = new Map<string, number>();
  for (const t of txs) {
    if (t.type === 'in') totalIn += t.amountPesewas;
    else totalOut += t.amountPesewas;
    const cur = byCatMap.get(t.categoryId) ?? 0;
    const sign = t.type === 'in' ? 1 : -1;
    byCatMap.set(t.categoryId, cur + sign * t.amountPesewas);
  }
  const byCategory = Array.from(byCatMap.entries()).map(([categoryId, totalPesewas]) => ({ categoryId, totalPesewas }));
  return { totalIn, totalOut, profit: totalIn - totalOut, byCategory };
}

/** Balance per payment method */
export interface MethodBalance {
  paymentMethodId: string;
  balancePesewas: number;
}

export async function getBalances(): Promise<MethodBalance[]> {
  const methods = await db.paymentMethods.toArray();
  const balances: MethodBalance[] = [];
  for (const m of methods) {
    const txs = await db.transactions
      .where('paymentMethodId')
      .equals(m.id)
      .toArray();
    let delta = 0;
    for (const t of txs) {
      delta += t.type === 'in' ? t.amountPesewas : -t.amountPesewas;
    }
    balances.push({ paymentMethodId: m.id, balancePesewas: m.openingBalancePesewas + delta });
  }
  return balances;
}

/** Settings */
export async function getSetting(key: string) {
  const s = await db.settings.get(key);
  return s?.value;
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value });
}

/** Debts */
export async function addDebt(
  data: Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'paidPesewas' | 'status'> & {
    paidPesewas?: number;
    status?: 'open' | 'paid';
  }
) {
  const now = new Date();
  const debt: Debt = {
    id: uuid(),
    paidPesewas: data.paidPesewas ?? 0,
    status: data.status ?? 'open',
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  await db.debts.add(debt);
  return debt.id;
}

export async function updateDebt(
  id: string,
  changes: Partial<Omit<Debt, 'id' | 'createdAt'>>
) {
  const now = new Date();
  await db.debts.update(id, { ...changes, updatedAt: now });
}

export async function deleteDebt(id: string) {
  await db.debts.delete(id);
}

export async function getDebtById(id: string) {
  return db.debts.get(id);
}

export async function listDebts(
  kind?: 'owed_to_me' | 'i_owe',
  status?: 'open' | 'paid'
) {
  let debts: Debt[];
  if (kind) {
    debts = await db.debts.where('kind').equals(kind).toArray();
  } else if (status) {
    debts = await db.debts.where('status').equals(status).toArray();
  } else {
    debts = await db.debts.toArray();
  }
  if (kind && status) {
    debts = debts.filter((d) => d.status === status);
  }
  return debts;
}

export async function listDebtPayments(debtId: string) {
  const all = await db.transactions.where('debtId').equals(debtId).toArray();
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return all;
}

export async function recordDebtPayment(params: {
  debtId: string;
  amountPesewas: number;
  paymentMethodId: string;
  date?: Date;
  description?: string;
  categoryId?: string;
}) {
  const debt = await db.debts.get(params.debtId);
  if (!debt) {
    throw new Error(`Debt not found with ID ${params.debtId}`);
  }

  // Find a fallback category if not provided
  let categoryId = params.categoryId;
  if (!categoryId) {
    const categories = await listCategories(false);
    const targetType = debt.kind === 'owed_to_me' ? 'in' : 'out';
    const match = categories.find(
      (c) => c.type === targetType || c.type === 'both'
    );
    categoryId = match ? match.id : '';
  }

  const { debt: updatedDebt, transaction } = validateAndApplyPayment(
    debt,
    params.amountPesewas,
    params.paymentMethodId,
    {
      date: params.date,
      categoryId,
      description: params.description,
    }
  );

  // Update debt in DB
  await db.debts.update(debt.id, {
    paidPesewas: updatedDebt.paidPesewas,
    status: updatedDebt.status,
    updatedAt: updatedDebt.updatedAt,
  });

  // Add transaction linked by debtId
  const txId = await addTransaction(transaction);
  return txId;
}

export async function getDebtsSummary() {
  const debts = await db.debts.toArray();
  return calculateDebtsSummary(debts);
}

/** Receipts */
export async function addReceipt(blob: Blob, mimeType: string = 'image/jpeg'): Promise<string> {
  const receiptId = uuid();
  const receipt: Receipt = {
    id: receiptId,
    blob,
    mimeType,
    createdAt: new Date(),
  };
  await db.receipts.add(receipt);
  return receiptId;
}

export async function getReceiptById(id: string): Promise<Receipt | undefined> {
  return db.receipts.get(id);
}

export async function deleteReceipt(id: string): Promise<void> {
  await db.receipts.delete(id);
}

