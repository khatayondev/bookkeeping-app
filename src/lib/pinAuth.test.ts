// @vitest-environment jsdom
// src/lib/pinAuth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPin,
  verifyPin,
  uint8ToHex,
  hexToUint8,
  timingSafeEqual,
  getThrottleState,
  recordFailedAttempt,
  resetThrottleState,
  savePinConfig,
  getStoredPinConfigSync,
  getStoredPinConfig,
  shouldAutoLockOnResume,
  STORAGE_KEY_PIN_CONFIG,
  STORAGE_KEY_FAILED_ATTEMPTS,
  STORAGE_KEY_LOCKOUT_UNTIL,
  type PinConfig,
} from './pinAuth';

describe('pinAuth cryptographic & security unit tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('hex and byte utilities', () => {
    it('converts Uint8Array to hex and back accurately', () => {
      const original = new Uint8Array([0, 15, 16, 255, 128, 42]);
      const hex = uint8ToHex(original);
      expect(hex).toBe('000f10ff802a');
      const recovered = hexToUint8(hex);
      expect(recovered).toEqual(original);
    });

    it('throws when hex length is odd', () => {
      expect(() => hexToUint8('abc')).toThrow('Invalid hex string length');
    });

    it('performs timing-safe string equality', () => {
      expect(timingSafeEqual('abcdef', 'abcdef')).toBe(true);
      expect(timingSafeEqual('abcdef', 'abcdeg')).toBe(false);
      expect(timingSafeEqual('abcdef', 'abcde')).toBe(false);
    });
  });

  describe('PBKDF2 Web Crypto hashing and verification', () => {
    it('generates a unique salt and valid 256-bit hash for a numeric PIN', async () => {
      const pin = '4826';
      const result = await hashPin(pin);

      expect(result.saltHex).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(result.hashHex).toHaveLength(64); // 32 bytes (256 bits) = 64 hex chars
      expect(result.iterations).toBe(100000);

      // Verify that the result does NOT contain any property named pin
      expect(result).not.toHaveProperty('pin');
    });

    it('generates different salts and hashes for the same PIN when called repeatedly', async () => {
      const res1 = await hashPin('1234');
      const res2 = await hashPin('1234');

      expect(res1.saltHex).not.toBe(res2.saltHex);
      expect(res1.hashHex).not.toBe(res2.hashHex);
    });

    it('verifies correct PIN against stored salt and hash', async () => {
      const pin = '1234';
      const { saltHex, hashHex, iterations } = await hashPin(pin);

      const isCorrect = await verifyPin(pin, saltHex, hashHex, iterations);
      expect(isCorrect).toBe(true);
    });

    it('rejects incorrect PIN against stored salt and hash', async () => {
      const { saltHex, hashHex, iterations } = await hashPin('1234');

      const isCorrect = await verifyPin('9999', saltHex, hashHex, iterations);
      expect(isCorrect).toBe(false);
    });

    it('rejects malformed salt gracefully', async () => {
      const isValid = await verifyPin('1234', 'bad-salt', 'hash');
      expect(isValid).toBe(false);
    });
  });

  describe('attempt throttling (5 wrong tries -> 30s lockout)', () => {
    it('starts with 0 failed attempts and not locked out', () => {
      const state = getThrottleState();
      expect(state.failedAttempts).toBe(0);
      expect(state.isLockedOut).toBe(false);
      expect(state.remainingSeconds).toBe(0);
    });

    it('increments failed attempts without lockout for tries 1 through 4', () => {
      for (let i = 1; i <= 4; i++) {
        const state = recordFailedAttempt();
        expect(state.failedAttempts).toBe(i);
        expect(state.isLockedOut).toBe(false);
        expect(state.remainingSeconds).toBe(0);
      }
    });

    it('locks out for 30 seconds on the 5th failed attempt', () => {
      const startTime = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(startTime);

      for (let i = 1; i <= 4; i++) {
        recordFailedAttempt();
      }

      const fifthState = recordFailedAttempt();
      expect(fifthState.failedAttempts).toBe(5);
      expect(fifthState.isLockedOut).toBe(true);
      expect(fifthState.remainingSeconds).toBe(30);

      // Check localStorage persistence
      expect(localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS)).toBe('5');
      expect(localStorage.getItem(STORAGE_KEY_LOCKOUT_UNTIL)).toBe(String(startTime + 30000));

      // Advance time by 10 seconds -> 20 seconds remaining
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 10000);
      const intermediateState = getThrottleState();
      expect(intermediateState.isLockedOut).toBe(true);
      expect(intermediateState.remainingSeconds).toBe(20);

      // Advance time by 30 seconds -> lockout expired
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 30000);
      const expiredState = getThrottleState();
      expect(expiredState.isLockedOut).toBe(false);
      expect(expiredState.remainingSeconds).toBe(0);
    });

    it('resets throttle state completely on resetThrottleState', () => {
      recordFailedAttempt();
      recordFailedAttempt();
      expect(localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS)).toBe('2');

      resetThrottleState();
      expect(localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY_LOCKOUT_UNTIL)).toBeNull();

      const state = getThrottleState();
      expect(state.failedAttempts).toBe(0);
      expect(state.isLockedOut).toBe(false);
    });
  });

  describe('PIN configuration storage & sanitization', () => {
    it('stores only salted hash and metadata, never the PIN', async () => {
      const mockConfig: PinConfig = {
        saltHex: 'abc123salt',
        hashHex: 'def456hash',
        iterations: 100000,
        autoLockTimeout: '1min',
      };

      await savePinConfig(mockConfig);

      // Read from localStorage directly
      const rawStored = localStorage.getItem(STORAGE_KEY_PIN_CONFIG);
      expect(rawStored).not.toBeNull();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.saltHex).toBe('abc123salt');
      expect(parsed.hashHex).toBe('def456hash');
      expect(parsed.autoLockTimeout).toBe('1min');
      // Strictly verify no 'pin' key exists in stored data
      expect(parsed).not.toHaveProperty('pin');

      const retrievedSync = getStoredPinConfigSync();
      expect(retrievedSync?.saltHex).toBe('abc123salt');

      const retrievedAsync = await getStoredPinConfig();
      expect(retrievedAsync?.hashHex).toBe('def456hash');
    });

    it('clears stored PIN config when saving null', async () => {
      await savePinConfig({
        saltHex: 'salt',
        hashHex: 'hash',
        iterations: 100000,
        autoLockTimeout: 'immediately',
      });

      expect(getStoredPinConfigSync()).not.toBeNull();

      await savePinConfig(null);
      expect(getStoredPinConfigSync()).toBeNull();
      expect(await getStoredPinConfig()).toBeNull();
    });
  });

  describe('shouldAutoLockOnResume logic', () => {
    it('returns true for immediately timeout regardless of elapsed time', () => {
      expect(shouldAutoLockOnResume(0, 'immediately')).toBe(true);
      expect(shouldAutoLockOnResume(100, 'immediately')).toBe(true);
    });

    it('handles 1min timeout (60 seconds)', () => {
      expect(shouldAutoLockOnResume(59999, '1min')).toBe(false);
      expect(shouldAutoLockOnResume(60000, '1min')).toBe(true);
      expect(shouldAutoLockOnResume(90000, '1min')).toBe(true);
    });

    it('handles 5min timeout (300 seconds)', () => {
      expect(shouldAutoLockOnResume(299999, '5min')).toBe(false);
      expect(shouldAutoLockOnResume(300000, '5min')).toBe(true);
    });

    it('returns false for never timeout', () => {
      expect(shouldAutoLockOnResume(0, 'never')).toBe(false);
      expect(shouldAutoLockOnResume(9999999, 'never')).toBe(false);
    });
  });
});

