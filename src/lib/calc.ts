// src/lib/calc.ts
// ─────────────────────────────────────────────────────────
// Safe expression parser/evaluator for GHS amounts.
// No use of dynamic code execution (no eval, no Function constructor).
// All arithmetic is performed in integer pesewas to avoid
// floating-point rounding issues (e.g. 0.1 + 0.2 = 0.30).
// ─────────────────────────────────────────────────────────

/** Maximum allowed input length to prevent abuse. */
const MAX_INPUT_LENGTH = 256;

// ── Result types ────────────────────────────────────────

export interface CalcOk {
  ok: true;
  /** Result expressed as integer pesewas (100ths of a cedi). */
  valuePesewas: number;
  /** Human-readable display string, e.g. "1,250.75" */
  display: string;
}

export interface CalcErr {
  ok: false;
  error: string;
}

export type CalcResult = CalcOk | CalcErr;

// ── Token types ─────────────────────────────────────────

const enum TokenKind {
  Number,
  Percent,
  Plus,
  Minus,
  Mul,
  Div,
  LParen,
  RParen,
  EOF,
}

interface Token {
  kind: TokenKind;
  /** For Number tokens: value in pesewas (integer). */
  value?: number;
}

// ── Lexer ───────────────────────────────────────────────

/**
 * Parse a numeric literal (with optional thousands separators and decimals)
 * into integer pesewas.
 *
 * Accepted formats: 1,234.56  1234.56  1234  .5  1,234
 * Thousands separators must be correctly placed (groups of 3) when present.
 */
function parseNumber(raw: string): number {
  // Strip thousands separators
  const cleaned = raw.replace(/,/g, "");
  // We do decimal-safe conversion: split on "." and scale
  const dotIdx = cleaned.indexOf(".");
  if (dotIdx === -1) {
    // Integer — multiply by 100 for pesewas
    return parseInt(cleaned, 10) * 100;
  }
  const intPart = cleaned.slice(0, dotIdx) || "0";
  let fracStr = cleaned.slice(dotIdx + 1);
  // Pad or truncate to 3 digits so we can round the third digit
  while (fracStr.length < 3) fracStr += "0";
  const thirdDigit = parseInt(fracStr[2], 10);
  const firstTwo = parseInt(fracStr.slice(0, 2), 10);
  const rounded = thirdDigit >= 5 ? firstTwo + 1 : firstTwo;
  const intVal = parseInt(intPart, 10);
  // Combine: (intPart * 100) + rounded fractional pesewas
  return intVal * 100 + (intVal < 0 ? -rounded : rounded);
}

/**
 * Tokenise the normalised input string.
 * Returns an array of tokens or throws a descriptive error string.
 */
function tokenise(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Skip whitespace
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    // Operators & parens
    if (ch === "+") {
      tokens.push({ kind: TokenKind.Plus });
      i++;
      continue;
    }
    if (ch === "-" || ch === "−") {
      tokens.push({ kind: TokenKind.Minus });
      i++;
      continue;
    }
    if (ch === "*" || ch === "×" || ch === "x" || ch === "X") {
      tokens.push({ kind: TokenKind.Mul });
      i++;
      continue;
    }
    if (ch === "/" || ch === "÷") {
      tokens.push({ kind: TokenKind.Div });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: TokenKind.LParen });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: TokenKind.RParen });
      i++;
      continue;
    }
    if (ch === "%") {
      tokens.push({ kind: TokenKind.Percent });
      i++;
      continue;
    }

    // Number literal: digits, commas, dots
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      const start = i;
      while (
        i < len &&
        ((input[i] >= "0" && input[i] <= "9") ||
          input[i] === "." ||
          input[i] === ",")
      ) {
        i++;
      }
      const raw = input.slice(start, i);
      // Validate: at most one dot, commas in proper positions
      const dotCount = (raw.match(/\./g) || []).length;
      if (dotCount > 1) throw "Invalid number: multiple decimal points";
      // Check comma placement (groups of 3 from the right of integer part)
      if (raw.includes(",")) {
        const intPart = raw.includes(".") ? raw.slice(0, raw.indexOf(".")) : raw;
        if (!/^\d{1,3}(,\d{3})*$/.test(intPart))
          throw "Invalid number: malformed thousands separators";
      }
      // Must contain at least one digit
      if (!/\d/.test(raw)) throw "Invalid number";
      tokens.push({ kind: TokenKind.Number, value: parseNumber(raw) });
      continue;
    }

    throw `Unexpected character: '${ch}'`;
  }

  tokens.push({ kind: TokenKind.EOF });
  return tokens;
}

