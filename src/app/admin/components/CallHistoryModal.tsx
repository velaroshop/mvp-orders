"use client";

import { useState, useEffect } from "react";
import type { Order } from "@/lib/types";

interface PhoneCall {
  id: string;
  vapi_call_id: string;
  attempt_number: number;
  status: string;
  result: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  summary: string | null;
  structured_data: Record<string, unknown> | null;
  recording_url: string | null;
  cost: number | null;
  created_at: string;
  ended_at: string | null;
}

interface CallHistoryModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatOrderNumber(orderNumber?: number, orderSeries?: string) {
  if (orderNumber && orderSeries) {
    const series = orderSeries.endsWith("-")
      ? orderSeries
      : `${orderSeries}-`;
    return `${series}${String(orderNumber).padStart(5, "0")}`;
  }
  return "";
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string, result: string | null) {
  const key = result || status;
  switch (key) {
    case "confirmed":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    case "address_corrected":
      return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    case "cancelled":
      return "bg-red-500/20 text-red-400 border-red-500/50";
    case "no_answer":
      return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "needs_review":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "calling":
      return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    case "failed":
      return "bg-red-500/20 text-red-400 border-red-500/50";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/50";
  }
}

function getStatusLabel(status: string, result: string | null) {
  const key = result || status;
  switch (key) {
    case "confirmed":
      return "Confirmat";
    case "address_corrected":
      return "Adresă corectată";
    case "cancelled":
      return "Anulat";
    case "no_answer":
      return "Nu răspunde";
    case "needs_review":
      return "Necesită review";
    case "calling":
      return "Se apelează...";
    case "failed":
      return "Eșuat";
    case "completed":
      return "Completat";
    default:
      return key;
  }
}

export default function CallHistoryModal({
  order,
  isOpen,
  onClose,
}: CallHistoryModalProps) {
  const [calls, setCalls] = useState<PhoneCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !order) {
      setCalls([]);
      setExpandedCall(null);
      return;
    }

    async function fetchCalls() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${order!.id}/calls`);
        if (!res.ok) throw new Error("Eroare la încărcarea apelurilor");
        const data = await res.json();
        setCalls(data.calls || []);
        // Auto-expand the latest call
        if (data.calls?.length > 0) {
          setExpandedCall(data.calls[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Eroare la încărcarea apelurilor",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Extract corrected address from the latest call's structured_data
  function getCorrectedAddress(call: PhoneCall): string | null {
    const sd = call.structured_data;
    if (!sd || !sd.correctedAddress) return null;
    const addr = sd.correctedAddress as Record<string, string>;
    const parts = [
      addr.street,
      addr.streetNumber ? `nr. ${addr.streetNumber}` : null,
      addr.city,
      addr.county,
      addr.postalCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 max-w-lg w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-white">
              Istoric apeluri
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {order.fullName}
              {order.orderNumber && (
                <span className="ml-2 text-blue-400">
                  {formatOrderNumber(order.orderNumber, order.orderSeries)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <svg
                className="w-5 h-5 animate-spin text-zinc-400"
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
              <span className="text-zinc-400 text-xs ml-2">Se încarcă...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded p-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && calls.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-400 text-sm">
                Nu există apeluri pentru această comandă.
              </p>
            </div>
          )}

          {!loading && calls.length > 0 && (
            <div className="space-y-3">
              {calls.map((call) => {
                const isExpanded = expandedCall === call.id;
                const correctedAddress = getCorrectedAddress(call);

                return (
                  <div
                    key={call.id}
                    className="border border-zinc-700 rounded-lg overflow-hidden"
                  >
                    {/* Call header - clickable */}
                    <button
                      onClick={() =>
                        setExpandedCall(isExpanded ? null : call.id)
                      }
                      className="w-full px-3 py-2.5 flex items-center justify-between bg-zinc-700/30 hover:bg-zinc-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">
                          #{call.attempt_number}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(call.status, call.result)}`}
                        >
                          {getStatusLabel(call.status, call.result)}
                        </span>
                        {call.duration_seconds && (
                          <span className="text-[10px] text-zinc-500">
                            {formatDuration(call.duration_seconds)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">
                          {formatDate(call.created_at)}
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 py-3 space-y-3 border-t border-zinc-700">
                        {/* Corrected address */}
                        {(call.result === "address_corrected" ||
                          correctedAddress) && (
                          <div className="bg-blue-900/20 border border-blue-700/50 rounded p-2">
                            <p className="text-[10px] text-blue-400 uppercase font-medium mb-1">
                              Adresă corectată
                            </p>
                            <p className="text-xs text-blue-200">
                              {correctedAddress || "Verifică transcriptul"}
                            </p>
                          </div>
                        )}

                        {/* Summary */}
                        {call.summary && (
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase mb-1">
                              Rezumat
                            </p>
                            <p className="text-xs text-zinc-200">
                              {call.summary}
                            </p>
                          </div>
                        )}

                        {/* Info row - only show fields that have data */}
                        {(call.duration_seconds || call.cost != null) && (
                          <div className="flex items-center gap-4">
                            {call.duration_seconds && (
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase">
                                  Durată
                                </p>
                                <p className="text-xs text-white">
                                  {formatDuration(call.duration_seconds)}
                                </p>
                              </div>
                            )}
                            {call.cost != null && (
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase">
                                  Cost
                                </p>
                                <p className="text-xs text-white">
                                  ${call.cost.toFixed(3)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Recording */}
                        {call.recording_url && (
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase mb-1">
                              Înregistrare
                            </p>
                            <audio
                              controls
                              className="w-full h-8"
                              src={call.recording_url}
                            >
                              <track kind="captions" />
                            </audio>
                          </div>
                        )}

                        {/* Transcript */}
                        {call.transcript && (
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase mb-1">
                              Transcript
                            </p>
                            <div className="bg-zinc-900 rounded p-2 max-h-48 overflow-y-auto">
                              {call.transcript.split("\n").map((line, idx) => {
                                const isUser = line.startsWith("User:");
                                const isBot = line.startsWith("AI:");
                                return (
                                  <p
                                    key={idx}
                                    className={`text-[11px] leading-relaxed ${
                                      isUser
                                        ? "text-emerald-300"
                                        : isBot
                                          ? "text-blue-300"
                                          : "text-zinc-300"
                                    }`}
                                  >
                                    {line}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-600 text-xs font-medium"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
