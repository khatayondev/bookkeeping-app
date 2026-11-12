// src/components/ReloadPrompt.tsx
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('SW registration error', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-gray-900/95 text-white dark:bg-white/95 dark:text-gray-900 shadow-2xl rounded-2xl p-3.5 border border-gray-700/80 dark:border-gray-200 backdrop-blur-md flex items-center justify-between gap-3 transition-all"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          ✨
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold truncate">New version available</p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600 truncate">
            Refresh to update app
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="p-1.5 text-gray-400 hover:text-white dark:hover:text-gray-900 text-xs font-bold rounded"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