// ── Recursive-descent parser ────────────────────────────
// Grammar (precedence low→high):
//   expr       → term (('+' | '-') term)*
//   term       → unary (('*' | '/') unary)*
//   unary      → '-' unary | postfix
//   postfix    → primary ('%')?
//   primary    → NUMBER | '(' expr ')'
//
// Percent semantics:
//   When `%` appears and there is a left-hand additive operand,
//   "A + B%" means A + A*(B/100).  Standalone "B%" means B/100.

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private eat(kind: TokenKind): Token {
    const t = this.tokens[this.pos];
    if (t.kind !== kind) throw "Unexpected token";
    this.pos++;
    return t;
  }

  private match(kind: TokenKind): boolean {
    if (this.tokens[this.pos].kind === kind) {
      this.pos++;
      return true;
    }
    return false;
  }

  /** Parse top-level expression and ensure we consumed everything. */
  parse(): number {
    const result = this.expr();
    if (this.peek().kind !== TokenKind.EOF) {
      throw "Unexpected token after expression";
    }
    return result;
  }

  /** expr → term (('+' | '-') term)* with percent awareness */
  private expr(): number {
    let left = this.term();

    while (
      this.peek().kind === TokenKind.Plus ||
      this.peek().kind === TokenKind.Minus
    ) {
      const op = this.peek().kind;
      this.pos++;

      // Before parsing the right-hand term, check if there's a percent
      // following a number (e.g. "200 + 10%").  We handle this by parsing
      // the term and then checking for percent.
      const right = this.termForAdditive(left);

      if (op === TokenKind.Plus) {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  /**
   * Like term(), but if the *entire* resulting value came from a simple
   * `number%`, we interpret it relative to `base`.
   *
   * "200 + 10%" → 200 + 200*(10/100) = 220
   */
  private termForAdditive(base: number): number {
    return this.termPercentAware(base);
  }

  /**
   * Parses a term (mul/div chain). If the *first* factor is a bare `number%`,
   * it is interpreted as `base * (number / 100)`.
   */
  private termPercentAware(base: number): number {
    let left = this.unaryPercentAware(base);

    while (
      this.peek().kind === TokenKind.Mul ||
      this.peek().kind === TokenKind.Div
    ) {
      const op = this.peek().kind;
      this.pos++;
      const right = this.unary();
      if (op === TokenKind.Mul) {
        // pesewas × pesewas would blow up scale, so: (a * b) / 100
        left = roundHalfUp(left * right, 100);
      } else {
        if (right === 0) throw "Division by zero";
        left = roundHalfUp(left * 100, right);
      }
    }

    return left;
  }

  /** term → unary (('*' | '/') unary)* */
  private term(): number {
    let left = this.unary();

    while (
      this.peek().kind === TokenKind.Mul ||
      this.peek().kind === TokenKind.Div
    ) {
      const op = this.peek().kind;
      this.pos++;
      const right = this.unary();
      if (op === TokenKind.Mul) {
        left = roundHalfUp(left * right, 100);
      } else {
        if (right === 0) throw "Division by zero";
        left = roundHalfUp(left * 100, right);
      }
    }

    return left;
  }

  /** unary → '-' unary | postfix */
  private unary(): number {
    if (this.peek().kind === TokenKind.Minus) {
      this.pos++;
      return -this.unary();
    }
    // Allow unary plus
    if (this.peek().kind === TokenKind.Plus) {
      this.pos++;
      return this.unary();
    }
    return this.postfix();
  }

  /** Percent-aware unary for additive context. */
  private unaryPercentAware(base: number): number {
    if (this.peek().kind === TokenKind.Minus) {
      this.pos++;
      return -this.unaryPercentAware(base);
    }
    if (this.peek().kind === TokenKind.Plus) {
      this.pos++;
      return this.unaryPercentAware(base);
    }
    return this.postfixPercentAware(base);
  }

  /** postfix → primary ('%')? */
  private postfix(): number {
    const val = this.primary();
    if (this.match(TokenKind.Percent)) {
      // Standalone percent: val / 100.  val is in pesewas so we divide pesewas
      // by 100 → fraction of 1 cedi? No, we want to keep pesewas scale.
      // "50%" standalone should mean 0.50 (pesewas=50).
      return roundHalfUp(val, 100);
    }
    return val;
  }

  /** Percent-aware postfix for additive context. */
  private postfixPercentAware(base: number): number {
    const val = this.primary();
    if (this.match(TokenKind.Percent)) {
      // "base + val%" → base * (val / 10000) because val is in pesewas
      // val pesewas represents val/100 GHS, so percentage = (val/100)/100 = val/10000
      // result = base * val / 10000
      return roundHalfUp(base * val, 10000);
    }
    return val;
  }

  /** primary → NUMBER | '(' expr ')' */
  private primary(): number {
    if (this.peek().kind === TokenKind.Number) {
      return this.eat(TokenKind.Number).value!;
    }
    if (this.peek().kind === TokenKind.LParen) {
      this.eat(TokenKind.LParen);
      const val = this.expr();
      if (this.peek().kind !== TokenKind.RParen) {
        throw "Missing closing parenthesis";
      }
      this.eat(TokenKind.RParen);
      return val;
    }
    throw "Expected a number or parenthesised expression";
  }
}

// ── Helpers ─────────────────────────────────────────────

/**
 * Integer division with "round half up" (away from zero for .5).
 * Computes Math.round(numerator / divisor) but with half-up semantics.
 */
function roundHalfUp(numerator: number, divisor: number): number {
  // We want: round(numerator / divisor) with 0.5 → up
  // Using: floor((numerator + divisor/2) / divisor) for positive,
  //        ceil((numerator - divisor/2) / divisor) for negative.
  if (divisor === 0) throw "Division by zero";
  const sign = (numerator >= 0 ? 1 : -1) * (divisor >= 0 ? 1 : -1);
  const absNum = Math.abs(numerator);
  const absDiv = Math.abs(divisor);
  // (absNum + absDiv/2) / absDiv, but use integer math to avoid float issues
  // = (2*absNum + absDiv) / (2*absDiv)
  const result = Math.floor((2 * absNum + absDiv) / (2 * absDiv));
  return sign * result;
}

/**
 * Format pesewas as a display string (no currency symbol).
 * E.g. 125075 → "1,250.75", -50 → "-0.50"
 */
function formatDisplay(pesewas: number): string {
  const sign = pesewas < 0 ? "-" : "";
  const abs = Math.abs(pesewas);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const wholeStr = whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(2, "0");
  return `${sign}${wholeStr}.${fracStr}`;
}

// ── Public API ──────────────────────────────────────────

/**
 * Safely evaluate a calculator expression.
 *
 * Supports: + - × ÷ (also *, /, x), parentheses, decimals,
 * percent (e.g. "200 + 10%" = 220), unary minus, thousands separators.
 *
 * All math is done in integer pesewas to avoid floating-point errors.
 * Results are rounded half-up to 2 decimal places.
 */
export function evaluate(input: string): CalcResult {
  try {
    if (typeof input !== "string") {
      return { ok: false, error: "Input must be a string" };
    }

    const trimmed = input.trim();

    if (trimmed.length === 0) {
      return { ok: false, error: "Empty expression" };
    }

    if (trimmed.length > MAX_INPUT_LENGTH) {
      return { ok: false, error: "Expression too long" };
    }

    const tokens = tokenise(trimmed);
    const parser = new Parser(tokens);
    const valuePesewas = parser.parse();

    if (!Number.isFinite(valuePesewas)) {
      return { ok: false, error: "Result is not finite" };
    }

    return {
      ok: true,
      valuePesewas,
      display: formatDisplay(valuePesewas),
    };
  } catch (e) {
    const message = typeof e === "string" ? e : "Invalid expression";
    return { ok: false, error: message };
  }
}
