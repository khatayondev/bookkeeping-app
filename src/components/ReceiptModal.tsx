// src/components/ReceiptModal.tsx
/**
 * Full-screen Receipt Viewer Modal.
 * Displays the high-resolution compressed receipt image with zoom-to-fit,
 * and optional Replace / Remove actions.
 */
import React from "react";
import { formatFileSize } from "../lib/imageCompression";

export interface ReceiptModalProps {
  isOpen: boolean;
  imageUrl: string;
  blob?: Blob | null;
  title?: string;
  onClose: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  imageUrl,
  blob,
  title = "Receipt",
  onClose,
  onReplace,
  onRemove,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Full-screen receipt viewer"
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between text-white pb-3 pt-1 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{title}</span>
            {blob && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                {formatFileSize(blob.size)}
              </span>
            )}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/20 hover:bg-white/30 text-white w-9 h-9 flex items-center justify-center text-lg font-bold transition-colors"
          aria-label="Close receipt preview"
        >
          ✕
        </button>
      </div>

      {/* Main Image Display (Pinch/click to zoom) */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Receipt full-screen preview"
          className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform"
        />
      </div>

      {/* Footer bar with actions */}
      <div
        className="flex items-center justify-center gap-3 pt-3 pb-1 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {onReplace && (
          <button
            type="button"
            onClick={() => {
              onReplace();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Replace</span>
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Remove this attached receipt?")) {
                onRemove();
                onClose();
              }
            }}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 border border-neutral-600"
          >
            <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Remove</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

