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
        <div className="inline-block p-1 rounded-full bg-gradient-to-tr from-[#FF6E00] to-amber-400 shadow-md">
          <img
            src="/honey-palace-badge.png"
            alt="The Honey Palace Logo"
            className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-zinc-900"
          />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            The Honey Palace Africa
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Offline Bookkeeping &amp; Sales Management
          </p>
        </div>

        {/* Dual badges matching screen 1: Orange pill + Black pill */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#C85600] text-white shadow-xs">
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
          <Card className="hover:border-[#FF6E00]/60 transition-colors border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#16171B] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-[#C85600] dark:text-[#FF8A00] flex items-center justify-center font-bold text-xl border border-orange-200/60 dark:border-orange-800">
                ±
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Calculator
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expressions, customer change calculator &amp; history
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/export" className="block">
          <Card className="hover:border-[#FF6E00]/60 transition-colors border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#16171B] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-200/60 dark:border-emerald-800">
                📤
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Export Data
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Excel CSV &amp; PDF financial statement reports
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/backup" className="block">
          <Card className="hover:border-[#FF6E00]/60 transition-colors border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#16171B] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-xl border border-purple-200/60 dark:border-purple-800">
                💾
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Backup &amp; Restore
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Export complete database JSON or safely restore
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/storage" className="block">
          <Card className="hover:border-[#FF6E00]/60 transition-colors border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#16171B] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-200/60 dark:border-amber-800">
                🛡️
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Storage &amp; Persistence
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Browser eviction defense &amp; disk quota status
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-lg font-bold">›</span>
          </Card>
        </Link>

        <Link to="/more/security" className="block">
          <Card className="hover:border-[#FF6E00]/60 transition-colors border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#16171B] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xl border border-blue-200/60 dark:border-blue-800">
                🔒
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    PIN Lock &amp; Security
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cryptographic PBKDF2 numeric security
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-lg font-bold">›</span>
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
