// src/dev/seedData.ts
/**
 * Dev-only seed utility for generating realistic test data.
 * Seeds 5,000 realistic transactions spread over 12 months, plus 30 debts.
 *
 * NOTE: This module is intended for dev mode only and must NOT be shipped
 * in production builds.
 */

import { db, type Transaction, type Debt } from '../db/db';

const GHANAIAN_NAMES = [
  'Kwame Mensah',
  'Ama Serwaa',
  'Kofi Boateng',
  'Akosua Agyeman',
  'Yaw Addo',
  'Abena Osei',
  'Emmanuel Owusu',
  'Grace Ansah',
  'Samuel Tetteh',
  'Dorothy Baah',
  'David Asante',
  'Mercy Appiah',
  'Joseph Darko',
  'Eunice Kwarteng',
  'Peter Amankwah',
  'Frank Antwi',
  'Rita Danso',
  'Daniel Arthur',
  'Comfort Mensah',
  'Stephen Okyere',
  'Esther Boakye',
  'Isaac Donkor',
  'Mary Frimpong',
  'Charles Opoku',
  'Janet Adjei',
  'George Annan',
  'Beatrice Sackey',
  'Prince Yeboah',
  'Patience Quaye',
  'Francis Agyei',
];

const INCOME_DESCRIPTIONS = [
  'Storefront retail sales',
  'Client invoice payment - Project Alpha',
  'Consulting service fee',
  'Wholesale order settlement',
  'Customer mobile money payment',
  'Contract milestone payment',
  'Bulk order deposit',
  'Special delivery fee',
  'Weekend market revenue',
  'Online store orders payout',
  'Custom fabrication payment',
  'Maintenance contract service',
];

const EXPENSE_DESCRIPTIONS = [
  'Weekly inventory restocking',
  'Monthly shop rent contribution',
  'Electricity utility prepaid bill',
  'Water utility bill',
  'Office high-speed internet bundle',
  'Staff travel & delivery fuel',
  'Store consumables & cleaning',
  'Social media advertising campaign',
  'Packaging supplies & branded bags',
  'Airtime & mobile data top-up',
  'Equipment maintenance & servicing',
  'Generator fuel & oil top-up',
  'Wholesale material replenishment',
  'Casual labor & loading fee',
  'Security & sanitation levy',
  'Printing & stationary supplies',
];

