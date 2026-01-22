"use client";

import type { Order } from "@/lib/types";

interface ConfirmScheduledOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isConfirming: boolean;
}

function formatOrderNumber(orderNumber: number | undefined, orderSeries: string | undefined, orderId: string): string {
  if (orderNumber && orderSeries) {
    return `${orderSeries}${String(orderNumber).padStart(5, "0")}`;
  }
  return orderId.substring(0, 8);
}

export default function ConfirmScheduledOrderModal({
  order,
  isOpen,
  onClose,
  onConfirm,
  isConfirming,
}: ConfirmScheduledOrderModalProps) {
  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  // Debug logging
  console.log('[ConfirmScheduledOrderModal] order:', order);
  console.log('[ConfirmScheduledOrderModal] scheduledDate:', order.scheduledDate);
  console.log('[ConfirmScheduledOrderModal] scheduledDate type:', typeof order.scheduledDate);

  const scheduledDateFormatted = order.scheduledDate
    ? (() => {
        // Parse YYYY-MM-DD format correctly (add time to avoid timezone issues)
        const dateStr = order.scheduledDate.includes('T')
          ? order.scheduledDate
          : `${order.scheduledDate}T12:00:00`;
        const date = new Date(dateStr);

        console.log('[ConfirmScheduledOrderModal] dateStr:', dateStr);
        console.log('[ConfirmScheduledOrderModal] parsed date:', date);
        console.log('[ConfirmScheduledOrderModal] isValid:', !isNaN(date.getTime()));

        // Check if date is valid
        if (isNaN(date.getTime())) {
          return order.scheduledDate; // Fallback to raw string
        }

        const formatted = date.toLocaleDateString("ro-RO", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        console.log('[ConfirmScheduledOrderModal] formatted:', formatted);

        return formatted;
      })()
    : "N/A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">
            Confirm Scheduled Order
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-md p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">
                  Order: <span className="text-cyan-400">{formatOrderNumber(order.orderNumber, order.orderSeries, order.id)}</span>
                </p>
                <p className="text-sm text-zinc-300 mt-1">
                  Scheduled for:{" "}
                  <span className="text-white font-medium">{scheduledDateFormatted}</span>
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-zinc-300">
            Are you sure you want to confirm this order now? This will process the order
            immediately instead of waiting for the scheduled date.
          </p>

          {order.fullName && (
            <div className="bg-zinc-800/50 rounded-md p-3 space-y-1">
              <p className="text-xs text-zinc-400">Customer Details:</p>
              <p className="text-sm text-white font-medium">{order.fullName}</p>
              {order.phone && (
                <p className="text-sm text-zinc-300">{order.phone}</p>
              )}
              {order.city && order.county && (
                <p className="text-sm text-zinc-300">
                  {order.city}, {order.county}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-700 hover:bg-zinc-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Confirming...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Confirm Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
