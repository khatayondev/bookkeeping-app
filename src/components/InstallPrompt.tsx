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
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
            <svg className="w-4 h-4 text-neutral-900 dark:text-neutral-100 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Install on iPhone / iPad</span>
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
            To install this app on your home screen: tap the <strong>Share</strong> button (
            <span className="inline-block px-1 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-[10px]">
              ⎋
            </span>
            ) in Safari, then tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> (
            <span className="inline-block px-1 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-[10px]">
              ⊞
            </span>
            ).
          </p>
        </div>
      );
    }

    return (
      <div className="relative bg-black text-white dark:bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl shadow-md text-xs mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="font-bold block text-sm">Install Bookkeeping App</span>
              <p className="text-neutral-300 leading-snug">
                Tap the Safari <strong>Share</strong> button (⎋), then tap{' '}
                <strong>&ldquo;Add to Home Screen&rdquo;</strong> to use offline anytime.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-neutral-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-bold leading-none rounded-lg focus-visible:outline-white"
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
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-lg shadow-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Install Bookkeeping
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Install on your home screen for quick offline access
            </p>
          </div>
        </div>
        <Button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="min-h-[44px] px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold rounded-xl shadow-md whitespace-nowrap active:scale-95 transition-all"
        >
          {isInstalling ? 'Installing…' : 'Install App'}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative bg-black text-white dark:bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl shadow-md text-xs mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <span className="font-bold block text-sm">Install Bookkeeping App</span>
          <p className="text-neutral-300 text-[11px]">
            Fast access from your home screen with complete offline support.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="min-h-[44px] px-3.5 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs rounded-xl shadow-md whitespace-nowrap active:scale-95 transition-all"
        >
          {isInstalling ? 'Installing…' : 'Install'}
        </Button>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-neutral-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-bold rounded-lg focus-visible:outline-white"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

