// src/lib/exportPdf.test.ts
import { describe, it, expect } from 'vitest';
import { generateTransactionsPdf } from './exportPdf';
import type { Category, PaymentMethod, Transaction } from '../db/db';

describe('exportPdf', () => {
  const mockCategories: Category[] = [
    { id: 'cat-sales', name: 'Sales', type: 'in', isDefault: true, isArchived: false },
    { id: 'cat-inventory', name: 'Inventory Purchases', type: 'out', isDefault: false, isArchived: false },
  ];

  const mockPaymentMethods: PaymentMethod[] = [
    { id: 'pm-cash', name: 'Cash', openingBalancePesewas: 0, isArchived: false },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: new Date('2026-10-15T10:00:00Z'),
      amountPesewas: 100000, // 1,000.00 GHS
      type: 'in',
      categoryId: 'cat-sales',
      paymentMethodId: 'pm-cash',
      description: 'Daily revenue',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'tx-2',
      date: new Date('2026-10-16T14:30:00Z'),
      amountPesewas: 40000, // 400.00 GHS
      type: 'out',
      categoryId: 'cat-inventory',
      paymentMethodId: 'pm-cash',
      description: 'Stock restock',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('generates a valid PDF blob with given transactions', async () => {
    const blob = await generateTransactionsPdf({
      transactions: mockTransactions,
      categories: mockCategories,
      paymentMethods: mockPaymentMethods,
      businessName: 'Kofi Wholesale Mart',
      periodLabel: 'October 2026',
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('handles empty transaction lists gracefully', async () => {
    const blob = await generateTransactionsPdf({
      transactions: [],
      categories: mockCategories,
      paymentMethods: mockPaymentMethods,
      businessName: 'Empty Store',
      periodLabel: 'This Month',
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
  });
});

