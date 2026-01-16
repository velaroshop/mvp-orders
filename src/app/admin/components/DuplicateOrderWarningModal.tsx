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

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    return `${diffInDays} ${diffInDays === 1 ? "zi" : "zile"}`;
  }

  function formatPrice(price: number) {
    return price.toFixed(2);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400";
      case "confirmed":
        return "bg-blue-500/20 text-blue-400";
      case "pending":
        return "bg-amber-500/20 text-amber-400";
      case "cancelled":
        return "bg-red-500/20 text-red-400";
      case "hold":
        return "bg-purple-500/20 text-purple-400";
      case "sync_error":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "În așteptare",
      confirmed: "Confirmat",
      processing: "În procesare",
      shipped: "Expediat",
      completed: "Livrat",
      cancelled: "Anulat",
      hold: "În așteptare",
      sync_error: "Eroare sincronizare",
    };
    return labels[status] || status;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6"
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
            <h2 className="text-xl font-semibold">Atenție: Comenzi Duplicate Detectate</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-zinc-900 font-medium">
              Acest client mai are{" "}
              <span className="text-amber-600 font-bold">
                {duplicateOrders.length}{" "}
                {duplicateOrders.length === 1 ? "comandă" : "comenzi"}
              </span>{" "}
              în ultimele {duplicateOrderDays} zile:
            </p>
          </div>

          {/* Orders List */}
          <div className="space-y-3 mb-6">
            {duplicateOrders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-zinc-900">
                        #{order.orderNumber || order.id.substring(0, 8)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        acum {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-700">
                      <p className="font-medium">{order.fullName}</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {order.address}, {order.city}, {order.county}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-600">
                      {formatPrice(order.total)} RON
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900">
              <strong>Recomandare:</strong> Verifică istoricul complet al clientului
              înainte de a confirma această comandă pentru a evita comenzile duplicate.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/admin/customers/${customerId}`}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              onClick={onClose}
            >
              Vezi Toate Comenzile Clientului →
            </Link>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={onProceed}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
              >
                Confirmă Oricum
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
