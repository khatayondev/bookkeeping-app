// src/dev/benchmark.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { seedDatabase, clearDevData } from './seedData';
import { listTransactions } from '../db/queries';

describe('Performance benchmark with 5,000 rows', () => {
  beforeEach(async () => {
    await clearDevData();
  });

  it('measures database seeding time', async () => {
    const start = performance.now();
    const res = await seedDatabase(5000, 30);
    const duration = performance.now() - start;

    expect(res.transactionsCount).toBe(5000);
    expect(res.debtsCount).toBe(30);
    console.log(`[BENCHMARK] Seeded 5,000 transactions and 30 debts in ${duration.toFixed(1)}ms`);
  });

  it('measures listTransactions full scan and filter time', async () => {
    await seedDatabase(5000, 30);

    // Baseline: List all
    const startAll = performance.now();
    const all = await listTransactions({});
    const durationAll = performance.now() - startAll;
    expect(all.length).toBe(5000);
    console.log(`[BENCHMARK] listTransactions (all 5,000): ${durationAll.toFixed(1)}ms`);

    // Filter by type 'in'
    const startIn = performance.now();
    const inTxs = await listTransactions({ type: 'in' });
    const durationIn = performance.now() - startIn;
    console.log(`[BENCHMARK] listTransactions (filter type='in', ${inTxs.length} rows): ${durationIn.toFixed(1)}ms`);

    // Filter by search
    const startSearch = performance.now();
    const searchTxs = await listTransactions({ search: 'inventory' });
    const durationSearch = performance.now() - startSearch;
    console.log(`[BENCHMARK] listTransactions (search 'inventory', ${searchTxs.length} rows): ${durationSearch.toFixed(1)}ms`);
  });
});

