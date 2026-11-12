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
          className="text-xs text-[#C85600] dark:text-[#FF8A00] font-bold hover:underline min-h-[44px] px-2.5 py-1 flex items-center"
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
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {storageInfo?.persisted ? '✓ Persisted' : 'Denied / Ephemeral'}
          </span>
        </div>

        {/* Plain-language explanation */}
        {storageInfo?.persisted ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200">
            Storage is persisted. Your offline records won&apos;t be cleared by the browser during storage cleanups.
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <p className="font-semibold">Backups matter more!</p>
            <p className="leading-relaxed">
              Persistent storage was denied or not granted by your browser. If your device runs low on disk space, the browser may evict offline cached databases.
            </p>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Please take regular JSON backups in <strong>More &gt; Backup &amp; Restore</strong> to keep your bookkeeping records safe.
            </p>
          </div>
        )}

        {!storageInfo?.persisted && (
          <Button
            type="button"
            onClick={refreshStorageData}
            disabled={isChecking}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Request Storage Persistence
          </Button>
        )}
      </Card>

      {/* ── Space & Quota Card ─────────────────────── */}
      <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Disk Space &amp; Quota
        </span>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">
              Used Space
            </span>
            <span className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
              {formatBytes(storageInfo?.usageBytes ?? 0)}
            </span>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">
              Remaining Space
            </span>
            <span className="text-base font-bold font-mono text-[#C85600] dark:text-[#FF8A00]">
              {formatBytes(storageInfo?.remainingBytes ?? 0)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>Quota: {formatBytes(storageInfo?.quotaBytes ?? 0)}</span>
            <span>{(storageInfo?.percentUsed ?? 0).toFixed(2)}% used</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
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
          className="w-full min-h-[48px] py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span>💾</span>
          <span>Go to Backup &amp; Restore</span>
        </Link>
      </div>
    </div>
  );
}
