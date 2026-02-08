"use client";

import { useState } from "react";
import type { Order } from "@/lib/types";

interface CallOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onCall: (orderId: string) => Promise<void>;
}

export default function CallOrderModal({
  order,
  isOpen,
  onClose,
  onCall,
}: CallOrderModalProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callStarted, setCallStarted] = useState(false);

  if (!isOpen || !order) return null;

  function formatOrderNumber(
    orderNumber?: number,
    orderSeries?: string,
  ) {
    if (orderNumber && orderSeries) {
      const series = orderSeries.endsWith("-")
        ? orderSeries
        : `${orderSeries}-`;
      return `${series}${String(orderNumber).padStart(5, "0")}`;
    }
    return order?.id?.substring(0, 8) || "";
  }

  async function handleCall() {
    if (!order) return;
    setIsCalling(true);
    setCallError(null);

    try {
      await onCall(order.id);
      setCallStarted(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Eroare la inițierea apelului";
      setCallError(message);
    } finally {
      setIsCalling(false);
    }
  }

  function handleClose() {
    setCallStarted(false);
    setCallError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            Suna clientul
            <span className="ml-2 text-blue-400 text-sm">
              {formatOrderNumber(order.orderNumber, order.orderSeries)}
            </span>
          </h3>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Client</p>
              <p className="text-sm text-white font-medium">
                {order.fullName}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase">Telefon</p>
              <p className="text-sm text-white font-medium">{order.phone}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-zinc-400 uppercase">Produs</p>
            <p className="text-sm text-white">
              {order.productName || "N/A"} x{order.productQuantity || 1}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-zinc-400 uppercase">Adresa</p>
            <p className="text-sm text-white">
              {order.address}
              {order.streetNumber ? ` nr. ${order.streetNumber}` : ""}
              {order.city ? `, ${order.city}` : ""}
              {order.county ? `, ${order.county}` : ""}
            </p>
          </div>

          <div className="bg-zinc-700/50 rounded p-2 flex justify-between items-center">
            <span className="text-xs text-zinc-300">Total</span>
            <span className="text-sm text-white font-bold">
              {order.total?.toFixed(2)} RON
            </span>
          </div>

          {/* Previous attempts */}
          {(order.callAttempts || 0) > 0 && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded p-2">
              <p className="text-[10px] text-amber-400">
                Apeluri anterioare: {order.callAttempts}
                {order.callStatus && ` (ultimul: ${order.callStatus})`}
              </p>
            </div>
          )}

          {/* Call started */}
          {callStarted && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded p-2">
              <p className="text-xs text-blue-400 font-medium">
                Apelul a fost initiat cu succes!
              </p>
              <p className="text-[10px] text-blue-300 mt-1">
                Poti inchide acest dialog. Rezultatul va aparea automat in
                tabel.
              </p>
            </div>
          )}

          {/* Error */}
          {callError && (
            <div className="bg-red-900/20 border border-red-700/50 rounded p-2">
              <p className="text-xs text-red-400 font-medium">Eroare</p>
              <p className="text-[10px] text-red-300 mt-0.5">{callError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-600 text-xs font-medium"
          >
            {callStarted ? "Inchide" : "Anuleaza"}
          </button>
          {!callStarted && (
            <button
              onClick={handleCall}
              disabled={isCalling}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium inline-flex items-center gap-2"
            >
              {isCalling ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Se initializeaza...
                </>
              ) : (
                "Suna acum"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
