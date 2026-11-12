// src/lib/pinAuth.ts
/**
 * Cryptographic PIN authentication using PBKDF2 via Web Crypto API.
 * 
 * Security guarantees:
 * - NEVER stores the plaintext PIN.
 * - Stores only a cryptographically salted hash using PBKDF2 (SHA-256, 100,000 iterations).
 * - A unique 16-byte random salt is generated for every PIN.
 * - Constant-time comparison to mitigate timing attacks.
 * - Attempt throttling: locks out for 30 seconds after 5 consecutive failed attempts.
 */
import { getSetting, setSetting } from '../db/queries';

export type AutoLockTimeout = 'immediately' | '1min' | '5min' | 'never';

export interface PinConfig {
  saltHex: string;
  hashHex: string;
  iterations: number;
  autoLockTimeout: AutoLockTimeout;
}

export interface ThrottleState {
  failedAttempts: number;
  isLockedOut: boolean;
  remainingSeconds: number;
}

export const PBKDF2_ITERATIONS = 100000;
export const SALT_BYTE_LENGTH = 16;
export const HASH_KEY_LENGTH_BITS = 256; // 32 bytes
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30000; // 30 seconds

export const STORAGE_KEY_PIN_CONFIG = 'pin_config';
export const STORAGE_KEY_FAILED_ATTEMPTS = 'pin_failed_attempts';
export const STORAGE_KEY_LOCKOUT_UNTIL = 'pin_lockout_until';

// ─────────────────────────────────────────────────────────
// Byte and Hex conversion utilities
// ─────────────────────────────────────────────────────────

export function uint8ToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToUint8(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time comparison between two hex strings to mitigate timing side-channel attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ─────────────────────────────────────────────────────────
// Web Crypto PBKDF2 Hashing & Verification
// ─────────────────────────────────────────────────────────

function getCryptoSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) is not supported in this environment.');
}

/**
 * Computes a salted PBKDF2 hash of the PIN.
 * Returns only the saltHex, hashHex, and iterations. NEVER returns or persists the PIN.
 */
export async function hashPin(
  pin: string,
  saltBytes?: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<{ saltHex: string; hashHex: string; iterations: number }> {
  const subtle = getCryptoSubtle();
  const salt = saltBytes ?? globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));

  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_KEY_LENGTH_BITS
  );

  return {
    saltHex: uint8ToHex(salt),
    hashHex: uint8ToHex(new Uint8Array(derivedBits)),
    iterations,
  };
}

/**
 * Verifies a candidate PIN against a stored salt and expected hash.
 */
export async function verifyPin(
  candidatePin: string,
  saltHex: string,
  expectedHashHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<boolean> {
  try {
    const saltBytes = hexToUint8(saltHex);
    const { hashHex } = await hashPin(candidatePin, saltBytes, iterations);
    return timingSafeEqual(hashHex, expectedHashHex);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// Throttling & Lockout (30 second delay after 5 wrong tries)
// ─────────────────────────────────────────────────────────

export function getThrottleState(): ThrottleState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { failedAttempts: 0, isLockedOut: false, remainingSeconds: 0 };
  }

  const failedAttempts = parseInt(localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS) || '0', 10) || 0;
  const lockoutUntil = parseInt(localStorage.getItem(STORAGE_KEY_LOCKOUT_UNTIL) || '0', 10) || 0;
  const now = Date.now();

  if (lockoutUntil > now) {
    const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
    return {
      failedAttempts,
      isLockedOut: true,
      remainingSeconds,
    };
  }

  return {
    failedAttempts,
    isLockedOut: false,
    remainingSeconds: 0,
  };
}

export function recordFailedAttempt(): ThrottleState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { failedAttempts: 1, isLockedOut: false, remainingSeconds: 0 };
  }

  const currentState = getThrottleState();
  const newAttempts = currentState.failedAttempts + 1;
  const now = Date.now();

  localStorage.setItem(STORAGE_KEY_FAILED_ATTEMPTS, String(newAttempts));

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = now + LOCKOUT_DURATION_MS;
    localStorage.setItem(STORAGE_KEY_LOCKOUT_UNTIL, String(lockoutUntil));
    return {
      failedAttempts: newAttempts,
      isLockedOut: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  return {
    failedAttempts: newAttempts,
    isLockedOut: false,
    remainingSeconds: 0,
  };
}

export function resetThrottleState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.removeItem(STORAGE_KEY_FAILED_ATTEMPTS);
  localStorage.removeItem(STORAGE_KEY_LOCKOUT_UNTIL);
}

// ─────────────────────────────────────────────────────────
// Persistence of PIN Configuration
// ─────────────────────────────────────────────────────────

/**
 * Synchronous read from localStorage for immediate, flicker-free lock state on startup.
 */
export function getStoredPinConfigSync(): PinConfig | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = localStorage.getItem(STORAGE_KEY_PIN_CONFIG);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.saltHex === 'string' && typeof parsed.hashHex === 'string') {
      return parsed as PinConfig;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

/**
 * Asynchronous read from database settings (with localStorage fallback).
 */
export async function getStoredPinConfig(): Promise<PinConfig | null> {
  try {
    const dbValue = await getSetting(STORAGE_KEY_PIN_CONFIG);
    if (dbValue && typeof dbValue === 'object') {
      const config = dbValue as PinConfig;
      if (typeof config.saltHex === 'string' && typeof config.hashHex === 'string') {
        return config;
      }
    }
  } catch {
    // Fall back to localStorage
  }

  return getStoredPinConfigSync();
}

/**
 * Saves or deletes PIN configuration in both database settings and localStorage.
 * NEVER stores the plain PIN.
 */
export async function savePinConfig(config: PinConfig | null): Promise<void> {
  if (config) {
    // Verify that NO plaintext pin property exists
    const sanitized: PinConfig = {
      saltHex: config.saltHex,
      hashHex: config.hashHex,
      iterations: config.iterations || PBKDF2_ITERATIONS,
      autoLockTimeout: config.autoLockTimeout || '1min',
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_PIN_CONFIG, JSON.stringify(sanitized));
    }
    await setSetting(STORAGE_KEY_PIN_CONFIG, sanitized);
  } else {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY_PIN_CONFIG);
    }
    await setSetting(STORAGE_KEY_PIN_CONFIG, null);
  }
}

/**
 * Calculates whether the elapsed time in background requires auto-locking.
 */
export function shouldAutoLockOnResume(
  elapsedMs: number,
  timeout: AutoLockTimeout
): boolean {
  switch (timeout) {
    case 'immediately':
      return true;
    case '1min':
      return elapsedMs >= 60000;
    case '5min':
      return elapsedMs >= 300000;
    case 'never':
      return false;
    default:
      return elapsedMs >= 60000;
  }
}
