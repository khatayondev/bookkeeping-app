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
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                Receipt Attached
              </span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                {formatFileSize(activeBlob.size)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
              Tap thumbnail to view full-screen
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTriggerPicker}
                disabled={disabled}
                className="text-xs font-semibold text-primary hover:text-primary/80 min-h-[44px] py-2 px-3 rounded bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-1"
                aria-label="Replace receipt photo"
              >
                🔄 Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="text-xs font-semibold text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 min-h-[44px] py-2 px-3 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"
                aria-label="Remove receipt photo"
              >
                🗑️ Remove
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
          className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary bg-gray-50/50 dark:bg-gray-800/50 hover:bg-primary/5 text-gray-700 dark:text-gray-200 hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <span className="text-lg">📷</span>
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

