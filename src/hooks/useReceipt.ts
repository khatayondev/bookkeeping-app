// src/hooks/useReceipt.ts
/**
 * Hook for loading and managing receipt images from Dexie.
 * Handles lifecycle of Object URLs, guaranteeing URL.revokeObjectURL is called
 * on unmount or when the receipt changes to prevent memory leaks.
 */
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getReceiptById } from "../db/queries";
import type { Receipt } from "../db/db";

export interface UseReceiptResult {
  receipt: Receipt | null | undefined;
  blob: Blob | null;
  imageUrl: string | null;
  isLoading: boolean;
}

/**
 * Loads a receipt from the database by receiptId, or takes a direct Blob (e.g. freshly compressed).
 * Automatically handles Object URL creation and revocation.
 */
export function useReceipt(
  receiptIdOrBlob: string | Blob | null | undefined,
): UseReceiptResult {
  const isId = typeof receiptIdOrBlob === "string" && receiptIdOrBlob.length > 0;
  const isDirectBlob = receiptIdOrBlob instanceof Blob;

  // If receiptId string is passed, query it from IndexedDB
  const queriedReceipt = useLiveQuery(
    async () => {
      if (!isId) return null;
      return (await getReceiptById(receiptIdOrBlob as string)) ?? null;
    },
    [isId ? (receiptIdOrBlob as string) : null],
  );

  const activeBlob: Blob | null = isDirectBlob
    ? (receiptIdOrBlob as Blob)
    : queriedReceipt?.blob ?? null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBlob) {
      setImageUrl(null);
      return;
    }

    // Create Object URL for preview
    const url = URL.createObjectURL(activeBlob);
    setImageUrl(url);

    // Clean up / revoke to avoid memory leaks
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeBlob]);

  return {
    receipt: isDirectBlob ? null : queriedReceipt,
    blob: activeBlob,
    imageUrl,
    isLoading: isId && queriedReceipt === undefined,
  };
}

