// src/components/ReceiptPicker.tsx
/**
 * Receipt Picker and Thumbnail Preview Component.
 *
 * Features:
 * - "Attach receipt" button opening camera or photo picker
 *   (<input type="file" accept="image/*" capture="environment" />)
 * - Automatic client-side compression (max 1280px longest side, JPEG 0.7)
 * - Thumbnail display with size badge
 * - Tap to view full-screen in ReceiptModal
 * - Replace and Remove action buttons
 * - Object URL cleanup to prevent memory leaks
 */
import React, { useRef, useState } from "react";
import { compressImage, formatFileSize } from "../lib/imageCompression";
import { useReceipt } from "../hooks/useReceipt";
import { ReceiptModal } from "./ReceiptModal";

export interface ReceiptPickerProps {
  /** If an existing receipt is saved in DB, pass its receiptId */
  existingReceiptId?: string | null;
  /** Current active blob (e.g. newly picked / compressed) */
  currentBlob?: Blob | null;
  /** Callback fired when a new compressed receipt blob is ready or removed */
  onReceiptChange: (blob: Blob | null) => void;
  /** Disabled state */
  disabled?: boolean;
}

export const ReceiptPicker: React.FC<ReceiptPickerProps> = ({
  existingReceiptId,
  currentBlob,
  onReceiptChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preview from either newly set blob or existing DB receiptId
  const { blob: activeBlob, imageUrl } = useReceipt(
    currentBlob !== undefined ? currentBlob : existingReceiptId,
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCompressing(true);

    try {
      // Client-side compression: max 1280px, quality 0.7 JPEG
      const compressedBlob = await compressImage(file, 1280, 0.7);
      onReceiptChange(compressedBlob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compress image");
    } finally {
      setCompressing(false);
      // Reset input value so re-selecting the same file fires onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleTriggerPicker = () => {
    if (disabled || compressing) return;
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    onReceiptChange(null);
  };

  return (
    <div className="mb-4">
      <label className="block mb-1.5 font-medium text-sm text-gray-700 dark:text-gray-300">
        Receipt / Bill Photo
      </label>

      {/* Hidden file input with camera capture support */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload or take receipt photo"
      />

      {/* State 1: Compressing */}
      {compressing && (
        <div className="p-4 rounded-xl border border-dashed border-primary/50 bg-primary/5 flex items-center justify-center gap-2.5 text-primary text-sm font-medium animate-pulse">
          <span className="text-lg">⏳</span>
          <span>Compressing receipt photo…</span>
        </div>
      )}

      {/* State 2: Receipt attached -> Thumbnail with preview & actions */}
      {!compressing && activeBlob && imageUrl && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm flex items-center gap-3">
          {/* Thumbnail - tap to view full screen */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 w-16 h-16 shrink-0 group focus:outline-none focus:ring-2 focus:ring-primary shadow-inner min-h-[44px] min-w-[44px]"
            title="Tap to view receipt full-screen"
            aria-label="View receipt photo full-screen"
          >
            <img
              src={imageUrl}
              alt="Receipt thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
              <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-bold drop-shadow">
                🔍
              </span>
            </div>
          </button>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                Receipt Attached
              </span>
              <span className="text-[11px] bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 rounded-full font-mono font-bold">
                {formatFileSize(activeBlob.size)}
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-2">
              Tap thumbnail to view full-screen
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTriggerPicker}
                disabled={disabled}
                className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:underline min-h-[44px] py-2 px-3 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1.5"
                aria-label="Replace receipt photo"
              >
                <svg className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="text-xs font-bold text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white min-h-[44px] py-2 px-3 rounded hover:bg-neutral-150 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                aria-label="Remove receipt photo"
              >
                <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 3: No receipt -> "Attach receipt" button */}
      {!compressing && !activeBlob && (
        <button
          type="button"
          onClick={handleTriggerPicker}
          disabled={disabled}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 transition-all flex items-center justify-center gap-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        >
          <svg className="w-5 h-5 text-neutral-800 dark:text-neutral-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Attach receipt (Camera or Photos)</span>
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 font-medium">
          {error}
        </p>
      )}

      {/* Full screen modal */}
      {imageUrl && (
        <ReceiptModal
          isOpen={isModalOpen}
          imageUrl={imageUrl}
          blob={activeBlob}
          title="Transaction Receipt"
          onClose={() => setIsModalOpen(false)}
          onReplace={handleTriggerPicker}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
};

