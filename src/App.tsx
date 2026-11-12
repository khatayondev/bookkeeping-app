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
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] dark:bg-[#0D0E12] text-slate-900 dark:text-gray-100 font-sans">
      {isLocked && <LockScreen />}
      <header className="px-4 pt-3.5 pb-2 safe-pt max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#FF6E00] to-amber-400 shadow-sm">
              <img
                src="/honey-palace-badge.png"
                alt="The Honey Palace Logo"
                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-zinc-900"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Honey <span className="text-[#C85600] dark:text-[#FF8A00]">Palace</span>
                </h1>
                <span className="text-[10px] bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Bookkeeping
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Offline-First Mobile Ledger
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Offline
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-2 max-w-md mx-auto w-full">
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
