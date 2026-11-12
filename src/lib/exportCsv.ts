// src/lib/exportCsv.ts
import type { Category, PaymentMethod, Transaction } from '../db/db';

export interface CsvExportOptions {
  transactions: Transaction[];
  categories?: Category[] | Map<string, string>;
  paymentMethods?: PaymentMethod[] | Map<string, string>;
}

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateToIso(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds a category name lookup map from an array or Map.
 */
function toCategoryMap(categories?: Category[] | Map<string, string>): Map<string, string> {
  if (!categories) return new Map();
  if (categories instanceof Map) return categories;
  const map = new Map<string, string>();
  for (const cat of categories) {
    map.set(cat.id, cat.name);
  }
  return map;
}

/**
 * Builds a payment method name lookup map from an array or Map.
 */
function toPaymentMethodMap(paymentMethods?: PaymentMethod[] | Map<string, string>): Map<string, string> {
  if (!paymentMethods) return new Map();
  if (paymentMethods instanceof Map) return paymentMethods;
  const map = new Map<string, string>();
  for (const m of paymentMethods) {
    map.set(m.id, m.name);
  }
  return map;
}

/**
 * Generates a UTF-8 CSV string with BOM for transactions.
 * Columns: Date, Type, Category, Description, Payment Method, Amount (GHS)
 * Amount is in GHS with 2 decimal places.
 */
export function generateTransactionsCsv(options: CsvExportOptions): string {
  const { transactions, categories, paymentMethods } = options;
  const catMap = toCategoryMap(categories);
  const pmMap = toPaymentMethodMap(paymentMethods);

  // UTF-8 BOM so Microsoft Excel automatically recognizes UTF-8 encoding
  const BOM = '\uFEFF';
  const headers = ['Date', 'Type', 'Category', 'Description', 'Payment Method', 'Amount (GHS)'];
  const lines: string[] = [headers.join(',')];

  // Sort transactions chronologically or by date descending
  // Default to sorted by date descending (newest first)
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const t of sorted) {
    const dateStr = formatDateToIso(t.date);
    const typeStr = t.type === 'in' ? 'In' : 'Out';
    const categoryName = catMap.get(t.categoryId) ?? t.categoryId ?? 'Uncategorized';
    const description = t.description ?? '';
    const paymentMethodName = pmMap.get(t.paymentMethodId) ?? t.paymentMethodId ?? 'Unknown';
    const amountGhs = (t.amountPesewas / 100).toFixed(2);

    const row = [
      escapeCsvCell(dateStr),
      escapeCsvCell(typeStr),
      escapeCsvCell(categoryName),
      escapeCsvCell(description),
      escapeCsvCell(paymentMethodName),
      escapeCsvCell(amountGhs),
    ];
    lines.push(row.join(','));
  }

  return BOM + lines.join('\r\n');
}

/**
 * Creates a Blob suitable for file download/sharing from the CSV string.
 */
export function createCsvBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

