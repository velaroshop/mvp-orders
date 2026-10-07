"use client";

import { useEffect, useState } from "react";

interface StatusRow {
  status: string;
  count: number;
}

interface PartialStats {
  todayTotal: number;
  statusBreakdown: StatusRow[];
}

const STATUS_META: Record<string, { label: string; color: string; barColor: string }> = {
  pending:    { label: "În așteptare", color: "text-blue-400",   barColor: "from-indigo-600 to-blue-500" },
  accepted:   { label: "Acceptate",    color: "text-emerald-400", barColor: "from-emerald-600 to-emerald-400" },
  refused:    { label: "Refuzate",     color: "text-red-400",    barColor: "from-red-700 to-red-500" },
  unanswered: { label: "Fără răspuns", color: "text-orange-400", barColor: "from-orange-600 to-orange-400" },
  call_later: { label: "Sună mai târziu", color: "text-violet-400", barColor: "from-violet-600 to-violet-400" },
  duplicate:  { label: "Duplicate",    color: "text-yellow-400", barColor: "from-yellow-600 to-yellow-400" },
};

export default function PartialStatsCard() {
  const [stats, setStats] = useState<PartialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/partial-orders/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-white">Parțiale azi</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Distribuție pe statusuri</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-zinc-500 text-sm">Se încarcă...</p>
        </div>
      ) : stats ? (
        <>
          {/* Big total */}
          <div>
            <p className="text-5xl font-bold text-white leading-none">{stats.todayTotal}</p>
            <p className="text-xs text-zinc-500 mt-1.5">parțiale capturate astăzi</p>
          </div>

          {/* Status breakdown */}
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            {stats.statusBreakdown.map(({ status, count }) => {
              const meta = STATUS_META[status];
              if (!meta) return null;
              const pct = stats.todayTotal > 0 ? (count / stats.todayTotal) * 100 : 0;

              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300">{meta.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{pct.toFixed(0)}%</span>
                      <span className={`text-xs font-semibold w-6 text-right ${meta.color}`}>
                        {count}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-linear-to-r ${meta.barColor} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {stats.todayTotal === 0 && (
            <p className="text-zinc-500 text-sm text-center py-2">Nicio parțială azi încă.</p>
          )}
        </>
      ) : (
        <p className="text-zinc-500 text-sm py-4 text-center">Nu s-au putut încărca datele.</p>
      )}
    </div>
  );
}
