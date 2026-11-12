// src/components/InstallPrompt.tsx
import React, { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { Button } from './Button';

interface InstallPromptProps {
  /** If provided, renders an inline card variant (e.g. for More page). Otherwise renders a banner. */
  variant?: 'banner' | 'card';
}

export function InstallPrompt({ variant = 'banner' }: InstallPromptProps) {
  const { isInstallable, isInstalled, isIosSafari, installApp } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Hidden when already installed or dismissed (unless card variant in More)
  if (isInstalled) return null;
  if (variant === 'banner' && isDismissed) return null;
  if (!isInstallable && !isIosSafari) return null;

  const handleInstallClick = async () => {
    try {
      setIsInstalling(true);
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  // ── iOS Safari Hint ─────────────────────────────────────
  if (isIosSafari) {
    if (variant === 'card') {
      return (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
            <span className="text-base">📲</span>
            <span>Install on iPhone / iPad</span>
          </div>
          <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
            To install this app on your home screen: tap the <strong>Share</strong> button (
            <span className="inline-block px-1 bg-white dark:bg-gray-800 rounded border border-blue-300 font-mono text-[10px]">
              ⎋
            </span>
            ) in Safari, then tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> (
            <span className="inline-block px-1 bg-white dark:bg-gray-800 rounded border border-blue-300 font-mono text-[10px]">
              ⊞
            </span>
            ).
          </p>
        </div>
      );
    }

    return (
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-xl shadow-md text-xs mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">📲</span>
            <div className="space-y-1">
              <span className="font-bold block text-sm">Install Bookkeeping App</span>
              <p className="text-blue-100 leading-snug">
                Tap the Safari <strong>Share</strong> button (⎋), then tap{' '}
                <strong>&ldquo;Add to Home Screen&rdquo;</strong> to use offline anytime.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-blue-200 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-bold leading-none rounded-lg focus-visible:outline-white"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── Native BeforeInstallPrompt ──────────────────────────
  if (variant === 'card') {
    return (
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
            📲
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Install Bookkeeping
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Install on your home screen for quick offline access
            </p>
          </div>
        </div>
        <Button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="min-h-[44px] px-3.5 py-2 bg-primary hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap"
        >
          {isInstalling ? 'Installing…' : 'Install App'}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3.5 rounded-xl shadow-md text-xs mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">📲</span>
        <div>
          <span className="font-bold block text-sm">Install Bookkeeping App</span>
          <p className="text-blue-100 text-[11px]">
            Fast access from your home screen with complete offline support.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="min-h-[44px] px-3.5 py-2 bg-white text-primary hover:bg-blue-50 font-bold text-xs rounded-lg shadow-sm"
        >
          {isInstalling ? 'Installing…' : 'Install'}
        </Button>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-blue-200 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-bold rounded-lg focus-visible:outline-white"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

