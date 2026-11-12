import { describe, it, expect } from 'vitest';
import {
  today,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  formatDate,
  isOverdue,
} from './dates';

// Helper to create date at midnight UTC for consistency
// Helper to create date at midnight local timezone for consistency
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

describe('Week helpers', () => {
  it('calculates start of week (Monday) correctly', () => {
    const wednesday = localDate(2023, 1, 4); // Wed Jan 4 2023
    const start = startOfWeek(wednesday);
    expect(start.toISOString().slice(0, 10)).toBe('2023-01-02'); // Monday
  });
  it('calculates end of week correctly', () => {
    const wednesday = localDate(2023, 1, 4);
    const end = endOfWeek(wednesday);
    // Sunday of that week
    expect(end.toISOString().slice(0, 10)).toBe('2023-01-08');
  });
});

describe('Month helpers', () => {
  it('start and end of February (non-leap) correctly', () => {
    const anyDate = localDate(2023, 2, 15);
    expect(startOfMonth(anyDate).toISOString().slice(0, 10)).toBe('2023-02-01');
    expect(endOfMonth(anyDate).toISOString().slice(0, 10)).toBe('2023-02-28');
  });
  it('end of December correctly', () => {
    const anyDate = localDate(2022, 12, 15);
    expect(endOfMonth(anyDate).toISOString().slice(0, 10)).toBe('2022-12-31');
  });
});

describe('formatDate', () => {
  it('returns friendly strings for non-today dates', () => {
    const date = localDate(2023, 11, 3); // Friday
    // Assuming not today when test runs
    const formatted = formatDate(date);
    // Should be like "Fri 3 Nov"
    expect(formatted).toBe('Fri 3 Nov');
  });
});

describe('isOverdue', () => {
  it('detects overdue dates', () => {
    const todayDate = today();
    const past = new Date(todayDate);
    past.setDate(past.getDate() - 1);
    expect(isOverdue(past)).toBe(true);
    const future = new Date(todayDate);
    future.setDate(future.getDate() + 1);
    expect(isOverdue(future)).toBe(false);
  });
});
