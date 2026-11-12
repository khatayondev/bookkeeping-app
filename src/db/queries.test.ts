import { expect, test, beforeEach, describe } from 'vitest';
import { RecodsDB } from './db';
import {
  addTransaction,
  addCategory,
  addPaymentMethod,
  getSummary,
  getBalances,
  addDebt,
  getDebtById,
  recordDebtPayment,
  deleteTransaction,
  getDebtsSummary,
  addReceipt,
  getReceiptById,
  deleteReceipt,
  updateTransaction,
} from './queries';

// Helper to create a date at midnight UTC for consistency
function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

beforeEach(async () => {
  const db = new RecodsDB();
  await db.delete();
});

test('summary on empty database returns zeros', async () => {
  const summary = await getSummary();
  expect(summary.totalIn).toBe(0);
  expect(summary.totalOut).toBe(0);
  expect(summary.profit).toBe(0);
  expect(summary.byCategory).toHaveLength(0);
});

test('balance per payment method reflects opening balance and transactions', async () => {
  const catId = await addCategory({ name: 'Test', type: 'in', isDefault: false, isArchived: false });
  const pmId = await addPaymentMethod({ name: 'Cash', openingBalancePesewas: 1000, isArchived: false });

  // Add income transaction
  await addTransaction({
    date: utc(2023, 5, 10),
    amountPesewas: 500,
    type: 'in',
    categoryId: catId,
    paymentMethodId: pmId,
    description: 'Sale',
  });

  // Add expense transaction
  await addTransaction({
    date: utc(2023, 5, 11),
    amountPesewas: 200,
    type: 'out',
    categoryId: catId,
    paymentMethodId: pmId,
    description: 'Purchase',
  });

  const balances = await getBalances();
  const cash = balances.find((b) => b.paymentMethodId === pmId);
  expect(cash).toBeDefined();
  // Opening 1000 + 500 - 200 = 1300
  expect(cash?.balancePesewas).toBe(1300);
});

test('summary respects date boundaries and filters', async () => {
  const catIn = await addCategory({ name: 'Income', type: 'in', isDefault: false, isArchived: false });
  const catOut = await addCategory({ name: 'Expense', type: 'out', isDefault: false, isArchived: false });
  const pmId = await addPaymentMethod({ name: 'Bank', openingBalancePesewas: 0, isArchived: false });

  // Transaction before range
  await addTransaction({
    date: utc(2023, 1, 1),
    amountPesewas: 1000,
    type: 'in',
    categoryId: catIn,
    paymentMethodId: pmId,
    description: 'Early',
  });

  // Transaction inside range
  await addTransaction({
    date: utc(2023, 2, 15),
    amountPesewas: 3000,
    type: 'in',
    categoryId: catIn,
    paymentMethodId: pmId,
    description: 'Mid',
  });
  await addTransaction({
    date: utc(2023, 2, 16),
    amountPesewas: 1500,
    type: 'out',
    categoryId: catOut,
    paymentMethodId: pmId,
    description: 'Mid expense',
  });

  // Transaction after range
  await addTransaction({
    date: utc(2023, 3, 1),
    amountPesewas: 500,
    type: 'out',
    categoryId: catOut,
    paymentMethodId: pmId,
    description: 'Late',
  });

  const from = utc(2023, 2, 1);
  const to = utc(2023, 2, 28);
  const summary = await getSummary(from, to);

  expect(summary.totalIn).toBe(3000);
  expect(summary.totalOut).toBe(1500);
  expect(summary.profit).toBe(1500);
  // byCategory should contain two entries
  expect(summary.byCategory).toHaveLength(2);
  const incomeEntry = summary.byCategory.find((c) => c.categoryId === catIn);
  const expenseEntry = summary.byCategory.find((c) => c.categoryId === catOut);
  expect(incomeEntry?.totalPesewas).toBe(3000);
  expect(expenseEntry?.totalPesewas).toBe(-1500);
});

