"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface AnalyticsSummary {
  totalSessions: number;
  purchased: number;
  abandoned: number;
  formStarted: number;
  conversionRate: string;
  formStartRate: string;
  avgTimeOnPage: number;
  avgScrollMax: number;
  abandonFields: Record<string, number>;
  offerDistribution: Record<string, number>;
  deviceBreakdown: Record<string, number>;
}

interface LandingPageOption {
  id: string;
  name: string;
  slug: string;
  analytics_tracking: boolean;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isSuperadmin = useMemo(() => {
    const userRole = (session?.user as any)?.activeRole;
    const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;
    return userRole === "owner" && isSuperadminOrg === true;
  }, [session]);

  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperadmin) {
      router.push("/admin/orders");
    }
  }, [session, status, router, isSuperadmin]);

  const [landingPages, setLandingPages] = useState<LandingPageOption[]>([]);
  const [selectedLP, setSelectedLP] = useState<string>("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  // Fetch landing pages with analytics enabled
  useEffect(() => {
    if (!isSuperadmin) return;
    fetch("/api/landing-pages")
      .then(res => res.json())
      .then(data => {
        const lps = (data.landingPages || [])
          .filter((lp: any) => lp.analytics_tracking)
          .map((lp: any) => ({ id: lp.id, name: lp.name, slug: lp.slug, analytics_tracking: lp.analytics_tracking }));
        setLandingPages(lps);
        if (lps.length > 0 && !selectedLP) setSelectedLP(lps[0].id);
      })
      .catch(console.error);
  }, [isSuperadmin]);

  // Fetch analytics data
  async function fetchAnalytics() {
    if (!selectedLP) return;
    setLoading(true);
    setAiAnalysis(null);
    try {
      const params = new URLSearchParams({
        landingPageId: selectedLP,
        startDate,
        endDate,
        limit: "500",
      });
      const res = await fetch(`/api/analytics/sessions?${params}`);
      const data = await res.json();
      setSummary(data.summary);
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedLP) fetchAnalytics();
  }, [selectedLP, startDate, endDate]);

  // AI Analysis
  async function handleAIAnalysis() {
    if (!summary) return;
    setAnalyzingAI(true);
    try {
      const lpName = landingPages.find(lp => lp.id === selectedLP)?.name || "";
      const res = await fetch("/api/analytics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          landingPageName: lpName,
          dateRange: { startDate, endDate },
        }),
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || "No analysis generated.");
    } catch (err) {
      console.error("Error analyzing:", err);
      setAiAnalysis("Eroare la generarea analizei.");
    } finally {
      setAnalyzingAI(false);
    }
  }

  async function handleDeleteSessions() {
    if (!selectedLP) return;
    const lpName = landingPages.find(lp => lp.id === selectedLP)?.name || "";
    if (!confirm(`Sigur vrei să ștergi toate sesiunile pentru "${lpName}"?\n\nAceastă acțiune este ireversibilă.`)) return;
    try {
      const res = await fetch(`/api/analytics/sessions?landingPageId=${selectedLP}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSessions([]);
      setSummary(null);
      setAiAnalysis(null);
    } catch (err) {
      console.error("Error deleting sessions:", err);
      alert("Eroare la ștergerea sesiunilor.");
    }
  }

  if (status === "loading" || !isSuperadmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-white mb-6">🔍 Visitor Analytics</h1>

      {/* Filters */}
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Landing Page</label>
            <select
              value={selectedLP}
              onChange={(e) => setSelectedLP(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-white min-w-[200px]"
            >
              {landingPages.length === 0 && <option value="">No tracked pages</option>}
              {landingPages.map(lp => (
                <option key={lp.id} value={lp.id}>{lp.name} ({lp.slug})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-white"
            />
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleDeleteSessions}
            disabled={!selectedLP || !sessions.length}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🗑️ Șterge sesiunile
          </button>
        </div>
      </div>

      {landingPages.length === 0 && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Nu ai landing pages cu analytics tracking activat.</p>
          <p className="text-zinc-500 text-sm mt-2">Activează tracking-ul din Landing Pages → toggle-ul 📊 Analytics Tracking.</p>
        </div>
      )}

      {loading && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Se încarcă datele...</p>
        </div>
      )}

      {!loading && summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-1">Total Sesiuni</p>
              <p className="text-2xl font-bold text-white">{summary.totalSessions}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-1">Conversie</p>
              <p className="text-2xl font-bold text-emerald-400">{summary.conversionRate}%</p>
              <p className="text-xs text-zinc-500">{summary.purchased} comenzi</p>
            </div>
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-1">Form Started</p>
              <p className="text-2xl font-bold text-blue-400">{summary.formStartRate}%</p>
              <p className="text-xs text-zinc-500">{summary.formStarted} sesiuni</p>
            </div>
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-1">Abandonuri</p>
              <p className="text-2xl font-bold text-red-400">{summary.abandoned}</p>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-1">Timp Mediu pe Pagină</p>
              <p className="text-xl font-bold text-white">{summary.avgTimeOnPage}s</p>
            </div>
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-1">Scroll Mediu</p>
              <p className="text-xl font-bold text-white">{summary.avgScrollMax}%</p>
            </div>
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-2">Dispozitive</p>
              <div className="space-y-1">
                {Object.entries(summary.deviceBreakdown).map(([device, count]) => (
                  <div key={device} className="flex justify-between text-sm">
                    <span className="text-zinc-300">{device}</span>
                    <span className="text-white font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Abandon Fields + Offer Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-3">Câmpuri Abandon (unde se opresc)</p>
              {Object.keys(summary.abandonFields).length === 0 ? (
                <p className="text-sm text-zinc-500 italic">Nu sunt date suficiente</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(summary.abandonFields)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([field, count]) => (
                      <div key={field} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="text-zinc-300">{field}</span>
                            <span className="text-red-400 font-medium">{count as number}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${Math.min(100, ((count as number) / summary.totalSessions) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
              <p className="text-xs text-zinc-400 mb-3">Distribuție Oferte</p>
              {Object.keys(summary.offerDistribution).length === 0 ? (
                <p className="text-sm text-zinc-500 italic">Nu sunt date suficiente</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(summary.offerDistribution)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([offer, count]) => (
                      <div key={offer} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="text-zinc-300">{offer}</span>
                            <span className="text-blue-400 font-medium">{count as number}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(100, ((count as number) / summary.totalSessions) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">🤖 Analiză AI</h3>
              <button
                onClick={handleAIAnalysis}
                disabled={analyzingAI || !summary || summary.totalSessions === 0}
                className="px-4 py-1.5 bg-violet-600 text-white rounded text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzingAI ? "Se analizează..." : "Generează Analiză"}
              </button>
            </div>
            {aiAnalysis ? (
              <div className="prose prose-sm prose-invert max-w-none text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed">
                {aiAnalysis}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">
                {summary.totalSessions === 0
                  ? "Nu sunt sesiuni în perioada selectată."
                  : "Apasă \"Generează Analiză\" pentru a primi insights de la AI."}
              </p>
            )}
          </div>

          {/* Recent Sessions Table */}
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
            <div className="p-4 border-b border-zinc-700">
              <h3 className="text-sm font-semibold text-white">Sesiuni Recente ({sessions.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-700 bg-zinc-900 text-xs text-zinc-400 uppercase">
                  <tr>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Scroll</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Form</th>
                    <th className="px-3 py-2">Abandon At</th>
                    <th className="px-3 py-2">Offer</th>
                    <th className="px-3 py-2">Outcome</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 50).map((s) => (
                    <tr key={s.id} className="border-t border-zinc-700/50 text-xs text-zinc-300">
                      <td className="px-3 py-2">{s.device || "-"}</td>
                      <td className="px-3 py-2">{s.scroll_max || 0}%</td>
                      <td className="px-3 py-2">{s.time_on_page || 0}s</td>
                      <td className="px-3 py-2">
                        {s.form_started ? (
                          <span className="text-emerald-400">{(s.fields_completed || []).length} câmpuri</span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {s.field_abandoned_at ? (
                          <span className="text-red-400">{s.field_abandoned_at}</span>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2">{s.offer_selected || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.outcome === "purchased"
                            ? "bg-emerald-600 text-white"
                            : "bg-red-600/20 text-red-400"
                        }`}>
                          {s.outcome}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {new Date(s.created_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">Nu sunt sesiuni înregistrate.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
