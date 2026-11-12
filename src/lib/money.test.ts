import { describe, it, expect } from 'vitest';
import { toPesewas, fromPesewas, formatMoney, parseMoneyInput } from './money';

describe('toPesewas', () => {
  it('parses integer strings', () => {
    expect(toPesewas('12')).toBe(1200);
  });
  it('parses decimal strings', () => {
    expect(toPesewas('12.5')).toBe(1250);
  });
  it('handles commas', () => {
    expect(toPesewas('1,250.75')).toBe(125075);
  });
  it('rounds correctly', () => {
    expect(toPesewas('0.005')).toBe(1); // 0.5 rounds up
    expect(toPesewas('0.004')).toBe(0);
  });
  it('handles negative values', () => {
    expect(toPesewas('-5.25')).toBe(-525);
  });
  it('rejects empty or junk', () => {
    expect(toPesewas('')).toBeNaN();
    expect(toPesewas('abc')).toBeNaN();
    expect(toPesewas('12.34.56')).toBeNaN();
  });
});

describe('fromPesewas', () => {
  it('converts back to GHS', () => {
    expect(fromPesewas(125075)).toBeCloseTo(1250.75);
  });
});

describe('formatMoney', () => {
  it('formats positive values', () => {
    expect(formatMoney(125075)).toBe('GHS 1,250.75');
  });
  it('formats negative values with sign', () => {
    expect(formatMoney(-525)).toBe('-GHS 5.25');
  });
});

describe('parseMoneyInput', () => {
  it('delegates to toPesewas', () => {
    expect(parseMoneyInput('1,000')).toBe(100000);
  });
});

