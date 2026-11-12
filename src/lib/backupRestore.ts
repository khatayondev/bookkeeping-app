// src/lib/backupRestore.ts
import { db, type Category, type Debt, type PaymentMethod, type Receipt, type Setting, type Transaction } from '../db/db';
import { setSetting } from '../db/queries';

export const BACKUP_SCHEMA_VERSION = 1;

export interface SerializedTransaction {
  id: string;
  date: string;
  amountPesewas: number;
  type: 'in' | 'out';
  categoryId: string;
  description?: string;
  paymentMethodId: string;
  debtId?: string;
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedDebt {
  id: string;
  kind: 'owed_to_me' | 'i_owe';
  personName: string;
  phone?: string;
  amountPesewas: number;
  paidPesewas: number;
  dueDate?: string;
  note?: string;
  status: 'open' | 'paid';
  createdAt: string;
  updatedAt: string;
}

export interface SerializedReceipt {
  id: string;
  dataBase64: string;
  mimeType: string;
  createdAt: string;
}

export interface BackupData {
  schemaVersion: number;
  exportTimestamp: string;
  transactions: SerializedTransaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  debts: SerializedDebt[];
  receipts: SerializedReceipt[];
  settings: Setting[];
}

export interface BackupSummary {
  transactionCount: number;
  debtCount: number;
  categoryCount: number;
  paymentMethodCount: number;
  receiptCount: number;
  settingCount: number;
  summaryText: string;
}

export type RestoreMode = 'replace' | 'merge';

/**
 * Converts a Blob to a base64 encoded string.
 * Works seamlessly in both Node.js (test) and browser environments.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arrayBuffer).toString('base64');
  }
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Converts a base64 encoded string back to a Blob.
 */
export function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  if (typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(base64, 'base64');
    return new Blob([buffer], { type: mimeType });
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Gathers all data across all database tables into a single BackupData object,
 * with receipts encoded as base64 and dates converted to ISO strings.
 */
export async function createBackupData(): Promise<BackupData> {
  const [
    transactions,
    categories,
    paymentMethods,
    debts,
    receipts,
    settings,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.paymentMethods.toArray(),
    db.debts.toArray(),
    db.receipts.toArray(),
    db.settings.toArray(),
  ]);

  const serializedTransactions: SerializedTransaction[] = transactions.map((t) => ({
    ...t,
    date: t.date instanceof Date ? t.date.toISOString() : new Date(t.date).toISOString(),
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date(t.createdAt).toISOString(),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : new Date(t.updatedAt).toISOString(),
  }));

  const serializedDebts: SerializedDebt[] = debts.map((d) => ({
    ...d,
    dueDate: d.dueDate
      ? d.dueDate instanceof Date
        ? d.dueDate.toISOString()
        : new Date(d.dueDate).toISOString()
      : undefined,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(d.createdAt).toISOString(),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : new Date(d.updatedAt).toISOString(),
  }));

  const serializedReceipts: SerializedReceipt[] = await Promise.all(
    receipts.map(async (r) => ({
      id: r.id,
      dataBase64: await blobToBase64(r.blob),
      mimeType: r.mimeType,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
    }))
  );

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportTimestamp: new Date().toISOString(),
    transactions: serializedTransactions,
    categories,
    paymentMethods,
    debts: serializedDebts,
    receipts: serializedReceipts,
    settings,
  };
}

/**
 * Creates a backup JSON file Blob, generates standard filename,
 * and records lastBackupAt in settings on success.
 */
export async function exportBackupFile(): Promise<{ filename: string; blob: Blob }> {
  const backup = await createBackupData();
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `bookkeeping-backup-${dateStr}.json`;

  await setSetting('lastBackupAt', new Date().toISOString());

  return { filename, blob };
}

/**
 * Validates the syntax, schemaVersion, and structure of a backup JSON file.
 * Returns a typed validation result with parsed summary data.
 * Never logs user data to the console.
 */
