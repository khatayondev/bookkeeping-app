// @vitest-environment jsdom
// src/lib/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAndRequestStoragePersistence, formatBytes } from './storage';

describe('storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('formats bytes into human readable units accurately', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(2684354560)).toBe('2.5 GB');
  });

  it('handles environment when navigator.storage is unsupported', async () => {
    // Temporarily delete navigator.storage
    const originalStorage = navigator.storage;
    // @ts-expect-error intentionally delete property for test
    delete navigator.storage;

    const result = await checkAndRequestStoragePersistence();
    expect(result.supported).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.remainingBytes).toBe(0);

    // Restore
    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('calls persist() and estimate() when persistence is granted', async () => {
    const mockPersisted = vi.fn().mockResolvedValue(false);
    const mockPersist = vi.fn().mockResolvedValue(true);
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 20971520, // 20 MB
      quota: 1073741824, // 1 GB
    });

    Object.defineProperty(navigator, 'storage', {
      value: {
        persisted: mockPersisted,
        persist: mockPersist,
        estimate: mockEstimate,
      },
      configurable: true,
      writable: true,
    });

    const result = await checkAndRequestStoragePersistence();

    expect(result.supported).toBe(true);
    expect(result.persisted).toBe(true);
    expect(result.usageBytes).toBe(20971520);
    expect(result.quotaBytes).toBe(1073741824);
    expect(result.remainingBytes).toBe(1073741824 - 20971520);
    expect(result.percentUsed).toBeCloseTo(1.95, 1);

    expect(mockPersisted).toHaveBeenCalled();
    expect(mockPersist).toHaveBeenCalled();
    expect(mockEstimate).toHaveBeenCalled();
  });

  it('handles case when persistence is denied by browser', async () => {
    const mockPersisted = vi.fn().mockResolvedValue(false);
    const mockPersist = vi.fn().mockResolvedValue(false);
    const mockEstimate = vi.fn().mockResolvedValue({
      usage: 1024,
      quota: 50000000,
    });

    Object.defineProperty(navigator, 'storage', {
      value: {
        persisted: mockPersisted,
        persist: mockPersist,
        estimate: mockEstimate,
      },
      configurable: true,
      writable: true,
    });

    const result = await checkAndRequestStoragePersistence();

    expect(result.supported).toBe(true);
    expect(result.persisted).toBe(false);
    expect(result.usageBytes).toBe(1024);
    expect(mockPersist).toHaveBeenCalled();
  });
});
