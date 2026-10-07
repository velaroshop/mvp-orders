"use client";

import { useEffect, useState } from "react";

interface PartialStats {
  today: number;
  yesterday: number;
  last7days: number;
  last30days: number;
  total: number;
  trend: number | null; // % change today vs yesterday, null if no yesterday data
}

export default function PartialStatsCard() {
  const [stats, setStats] = useState<PartialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/partial-orders/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Volum parțiale</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Formulare abandonate capturate</p>
        </div>
        {!loading && stats && stats.trend !== null && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shrink-0 ${
              stats.trend >= 0
                ? "bg-emerald-900/40 text-emerald-400"
                : "bg-red-900/40 text-red-400"
            }`}
          >
            <span>{stats.trend >= 0 ? "↑" : "↓"}</span>
            <span>{Math.abs(stats.trend)}% vs ieri</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-zinc-500 text-sm">Se încarcă...</p>
        </div>
      ) : stats ? (
        <>
          {/* Today + Yesterday — prominent */}
          <div className="flex gap-4">
            <div className="flex-1 bg-zinc-800/60 rounded-xl p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Azi</p>
              <p className="text-3xl font-bold text-white leading-none">{stats.today}</p>
            </div>
            <div className="flex-1 bg-zinc-800/60 rounded-xl p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Ieri</p>
              <p className="text-3xl font-bold text-zinc-400 leading-none">{stats.yesterday}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* 7 zile / 30 zile / Total */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "7 zile", value: stats.last7days },
              { label: "30 zile", value: stats.last30days },
              { label: "Total", value: stats.total },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-lg font-bold text-white">{item.value.toLocaleString("ro-RO")}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Daily average (last 30 days) */}
          <div className="border-t border-zinc-800 pt-3">
            <p className="text-[11px] text-zinc-500 text-center">
              Medie zilnică (30 zile):{" "}
              <span className="text-zinc-300 font-semibold">
                {(stats.last30days / 30).toFixed(1)} parțiale/zi
              </span>
            </p>
          </div>
        </>
      ) : (
        <p className="text-zinc-500 text-sm py-4 text-center">Nu s-au putut încărca datele.</p>
      )}
    </div>
  );
}
