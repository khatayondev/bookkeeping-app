// src/dev/DevSeedSection.tsx
import React, { useState, useEffect } from 'react';
import { seedDatabase, clearDevData, type SeedResult } from './seedData';
import { db } from '../db/db';

export default function DevSeedSection() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [counts, setCounts] = useState<{ txCount: number; debtCount: number }>({
    txCount: 0,
    debtCount: 0,
  });

  const refreshCounts = async () => {
    try {
      const txCount = await db.transactions.count();
      const debtCount = await db.debts.count();
      setCounts({ txCount, debtCount });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshCounts();

    // Expose helpers globally on window in DEV mode for automation
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__seedDatabase = seedDatabase;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__clearDevData = clearDevData;
    }
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await seedDatabase(5000, 30);
      setResult(res);
      await refreshCounts();
    } catch (err) {
      console.error('Failed to seed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all transactions and debts?')) return;
    setLoading(true);
    try {
      await clearDevData();
      setResult(null);
      await refreshCounts();
    } catch (err) {
      console.error('Failed to clear data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="dev-seed-section"
      className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛠️</span>
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Developer Tools (DEV ONLY)
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Transactions in DB: <strong>{counts.txCount.toLocaleString()}</strong> | Debts:{' '}
              <strong>{counts.debtCount}</strong>
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 px-2 py-0.5 rounded">
          Dev Mode
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleSeed}
          disabled={loading}
          data-testid="seed-5000-btn"
          className="flex-1 min-w-[180px] bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <span>⏳ Seeding database...</span>
          ) : (
            <>
              <span>🌱</span>
              <span>Seed 5,000 Tx + 30 Debts</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={loading}
          data-testid="clear-dev-btn"
          className="bg-gray-200 hover:bg-red-100 hover:text-red-700 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-red-950 dark:hover:text-red-300 font-semibold text-xs py-2 px-3 rounded-lg transition-colors"
        >
          Clear DB
        </button>
      </div>

      {result && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
          ✅ Successfully seeded {result.transactionsCount.toLocaleString()} transactions and{' '}
          {result.debtsCount} debts in {result.durationMs}ms!
        </div>
      )}
    </div>
  );
}

