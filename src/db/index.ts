// src/db/index.ts
import Dexie, { Table } from "dexie";

export interface Transaction {
  id?: number;
  date: string; // ISO date (YYYY-MM-DD)
  amount: number; // stored in pesewas (integer)
  type: "in" | "out"; // Money in / Money out
}

export class AppDB extends Dexie {
  public transactions!: Table<Transaction, number>;

  constructor() {
    super("recods-db");
    this.version(1).stores({
      transactions: "++id, date, amount, type",
    });
  }
}

export const db = new AppDB();

