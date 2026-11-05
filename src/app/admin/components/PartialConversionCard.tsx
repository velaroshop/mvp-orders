"use client";

import { useEffect, useState } from "react";
import PartialPeriodFilter from "./PartialPeriodFilter";
import { PARTIAL_PERIODS, type PartialPeriod } from "@/lib/partial-period";

interface AgentStat {
  id: string;
  name: string;
  email: string;
  converted: number;
}

interface ReturnRate {
  final: number;
  returned: number;
  rate: number;
}

interface ConversionStats {
  totalPartials: number;
  totalConverted: number;
  conversionRate: number;
  returns: { partial: ReturnRate; direct: ReturnRate } | null;
  agentBreakdown: AgentStat[];
  period: string;
}

interface PartialConversionCardProps {
  isOwner: boolean;
}

export default function PartialConversionCard({ isOwner }: PartialConversionCardProps) {
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PartialPeriod>("30");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/partial-orders/conversion-stats?period=${period}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const periodLabel = PARTIAL_PERIODS.find((o) => o.value === period)?.label || "";

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white">Rată de conversie parțiale</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Parțiale convertite în comenzi</p>
        </div>
        <PartialPeriodFilter value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-zinc-500 text-sm">Se încarcă...</p>
        </div>
      ) : stats ? (
        <>
          {/* Main metric */}
          <div className="flex items-end gap-6 flex-wrap">
            {/* Big rate */}
            <div>
              <p className="text-4xl font-bold text-white leading-none">
                {stats.conversionRate}
                <span className="text-2xl text-zinc-400">%</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1.5">
                {stats.totalConverted} convertite din {stats.totalPartials} parțiale
                {period !== "all" && ` · ${periodLabel.toLowerCase()}`}
              </p>
            </div>

            {/* Counters */}
            <div className="flex gap-4 pb-1">
              <div>
                <p className="text-xl font-bold text-green-400">{stats.totalConverted}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">Convertite</p>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <p className="text-xl font-bold text-zinc-400">{stats.totalPartials - stats.totalConverted}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">Neconvertite</p>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <p className="text-xl font-bold text-white">{stats.totalPartials}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">Total</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700"
                style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zinc-600">0%</span>
              <span className="text-[10px] text-zinc-600">100%</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Parțialele mai vechi de 30 de zile se șterg, deci „Tot” înseamnă de fapt ultimele ~30 de zile.</p>
          </div>

          {/* Return rate — only over long periods, parcels of the last weeks have no final status yet */}
          {stats.returns && (
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                Rată de retur
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white leading-none">
                    {stats.returns.partial.rate}
                    <span className="text-lg text-zinc-400">%</span>
                  </p>
                  <p className="text-xs text-zinc-300 mt-1.5">Comenzi din parțiale</p>
                  <p className="text-[10px] text-zinc-400">
                    {stats.returns.partial.returned} returnate din {stats.returns.partial.final} colete finalizate
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-400 leading-none">
                    {stats.returns.direct.rate}
                    <span className="text-lg text-zinc-400">%</span>
                  </p>
                  <p className="text-xs text-zinc-300 mt-1.5">Comenzi directe</p>
                  <p className="text-[10px] text-zinc-400">
                    {stats.returns.direct.returned} returnate din {stats.returns.direct.final} colete finalizate
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400">
                * Doar coletele livrate sau returnate; cele aflate încă în livrare nu intră în calcul.
              </p>
            </div>
          )}

          {/* Agent breakdown — owner only */}
          {isOwner && stats.agentBreakdown.length > 0 && (
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                Conversii pe agent
              </p>
              <div className="space-y-2.5">
                {stats.agentBreakdown.map((agent, i) => {
                  const pct = stats.totalPartials > 0
                    ? Math.round((agent.converted / stats.totalPartials) * 100 * 10) / 10
                    : 0;
                  const barPct = stats.totalConverted > 0
                    ? (agent.converted / stats.totalConverted) * 100
                    : 0;

                  // Color cycling for bars
                  const colors = [
                    "from-indigo-600 to-indigo-400",
                    "from-violet-600 to-violet-400",
                    "from-cyan-600 to-cyan-400",
                    "from-emerald-600 to-emerald-400",
                    "from-amber-600 to-amber-400",
                  ];
                  const color = colors[i % colors.length];

                  return (
                    <div key={agent.id}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-zinc-300">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-300 truncate">{agent.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-zinc-500">{agent.converted} comenzi</span>
                          <span className="text-xs font-semibold text-white w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-600 pt-1">
                * Bara fiecărui agent reprezintă contribuția sa din totalul conversiilor.
              </p>
            </div>
          )}

          {isOwner && stats.agentBreakdown.length === 0 && stats.totalConverted > 0 && (
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-xs text-zinc-500">Nu există date de agent disponibile.</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-zinc-500 text-sm py-4 text-center">Nu s-au putut încărca datele.</p>
      )}
    </div>
  );
}
