// src/pages/More.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { InstallPrompt } from "../components/InstallPrompt";
import { usePinLock } from "../context/PinLockContext";

const DevSeedSection = import.meta.env.DEV
  ? React.lazy(() => import("../dev/DevSeedSection"))
  : null;

export default function More() {
  const { isPinSet } = usePinLock();

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-semibold mb-4">More</h2>

      {/* In-app Install Card (hidden if already installed) */}
      <InstallPrompt variant="card" />

      <div className="space-y-3">
        <Link to="/more/calculator" className="block" aria-label="Open Calculator">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                ±
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Calculator
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Math expressions, change calculator & history
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-xl font-medium">→</span>
          </Card>
        </Link>

        <Link to="/more/export" className="block" aria-label="Open Export">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
                📤
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Export
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Export CSV and PDF reports by date range
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-xl font-medium">→</span>
          </Card>
        </Link>

        <Link to="/more/backup" className="block" aria-label="Open Backup & Restore">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-xl">
                💾
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Backup & Restore
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Export all tables or restore from a JSON backup
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-xl font-medium">→</span>
          </Card>
        </Link>

        <Link to="/more/storage" className="block" aria-label="Open Storage & Offline">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xl">
                🛡️
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Storage & Offline
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Persistence status, disk quota & remaining space
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-xl font-medium">→</span>
          </Card>
        </Link>

        <Link to="/more/security" className="block" aria-label="Open PIN Lock & Security">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-200 dark:border-gray-700 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center font-bold text-xl">
                🔒
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    PIN Lock & Security
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isPinSet
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {isPinSet ? 'Active' : 'Off'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Numeric lock, background auto-lock & throttling
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-xl font-medium">→</span>
          </Card>
        </Link>
      </div>

      {DevSeedSection && (
        <React.Suspense fallback={null}>
          <div className="pt-4">
            <DevSeedSection />
          </div>
        </React.Suspense>
      )}
    </div>
  );
}
