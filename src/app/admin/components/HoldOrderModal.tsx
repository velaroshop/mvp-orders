"use client";

import { useState, useEffect } from "react";

interface HoldOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
  orderId: string;
}

export default function HoldOrderModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
}: HoldOrderModalProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetează state-ul când modalul se deschide sau când se schimbă comanda
  useEffect(() => {
    if (isOpen) {
      setNote("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validare: maxim 2 linii
    const lines = note.split("\n").filter(line => line.trim().length > 0);
    if (lines.length > 2) {
      setError("Nota poate avea maxim 2 linii");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(note.trim());
      setNote(""); // Reset după succes
      onClose();
    } catch (err) {
      console.error("Error holding order:", err);
      setError(err instanceof Error ? err.message : "Eroare la punerea comenzii pe hold");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">ORDER HOLD</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-900 mb-2">
              Notă (maxim 2 linii)
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
              rows={2}
              maxLength={200}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Introduceți nota pentru această comandă..."
            />
            <p className="text-xs text-zinc-500 mt-1">
              {note.split("\n").filter(line => line.trim().length > 0).length} / 2 linii
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {isSubmitting ? "Se salvează..." : "Hold Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
