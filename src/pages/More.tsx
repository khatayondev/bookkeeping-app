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
      {/* ── Profile Header (Design Match: Screen 1 Profile) ── */}
      <div className="text-center pt-2 pb-3 space-y-3">
        <div className="inline-block p-0.5 rounded-full bg-neutral-900 dark:bg-white shadow-md">
          <img
            src="/honey-palace-badge.png"
            alt="The Honey Palace Logo"
            className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-neutral-900"
          />
        </div>
        <div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white">
            The Honey Palace Africa
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Offline Bookkeeping &amp; Sales Management
          </p>
        </div>

        {/* Dual badges matching screen 1: Monochromatic pills */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 shadow-xs">
            🍯 Verified Merchant
          </span>
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-black text-white dark:bg-white dark:text-black shadow-xs">
            Offline Vault
          </span>
        </div>
      </div>

      {/* In-app Install Card (hidden if already installed) */}
      <InstallPrompt variant="card" />

      {/* ── Settings Items (Design Match: Screen 1 List) ── */}
      <div className="space-y-2.5 pt-2">
        <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
          Settings &amp; Tools
        </span>

        <Link to="/more/calculator" className="block">
          <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
                ±
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Calculator
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Expressions, customer change calculator &amp; history
                </p>
              </div>
            </div>
            <span className="text-neutral-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/export" className="block">
          <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
                📤
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Export Data
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Excel CSV &amp; PDF financial statement reports
                </p>
              </div>
            </div>
            <span className="text-neutral-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/backup" className="block">
          <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
                💾
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Backup &amp; Restore
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Export complete database JSON or safely restore
                </p>
              </div>
            </div>
            <span className="text-neutral-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/storage" className="block">
          <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
                🛡️
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Storage &amp; Persistence
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Browser eviction defense &amp; disk quota status
                </p>
              </div>
            </div>
            <span className="text-neutral-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/security" className="block">
          <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
                🔒
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    PIN Lock &amp; Security
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isPinSet
                        ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {isPinSet ? 'Active' : 'Off'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Cryptographic PBKDF2 numeric security
                </p>
              </div>
            </div>
            <span className="text-neutral-400 text-lg font-bold">›</span>
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
