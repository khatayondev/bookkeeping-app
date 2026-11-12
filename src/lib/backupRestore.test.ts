// src/lib/backupRestore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, type Category, type Debt, type PaymentMethod, type Receipt, type Setting, type Transaction } from '../db/db';
import {
  exportBackupFile,
  parseAndValidateBackup,
  restoreBackup,
  BACKUP_SCHEMA_VERSION,
  type BackupData,
} from './backupRestore';

describe('backupRestore', () => {
  beforeEach(async () => {
    // Clear all tables for a predictable starting state
    await Promise.all([
      db.transactions.clear(),
      db.categories.clear(),
      db.paymentMethods.clear(),
      db.debts.clear(),
      db.receipts.clear(),
      db.settings.clear(),
    ]);
  });

  it('performs a complete round-trip export and restore with identical data', async () => {
    const testCategory: Category = {
      id: 'cat-sales',
      name: 'Retail Sales',
      type: 'in',
      isDefault: true,
      isArchived: false,
    };
    const testPaymentMethod: PaymentMethod = {
      id: 'pm-momo',
      name: 'MTN Mobile Money',
      openingBalancePesewas: 50000,
      isArchived: false,
    };
    const testReceiptBlob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: 'image/png',
    });
    const testReceipt: Receipt = {
      id: 'receipt-101',
      blob: testReceiptBlob,
      mimeType: 'image/png',
      createdAt: new Date('2026-10-01T12:00:00Z'),
    };
    const testDebt: Debt = {
      id: 'debt-201',
      kind: 'owed_to_me',
      personName: 'Kwame Mensah',
      phone: '0244123456',
      amountPesewas: 35000,
      paidPesewas: 10000,
      dueDate: new Date('2026-12-01T00:00:00Z'),
      note: 'Supplied wholesale rice',
      status: 'open',
      createdAt: new Date('2026-10-02T10:00:00Z'),
      updatedAt: new Date('2026-10-02T10:00:00Z'),
    };
    const testTransaction: Transaction = {
      id: 'tx-301',
      date: new Date('2026-10-03T09:30:00Z'),
      amountPesewas: 25000,
      type: 'in',
      categoryId: testCategory.id,
      paymentMethodId: testPaymentMethod.id,
      debtId: testDebt.id,
      receiptId: testReceipt.id,
      description: 'Customer deposit',
      createdAt: new Date('2026-10-03T09:30:00Z'),
      updatedAt: new Date('2026-10-03T09:30:00Z'),
    };
    const testSetting: Setting = {
      key: 'businessName',
      value: 'Mensah Trading Store',
    };

    // Populate database
    await db.categories.add(testCategory);
    await db.paymentMethods.add(testPaymentMethod);
    await db.receipts.add(testReceipt);
    await db.debts.add(testDebt);
    await db.transactions.add(testTransaction);
    await db.settings.put(testSetting);

    // 1. Export backup file
    const { filename, blob } = await exportBackupFile();
    expect(filename).toMatch(/^bookkeeping-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(blob).toBeInstanceOf(Blob);

    // Check lastBackupAt was saved in settings
    const lastBackupSetting = await db.settings.get('lastBackupAt');
    expect(lastBackupSetting).toBeDefined();
    expect(typeof lastBackupSetting?.value).toBe('string');

    // Read exported JSON string
    const jsonString = await blob.text();
    const validation = parseAndValidateBackup(jsonString);
    expect(validation.ok).toBe(true);

    if (!validation.ok) return;

    // Summary checks
    expect(validation.summary.transactionCount).toBe(1);
    expect(validation.summary.debtCount).toBe(1);
    expect(validation.summary.receiptCount).toBe(1);
    expect(validation.summary.summaryText).toContain('1 transactions, 1 debts');

    // 2. Clear entire database to simulate a clean/new device
    await Promise.all([
      db.transactions.clear(),
      db.categories.clear(),
      db.paymentMethods.clear(),
      db.debts.clear(),
      db.receipts.clear(),
      db.settings.clear(),
    ]);

    expect(await db.transactions.count()).toBe(0);
    expect(await db.debts.count()).toBe(0);
    expect(await db.receipts.count()).toBe(0);

    // 3. Restore data in replace mode
    const restoreResult = await restoreBackup(validation.data, 'replace');
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.restoredTransactions).toBe(1);
    expect(restoreResult.restoredDebts).toBe(1);

    // 4. Verify restored data matches original completely
    const restoredTx = await db.transactions.get('tx-301');
    expect(restoredTx).toBeDefined();
    expect(restoredTx?.amountPesewas).toBe(25000);
    expect(restoredTx?.type).toBe('in');
    expect(restoredTx?.description).toBe('Customer deposit');
    expect(restoredTx?.date).toBeInstanceOf(Date);
    expect(restoredTx?.date.getTime()).toBe(testTransaction.date.getTime());

    const restoredDebt = await db.debts.get('debt-201');
    expect(restoredDebt).toBeDefined();
    expect(restoredDebt?.personName).toBe('Kwame Mensah');
    expect(restoredDebt?.amountPesewas).toBe(35000);
    expect(restoredDebt?.paidPesewas).toBe(10000);
    expect(restoredDebt?.dueDate).toBeInstanceOf(Date);
    expect(restoredDebt?.dueDate?.getTime()).toBe(testDebt.dueDate?.getTime());

    const restoredReceipt = await db.receipts.get('receipt-101');
    expect(restoredReceipt).toBeDefined();
    expect(restoredReceipt?.mimeType).toBe('image/png');
    expect(restoredReceipt?.blob).toBeInstanceOf(Blob);
    expect(restoredReceipt?.blob.size).toBe(testReceiptBlob.size);

    const restoredBytes = new Uint8Array(await restoredReceipt!.blob.arrayBuffer());
    const originalBytes = new Uint8Array(await testReceiptBlob.arrayBuffer());
    expect(restoredBytes).toEqual(originalBytes);

    const restoredCat = await db.categories.get('cat-sales');
    expect(restoredCat?.name).toBe('Retail Sales');

    const restoredPm = await db.paymentMethods.get('pm-momo');
    expect(restoredPm?.openingBalancePesewas).toBe(50000);

    const restoredSetting = await db.settings.get('businessName');
    expect(restoredSetting?.value).toBe('Mensah Trading Store');
  });

  it('rejects corrupt or invalid JSON files gracefully', () => {
    const notJson = parseAndValidateBackup('invalid { json string');
    expect(notJson.ok).toBe(false);
    if (!notJson.ok) {
      expect(notJson.error).toContain('File is not valid JSON');
    }

    const primitiveJson = parseAndValidateBackup('"just a string"');
    expect(primitiveJson.ok).toBe(false);

    const missingArrays = parseAndValidateBackup(
      JSON.stringify({
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportTimestamp: new Date().toISOString(),
        transactions: 'not an array',
      })
    );
    expect(missingArrays.ok).toBe(false);
    if (!missingArrays.ok) {
      expect(missingArrays.error).toContain('Invalid backup structure');
    }
  });

  it('rejects unsupported or wrong schemaVersion', () => {
    const wrongVersion = parseAndValidateBackup(
      JSON.stringify({
        schemaVersion: 999,
        exportTimestamp: new Date().toISOString(),
        transactions: [],
        categories: [],
        paymentMethods: [],
        debts: [],
        receipts: [],
      })
    );
    expect(wrongVersion.ok).toBe(false);
    if (!wrongVersion.ok) {
      expect(wrongVersion.error).toContain('Unsupported schema version');
      expect(wrongVersion.error).toContain('expected 1, got 999');
    }

    const missingVersion = parseAndValidateBackup(
      JSON.stringify({
        exportTimestamp: new Date().toISOString(),
        transactions: [],
        categories: [],
        paymentMethods: [],
        debts: [],
        receipts: [],
      })
    );
    expect(missingVersion.ok).toBe(false);
    if (!missingVersion.ok) {
      expect(missingVersion.error).toContain('missing schemaVersion');
    }
  });

  it('supports merge mode without overwriting existing IDs', async () => {
    // Existing database item
    await db.transactions.add({
      id: 'tx-existing',
      date: new Date('2026-10-01'),
      amountPesewas: 10000,
      type: 'in',
      categoryId: 'cat-1',
      paymentMethodId: 'pm-1',
      description: 'Existing item (do not change)',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const backupData: BackupData = {
      schemaVersion: 1,
      exportTimestamp: new Date().toISOString(),
      transactions: [
        {
          id: 'tx-existing', // Duplicate ID
          date: new Date('2026-10-01').toISOString(),
          amountPesewas: 999999, // Modified amount that should be skipped
          type: 'in',
          categoryId: 'cat-1',
          paymentMethodId: 'pm-1',
          description: 'Hacked version',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'tx-new', // New ID
          date: new Date('2026-10-02').toISOString(),
          amountPesewas: 20000,
          type: 'out',
          categoryId: 'cat-2',
          paymentMethodId: 'pm-1',
          description: 'New item to be added',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      categories: [],
      paymentMethods: [],
      debts: [],
      receipts: [],
      settings: [],
    };

    await restoreBackup(backupData, 'merge');

    const txExisting = await db.transactions.get('tx-existing');
    expect(txExisting?.amountPesewas).toBe(10000); // Unchanged!
    expect(txExisting?.description).toBe('Existing item (do not change)');

    const txNew = await db.transactions.get('tx-new');
    expect(txNew).toBeDefined();
    expect(txNew?.amountPesewas).toBe(20000);
  });

  it('rolls back atomically so a restore failure leaves existing data untouched', async () => {
    // Populate with existing data
    await db.transactions.add({
      id: 'tx-safe-1',
      date: new Date('2026-10-01'),
      amountPesewas: 50000,
      type: 'in',
      categoryId: 'cat-1',
      paymentMethodId: 'pm-1',
      description: 'Preserved transaction',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.debts.add({
      id: 'debt-safe-1',
      kind: 'owed_to_me',
      personName: 'Protected Customer',
      amountPesewas: 12000,
      paidPesewas: 0,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create a backup with an invalid receipt (corrupted base64) that causes failure
    const corruptBackup: BackupData = {
      schemaVersion: 1,
      exportTimestamp: new Date().toISOString(),
      transactions: [
        {
          id: 'tx-new-bad',
          date: new Date().toISOString(),
          amountPesewas: 90000,
          type: 'in',
          categoryId: 'cat-1',
          paymentMethodId: 'pm-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      categories: [],
      paymentMethods: [],
      debts: [],
      receipts: [
        {
          id: 'bad-receipt',
          dataBase64: null as unknown as string, // will throw error
          mimeType: 'image/jpeg',
          createdAt: new Date().toISOString(),
        },
      ],
      settings: [],
    };

    // Attempt replace restore which should fail and rollback
    await expect(restoreBackup(corruptBackup, 'replace')).rejects.toThrow();

    // Verify existing transactions and debts are completely untouched
    const tx = await db.transactions.get('tx-safe-1');
    expect(tx).toBeDefined();
    expect(tx?.amountPesewas).toBe(50000);
    expect(tx?.description).toBe('Preserved transaction');

    const debt = await db.debts.get('debt-safe-1');
    expect(debt).toBeDefined();
    expect(debt?.personName).toBe('Protected Customer');

    // Verify corrupt transaction was NOT inserted
    const badTx = await db.transactions.get('tx-new-bad');
    expect(badTx).toBeUndefined();
  });

  it('never logs data to the console', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const consoleInfoSpy = vi.spyOn(console, 'info');
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    const consoleErrorSpy = vi.spyOn(console, 'error');

    await db.transactions.add({
      id: 'tx-secret',
      date: new Date('2026-10-01'),
      amountPesewas: 888888,
      type: 'in',
      categoryId: 'cat-private',
      paymentMethodId: 'pm-private',
      description: 'Super Confidential Secret Revenue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { blob } = await exportBackupFile();
    const jsonString = await blob.text();
    const parsed = parseAndValidateBackup(jsonString);
    if (parsed.ok) {
      await restoreBackup(parsed.data, 'replace');
    }

    // Check no console call logged secret data
    const allLoggedArgs = [
      ...consoleLogSpy.mock.calls,
      ...consoleInfoSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
    ].flat();

    for (const arg of allLoggedArgs) {
      const str = typeof arg === 'string' ? arg : JSON.stringify(arg);
      expect(str).not.toContain('Super Confidential Secret Revenue');
      expect(str).not.toContain('888888');
      expect(str).not.toContain('tx-secret');
    }
  });
});
