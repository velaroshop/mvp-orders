"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, RefreshCw, Download } from "lucide-react";
import RomaniaMap from "./RomaniaMap";
import type { CountyStat } from "@/app/api/admin/returns-map/route";

type Period = "30" | "90" | "180" | "365" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  "30": "30 zile",
  "90": "90 zile",
  "180": "6 luni",
  "365": "1 an",
  "all": "Tot timpul",
};

interface Summary {
  totalOrders: number;
  totalReturned: number;
  overallRate: number;
  totalReturnedValue: number;
  syncedOrders: number;
  noHelpshipOrders: number;
  unsyncedOrders: number;
}

export default function ReturnsMapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [period, setPeriod] = useState<Period>("90");
  const [minOrders, setMinOrders] = useState(5);
  const [stats, setStats] = useState<CountyStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: number } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) router.replace("/admin/orders");
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/returns-map?period=${period}&minOrders=${minOrders}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [period, minOrders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleBulkSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/bulk-sync-tracking", { method: "POST" });
      const data = await res.json();
      setSyncResult({ synced: data.synced ?? 0, errors: data.errors ?? 0 });
      await fetchData();
    } finally {
      setSyncing(false);
    }
  }

  // Sorted best → worst (ascending rate)
  const best = [...stats].sort((a, b) => a.returnRate - b.returnRate).slice(0, 5);
  const worst = [...stats].sort((a, b) => b.returnRate - a.returnRate).slice(0, 5);
  const allSorted = [...stats].sort((a, b) => b.returnRate - a.returnRate);

  if (status === "loading" || !session?.user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Hartă Retururi</h1>
          <p className="text-sm text-zinc-400 mt-1">Rata de retur per județ — bazat pe tracking_status din Helpship</p>
        </div>
        <button
          onClick={handleBulkSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors disabled:opacity-50"
          title="Sincronizează tracking pentru toate comenzile (rulează o singură dată pentru date istorice)"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Se sincronizează..." : "Import date istorice"}
        </button>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300">
          ✓ Sincronizare completă: <span className="text-white font-semibold">{syncResult.synced}</span> comenzi actualizate
          {syncResult.errors > 0 && <span className="text-red-400 ml-2">· {syncResult.errors} erori</span>}
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-zinc-400">Min. comenzi:</label>
          <select
            value={minOrders}
            onChange={(e) => setMinOrders(Number(e.target.value))}
            className="input py-1 text-xs w-20"
          >
            <option value={1}>1</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total comenzi</p>
            <p className="text-xl font-bold text-white mt-0.5">{summary.totalOrders.toLocaleString("ro-RO")}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total retururi</p>
            <p className="text-xl font-bold text-red-400 mt-0.5">{summary.totalReturned.toLocaleString("ro-RO")}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Rată generală</p>
            <p className={`text-xl font-bold mt-0.5 ${summary.overallRate > 20 ? "text-red-400" : summary.overallRate > 10 ? "text-amber-400" : "text-emerald-400"}`}>
              {summary.overallRate.toFixed(1)}%
            </p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Valoare pierdută</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {summary.totalReturnedValue.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
              <span className="text-sm font-normal text-zinc-400 ml-1">RON</span>
            </p>
          </div>
        </div>
      )}

      {/* Unsynced warning */}
      {summary && summary.unsyncedOrders > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-700/40 text-sm text-amber-400">
          <span>⚠</span>
          <span>
            {summary.unsyncedOrders > summary.noHelpshipOrders ? (
              <>
                <strong>{summary.unsyncedOrders - summary.noHelpshipOrders}</strong> comenzi pot fi sincronizate — apasă &ldquo;Import date istorice&rdquo;.
                {summary.noHelpshipOrders > 0 && (
                  <span className="text-amber-500/70"> · {summary.noHelpshipOrders} fără expediere Helpship (nu pot fi sincronizate).</span>
                )}
              </>
            ) : (
              <><strong>{summary.noHelpshipOrders}</strong> comenzi fără expediere Helpship — tracking indisponibil (comenzi anulate sau neexpediate).</>
            )}
          </span>
        </div>
      )}

      {/* Map */}
      <div className="card p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-zinc-400 text-sm">Se încarcă...</p>
          </div>
        ) : (
          <RomaniaMap stats={stats} />
        )}
      </div>

      {/* Top 5 best + worst */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Best */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-400">Top 5 — Rată mică de retur</h2>
          {best.length === 0 ? (
            <p className="text-zinc-500 text-xs">Date insuficiente</p>
          ) : (
            best.map((s, i) => <CountyRow key={s.county} rank={i + 1} stat={s} mode="best" />)
          )}
        </div>

        {/* Worst */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-red-400">Top 5 — Rată mare de retur</h2>
          {worst.length === 0 ? (
            <p className="text-zinc-500 text-xs">Date insuficiente</p>
          ) : (
            worst.map((s, i) => <CountyRow key={s.county} rank={i + 1} stat={s} mode="worst" />)
          )}
        </div>
      </div>

      {/* Expand all */}
      <div className="card p-4 space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Toate județele ({allSorted.length})
        </button>

        {expanded && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-500 uppercase tracking-wide px-1 pb-1 border-b border-zinc-800">
              <span>Județ</span>
              <span className="text-right">Comenzi</span>
              <span className="text-right">Retururi</span>
              <span className="text-right">Rată</span>
            </div>
            {allSorted.map((s, i) => (
              <div key={s.county} className="grid grid-cols-4 gap-2 text-sm px-1 py-0.5 rounded hover:bg-zinc-800/50">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <span className="text-zinc-600 text-xs w-4">{i + 1}</span>
                  {s.county}
                </span>
                <span className="text-right text-zinc-400">{s.totalOrders}</span>
                <span className="text-right text-zinc-400">{s.returnedOrders}</span>
                <span className={`text-right font-semibold ${s.returnRate > 20 ? "text-red-400" : s.returnRate > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  {s.returnRate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CountyRow({ rank, stat, mode }: { rank: number; stat: CountyStat; mode: "best" | "worst" }) {
  const rateColor = mode === "best"
    ? "text-emerald-400"
    : stat.returnRate > 25 ? "text-red-400" : "text-amber-400";

  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-600 text-xs w-4 shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{stat.county}</p>
        <p className="text-[10px] text-zinc-500">{stat.returnedOrders} / {stat.totalOrders} comenzi</p>
      </div>
      <span className={`text-sm font-bold shrink-0 ${rateColor}`}>
        {stat.returnRate.toFixed(1)}%
      </span>
    </div>
  );
}