export function parseAndValidateBackup(
  jsonString: string
): { ok: true; data: BackupData; summary: BackupSummary } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Invalid backup: content must be a JSON object.' };
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.schemaVersion !== 'number') {
    return { ok: false, error: 'Invalid backup: missing schemaVersion.' };
  }

  if (record.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schema version: expected ${BACKUP_SCHEMA_VERSION}, got ${record.schemaVersion}.`,
    };
  }

  if (
    !Array.isArray(record.transactions) ||
    !Array.isArray(record.categories) ||
    !Array.isArray(record.paymentMethods) ||
    !Array.isArray(record.debts) ||
    !Array.isArray(record.receipts)
  ) {
    return {
      ok: false,
      error: 'Invalid backup structure: required table arrays are missing or corrupt.',
    };
  }

  const transactions = record.transactions as SerializedTransaction[];
  const categories = record.categories as Category[];
  const paymentMethods = record.paymentMethods as PaymentMethod[];
  const debts = record.debts as SerializedDebt[];
  const receipts = record.receipts as SerializedReceipt[];
  const settings = Array.isArray(record.settings) ? (record.settings as Setting[]) : [];

  const txCount = transactions.length;
  const debtCount = debts.length;
  const categoryCount = categories.length;
  const pmCount = paymentMethods.length;
  const receiptCount = receipts.length;
  const settingCount = settings.length;

  const summaryText = `${txCount.toLocaleString()} transactions, ${debtCount.toLocaleString()} debts, ${categoryCount.toLocaleString()} categories, ${pmCount.toLocaleString()} payment methods, ${receiptCount.toLocaleString()} receipts`;

  const validatedData: BackupData = {
    schemaVersion: record.schemaVersion,
    exportTimestamp: typeof record.exportTimestamp === 'string' ? record.exportTimestamp : new Date().toISOString(),
    transactions,
    categories,
    paymentMethods,
    debts,
    receipts,
    settings,
  };

  return {
    ok: true,
    data: validatedData,
    summary: {
      transactionCount: txCount,
      debtCount,
      categoryCount,
      paymentMethodCount: pmCount,
      receiptCount,
      settingCount,
      summaryText,
    },
  };
}

/**
 * Restores a validated BackupData object into the database.
 * Runs atomically inside a single Dexie transaction.
 * If an error occurs, the entire transaction is rolled back, leaving existing data untouched.
 * Never logs user data to the console.
 */
export async function restoreBackup(
  backup: BackupData,
  mode: RestoreMode
): Promise<{ success: boolean; restoredTransactions: number; restoredDebts: number }> {
  // Pre-deserialize and validate objects before starting the transaction
  const deserializedTransactions: Transaction[] = backup.transactions.map((t) => ({
    id: t.id,
    date: new Date(t.date),
    amountPesewas: Number(t.amountPesewas),
    type: t.type,
    categoryId: t.categoryId,
    description: t.description,
    paymentMethodId: t.paymentMethodId,
    debtId: t.debtId,
    receiptId: t.receiptId,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
  }));

  const deserializedDebts: Debt[] = backup.debts.map((d) => ({
    id: d.id,
    kind: d.kind,
    personName: d.personName,
    phone: d.phone,
    amountPesewas: Number(d.amountPesewas),
    paidPesewas: Number(d.paidPesewas),
    dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
    note: d.note,
    status: d.status,
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt),
  }));

  const deserializedReceipts: Receipt[] = backup.receipts.map((r) => {
    if (typeof r.dataBase64 !== 'string') {
      throw new Error(`Receipt ${r.id} missing base64 data.`);
    }
    const blob = base64ToBlob(r.dataBase64, r.mimeType || 'image/jpeg');
    return {
      id: r.id,
      blob,
      mimeType: r.mimeType,
      createdAt: new Date(r.createdAt),
    };
  });

  const deserializedCategories: Category[] = backup.categories.map((c) => ({ ...c }));
  const deserializedPaymentMethods: PaymentMethod[] = backup.paymentMethods.map((m) => ({ ...m }));
  const deserializedSettings: Setting[] = (backup.settings || []).map((s) => ({ ...s }));

  // Execute restore inside a single Dexie transaction
  await db.transaction(
    'rw',
    [db.transactions, db.categories, db.paymentMethods, db.debts, db.receipts, db.settings],
    async () => {
      if (mode === 'replace') {
        // Clear all tables first
        await Promise.all([
          db.transactions.clear(),
          db.categories.clear(),
          db.paymentMethods.clear(),
          db.debts.clear(),
          db.receipts.clear(),
          db.settings.clear(),
        ]);

        // Bulk insert all deserialized items
        await Promise.all([
          db.transactions.bulkAdd(deserializedTransactions),
          db.categories.bulkAdd(deserializedCategories),
          db.paymentMethods.bulkAdd(deserializedPaymentMethods),
          db.debts.bulkAdd(deserializedDebts),
          db.receipts.bulkAdd(deserializedReceipts),
          db.settings.bulkPut(deserializedSettings),
        ]);
      } else {
        // Merge mode: skip records with existing IDs
        const [
          existingTx,
          existingCat,
          existingPm,
          existingDebts,
          existingReceipts,
          existingSettings,
        ] = await Promise.all([
          db.transactions.toArray(),
          db.categories.toArray(),
          db.paymentMethods.toArray(),
          db.debts.toArray(),
          db.receipts.toArray(),
          db.settings.toArray(),
        ]);

        const txIdSet = new Set(existingTx.map((t) => t.id));
        const catIdSet = new Set(existingCat.map((c) => c.id));
        const pmIdSet = new Set(existingPm.map((m) => m.id));
        const debtIdSet = new Set(existingDebts.map((d) => d.id));
        const receiptIdSet = new Set(existingReceipts.map((r) => r.id));
        const settingKeySet = new Set(existingSettings.map((s) => s.key));

        const toAddTx = deserializedTransactions.filter((t) => !txIdSet.has(t.id));
        const toAddCat = deserializedCategories.filter((c) => !catIdSet.has(c.id));
        const toAddPm = deserializedPaymentMethods.filter((m) => !pmIdSet.has(m.id));
        const toAddDebts = deserializedDebts.filter((d) => !debtIdSet.has(d.id));
        const toAddReceipts = deserializedReceipts.filter((r) => !receiptIdSet.has(r.id));
        const toAddSettings = deserializedSettings.filter((s) => !settingKeySet.has(s.key));

        await Promise.all([
          toAddTx.length > 0 ? db.transactions.bulkAdd(toAddTx) : Promise.resolve(),
          toAddCat.length > 0 ? db.categories.bulkAdd(toAddCat) : Promise.resolve(),
          toAddPm.length > 0 ? db.paymentMethods.bulkAdd(toAddPm) : Promise.resolve(),
          toAddDebts.length > 0 ? db.debts.bulkAdd(toAddDebts) : Promise.resolve(),
          toAddReceipts.length > 0 ? db.receipts.bulkAdd(toAddReceipts) : Promise.resolve(),
          toAddSettings.length > 0 ? db.settings.bulkPut(toAddSettings) : Promise.resolve(),
        ]);
      }
    }
  );

  return {
    success: true,
    restoredTransactions: deserializedTransactions.length,
    restoredDebts: deserializedDebts.length,
  };
}

