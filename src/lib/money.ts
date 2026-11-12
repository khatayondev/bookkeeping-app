// src/lib/money.ts
/**
 * Convert a money string or number (GHS) to pesewas (integer).
 * Handles commas, optional decimal part, and rejects invalid input by returning NaN.
 */
export function toPesewas(input: string | number): number {
  if (typeof input === "number") {
    // Directly treat as GHS number.
    if (!Number.isFinite(input)) return NaN;
    return Math.round(input * 100);
  }
  if (typeof input !== "string") return NaN;
  // Trim whitespace
  const trimmed = input.trim();
  if (trimmed === "") return NaN;
  // Remove commas
  const normalized = trimmed.replace(/,/g, "");
  // Validate format: optional leading sign, digits, optional decimal with up to any number of digits
  if (!/^[-+]?\d*(\.\d+)?$/.test(normalized)) return NaN;
  const num = Number(normalized);
  if (isNaN(num)) return NaN;
  return Math.round(num * 100);
}
/**
 * Convert pesewas (integer) back to GHS as a number.
 */
export function fromPesewas(pesewas: number): number {
  if (typeof pesewas !== "number" || !Number.isFinite(pesewas)) return NaN;
  return pesewas / 100;
}
/**
 * Format pesewas as a currency string.
 * Example: formatMoney(125075) => "GHS 1,250.75"
 */
export interface FormatMoneyOpts {
  /** Currency prefix, default "GHS" */
  prefix?: string;
}
export function formatMoney(pesewas: number, opts?: FormatMoneyOpts): string {
  if (typeof pesewas !== "number" || !Number.isFinite(pesewas)) return "";
  const prefix = opts?.prefix ?? "GHS";
  const abs = Math.abs(pesewas);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const wholeStr = whole.toLocaleString("en-US");
  const fractionStr = fraction.toString().padStart(2, "0");
  const sign = pesewas < 0 ? "-" : "";
  return `${sign}${prefix} ${wholeStr}.${fractionStr}`;
}
/**
 * Parse a money input from form fields, returning pesewas.
 * Utilises toPesewas internally.
 */
export function parseMoneyInput(input: string | number): number {
  return toPesewas(input);
}
