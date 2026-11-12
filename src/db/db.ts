// src/db/db.ts
/**
 * Dexie database schema for Recods App.
 * Tables:
 *  - transactions: financial entries (id, date, amountPesewas, type, categoryId, paymentMethodId, debtId?, receiptId?, createdAt, updatedAt)
 *  - categories: expense/income categories (id, name, type, isDefault, isArchived)
 *  - paymentMethods: ways of payment (id, name, openingBalancePesewas, isArchived)
 *  - debts: tracked debts (id, kind, personName, phone?, amountPesewas, paidPesewas, dueDate?, note?, status, createdAt, updatedAt)
 *  - receipts: stored receipt blobs (id, blob, mimeType, createdAt)
 *  - settings: key/value store for app settings
 *
 * Provides full IndexedDB storage in browser environments, with an automatic
 * memory-backed fallback for Node.js test environments where IndexedDB is not natively available.
 */

import Dexie, { type Table, type PromiseExtended } from 'dexie';

export interface Transaction {
  id: string;
  date: Date;
  amountPesewas: number;
  type: 'in' | 'out';
  categoryId: string;
  description?: string;
  paymentMethodId: string;
  debtId?: string;
  receiptId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  type: 'in' | 'out' | 'both';
  isDefault: boolean;
  isArchived: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  openingBalancePesewas: number;
  isArchived: boolean;
}

export interface Debt {
  id: string;
  kind: 'owed_to_me' | 'i_owe';
  personName: string;
  phone?: string;
  amountPesewas: number;
  paidPesewas: number;
  dueDate?: Date;
  note?: string;
  status: 'open' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

export interface Receipt {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: Date;
}

export interface Setting {
  key: string;
  value: unknown;
}

// ─────────────────────────────────────────────────────────
// In-Memory fallback implementation for Node.js testing
// ─────────────────────────────────────────────────────────

class MemoryCollection<T> {
  constructor(private items: T[]) {}

