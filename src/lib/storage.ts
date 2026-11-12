// src/lib/storage.ts
import { setSetting } from '../db/queries';

export interface StorageEstimateResult {
  supported: boolean;
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  percentUsed: number;
  checkedAt: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calls navigator.storage.persist() and navigator.storage.estimate().
 * Saves the latest storage metadata to the settings table and returns the result.
 */
export async function checkAndRequestStoragePersistence(): Promise<StorageEstimateResult> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return {
      supported: false,
      persisted: false,
      usageBytes: 0,
      quotaBytes: 0,
      remainingBytes: 0,
      percentUsed: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  let persisted = false;

  // 1. Check if already persisted
  try {
    if (typeof navigator.storage.persisted === 'function') {
      persisted = await navigator.storage.persisted();
    }
  } catch {
    persisted = false;
  }

  // 2. If not already persisted, attempt to request persistence
  if (!persisted && typeof navigator.storage.persist === 'function') {
    try {
      persisted = await navigator.storage.persist();
    } catch {
      persisted = false;
    }
  }

  // 3. Estimate usage and total quota
  let usage = 0;
  let quota = 0;
  try {
    if (typeof navigator.storage.estimate === 'function') {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage ?? 0;
      quota = estimate.quota ?? 0;
    }
  } catch {
    usage = 0;
    quota = 0;
  }

  const remaining = Math.max(0, quota - usage);
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

  const result: StorageEstimateResult = {
    supported: true,
    persisted,
    usageBytes: usage,
    quotaBytes: quota,
    remainingBytes: remaining,
    percentUsed,
    checkedAt: new Date().toISOString(),
  };

  try {
    await setSetting('storageInfo', result);
  } catch {
    // Safe fallback if settings table is not ready
  }

  return result;
}

