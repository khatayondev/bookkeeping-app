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
          className={`p-3 rounded-lg text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
          }`}
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
      <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
            💾
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Create Backup
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {lastBackupAt
                ? `Last backup: ${formatTimestamp(lastBackupAt)}`
                : 'No backups recorded yet'}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300">
          Exports all transactions, categories, payment methods, debts, settings, and receipt photos into a single offline JSON file.
        </p>

        <Button
          onClick={handleExportBackup}
          disabled={isExporting}
          className="w-full min-h-[48px] py-3 bg-primary hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <span>📥</span>
          <span>{isExporting ? 'Generating Backup…' : 'Download Backup File'}</span>
        </Button>
      </Card>

      {/* ── Restore Section ────────────────────────── */}
      <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xl">
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
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-200">
                <span>📄 {selectedFileName}</span>
                <span className="text-[11px] bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded">
                  v{validatedBackup.schemaVersion}
                </span>
              </div>
              <p className="text-blue-800 dark:text-blue-300 font-mono">
                {backupSummary?.summaryText}
              </p>
              {validatedBackup.exportTimestamp && (
                <p className="text-blue-700 dark:text-blue-300 text-[11px]">
                  Created: {formatTimestamp(validatedBackup.exportTimestamp)}
                </p>
              )}
            </div>

            {/* Restore Mode Radio Options */}
            <div className="space-y-2 pt-1" role="radiogroup" aria-label="Restore options">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Restore Option
              </span>

              <label className="flex items-start gap-2.5 p-3 min-h-[48px] border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-gray-200 dark:border-gray-700">
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="mt-0.5 text-primary"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-gray-900 dark:text-gray-100">
                    Merge (Safe)
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    Keeps existing records; adds only new items that do not already exist.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 min-h-[48px] border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-gray-200 dark:border-gray-700">
                <input
                  type="radio"
                  name="restoreMode"
                  value="replace"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                  className="mt-0.5 text-red-600"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-red-700 dark:text-red-400">
                    Replace everything
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    Wipes existing database and replaces completely with this backup.
                  </span>
                </div>
              </label>
            </div>

            {/* Replace Confirmation Field */}
            {restoreMode === 'replace' && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-3 space-y-2">
                <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                  ⚠️ Warning: All current transactions and debts on this device will be erased!
                </p>
                <div>
                  <label
                    htmlFor="replaceConfirmInput"
                    className="block text-[11px] text-red-700 dark:text-red-400 font-bold mb-1"
                  >
                    Type REPLACE to confirm:
                  </label>
                  <input
                    id="replaceConfirmInput"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="REPLACE"
                    className="w-full px-2.5 py-2 min-h-[44px] text-xs border border-red-300 dark:border-red-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleCancelStage}
                className="flex-1 min-h-[44px] py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || !isReplaceConfirmed}
                className={`flex-1 min-h-[44px] py-2.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-all ${
                  restoreMode === 'replace'
                    ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                    : 'bg-primary hover:bg-blue-700 disabled:opacity-50'
                }`}
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

