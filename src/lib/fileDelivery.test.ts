// @vitest-environment jsdom
// src/lib/fileDelivery.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareOrDownloadFile } from './fileDelivery';

describe('fileDelivery', () => {
  const dummyBlob = new Blob(['hello world'], { type: 'text/plain' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses Web Share API when navigator.canShare is supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: mockCanShare,
      configurable: true,
      writable: true,
    });

    const result = await shareOrDownloadFile({
      blob: dummyBlob,
      filename: 'report.csv',
      mimeType: 'text/csv',
    });

    expect(result).toBe('shared');
    expect(mockCanShare).toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalled();
  });

  it('returns cancelled when user cancels Web Share dialog (AbortError)', async () => {
    const abortErr = new Error('Share canceled');
    abortErr.name = 'AbortError';

    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abortErr),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
      writable: true,
    });

    const result = await shareOrDownloadFile({
      blob: dummyBlob,
      filename: 'report.csv',
      mimeType: 'text/csv',
    });

    expect(result).toBe('cancelled');
  });

  it('falls back to browser anchor download when navigator.canShare is false or throws', async () => {
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(false),
      configurable: true,
      writable: true,
    });

    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    URL.createObjectURL = createObjectURLSpy;
    if (typeof URL.revokeObjectURL !== 'function') {
      URL.revokeObjectURL = vi.fn();
    }
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const result = await shareOrDownloadFile({
      blob: dummyBlob,
      filename: 'report.csv',
      mimeType: 'text/csv',
    });

    expect(result).toBe('downloaded');
    expect(createObjectURLSpy).toHaveBeenCalledWith(dummyBlob);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
