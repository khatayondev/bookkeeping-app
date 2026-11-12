// src/components/LockScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePinLock } from '../context/PinLockContext';
import { Card } from './Card';
import { Button } from './Button';
import { parseAndValidateBackup, restoreBackup } from '../lib/backupRestore';
import { db } from '../db/db';

export interface LockScreenProps {
  onUnlocked?: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked }) => {
  const { unlock, throttle, refreshPinConfig } = usePinLock();

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [emergencyFeedback, setEmergencyFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDigit = useCallback((d: string) => {
    if (throttle.isLockedOut || isVerifying) return;
    setErrorMessage(null);
    setEnteredPin((prev) => (prev.length < 12 ? prev + d : prev));
  }, [throttle.isLockedOut, isVerifying]);

  const handleBackspace = useCallback(() => {
    if (throttle.isLockedOut || isVerifying) return;
    setErrorMessage(null);
    setEnteredPin((prev) => prev.slice(0, -1));
  }, [throttle.isLockedOut, isVerifying]);

  const handleClear = useCallback(() => {
    if (throttle.isLockedOut || isVerifying) return;
    setErrorMessage(null);
    setEnteredPin('');
  }, [throttle.isLockedOut, isVerifying]);

  const handleUnlock = useCallback(async () => {
    if (throttle.isLockedOut || isVerifying || enteredPin.length === 0) return;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const result = await unlock(enteredPin);
      if (result.success) {
        setEnteredPin('');
        onUnlocked?.();
      } else {
        setErrorMessage(result.error || 'Incorrect PIN.');
        setEnteredPin('');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [throttle.isLockedOut, isVerifying, enteredPin, unlock, onUnlocked]);

  // Support physical keyboard input (digits, Backspace, Escape, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showEmergencyModal) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        handleUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear, handleUnlock, showEmergencyModal]);

  // Emergency Restore from Backup handler
  const handleEmergencyFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setEmergencyFeedback('Validating backup file…');
      const text = await file.text();
      const validation = parseAndValidateBackup(text);

      if (!validation.ok) {
        setEmergencyFeedback(`Error: ${validation.error}`);
        return;
      }

      setEmergencyFeedback('Restoring database from backup…');
      await restoreBackup(validation.data, 'replace');
      await refreshPinConfig();

      setEmergencyFeedback('Backup restored successfully! Refreshing…');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setEmergencyFeedback('Failed to restore backup.');
    }
  };

  // Emergency Wipe Data handler
  const handleEmergencyWipe = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure you want to wipe all app data? This permanently deletes all transactions, debts, receipts, and removes the PIN lock.'
    );
    if (!confirmed) return;

    try {
      await db.delete();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch {
      alert('Could not wipe IndexedDB. Please clear site data in your browser settings.');
    }
  };

  // Keypad keys configuration
  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PIN Lock Screen"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 p-4 text-gray-100 backdrop-blur-md"
    >
      <div className="w-full max-w-sm space-y-6">
        {/* App Title & Lock Icon */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary border border-primary/30 text-3xl shadow-lg">
            🔒
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">App Locked</h1>
          <p className="text-sm text-gray-400">Enter your numeric PIN to continue</p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex justify-center items-center gap-3 py-2" aria-label="PIN digit indicator">
          {Array.from({ length: Math.max(4, enteredPin.length) }).map((_, idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                idx < enteredPin.length
                  ? 'bg-primary border-primary scale-110 shadow-sm shadow-primary/50'
                  : 'bg-transparent border-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Throttling or Error Banner */}
        {throttle.isLockedOut ? (
          <div
            role="alert"
            className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-center text-xs text-red-300 space-y-1 shadow-inner animate-pulse"
          >
            <p className="font-bold text-red-200">Too many failed attempts!</p>
            <p>
              Please wait{' '}
              <span className="font-mono text-sm font-bold text-white">
                {throttle.remainingSeconds}s
              </span>{' '}
              before trying again.
            </p>
          </div>
        ) : errorMessage ? (
          <div
            role="alert"
            className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-xl text-center text-xs text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        {/* Numeric Keypad Grid */}
        <div
          className="grid grid-cols-3 gap-2.5 select-none"
          role="group"
          aria-label="Numeric PIN keypad"
        >
          {keypadNumbers.map((num) => (
            <button
              key={num}
              type="button"
              disabled={throttle.isLockedOut || isVerifying}
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-gray-800/80 hover:bg-gray-700 active:bg-gray-600 border border-gray-700/60 text-2xl font-semibold text-white shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation"
              aria-label={`Digit ${num}`}
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            disabled={throttle.isLockedOut || isVerifying || enteredPin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-gray-800/40 hover:bg-gray-800 active:bg-gray-700 border border-gray-700/40 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation"
            aria-label="Clear PIN"
          >
            Clear
          </button>

          {/* Zero */}
          <button
            type="button"
            disabled={throttle.isLockedOut || isVerifying}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-gray-800/80 hover:bg-gray-700 active:bg-gray-600 border border-gray-700/60 text-2xl font-semibold text-white shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation"
            aria-label="Digit 0"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={throttle.isLockedOut || isVerifying || enteredPin.length === 0}
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-gray-800/40 hover:bg-gray-800 active:bg-gray-700 border border-gray-700/40 text-xl font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation"
            aria-label="Backspace"
          >
            ⌫
          </button>
        </div>

        {/* Unlock Action Button */}
        <Button
          type="button"
          variant="primary"
          onClick={handleUnlock}
          disabled={throttle.isLockedOut || isVerifying || enteredPin.length === 0}
          className="w-full py-3.5 text-base font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <span>Verifying…</span>
          ) : (
            <>
              <span>🔓</span>
              <span>Unlock</span>
            </>
          )}
        </Button>

        {/* Clear Note on Recovery */}
        <div className="pt-2 text-center space-y-2">
          <p className="text-xs text-gray-400 leading-relaxed px-2">
            <strong>Note:</strong> A forgotten PIN can only be reset by restoring from a backup or wiping the app data.
          </p>

          <button
            type="button"
            onClick={() => setShowEmergencyModal(true)}
            className="text-xs text-primary hover:text-primary/80 underline font-semibold min-h-[44px] px-2 py-1 inline-flex items-center"
          >
            Forgot PIN or need to reset?
          </button>
        </div>
      </div>

      {/* Emergency Recovery Modal */}
      {showEmergencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
        >
          <Card className="w-full max-w-sm bg-gray-800 text-gray-100 border border-gray-700 space-y-4 p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Reset PIN / Recovery</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEmergencyModal(false);
                  setEmergencyFeedback(null);
                }}
                className="text-gray-400 hover:text-white text-lg font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Because your PIN is cryptographically hashed with PBKDF2, it cannot be read or retrieved. To recover access:
            </p>

            {emergencyFeedback && (
              <div className="p-2.5 rounded-lg bg-blue-900/40 border border-blue-500/40 text-xs text-blue-200">
                {emergencyFeedback}
              </div>
            )}

            <div className="space-y-3 pt-1">
              {/* Option 1: Restore Backup */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleEmergencyFile}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>Restore from Backup File</span>
                </Button>
                <p className="text-[11px] text-gray-400 mt-1">
                  Replaces the database with your backup file, resetting or restoring its PIN setting.
                </p>
              </div>

              {/* Option 2: Wipe App Data */}
              <div className="pt-2 border-t border-gray-700">
                <Button
                  type="button"
                  onClick={handleEmergencyWipe}
                  className="w-full py-2.5 bg-red-600/80 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <span>🗑️</span>
                  <span>Wipe All App Data</span>
                </Button>
                <p className="text-[11px] text-gray-400 mt-1">
                  Clears all offline records and removes the PIN lock.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEmergencyModal(false);
                setEmergencyFeedback(null);
              }}
              className="w-full py-2 text-xs font-medium rounded-xl"
            >
              Back to Lock Screen
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

