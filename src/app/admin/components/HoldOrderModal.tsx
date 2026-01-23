"use client";

import { useState, useEffect } from "react";

interface HoldOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
  orderId: string;
}

const MAX_CHARS_PER_LINE = 20;

export default function HoldOrderModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
}: HoldOrderModalProps) {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLine1("");
      setLine2("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      // Combine lines into note (filter empty lines)
      const note = [line1.trim(), line2.trim()]
        .filter(line => line.length > 0)
        .join("\n");

      await onConfirm(note);
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
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-1">
                Linia 1 ({line1.length}/{MAX_CHARS_PER_LINE})
              </label>
              <input
                type="text"
                value={line1}
                onChange={(e) => {
                  const value = e.target.value.slice(0, MAX_CHARS_PER_LINE);
                  setLine1(value);
                  setError(null);
                }}
                maxLength={MAX_CHARS_PER_LINE}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Motivul hold-ului..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-1">
                Linia 2 ({line2.length}/{MAX_CHARS_PER_LINE})
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => {
                  const value = e.target.value.slice(0, MAX_CHARS_PER_LINE);
                  setLine2(value);
                  setError(null);
                }}
                maxLength={MAX_CHARS_PER_LINE}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Detalii adiționale..."
              />
            </div>
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