  where(field: keyof T) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      equals: (val: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new MemoryCollection(this.items.filter((item: any) => item[field] === val)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      between: (lower: any, upper: any, incL = true, incU = true) =>
        new MemoryCollection(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.items.filter((item: any) => {
            const v = item[field] instanceof Date ? item[field].getTime() : item[field];
            const l = lower instanceof Date ? lower.getTime() : lower;
            const u = upper instanceof Date ? upper.getTime() : upper;
            const lOk = incL ? v >= l : v > l;
            const uOk = incU ? v <= u : v < u;
            return lOk && uOk;
          }),
        ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aboveOrEqual: (lower: any) =>
        new MemoryCollection(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.items.filter((item: any) => {
            const v = item[field] instanceof Date ? item[field].getTime() : item[field];
            const l = lower instanceof Date ? lower.getTime() : lower;
            return v >= l;
          }),
        ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      belowOrEqual: (upper: any) =>
        new MemoryCollection(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.items.filter((item: any) => {
            const v = item[field] instanceof Date ? item[field].getTime() : item[field];
            const u = upper instanceof Date ? upper.getTime() : upper;
            return v <= u;
          }),
        ),
    };
  }

  async toArray(): Promise<T[]> {
    return [...this.items];
  }

  async each(callback: (item: T) => void | Promise<void>): Promise<void> {
    for (const item of this.items) {
      await callback(item);
    }
  }
}

class MemoryTable<T extends { id?: string; key?: string }> {
  public map = new Map<string, T>();

  async count(): Promise<number> {
    return this.map.size;
  }

  async toArray(): Promise<T[]> {
    return Array.from(this.map.values());
  }

  async each(callback: (item: T) => void | Promise<void>): Promise<void> {
    for (const item of this.map.values()) {
      await callback(item);
    }
  }

  async add(item: T): Promise<string> {
    const key = item.id || item.key || crypto.randomUUID();
    const stored = { ...item, id: item.id || key };
    this.map.set(key, stored as T);
    return key;
  }

  async put(item: T): Promise<string> {
    const key = item.key || item.id || crypto.randomUUID();
    this.map.set(key, { ...item });
    return key;
  }

  async bulkAdd(items: T[]): Promise<void> {
    for (const item of items) {
      await this.add(item);
    }
  }

  async bulkPut(items: T[]): Promise<void> {
    for (const item of items) {
      await this.put(item);
    }
  }

  async get(idOrKey: string): Promise<T | undefined> {
    const item = this.map.get(idOrKey);
    return item ? { ...item } : undefined;
  }

  async update(idOrKey: string, changes: Partial<T>): Promise<number> {
    const current = this.map.get(idOrKey);
    if (current) {
      this.map.set(idOrKey, { ...current, ...changes });
      return 1;
    }
    return 0;
  }

  async delete(idOrKey: string): Promise<void> {
    this.map.delete(idOrKey);
  }

  where(field: keyof T) {
    return new MemoryCollection(Array.from(this.map.values())).where(field);
  }

  toCollection() {
    return new MemoryCollection(Array.from(this.map.values()));
  }

  clear(): void {
    this.map.clear();
  }

  getSnapshot(): Map<string, T> {
    const copy = new Map<string, T>();
    for (const [k, v] of this.map.entries()) {
      copy.set(k, { ...v });
    }
    return copy;
  }

  restoreSnapshot(snapshot: Map<string, T>): void {
    this.map = new Map(snapshot);
  }
}

// ─────────────────────────────────────────────────────────
// Seed Data
// ─────────────────────────────────────────────────────────
const defaultCategories: Omit<Category, 'id'>[] = [
  // Income (in)
  { name: 'Sales', type: 'in', isDefault: true, isArchived: false },
  { name: 'Services', type: 'in', isDefault: true, isArchived: false },
  { name: 'Other income', type: 'in', isDefault: true, isArchived: false },
  // Expense (out)
  { name: 'Stock/Materials', type: 'out', isDefault: true, isArchived: false },
  { name: 'Rent', type: 'out', isDefault: true, isArchived: false },
  { name: 'Transport', type: 'out', isDefault: true, isArchived: false },
  { name: 'Utilities', type: 'out', isDefault: true, isArchived: false },
  { name: 'Salaries', type: 'out', isDefault: true, isArchived: false },
  { name: 'Marketing', type: 'out', isDefault: true, isArchived: false },
  { name: 'Airtime/Data', type: 'out', isDefault: true, isArchived: false },
  { name: 'Other expense', type: 'out', isDefault: true, isArchived: false },
];

const defaultMethods: Omit<PaymentMethod, 'id'>[] = [
  { name: 'Cash', openingBalancePesewas: 0, isArchived: false },
  { name: 'Mobile Money', openingBalancePesewas: 0, isArchived: false },
  { name: 'Bank', openingBalancePesewas: 0, isArchived: false },
];

// ─────────────────────────────────────────────────────────
// Database Class
// ─────────────────────────────────────────────────────────
export class RecodsDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  paymentMethods!: Table<PaymentMethod>;
  debts!: Table<Debt>;
  receipts!: Table<Receipt>;
  settings!: Table<Setting>;

  private isMemory = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private memoryTables: Record<string, MemoryTable<any>> = {};

  constructor() {
    super('RecodsDB');

    if (typeof indexedDB === 'undefined') {
      this.isMemory = true;
      const memTrans = new MemoryTable<Transaction>();
      const memCat = new MemoryTable<Category>();
      const memPm = new MemoryTable<PaymentMethod>();
      const memDebts = new MemoryTable<Debt>();
      const memReceipts = new MemoryTable<Receipt>();
      const memSettings = new MemoryTable<Setting>();

      this.memoryTables = {
        transactions: memTrans,
        categories: memCat,
        paymentMethods: memPm,
        debts: memDebts,
        receipts: memReceipts,
        settings: memSettings,
      };

      // Assign to properties
      this.transactions = memTrans as unknown as Table<Transaction>;
      this.categories = memCat as unknown as Table<Category>;
      this.paymentMethods = memPm as unknown as Table<PaymentMethod>;
      this.debts = memDebts as unknown as Table<Debt>;
      this.receipts = memReceipts as unknown as Table<Receipt>;
      this.settings = memSettings as unknown as Table<Setting>;
      return;
    }

    this.version(1).stores({
      transactions: '++id, date, amountPesewas, type, categoryId, paymentMethodId, debtId, receiptId, createdAt, updatedAt',
      categories: '++id, name, type, isDefault, isArchived',
      paymentMethods: '++id, name, openingBalancePesewas, isArchived',
      debts: '++id, kind, personName, phone, amountPesewas, paidPesewas, dueDate, note, status, createdAt, updatedAt',
      receipts: '++id, mimeType, createdAt',
      settings: '&key, value',
    });

    this.on('populate', async () => {
      await this.seedDefaults();
    });
  }

  async seedDefaults(): Promise<void> {
    const catCount = await this.categories.count();
    if (catCount === 0) {
      const withIds = defaultCategories.map((c) => ({
        id: crypto.randomUUID(),
        ...c,
      } as Category));
      await this.categories.bulkAdd(withIds);
    }

    const pmCount = await this.paymentMethods.count();
    if (pmCount === 0) {
      const withIds = defaultMethods.map((m) => ({
        id: crypto.randomUUID(),
        ...m,
      } as PaymentMethod));
      await this.paymentMethods.bulkAdd(withIds);
    }
  }

  override open(): PromiseExtended<Dexie> {
    if (this.isMemory) {
      return Dexie.Promise.resolve(this.seedDefaults()).then(() => this);
    }
    return super.open();
  }

  override delete(closeOptions?: { disableAutoOpen: boolean }): PromiseExtended<void> {
    if (this.isMemory) {
      for (const t of Object.values(this.memoryTables)) {
        t.clear();
      }
      return Dexie.Promise.resolve();
    }
    return super.delete(closeOptions);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override transaction(...args: any[]): PromiseExtended<any> {
    if (this.isMemory) {
      const fn = args[args.length - 1];
      if (typeof fn !== 'function') {
        return Dexie.Promise.resolve();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snapshots = new Map<string, Map<string, any>>();
      for (const [name, table] of Object.entries(this.memoryTables)) {
        snapshots.set(name, table.getSnapshot());
      }

      return new Dexie.Promise(async (resolve, reject) => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          for (const [name, table] of Object.entries(this.memoryTables)) {
            const snap = snapshots.get(name);
            if (snap) {
              table.restoreSnapshot(snap);
            }
          }
          reject(err);
        }
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (super.transaction as any).apply(this, args);
  }
}

export const db = new RecodsDB();
