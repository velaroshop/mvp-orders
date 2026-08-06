"use client";

import { useState, useEffect } from "react";

interface ScoreData {
  score: number | null;
  level: "NEW" | "PERFECT" | "GOOD" | "POOR" | "BAD";
  totalOrders?: number;
  ordersList12Months?: number;
  resolvedLast12Months?: number;
  returnedLast12Months?: number;
  returnRatePercent?: number;
  firstOrderAt?: string | null;
  lastOrderAt?: string | null;
  phone?: string;
}

const LEVEL_CONFIG = {
  NEW: { color: "bg-zinc-500", border: "border-zinc-400", text: "text-zinc-300", label: "NEW" },
  PERFECT: { color: "bg-emerald-500", border: "border-emerald-400", text: "text-emerald-300", label: "PERFECT" },
  GOOD: { color: "bg-blue-500", border: "border-blue-400", text: "text-blue-300", label: "GOOD" },
  POOR: { color: "bg-amber-500", border: "border-amber-400", text: "text-amber-300", label: "POOR" },
  BAD: { color: "bg-red-500", border: "border-red-400", text: "text-red-300", label: "BAD" },
};

// Small dot for orders table
export function ScoreDot({ orderId }: { orderId: string }) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}/customer-score`);
        if (res.ok && !cancelled) {
          setData(await res.json());
        }
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [orderId]);

  if (!data) return null;

  const config = LEVEL_CONFIG[data.level] || LEVEL_CONFIG.NEW;

  return (
    <div className="relative inline-block">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${config.color} cursor-default`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-zinc-200 whitespace-nowrap z-50 shadow-lg">
          {data.level === "NEW"
            ? "Client nou"
            : `Retur: ${data.returnRatePercent}% (${data.returnedLast12Months} din ${data.ordersList12Months})`
          }
        </div>
      )}
    </div>
  );
}

// Full banner for modal
export function ScoreBanner({ orderId }: { orderId: string }) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}/customer-score`);
        if (res.ok && !cancelled) {
          setData(await res.json());
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-700/50 rounded-md mb-3">
        <div className="w-3 h-3 rounded-full bg-zinc-600 animate-pulse" />
        <span className="text-xs text-zinc-500">Se incarca scorul...</span>
      </div>
    );
  }

  if (!data) return null;

  const config = LEVEL_CONFIG[data.level] || LEVEL_CONFIG.NEW;

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => data.level !== "NEW" && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border ${
          data.level === "BAD" ? "bg-red-900/20 border-red-700/50" :
          data.level === "POOR" ? "bg-amber-900/20 border-amber-700/50" :
          data.level === "NEW" ? "bg-zinc-700/30 border-zinc-600/50" :
          "bg-zinc-700/30 border-zinc-600/50"
        } ${data.level !== "NEW" ? "cursor-pointer hover:bg-zinc-700/50" : "cursor-default"}`}
      >
        <span className={`inline-block w-3 h-3 rounded-full ${config.color}`} />
        <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
        {data.level !== "NEW" ? (
          <span className="text-xs text-zinc-400 ml-1">
            Retur: {data.returnRatePercent}% ({data.returnedLast12Months} din {data.ordersList12Months} comenzi, 12 luni)
          </span>
        ) : (
          <span className="text-xs text-zinc-500 ml-1">Client nou — fara istoric</span>
        )}
        {data.level !== "NEW" && (
          <svg className={`w-3 h-3 ml-auto text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {expanded && data.level !== "NEW" && (
        <div className="mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-400">Total comenzi (all time)</span>
            <span className="text-white">{data.totalOrders}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Comenzi 12 luni</span>
            <span className="text-white">{data.ordersList12Months}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Livrate cu succes</span>
            <span className="text-emerald-400">{data.resolvedLast12Months}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Returnate</span>
            <span className="text-red-400">{data.returnedLast12Months}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-700 pt-1">
            <span className="text-zinc-400">Rata retur</span>
            <span className={`font-semibold ${config.text}`}>{data.returnRatePercent}%</span>
          </div>
          {data.firstOrderAt && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Prima comanda</span>
              <span className="text-zinc-300">{new Date(data.firstOrderAt).toLocaleDateString("ro-RO")}</span>
            </div>
          )}
          {data.lastOrderAt && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Ultima comanda</span>
              <span className="text-zinc-300">{new Date(data.lastOrderAt).toLocaleDateString("ro-RO")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
