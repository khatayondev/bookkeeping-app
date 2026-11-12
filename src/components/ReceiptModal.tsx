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
            <span>🧾 {title}</span>
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
            <span>🔄</span> Replace
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
            className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>🗑️</span> Remove
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

