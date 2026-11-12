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
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 shadow-xs inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Verified Merchant</span>
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

        <Link to="/debts" className="block">
          <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex items-center justify-between p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <svg className="w-5 h-5 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Debts &amp; Customer Credit
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Track money owed to you and payments owed to suppliers
                </p>
              </div>
            </div>
            <span className="text-neutral-400 text-lg font-bold">›</span>
          </Card>
        </Link>

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
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <svg className="w-5 h-5 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
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
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <svg className="w-5 h-5 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
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
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <svg className="w-5 h-5 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
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
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <svg className="w-5 h-5 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
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
