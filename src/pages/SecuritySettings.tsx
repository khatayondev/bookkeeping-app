// src/pages/SecuritySettings.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { usePinLock } from '../context/PinLockContext';
import { type AutoLockTimeout } from '../lib/pinAuth';

export default function SecuritySettings() {
  const {
    isPinSet,
    autoLockTimeout,
    updateAutoLockTimeout,
    setPin,
    changePin,
    removePin,
    lockApp,
    throttle,
  } = usePinLock();

  // Mode: 'idle' | 'set' | 'change' | 'remove'
  const [activeAction, setActiveAction] = useState<'idle' | 'set' | 'change' | 'remove'>('idle');

  // Form states
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setActiveAction('idle');
  };

  const validateNumericPin = (val: string): boolean => {
    return /^\d{4,8}$/.test(val);
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validateNumericPin(newPinInput)) {
      setFeedback({ type: 'error', message: 'PIN must be between 4 and 8 digits.' });
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setFeedback({ type: 'error', message: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await setPin(newPinInput);
      setFeedback({ type: 'success', message: 'PIN lock enabled successfully.' });
      resetForm();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to set PIN.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (throttle.isLockedOut) {
      setFeedback({
        type: 'error',
        message: `Too many failed attempts. Try again in ${throttle.remainingSeconds}s.`,
      });
      return;
    }

    if (!currentPinInput) {
      setFeedback({ type: 'error', message: 'Current PIN is required.' });
      return;
    }

    if (!validateNumericPin(newPinInput)) {
      setFeedback({ type: 'error', message: 'New PIN must be between 4 and 8 digits.' });
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setFeedback({ type: 'error', message: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await changePin(currentPinInput, newPinInput);
      if (res.success) {
        setFeedback({ type: 'success', message: 'PIN changed successfully.' });
        resetForm();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to change PIN.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error while changing PIN.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (throttle.isLockedOut) {
      setFeedback({
        type: 'error',
        message: `Too many failed attempts. Try again in ${throttle.remainingSeconds}s.`,
      });
      return;
    }

    if (!currentPinInput) {
      setFeedback({ type: 'error', message: 'Current PIN is required to remove lock.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await removePin(currentPinInput);
      if (res.success) {
        setFeedback({ type: 'success', message: 'PIN lock removed successfully.' });
        resetForm();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to remove PIN.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error while removing PIN.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeoutChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as AutoLockTimeout;
    try {
      await updateAutoLockTimeout(val);
      setFeedback({ type: 'success', message: 'Auto-lock timeout updated.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update auto-lock timeout.' });
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/more"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg"
            aria-label="Back to More"
          >
            ←
          </Link>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            PIN Lock & Security
          </h2>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          role="alert"
          className="p-3 rounded-xl text-xs flex items-center justify-between bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 font-medium"
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded opacity-70 hover:opacity-100"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* PIN Status Card */}
      <Card className="p-4 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
              🔒
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                App PIN Lock
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isPinSet ? 'Enabled with PBKDF2 hash' : 'Optional numeric lock'}
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              isPinSet
                ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700'
                : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {isPinSet ? 'Active' : 'Disabled'}
          </span>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          {isPinSet
            ? 'Your application is protected with a salted PBKDF2 hash. Locks on launch and when inactive in the background.'
            : 'Protect your sensitive bookkeeping data with a numeric PIN. Only a salted cryptographic hash is stored, never the PIN.'}
        </p>

        {/* Action Trigger Buttons */}
        {activeAction === 'idle' && (
          <div className="space-y-2 pt-2">
            {!isPinSet ? (
              <Button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setActiveAction('set');
                }}
                className="w-full min-h-[44px] py-2.5 text-xs font-semibold rounded-lg shadow-sm"
              >
                Set up PIN Lock
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFeedback(null);
                      setActiveAction('change');
                    }}
                    className="flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg"
                  >
                    Change PIN
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFeedback(null);
                      setActiveAction('remove');
                    }}
                    className="flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Remove PIN
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={lockApp}
                  className="w-full min-h-[44px] py-2.5 bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>🔒</span>
                  <span>Lock App Now</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Form: Set PIN */}
      {activeAction === 'set' && (
        <Card className="p-4 border border-primary/40 dark:border-primary/50 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Set New PIN
          </h3>
          <form onSubmit={handleSetPin} className="space-y-3">
            <Input
              id="set-new-pin"
              label="New PIN (4–8 digits)"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={8}
              required
              autoFocus
            />
            <Input
              id="set-confirm-pin"
              label="Confirm PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={8}
              required
            />

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newPinInput || !confirmPinInput}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg shadow-sm"
              >
                {isSubmitting ? 'Saving…' : 'Save PIN'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Form: Change PIN */}
      {activeAction === 'change' && (
        <Card className="p-4 border border-primary/40 dark:border-primary/50 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Change PIN
          </h3>
          <form onSubmit={handleChangePin} className="space-y-3">
            <Input
              id="change-current-pin"
              label="Current PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={8}
              required
              autoFocus
            />
            <Input
              id="change-new-pin"
              label="New PIN (4–8 digits)"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={8}
              required
            />
            <Input
              id="change-confirm-pin"
              label="Confirm New PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={8}
              required
            />

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !currentPinInput || !newPinInput || !confirmPinInput}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg shadow-sm"
              >
                {isSubmitting ? 'Updating…' : 'Update PIN'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Form: Remove PIN */}
      {activeAction === 'remove' && (
        <Card className="p-4 border border-neutral-300 dark:border-neutral-700 space-y-3">
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
            Remove PIN Lock
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            To remove PIN protection, please enter your current PIN.
          </p>
          <form onSubmit={handleRemovePin} className="space-y-3">
            <Input
              id="remove-current-pin"
              label="Current PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={8}
              required
              autoFocus
            />

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !currentPinInput}
                className="flex-1 min-h-[44px] py-2.5 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold rounded-lg shadow-sm"
              >
                {isSubmitting ? 'Removing…' : 'Confirm & Remove'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Auto-lock Timeout Configuration Card */}
      {isPinSet && (
        <Card className="p-4 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⏱️</span>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                Auto-lock in Background
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Lock app after being minimized or switching tabs
              </p>
            </div>
          </div>

          <Select
            id="auto-lock-timeout-select"
            label="Lock after"
            value={autoLockTimeout}
            onChange={handleTimeoutChange}
            options={[
              { value: 'immediately', label: 'Immediately' },
              { value: '1min', label: '1 minute (60 seconds)' },
              { value: '5min', label: '5 minutes' },
              { value: 'never', label: 'Never (launch only)' },
            ]}
          />
        </Card>
      )}

      {/* Important Security Notice Card */}
      <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-900 dark:text-neutral-200">
        <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
          <span>⚠️</span>
          <span>Important Notice</span>
        </div>
        <p className="leading-relaxed">
          <strong>Note:</strong> A forgotten PIN can only be reset by restoring from a backup or wiping the app data.
        </p>
        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-normal">
          For your privacy and security, Bookkeeping stores only a cryptographically salted PBKDF2 hash using Web Crypto. The PIN itself is never saved or transmitted.
        </p>
      </div>
    </div>
  );
}
