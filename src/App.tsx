// src/App.tsx
import * as React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Transactions from "./pages/Transactions";
import Add from "./pages/Add";
import Debts from "./pages/Debts";
import More from "./pages/More";
import Calculator from "./pages/Calculator";
import Export from "./pages/Export";
import BackupRestore from "./pages/BackupRestore";
import Storage from "./pages/Storage";
import SecuritySettings from "./pages/SecuritySettings";
import BottomNav from "./components/BottomNav";
import { ReloadPrompt } from "./components/ReloadPrompt";
import { LockScreen } from "./components/LockScreen";
import { PinLockProvider, usePinLock } from "./context/PinLockContext";
import { checkAndRequestStoragePersistence } from "./lib/storage";

function AppContent() {
  const location = useLocation();
  const { isLocked } = usePinLock();

  // On first launch, call navigator.storage.persist() & navigator.storage.estimate()
  React.useEffect(() => {
    checkAndRequestStoragePersistence().catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 font-sans">
      {isLocked && <LockScreen />}
      <header className="px-4 pt-3.5 pb-2 safe-pt max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-0.5 rounded-full bg-neutral-900 dark:bg-white shadow-sm">
              <img
                src="/honey-palace-badge.png"
                alt="The Honey Palace Logo"
                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-neutral-900"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
                  Honey Palace
                </h1>
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Bookkeeping
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                Offline-First Mobile Ledger
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white animate-pulse" />
              Offline
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-24 safe-pb max-w-md mx-auto w-full">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/add" element={<Add />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/more" element={<More />} />
          <Route path="/more/calculator" element={<Calculator />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/more/export" element={<Export />} />
          <Route path="/export" element={<Export />} />
          <Route path="/more/backup" element={<BackupRestore />} />
          <Route path="/backup" element={<BackupRestore />} />
          <Route path="/more/storage" element={<Storage />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/more/security" element={<SecuritySettings />} />
          <Route path="/security" element={<SecuritySettings />} />
        </Routes>
      </main>
      <ReloadPrompt />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <PinLockProvider>
      <AppContent />
    </PinLockProvider>
  );
}