const DEBT_NOTES = [
  'Stock purchase on 30-day credit',
  'Partial advance for bulk supplies',
  'Equipment repair invoice',
  'Shop rent balance',
  'Emergency inventory loan',
  'Client goods supplied on credit',
  'Pending event catering balance',
  'Wholesale fabric credit terms',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface SeedResult {
  transactionsCount: number;
  debtsCount: number;
  durationMs: number;
}

/**
 * Seeds 5,000 realistic transactions over 12 months and 30 debts.
 */
export async function seedDatabase(
  targetTransactions = 5000,
  targetDebts = 30
): Promise<SeedResult> {
  const startTime = performance.now();

  await db.seedDefaults();

  const categories = await db.categories.toArray();
  const paymentMethods = await db.paymentMethods.toArray();

  if (categories.length === 0 || paymentMethods.length === 0) {
    throw new Error('Default categories or payment methods not found');
  }

  const incomeCategories = categories.filter(
    (c) => c.type === 'in' || c.type === 'both'
  );
  const expenseCategories = categories.filter(
    (c) => c.type === 'out' || c.type === 'both'
  );
  const fallbackCat = categories[0];

  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  // ── 1. Generate 30 Debts ──────────────────────────────────
  const debts: Debt[] = [];
  for (let i = 0; i < targetDebts; i++) {
    const kind: 'owed_to_me' | 'i_owe' = i % 2 === 0 ? 'owed_to_me' : 'i_owe';
    const personName = GHANAIAN_NAMES[i % GHANAIAN_NAMES.length];
    const phone = `024${String(1000000 + i * 29381).slice(0, 7)}`;
    const amountPesewas = randomInt(150, 4500) * 100; // 150.00 to 4,500.00 GHS

    // Status: ~30% fully paid, ~70% open (some partially paid, some 0 paid)
    const isPaid = i % 3 === 0;
    let paidPesewas = 0;
    let status: 'open' | 'paid' = 'open';

    if (isPaid) {
      paidPesewas = amountPesewas;
      status = 'paid';
    } else if (i % 2 === 0) {
      paidPesewas = Math.round((amountPesewas * randomInt(20, 60)) / 100);
    }

    // Due dates: some past (overdue), some upcoming
    const dueOffsetDays = randomInt(-60, 60);
    const dueDate = new Date(now + dueOffsetDays * 24 * 60 * 60 * 1000);
    const createdAt = new Date(now - randomInt(30, 300) * 24 * 60 * 60 * 1000);

    debts.push({
      id: crypto.randomUUID(),
      kind,
      personName,
      phone,
      amountPesewas,
      paidPesewas,
      dueDate,
      note: randomChoice(DEBT_NOTES),
      status,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // ── 2. Generate 5,000 Transactions ────────────────────────
  const transactions: Transaction[] = [];

  // Seed payments for debts with paidPesewas > 0
  for (const debt of debts) {
    if (debt.paidPesewas > 0) {
      const isIncome = debt.kind === 'owed_to_me';
      const cat = isIncome
        ? randomChoice(incomeCategories) || fallbackCat
        : randomChoice(expenseCategories) || fallbackCat;
      const pm = randomChoice(paymentMethods);
      const txDate = new Date(debt.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);

      transactions.push({
        id: crypto.randomUUID(),
        date: txDate,
        amountPesewas: debt.paidPesewas,
        type: isIncome ? 'in' : 'out',
        categoryId: cat.id,
        description: `Debt payment: ${debt.personName}`,
        paymentMethodId: pm.id,
        debtId: debt.id,
        createdAt: txDate,
        updatedAt: txDate,
      });
    }
  }

  // Fill remainder of 5,000 transactions spread across 12 months
  const remainingCount = targetTransactions - transactions.length;

  for (let i = 0; i < remainingCount; i++) {
    // Distribute timestamps smoothly across 365 days
    // Add jitter so transactions are spread naturally through each day
    const progress = i / remainingCount;
    const timeAgoMs = (1 - progress) * oneYearMs + (Math.random() - 0.5) * 86400000;
    const txDate = new Date(Math.max(now - oneYearMs, Math.min(now, now - timeAgoMs)));

    // ~35% income, ~65% expense
    const isIncome = Math.random() < 0.35;
    const type: 'in' | 'out' = isIncome ? 'in' : 'out';

    let amountPesewas: number;
    let description: string;
    let catId: string;

    if (isIncome) {
      // Income: 40.00 GHS to 4,000.00 GHS
      amountPesewas = randomInt(40, 4000) * 100;
      description = randomChoice(INCOME_DESCRIPTIONS);
      const cat = randomChoice(incomeCategories) || fallbackCat;
      catId = cat.id;
    } else {
      // Expense: 8.00 GHS to 850.00 GHS
      amountPesewas = randomInt(8, 850) * 100;
      description = randomChoice(EXPENSE_DESCRIPTIONS);
      const cat = randomChoice(expenseCategories) || fallbackCat;
      catId = cat.id;
    }

    const pm = randomChoice(paymentMethods);

    transactions.push({
      id: crypto.randomUUID(),
      date: txDate,
      amountPesewas,
      type,
      categoryId: catId,
      description,
      paymentMethodId: pm.id,
      createdAt: txDate,
      updatedAt: txDate,
    });
  }

  // Insert in bulk chunks inside a transaction for performance
  const CHUNK_SIZE = 1000;
  await db.transaction('rw', [db.debts, db.transactions], async () => {
    await db.debts.bulkAdd(debts);
    for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
      const chunk = transactions.slice(i, i + CHUNK_SIZE);
      await db.transactions.bulkAdd(chunk);
    }
  });

  const durationMs = Math.round(performance.now() - startTime);

  return {
    transactionsCount: transactions.length,
    debtsCount: debts.length,
    durationMs,
  };
}

/**
 * Clears all transactions and debts (dev utility).
 */
export async function clearDevData(): Promise<void> {
  await db.transaction('rw', [db.transactions, db.debts, db.receipts], async () => {
    await db.transactions.clear();
    await db.debts.clear();
    await db.receipts.clear();
  });
}

