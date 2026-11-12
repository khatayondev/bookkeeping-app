// src/components/ReceiptThumbnailIcon.tsx
/**
 * Small receipt thumbnail icon for transaction rows.
 * Shows a compact preview thumbnail that opens the full-screen receipt modal on tap.
 */
import React, { useState } from "react";
import { useReceipt } from "../hooks/useReceipt";
import { ReceiptModal } from "./ReceiptModal";

export interface ReceiptThumbnailIconProps {
  receiptId: string;
  onReplace?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const ReceiptThumbnailIcon: React.FC<ReceiptThumbnailIconProps> = ({
  receiptId,
  onReplace,
  onRemove,
  className = "",
}) => {
  const { blob, imageUrl } = useReceipt(receiptId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!imageUrl) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={`relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-1 rounded-lg transition-all shrink-0 focus-visible:outline-primary ${className}`}
        title="View receipt"
        aria-label="View receipt"
      >
        <span className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-750 inline-block relative shadow-sm">
          <img
            src={imageUrl}
            alt="Receipt icon"
            className="w-full h-full object-cover"
          />
          <span className="absolute inset-0 bg-black/10 hover:bg-black/20" />
        </span>
      </button>

      <ReceiptModal
        isOpen={isModalOpen}
        imageUrl={imageUrl}
        blob={blob}
        title="Receipt"
        onClose={() => setIsModalOpen(false)}
        onReplace={onReplace}
        onRemove={onRemove}
      />
    </>
  );
};

