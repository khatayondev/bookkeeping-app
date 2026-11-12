// src/lib/exportPdf.ts
import type { jsPDF } from 'jspdf';
import type { Category, PaymentMethod, Transaction } from '../db/db';
import { formatMoney } from './money';

export interface PdfExportOptions {
  transactions: Transaction[];
  categories?: Category[] | Map<string, string>;
  paymentMethods?: PaymentMethod[] | Map<string, string>;
  businessName?: string;
  periodLabel?: string;
}

interface CategorySummary {
  id: string;
  name: string;
  type: 'in' | 'out';
  count: number;
  totalPesewas: number;
  percentage: number;
}

function toCategoryMap(categories?: Category[] | Map<string, string>): Map<string, string> {
  if (!categories) return new Map();
  if (categories instanceof Map) return categories;
  const map = new Map<string, string>();
  for (const cat of categories) {
    map.set(cat.id, cat.name);
  }
  return map;
}

function toPaymentMethodMap(paymentMethods?: PaymentMethod[] | Map<string, string>): Map<string, string> {
  if (!paymentMethods) return new Map();
  if (paymentMethods instanceof Map) return paymentMethods;
  const map = new Map<string, string>();
  for (const m of paymentMethods) {
    map.set(m.id, m.name);
  }
  return map;
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
 * Computes category-level aggregation and shares.
 */
function computeCategoryBreakdown(
  transactions: Transaction[],
  catMap: Map<string, string>,
  totalInPesewas: number,
  totalOutPesewas: number
): CategorySummary[] {
  const map = new Map<string, { id: string; name: string; type: 'in' | 'out'; count: number; totalPesewas: number }>();

  for (const t of transactions) {
    const key = `${t.type}_${t.categoryId}`;
    const name = catMap.get(t.categoryId) ?? t.categoryId ?? 'Uncategorized';
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalPesewas += t.amountPesewas;
    } else {
      map.set(key, {
        id: t.categoryId,
        name,
        type: t.type,
        count: 1,
        totalPesewas: t.amountPesewas,
      });
    }
  }

  const result: CategorySummary[] = [];
  for (const item of map.values()) {
    const denominator = item.type === 'in' ? totalInPesewas : totalOutPesewas;
    const percentage = denominator > 0 ? (item.totalPesewas / denominator) * 100 : 0;
    result.push({
      ...item,
      percentage,
    });
  }

  // Sort: In first, then Out; then by totalPesewas descending
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'in' ? -1 : 1;
    return b.totalPesewas - a.totalPesewas;
  });
}

/**
 * Generates a client-side PDF report containing:
 * - Business name & header
 * - Reporting period
 * - Summary Totals (Total In, Total Out, Net Cashflow)
 * - Category Breakdown table
 * - Detailed Transactions table
 */
export async function generateTransactionsPdf(options: PdfExportOptions): Promise<Blob> {
  const {
    transactions,
    categories,
    paymentMethods,
    businessName = 'My Business',
    periodLabel = 'All Time',
  } = options;

  const catMap = toCategoryMap(categories);
  const pmMap = toPaymentMethodMap(paymentMethods);

  // Calculate totals in pesewas
  const totalInPesewas = transactions
    .filter((t) => t.type === 'in')
    .reduce((sum, t) => sum + t.amountPesewas, 0);

  const totalOutPesewas = transactions
    .filter((t) => t.type === 'out')
    .reduce((sum, t) => sum + t.amountPesewas, 0);

  const netPesewas = totalInPesewas - totalOutPesewas;

  // Dynamically load jsPDF and jspdf-autotable on demand to avoid impacting main bundle size
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableModule.default || autoTableModule) as unknown as (
    doc: jsPDF,
    options: Record<string, unknown>
  ) => void;

  // Initialize PDF (A4 portrait, mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // Primary #2563eb
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName || 'Bookkeeping Report', margin, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Financial Report & Transaction Statement', margin, 18);

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 12, { align: 'right' });
  doc.text(`Period: ${periodLabel}`, pageWidth - margin, 18, { align: 'right' });

  currentY = 36;

  // ── Summary Cards ─────────────────────────────────────────
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Overview', margin, currentY);
  currentY += 4;

  const cardWidth = (pageWidth - margin * 2 - 8) / 3;
  const cardHeight = 18;

  // Total In Card
  doc.setFillColor(240, 253, 244); // light green bg
  doc.setDrawColor(187, 247, 208); // green border
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('TOTAL MONEY IN', margin + 4, currentY + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(totalInPesewas), margin + 4, currentY + 13);

  // Total Out Card
  const outX = margin + cardWidth + 4;
  doc.setFillColor(254, 242, 242); // light red bg
  doc.setDrawColor(254, 202, 202); // red border
  doc.roundedRect(outX, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27); // red-800
  doc.text('TOTAL MONEY OUT', outX + 4, currentY + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(totalOutPesewas), outX + 4, currentY + 13);

  // Net Cashflow Card
  const netX = outX + cardWidth + 4;
  doc.setFillColor(239, 246, 255); // light blue bg
  doc.setDrawColor(191, 219, 254); // blue border
  doc.roundedRect(netX, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text('NET CASHFLOW', netX + 4, currentY + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(netPesewas), netX + 4, currentY + 13);

  currentY += cardHeight + 8;

  // ── Category Breakdown ────────────────────────────────────
  const categorySummaries = computeCategoryBreakdown(
    transactions,
    catMap,
    totalInPesewas,
    totalOutPesewas
  );

  if (categorySummaries.length > 0) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Breakdown', margin, currentY);
    currentY += 2;

    const catRows = categorySummaries.map((cat) => [
      cat.name,
      cat.type === 'in' ? 'Income' : 'Expense',
      cat.count.toString(),
      (cat.totalPesewas / 100).toFixed(2),
      `${cat.percentage.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Category', 'Type', 'Count', 'Total (GHS)', 'Share (%)']],
      body: catRows,
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105], // slate-600
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 24 },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 24, halign: 'right' },
      },
    });

    // Update currentY after table
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ── Detailed Transactions ─────────────────────────────────
  // If remaining space on page is small, start transactions on a new page
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = margin;
  }

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Transaction Details (${transactions.length})`, margin, currentY);
  currentY += 2;

  // Sort descending by date
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const txRows = sorted.map((t) => [
    formatDateToIso(t.date),
    t.type === 'in' ? 'In' : 'Out',
    catMap.get(t.categoryId) ?? t.categoryId ?? 'Uncategorized',
    t.description || '—',
    pmMap.get(t.paymentMethodId) ?? t.paymentMethodId ?? 'Unknown',
    (t.amountPesewas / 100).toFixed(2),
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 15 },
    head: [['Date', 'Type', 'Category', 'Description', 'Method', 'Amount (GHS)']],
    body: txRows.length > 0 ? txRows : [['—', '—', 'No transactions in this period', '—', '—', '0.00']],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Primary #2563eb
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 16 },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28 },
      5: { cellWidth: 28, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // ── Page Numbers in Footer ─────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Recods Bookkeeping • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}
