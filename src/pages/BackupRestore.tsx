// src/pages/BackupRestore.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getSetting } from '../db/queries';
import {
  exportBackupFile,
  parseAndValidateBackup,
  restoreBackup,
  type BackupData,
  type BackupSummary,
  type RestoreMode,
} from '../lib/backupRestore';
import { shareOrDownloadFile } from '../lib/fileDelivery';

export default function BackupRestore() {
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Staged restore state
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [validatedBackup, setValidatedBackup] = useState<BackupData | null>(null);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [confirmText, setConfirmText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLastBackup = () => {
    getSetting('lastBackupAt').then((val) => {
      if (typeof val === 'string') {
        setLastBackupAt(val);
      }
    });
  };

  useEffect(() => {
    loadLastBackup();
  }, []);

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setFeedback(null);

      const { filename, blob } = await exportBackupFile();

      const result = await shareOrDownloadFile({
        blob,
        filename,
        mimeType: 'application/json',
        title: 'Bookkeeping Backup',
        text: `Bookkeeping backup created on ${new Date().toLocaleDateString()}`,
      });

      loadLastBackup();

      if (result === 'shared') {
        setFeedback({ type: 'success', message: 'Backup file shared successfully!' });
      } else {
        setFeedback({ type: 'success', message: `Backup saved: ${filename}` });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to create backup. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedback(null);
    setSelectedFileName(file.name);
    setConfirmText('');

    try {
      const text = await file.text();
      const validation = parseAndValidateBackup(text);

      if (!validation.ok) {
        setValidatedBackup(null);
        setBackupSummary(null);
        setFeedback({ type: 'error', message: validation.error });
        return;
      }

      setValidatedBackup(validation.data);
      setBackupSummary(validation.summary);
    } catch {
      setValidatedBackup(null);
      setBackupSummary(null);
      setFeedback({ type: 'error', message: 'Could not read the selected backup file.' });
    }
  };

  const handleExecuteRestore = async () => {
    if (!validatedBackup) return;

    if (restoreMode === 'replace' && confirmText.trim() !== 'REPLACE') {
      setFeedback({ type: 'error', message: 'Please type REPLACE to confirm full replacement.' });
      return;
    }

    try {
      setIsRestoring(true);
      setFeedback(null);

      const result = await restoreBackup(validatedBackup, restoreMode);

      setFeedback({
        type: 'success',
        message: `Restore complete! Successfully restored ${result.restoredTransactions.toLocaleString()} transactions and ${result.restoredDebts.toLocaleString()} debts.`,
      });

      // Clear staged state
      setValidatedBackup(null);
      setBackupSummary(null);
      setSelectedFileName(null);
      setConfirmText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadLastBackup();
    } catch {
      setFeedback({
        type: 'error',
        message: 'Restore failed. All existing data was safely preserved.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelStage = () => {
    setValidatedBackup(null);
    setBackupSummary(null);
    setSelectedFileName(null);
    setConfirmText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isReplaceConfirmed = restoreMode === 'merge' || confirmText.trim() === 'REPLACE';

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* ── Page Header ────────────────────────────── */}
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
            Backup & Restore
          </h2>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className="p-3 rounded-xl text-sm flex items-center justify-between bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 font-medium"
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded opacity-70 hover:opacity-100"
            aria-label="Dismiss feedback"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Backup Section ─────────────────────────── */}
      <Card className="p-4 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
            💾
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Create Backup
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              {lastBackupAt
                ? `Last backup: ${formatTimestamp(lastBackupAt)}`
                : 'No backups recorded yet'}
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-300">
          Exports all transactions, categories, payment methods, debts, settings, and receipt photos into a single offline JSON file.
        </p>

        <Button
          onClick={handleExportBackup}
          disabled={isExporting}
          className="w-full min-h-[48px] py-3 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span>📥</span>
          <span>{isExporting ? 'Generating Backup…' : 'Download Backup File'}</span>
        </Button>
      </Card>

      {/* ── Restore Section ────────────────────────── */}
      <Card className="p-4 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold text-xl border border-neutral-200 dark:border-neutral-700">
            🔄
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Restore from Backup
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Load a previously exported backup file
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          id="backupFileInput"
          aria-label="Upload backup JSON file"
        />

        {!validatedBackup ? (
          <div>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[48px] py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-sm border border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <span>📂</span>
              <span>Select Backup JSON File</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Validated file summary card */}
            <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-neutral-900 dark:text-neutral-100">
                <span>📄 {selectedFileName}</span>
                <span className="text-[11px] bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 rounded">
                  v{validatedBackup.schemaVersion}
                </span>
              </div>
              <p className="text-neutral-800 dark:text-neutral-200 font-mono">
                {backupSummary?.summaryText}
              </p>
              {validatedBackup.exportTimestamp && (
                <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                  Created: {formatTimestamp(validatedBackup.exportTimestamp)}
                </p>
              )}
            </div>

            {/* Restore Mode Radio Options */}
            <div className="space-y-2 pt-1" role="radiogroup" aria-label="Restore options">
              <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Restore Option
              </span>

              <label className="flex items-start gap-2.5 p-3 min-h-[48px] border rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-neutral-200 dark:border-neutral-700">
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="mt-0.5 text-black dark:text-white"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-neutral-900 dark:text-neutral-100">
                    Merge (Safe)
                  </span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    Keeps existing records; adds only new items that do not already exist.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 min-h-[48px] border rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-neutral-200 dark:border-neutral-700">
                <input
                  type="radio"
                  name="restoreMode"
                  value="replace"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                  className="mt-0.5 text-black dark:text-white"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-neutral-900 dark:text-neutral-100">
                    Replace everything
                  </span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    Wipes existing database and replaces completely with this backup.
                  </span>
                </div>
              </label>
            </div>

            {/* Replace Confirmation Field */}
            {restoreMode === 'replace' && (
              <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 space-y-2">
                <p className="text-xs text-neutral-900 dark:text-neutral-100 font-medium">
                  ⚠️ Warning: All current transactions and debts on this device will be erased!
                </p>
                <div>
                  <label
                    htmlFor="replaceConfirmInput"
                    className="block text-[11px] text-neutral-700 dark:text-neutral-300 font-bold mb-1"
                  >
                    Type REPLACE to confirm:
                  </label>
                  <input
                    id="replaceConfirmInput"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="REPLACE"
                    className="w-full px-2.5 py-2 min-h-[44px] text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleCancelStage}
                className="flex-1 min-h-[44px] py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || !isReplaceConfirmed}
                className="flex-1 min-h-[44px] py-2.5 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {isRestoring
                  ? 'Restoring…'
                  : restoreMode === 'replace'
                    ? 'Confirm & Replace All'
                    : 'Merge Backup'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

