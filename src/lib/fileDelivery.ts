// src/lib/fileDelivery.ts

export interface FileDeliveryOptions {
  blob: Blob;
  filename: string;
  mimeType: string;
  title?: string;
  text?: string;
}

export type DeliveryResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Delivers a file to the user by trying the Web Share API (with files support)
 * first. If Web Share is unavailable, fails, or is unsupported, falls back to
 * triggering a browser file download.
 */
export async function shareOrDownloadFile(options: FileDeliveryOptions): Promise<DeliveryResult> {
  const { blob, filename, mimeType, title, text } = options;

  // 1. Try Web Share API with files
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || filename,
          text: text || '',
        });
        return 'shared';
      }
    } catch (err: unknown) {
      // If user dismissed the share modal, don't download unnecessarily
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Log and fall through to download fallback
      console.warn('Web Share failed, falling back to download:', err);
    }
  }

  // 2. Fallback to direct anchor download
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
    return 'downloaded';
  }

  return 'downloaded';
}

