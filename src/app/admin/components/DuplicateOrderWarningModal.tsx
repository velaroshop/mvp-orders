"use client";

import Link from "next/link";
import type { Order } from "@/lib/types";

interface DuplicateOrderWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  duplicateOrders: Order[];
  duplicateOrderDays: number;
  customerId: string;
}

export default function DuplicateOrderWarningModal({
  isOpen,
  onClose,
  onProceed,
  duplicateOrders,
  duplicateOrderDays,
  customerId,
}: DuplicateOrderWarningModalProps) {
  if (!isOpen) return null;

  // Show only first 3 orders
  const displayOrders = duplicateOrders.slice(0, 3);
  const remainingCount = duplicateOrders.length - 3;

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "azi";
    if (diffInDays === 1) return "ieri";
    return `acum ${diffInDays} zile`;
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "confirmed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "hold":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "sync_error":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      completed: "Completed",
      cancelled: "Cancelled",
      hold: "Hold",
      sync_error: "Sync Error",
    };
    return labels[status] || status;
  }

  function formatOrderNumber(order: Order) {
    if (order.orderNumber && order.orderSeries) {
      const series = order.orderSeries.endsWith('-') ? order.orderSeries : `${order.orderSeries}-`;
      return `${series}${String(order.orderNumber).padStart(5, "0")}`;
    }
    if (order.orderNumber) {
      return `#${order.orderNumber}`;
    }
    return `#${order.id.substring(0, 8)}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-zinc-900 rounded-lg shadow-xl border border-zinc-700">
        {/* Header */}
        <div className="bg-amber-600/90 text-white px-4 py-2.5 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-sm font-semibold">Duplicate Orders Detected</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-zinc-300 mb-3">
            This customer has{" "}
            <span className="text-amber-400 font-bold">{duplicateOrders.length}</span>{" "}
            {duplicateOrders.length === 1 ? "order" : "orders"} in the last {duplicateOrderDays} days:
          </p>

          {/* Orders List - Compact */}
          <div className="space-y-2 mb-3">
            {displayOrders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-800 border border-zinc-700 rounded p-2.5 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white whitespace-nowrap">
                      {formatOrderNumber(order)}
                    </span>
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium border ${getStatusColor(order.status)}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                    {order.total.toFixed(2)} RON
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-400 truncate">
                  {order.fullName} • {order.city}, {order.county}
                </div>
              </div>
            ))}
          </div>

          {/* View All Link */}
          {remainingCount > 0 && (
            <p className="text-[10px] text-zinc-500 mb-3 text-center">
              +{remainingCount} more {remainingCount === 1 ? "order" : "orders"}
            </p>
          )}

          <Link
            href={`/admin/customers/${customerId}`}
            className="block w-full text-center px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded hover:bg-blue-500/20 transition-colors mb-3"
            onClick={onClose}
          >
            View All Customer Orders →
          </Link>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onProceed}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors"
            >
              Confirm Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
