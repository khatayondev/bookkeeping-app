// src/pages/Export.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { getSetting, setSetting } from '../db/queries';
import { formatMoney } from '../lib/money';
import { today, startOfMonth, endOfMonth } from '../lib/dates';
import { generateTransactionsCsv, createCsvBlob } from '../lib/exportCsv';
import { generateTransactionsPdf } from '../lib/exportPdf';
import { shareOrDownloadFile } from '../lib/fileDelivery';

export type RangePreset = 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom';

function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Export() {
  const categories = useCategories(true); // include archived so historical references resolve
  const paymentMethods = usePaymentMethods(true);

  const [businessName, setBusinessName] = useState<string>('My Business');
  const [preset, setPreset] = useState<RangePreset>('this_month');
  const [customStart, setCustomStart] = useState<string>(() => formatIsoDate(startOfMonth(today())));
  const [customEnd, setCustomEnd] = useState<string>(() => formatIsoDate(endOfMonth(today())));
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load business name from settings
  useEffect(() => {
    let active = true;
    getSetting('businessName').then((val) => {
      if (active && typeof val === 'string' && val.trim().length > 0) {
        setBusinessName(val);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusinessName(val);
    setSetting('businessName', val);
  };

  // Determine active date boundary
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = today();

    if (preset === 'this_month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const label = now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      return { startDate: start, endDate: end, periodLabel: `This Month (${label})` };
    }

    if (preset === 'last_month') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = startOfMonth(prevMonthDate);
      const end = endOfMonth(prevMonthDate);
      const label = prevMonthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      return { startDate: start, endDate: end, periodLabel: `Last Month (${label})` };
    }

    if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate: start, endDate: end, periodLabel: `This Year (${now.getFullYear()})` };
    }

    if (preset === 'all_time') {
      return { startDate: null, endDate: null, periodLabel: 'All Time' };
    }

    // Custom
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T23:59:59.999`) : null;
    const label = `${customStart || 'Start'} to ${customEnd || 'End'}`;
    return { startDate: start, endDate: end, periodLabel: label };
  }, [preset, customStart, customEnd]);

  const txFilters = useMemo(
    () => ({
      dateFrom: startDate || undefined,
      dateTo: endDate || undefined,
    }),
    [startDate, endDate]
  );
  const transactions = useTransactions(txFilters);

  // Filter transactions
  const filteredTransactions = useMemo(() => transactions ?? [], [transactions]);

  // Compute totals matching dashboard calculations
  const totalInPesewas = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'in')
      .reduce((sum, t) => sum + t.amountPesewas, 0);
  }, [filteredTransactions]);

  const totalOutPesewas = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'out')
      .reduce((sum, t) => sum + t.amountPesewas, 0);
  }, [filteredTransactions]);

  const netCashPesewas = totalInPesewas - totalOutPesewas;

  // CSV Export handler
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      setFeedback(null);

      const csvString = generateTransactionsCsv({
        transactions: filteredTransactions,
        categories: categories ?? [],
        paymentMethods: paymentMethods ?? [],
      });

      const blob = createCsvBlob(csvString);
      const fileSlug = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `transactions-${fileSlug}-${formatIsoDate(new Date())}.csv`;

      const result = await shareOrDownloadFile({
        blob,
        filename,
        mimeType: 'text/csv;charset=utf-8;',
        title: `${businessName} Transactions - ${periodLabel}`,
        text: `Exported ${filteredTransactions.length} transactions for ${periodLabel}`,
      });

      if (result === 'shared') {
        setFeedback({ type: 'success', message: 'CSV file shared successfully!' });
      } else if (result === 'downloaded') {
        setFeedback({ type: 'success', message: `Downloaded ${filename}` });
      }
    } catch (err: unknown) {
      console.error('CSV export failed:', err);
      setFeedback({ type: 'error', message: 'Failed to generate CSV file. Please try again.' });
    } finally {
      setIsExportingCsv(false);
    }
  };

  // PDF Export handler
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setFeedback(null);

      const blob = await generateTransactionsPdf({
        transactions: filteredTransactions,
        categories: categories ?? [],
        paymentMethods: paymentMethods ?? [],
        businessName: businessName.trim() || 'Bookkeeping',
        periodLabel,
      });

      const fileSlug = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `report-${fileSlug}-${formatIsoDate(new Date())}.pdf`;

      const result = await shareOrDownloadFile({
        blob,
        filename,
        mimeType: 'application/pdf',
        title: `${businessName} Financial Report - ${periodLabel}`,
        text: `Financial statement and transactions for ${periodLabel}`,
      });

      if (result === 'shared') {
        setFeedback({ type: 'success', message: 'PDF report shared successfully!' });
      } else if (result === 'downloaded') {
        setFeedback({ type: 'success', message: `Downloaded ${filename}` });
      }
    } catch (err: unknown) {
      console.error('PDF export failed:', err);
      setFeedback({ type: 'error', message: 'Failed to generate PDF report. Please try again.' });
    } finally {
      setIsExportingPdf(false);
    }
  };

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
            Export Data
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

      {/* ── Business Settings ──────────────────────── */}
      <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-2">
        <label
          htmlFor="businessNameInput"
          className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
        >
          Business Name (for PDF Reports)
        </label>
        <input
          id="businessNameInput"
          type="text"
          value={businessName}
          onChange={handleBusinessNameChange}
          placeholder="e.g. Ama Wholesale Mart"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </Card>

      {/* ── Date Range Selector ────────────────────── */}
      <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          Date Range
        </span>

        {/* Presets */}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Date range presets">
          {(
            [
              { key: 'this_month', label: 'This Month' },
              { key: 'last_month', label: 'Last Month' },
              { key: 'this_year', label: 'This Year' },
              { key: 'all_time', label: 'All Time' },
              { key: 'custom', label: 'Custom' },
            ] as const
          ).map((item) => {
            const isSelected = preset === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPreset(item.key)}
                className={`min-h-[44px] py-2 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Custom date range pickers */}
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label
                htmlFor="customStartDate"
                className="block text-[11px] text-gray-600 dark:text-gray-300 mb-1 font-medium"
              >
                From
              </label>
              <input
                id="customStartDate"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full min-h-[44px] text-xs px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label
                htmlFor="customEndDate"
                className="block text-[11px] text-gray-600 dark:text-gray-300 mb-1 font-medium"
              >
                To
              </label>
              <input
                id="customEndDate"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full min-h-[44px] text-xs px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Period Summary Preview (Matches Dashboard) ── */}
      <div className="rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white p-4 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
            Period Summary
          </span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
            {filteredTransactions.length}{' '}
            {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
          </span>
        </div>

        <div className="text-2xl font-bold font-mono mb-3">
          {formatMoney(netCashPesewas)}
          <span className="text-xs font-normal text-blue-200 ml-2">Net Cashflow</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/40 text-xs">
          <div>
            <span className="text-blue-200 block">Total In</span>
            <span className="font-semibold font-mono text-sm">
              {formatMoney(totalInPesewas)}
            </span>
          </div>
          <div>
            <span className="text-blue-200 block">Total Out</span>
            <span className="font-semibold font-mono text-sm">
              {formatMoney(totalOutPesewas)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Export Action Buttons ──────────────────── */}
      <div className="space-y-3 pt-2">
        {/* CSV Button */}
        <Button
          onClick={handleExportCsv}
          disabled={isExportingCsv || isExportingPdf}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span className="text-lg">📊</span>
          <span>{isExportingCsv ? 'Generating CSV…' : 'Export CSV (Excel Ready)'}</span>
        </Button>
        <p className="text-[11px] text-center text-gray-500 dark:text-gray-400">
          Formatted as UTF-8 with BOM for instant opening in Microsoft Excel or Google Sheets.
        </p>

        {/* PDF Button */}
        <Button
          onClick={handleExportPdf}
          disabled={isExportingCsv || isExportingPdf}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <span className="text-lg">📄</span>
          <span>{isExportingPdf ? 'Generating PDF…' : 'Export PDF Report'}</span>
        </Button>
        <p className="text-[11px] text-center text-gray-500 dark:text-gray-400">
          Includes business header, summary totals, category breakdown, and full transaction ledger.
        </p>
      </div>
    </div>
  );
}

