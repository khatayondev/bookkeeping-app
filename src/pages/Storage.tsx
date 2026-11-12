// src/pages/Storage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { db } from '../db/db';
import { checkAndRequestStoragePersistence, formatBytes, type StorageEstimateResult } from '../lib/storage';

export default function Storage() {
  const [storageInfo, setStorageInfo] = useState<StorageEstimateResult | null>(null);
  const [counts, setCounts] = useState<{
    transactions: number;
    debts: number;
    receipts: number;
    categories: number;
    paymentMethods: number;
  }>({
    transactions: 0,
    debts: 0,
    receipts: 0,
    categories: 0,
    paymentMethods: 0,
  });
  const [isChecking, setIsChecking] = useState(false);

  const refreshStorageData = async () => {
    setIsChecking(true);
    try {
      const [info, txCount, debtCount, receiptCount, catCount, pmCount] = await Promise.all([
        checkAndRequestStoragePersistence(),
        db.transactions.count(),
        db.debts.count(),
        db.receipts.count(),
        db.categories.count(),
        db.paymentMethods.count(),
      ]);
      setStorageInfo(info);
      setCounts({
        transactions: txCount,
        debts: debtCount,
        receipts: receiptCount,
        categories: catCount,
        paymentMethods: pmCount,
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    refreshStorageData();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* ── Page Header ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/more"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg"
            aria-label="Back to More"
          >
            ←
          </Link>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Storage & Offline
          </h2>
        </div>
        <button
          onClick={refreshStorageData}
          disabled={isChecking}
          className="text-xs text-neutral-900 dark:text-neutral-100 font-bold hover:underline min-h-[44px] px-2.5 py-1 flex items-center"
        >
          {isChecking ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {/* ── Persistence Status Card ────────────────── */}
      <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                Storage Persistence
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Browser eviction protection
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              storageInfo?.persisted
                ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700'
                : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700'
            }`}
          >
            {storageInfo?.persisted ? '✓ Persisted' : 'Denied / Ephemeral'}
          </span>
        </div>

        {/* Plain-language explanation */}
        {storageInfo?.persisted ? (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-xs text-neutral-900 dark:text-neutral-200">
            Storage is persisted. Your offline records won&apos;t be cleared by the browser during storage cleanups.
          </div>
        ) : (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-xs text-neutral-900 dark:text-neutral-200 space-y-1.5">
            <p className="font-semibold">Backups matter more!</p>
            <p className="leading-relaxed">
              Persistent storage was denied or not granted by your browser. If your device runs low on disk space, the browser may evict offline cached databases.
            </p>
            <p className="font-medium text-neutral-700 dark:text-neutral-300">
              Please take regular JSON backups in <strong>More &gt; Backup &amp; Restore</strong> to keep your bookkeeping records safe.
            </p>
          </div>
        )}

        {!storageInfo?.persisted && (
          <Button
            type="button"
            variant="secondary"
            onClick={refreshStorageData}
            disabled={isChecking}
            className="w-full py-2.5 text-xs font-semibold rounded-xl"
          >
            Request Storage Persistence
          </Button>
        )}
      </Card>

      {/* ── Space & Quota Card ─────────────────────── */}
      <Card className="p-4 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <span className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Disk Space &amp; Quota
        </span>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mb-0.5">
              Used Space
            </span>
            <span className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100">
              {formatBytes(storageInfo?.usageBytes ?? 0)}
            </span>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mb-0.5">
              Remaining Space
            </span>
            <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
              {formatBytes(storageInfo?.remainingBytes ?? 0)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] text-neutral-500">
            <span>Quota: {formatBytes(storageInfo?.quotaBytes ?? 0)}</span>
            <span>{(storageInfo?.percentUsed ?? 0).toFixed(2)}% used</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-black dark:bg-white h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(1, storageInfo?.percentUsed ?? 0))}%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* ── Stored Records Breakdown ───────────────── */}
      <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-2">
        <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Local Records Count
        </span>

        <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
          <div className="py-2 flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Transactions</span>
            <span className="font-mono font-semibold">{counts.transactions.toLocaleString()}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Debts</span>
            <span className="font-mono font-semibold">{counts.debts.toLocaleString()}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Receipt Photos</span>
            <span className="font-mono font-semibold">{counts.receipts.toLocaleString()}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Categories</span>
            <span className="font-mono font-semibold">{counts.categories.toLocaleString()}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Payment Methods</span>
            <span className="font-mono font-semibold">{counts.paymentMethods.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* ── Quick Link to Backup ───────────────────── */}
      <div className="pt-1">
        <Link
          to="/more/backup"
          className="w-full min-h-[48px] py-3 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span>💾</span>
          <span>Go to Backup &amp; Restore</span>
        </Link>
      </div>
    </div>
  );
}
