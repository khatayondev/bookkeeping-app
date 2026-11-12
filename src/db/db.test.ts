import { expect, test, beforeEach } from 'vitest';
import { RecodsDB } from './db';

// Ensure a clean IndexedDB before each test suite runs.
beforeEach(async () => {
  const cleaner = new RecodsDB();
  await cleaner.delete();
});

test('seeds default categories and payment methods on first open', async () => {
  const db = new RecodsDB();
  await db.open();
  const catCount = await db.categories.count();
  const pmCount = await db.paymentMethods.count();
  // Expected defaults: 11 categories, 3 payment methods.
  expect(catCount).toBe(11);
  expect(pmCount).toBe(3);
});

test('opening DB twice does not duplicate seeds', async () => {
  const db1 = new RecodsDB();
  await db1.open();
  const catCount1 = await db1.categories.count();
  const pmCount1 = await db1.paymentMethods.count();

  const db2 = new RecodsDB();
  await db2.open();
  const catCount2 = await db2.categories.count();
  const pmCount2 = await db2.paymentMethods.count();

  expect(catCount2).toBe(catCount1);
  expect(pmCount2).toBe(pmCount1);
});

