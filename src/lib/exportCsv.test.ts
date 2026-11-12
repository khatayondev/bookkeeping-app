// src/lib/exportCsv.test.ts
import { describe, it, expect } from 'vitest';
import { generateTransactionsCsv, createCsvBlob } from './exportCsv';
import type { Category, PaymentMethod, Transaction } from '../db/db';

describe('exportCsv', () => {
  const mockCategories: Category[] = [
    { id: 'cat-sales', name: 'Product Sales', type: 'in', isDefault: true, isArchived: false },
    { id: 'cat-rent', name: 'Shop Rent & Utilities', type: 'out', isDefault: false, isArchived: false },
  ];

  const mockPaymentMethods: PaymentMethod[] = [
    { id: 'pm-cash', name: 'Cash in Hand', openingBalancePesewas: 0, isArchived: false },
    { id: 'pm-momo', name: 'MTN Mobile Money', openingBalancePesewas: 0, isArchived: false },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: new Date('2026-10-15T10:00:00Z'),
      amountPesewas: 150050, // 1500.50 GHS
      type: 'in',
      categoryId: 'cat-sales',
      paymentMethodId: 'pm-momo',
      description: 'Sold 3 bags of rice',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'tx-2',
      date: new Date('2026-10-16T14:30:00Z'),
      amountPesewas: 50000, // 500.00 GHS
      type: 'out',
      categoryId: 'cat-rent',
      paymentMethodId: 'pm-cash',
      description: 'Paid shop electricity, water & repairs',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'tx-3',
      date: new Date('2026-10-17T09:15:00Z'),
      amountPesewas: 25, // 0.25 GHS
      type: 'in',
      categoryId: 'cat-sales',
      paymentMethodId: 'pm-cash',
      description: 'Candy "sweet" sale',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('starts with UTF-8 BOM byte sequence', () => {
    const csv = generateTransactionsCsv({
      transactions: [],
      categories: mockCategories,
      paymentMethods: mockPaymentMethods,
    });
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('includes proper header columns', () => {
    const csv = generateTransactionsCsv({
      transactions: [],
      categories: mockCategories,
      paymentMethods: mockPaymentMethods,
    });
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Description,Payment Method,Amount (GHS)');
  });

  it('formats amounts in GHS with 2 decimal places and resolves names', () => {
    const csv = generateTransactionsCsv({
      transactions: mockTransactions,
      categories: mockCategories,
      paymentMethods: mockPaymentMethods,
    });

    // Check rows exist
    expect(csv).toContain('1500.50');
    expect(csv).toContain('500.00');
    expect(csv).toContain('0.25');

    // Check names resolved
    expect(csv).toContain('Product Sales');
    expect(csv).toContain('Shop Rent & Utilities');
    expect(csv).toContain('MTN Mobile Money');
    expect(csv).toContain('Cash in Hand');
  });

  it('escapes quotes and cells with commas', () => {
    const csv = generateTransactionsCsv({
      transactions: mockTransactions,
      categories: mockCategories,
      paymentMethods: mockPaymentMethods,
    });

    // Cell containing comma must be wrapped in quotes
    expect(csv).toContain('"Paid shop electricity, water & repairs"');
    // Cell containing quotes must have double quotes
    expect(csv).toContain('"Candy ""sweet"" sale"');
  });

  it('handles empty descriptions and unknown categories/methods gracefully', () => {
    const orphanTx: Transaction = {
      id: 'tx-orphan',
      date: new Date('2026-11-01'),
      amountPesewas: 1000,
      type: 'in',
      categoryId: 'missing-cat',
      paymentMethodId: 'missing-pm',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const csv = generateTransactionsCsv({
      transactions: [orphanTx],
      categories: [],
      paymentMethods: [],
    });

    expect(csv).toContain('missing-cat');
    expect(csv).toContain('missing-pm');
    expect(csv).toContain('10.00');
  });

  it('creates a valid text/csv Blob', () => {
    const csv = generateTransactionsCsv({ transactions: [] });
    const blob = createCsvBlob(csv);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });
});

