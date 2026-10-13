"use client";

import { useState, useEffect } from "react";

interface SalesAnalysisModalProps {
  pageId: string;
  pageName: string;
  onClose: () => void;
}

export default function SalesAnalysisModal({ pageId, pageName, onClose }: SalesAnalysisModalProps) {
  const [salesData, setSalesData] = useState<any | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState(7);
  const [salesIncludeTesting, setSalesIncludeTesting] = useState(false);

  async function fetchData(period: number, includeTesting: boolean) {
    setSalesLoading(true);
    setSalesData(null);
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/sales-analysis?period=${period}&includeTesting=${includeTesting}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setSalesData(await res.json());
    } catch {
      setSalesData(null);
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    fetchData(salesPeriod, salesIncludeTesting);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-700 max-w-xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Analiză vânzări</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{pageName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Period filter + testing toggle */}
        <div className="px-5 py-3 border-b border-zinc-700/50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 mr-1">Perioadă:</span>
            {[0, 1, 3, 7, 30, 60].map((p) => (
              <button
                key={p}
                onClick={() => { setSalesPeriod(p); fetchData(p, salesIncludeTesting); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  salesPeriod === p
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                }`}
              >
                {p === 0 ? "Azi" : p === 1 ? "Ieri" : `${p} zile`}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const next = !salesIncludeTesting;
              setSalesIncludeTesting(next);
              fetchData(salesPeriod, next);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              salesIncludeTesting
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${salesIncludeTesting ? "bg-amber-400" : "bg-zinc-600"}`} />
            Testing
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {salesLoading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">Se încarcă datele...</p>
            </div>
          ) : !salesData ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">Nu s-au putut încărca datele.</p>
            </div>
          ) : salesData.totalOrders === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">Nicio comandă în această perioadă.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-xs text-zinc-300 mb-1">Total comenzi</div>
                  <div className="text-xl font-semibold text-white">{salesData.totalOrders}</div>
                  <div className="text-xs text-zinc-300 mt-0.5">
                    din care confirmate: <span className="text-emerald-400">{salesData.totalConfirmed}</span>
                    {salesData.totalTesting > 0 && (
                      <span className="ml-2 text-amber-400">· testing: {salesData.totalTesting}</span>
                    )}
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-xs text-zinc-300 mb-1">Revenue total</div>
                  <div className="text-xl font-semibold text-white">
                    {salesData.totalRevenue.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} lei
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5">toate statusurile</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-xs text-zinc-300 mb-1">AOV global</div>
                  <div className="text-xl font-semibold text-white">
                    {salesData.globalAov.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} lei
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5">valoare medie / comandă</div>
                </div>
              </div>

              {/* Offer distribution */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-2">Distribuție oferte</h4>
                <div className="space-y-2">
                  {salesData.offerStats
                    .filter((o: any) => o.count > 0)
                    .map((offer: any) => (
                      <div key={offer.code} className="bg-zinc-800/40 rounded-lg border border-zinc-700/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-white">{offer.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-300 font-medium">{offer.count} comenzi</span>
                            <span className="text-xs font-bold text-white min-w-[38px] text-right">
                              {offer.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${offer.pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-zinc-300">
                          <span>
                            Confirmate: <span className="text-emerald-400">{offer.confirmedCount}</span>
                            {offer.count > 0 && (
                              <span className="text-zinc-400"> ({offer.confirmedPct.toFixed(0)}%)</span>
                            )}
                          </span>
                          <span>
                            AOV: <span className="text-white">
                              {offer.aov.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} lei
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <p className="text-[11px] text-zinc-400">
                {salesData.includeTesting
                  ? "Include toate comenzile incl. testing."
                  : "Include toate comenzile (queue, pending, confirmed, cancelled etc.), excl. testing."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
