// src/lib/imageCompression.ts
/**
 * Client-side image compression utility.
 * Compresses images before saving:
 *  - Scales down so the longest side is at most maxDimension (default: 1280px)
 *  - Preserves aspect ratio without upscaling smaller images
 *  - Encodes as JPEG with specified quality (default: 0.7)
 *  - Releases object URLs to avoid memory leaks
 */

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Calculate scaled dimensions so the longest edge does not exceed maxDimension.
 * If both dimensions are already within the limit, returns the original dimensions.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxDimension = 1280,
): Dimensions {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }

  const maxEdge = Math.max(width, height);
  if (maxEdge <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const scale = maxDimension / maxEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Format bytes to human readable string (e.g. "245 KB", "1.2 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Compress an image file/blob client-side using HTMLCanvasElement.
 *
 * @param file The input File or Blob (e.g. from file picker or camera)
 * @param maxDimension Maximum width or height in pixels (default: 1280)
 * @param quality JPEG compression quality between 0 and 1 (default: 0.7)
 * @returns Compressed JPEG Blob
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.7,
): Promise<Blob> {
  // If not in a browser environment with canvas, return original file
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const { width: targetWidth, height: targetHeight } =
          calculateTargetDimensions(img.naturalWidth, img.naturalHeight, maxDimension);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file); // Fallback to original if 2D context is unavailable
          return;
        }

        // Apply high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw image onto canvas at resized dimensions
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Revoke the temporary image object URL
        URL.revokeObjectURL(objectUrl);

        // Convert canvas to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file); // Fallback
            }
          },
          "image/jpeg",
          quality,
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for compression: ${String(err)}`));
    };

    img.src = objectUrl;
  });
}