describe('Debt database operations & payment flow', () => {
  test('partial payment, full payment, overpayment prevention, and reversal', async () => {
    const pmId = await addPaymentMethod({ name: 'Cash', openingBalancePesewas: 0, isArchived: false });

    // 1. Create a debt: Kwame owes me 100 GHS (10000 pesewas)
    const debtId = await addDebt({
      kind: 'owed_to_me',
      personName: 'Kwame Mensah',
      amountPesewas: 10000,
      phone: '0241234567',
    });

    let debt = await getDebtById(debtId);
    expect(debt?.amountPesewas).toBe(10000);
    expect(debt?.paidPesewas).toBe(0);
    expect(debt?.status).toBe('open');

    // 2. Partial payment: Kwame pays 40 GHS (4000 pesewas)
    const txId1 = await recordDebtPayment({
      debtId,
      amountPesewas: 4000,
      paymentMethodId: pmId,
    });
    expect(txId1).toBeDefined();

    debt = await getDebtById(debtId);
    expect(debt?.paidPesewas).toBe(4000);
    expect(debt?.status).toBe('open');

    // 3. Overpayment prevention: Kwame tries to pay 70 GHS when 60 GHS remaining
    await expect(
      recordDebtPayment({
        debtId,
        amountPesewas: 7000,
        paymentMethodId: pmId,
      })
    ).rejects.toThrow(/overpayment not allowed/i);

    // Debt remains at 4000 paid
    debt = await getDebtById(debtId);
    expect(debt?.paidPesewas).toBe(4000);

    // 4. Full payment: Kwame pays the remaining 60 GHS (6000 pesewas)
    const txId2 = await recordDebtPayment({
      debtId,
      amountPesewas: 6000,
      paymentMethodId: pmId,
    });
    expect(txId2).toBeDefined();

    debt = await getDebtById(debtId);
    expect(debt?.paidPesewas).toBe(10000);
    expect(debt?.status).toBe('paid');

    // Summary should show 0 owed to me since it is fully settled
    let summary = await getDebtsSummary();
    expect(summary.totalOwedToMe).toBe(0);

    // 5. Reversal: deleting transaction txId2 reverses the 60 GHS payment
    await deleteTransaction(txId2);

    debt = await getDebtById(debtId);
    expect(debt?.paidPesewas).toBe(4000);
    expect(debt?.status).toBe('open'); // Reopened!

    summary = await getDebtsSummary();
    expect(summary.totalOwedToMe).toBe(6000);

    // Reversing the first transaction (txId1)
    await deleteTransaction(txId1);

    debt = await getDebtById(debtId);
    expect(debt?.paidPesewas).toBe(0);
    expect(debt?.status).toBe('open');

    summary = await getDebtsSummary();
    expect(summary.totalOwedToMe).toBe(10000);
  });
});

describe('Receipt database storage & cascade deletion', () => {
  test('creates, retrieves, and links a receipt blob to a transaction', async () => {
    const fakeBlob = new Blob(['sample-compressed-receipt-bytes'], { type: 'image/jpeg' });
    const receiptId = await addReceipt(fakeBlob, 'image/jpeg');

    expect(receiptId).toBeDefined();

    // Retrieve receipt
    const storedReceipt = await getReceiptById(receiptId);
    expect(storedReceipt).toBeDefined();
    expect(storedReceipt?.id).toBe(receiptId);
    expect(storedReceipt?.mimeType).toBe('image/jpeg');
    expect(storedReceipt?.blob).toBeDefined();

    // Link receipt to transaction
    const catId = await addCategory({ name: 'Stock', type: 'out', isDefault: true, isArchived: false });
    const pmId = await addPaymentMethod({ name: 'Cash', openingBalancePesewas: 0, isArchived: false });

    const txId = await addTransaction({
      date: new Date(),
      amountPesewas: 5000,
      type: 'out',
      categoryId: catId,
      paymentMethodId: pmId,
      receiptId,
      description: 'Stock purchase with receipt',
    });

    expect(txId).toBeDefined();

    // Cascade deletion: deleting transaction deletes its receipt
    await deleteTransaction(txId);

    const deletedReceipt = await getReceiptById(receiptId);
    expect(deletedReceipt).toBeUndefined();
  });

  test('updating transaction to remove receipt deletes the old receipt', async () => {
    const fakeBlob = new Blob(['receipt-to-be-removed'], { type: 'image/jpeg' });
    const receiptId = await addReceipt(fakeBlob, 'image/jpeg');

    const catId = await addCategory({ name: 'General', type: 'out', isDefault: false, isArchived: false });
    const pmId = await addPaymentMethod({ name: 'Momo', openingBalancePesewas: 0, isArchived: false });

    const txId = await addTransaction({
      date: new Date(),
      amountPesewas: 2500,
      type: 'out',
      categoryId: catId,
      paymentMethodId: pmId,
      receiptId,
    });

    // Remove receipt by updating receiptId to undefined
    await updateTransaction(txId, { receiptId: undefined });

    const deletedReceipt = await getReceiptById(receiptId);
    expect(deletedReceipt).toBeUndefined();
  });

  test('explicit deleteReceipt deletes receipt from database', async () => {
    const fakeBlob = new Blob(['temp-receipt'], { type: 'image/jpeg' });
    const receiptId = await addReceipt(fakeBlob, 'image/jpeg');

    expect(await getReceiptById(receiptId)).toBeDefined();

    await deleteReceipt(receiptId);
    expect(await getReceiptById(receiptId)).toBeUndefined();
  });
});

