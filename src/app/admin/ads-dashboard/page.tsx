"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { AdsKPIs, AdsCampaignRow } from "@/lib/types";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  status: string;
}

type DatePreset = "today" | "yesterday" | "last3days" | "last7days" | "last30days" | "custom";

function getDateRange(preset: DatePreset): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (preset) {
    case "today":     return { startDate: fmt(today), endDate: fmt(today) };
    case "yesterday": { const y = new Date(today); y.setDate(y.getDate() - 1); return { startDate: fmt(y), endDate: fmt(y) }; }
    case "last3days": { const s = new Date(today); s.setDate(s.getDate() - 2); return { startDate: fmt(s), endDate: fmt(today) }; }
    case "last7days": { const s = new Date(today); s.setDate(s.getDate() - 6); return { startDate: fmt(s), endDate: fmt(today) }; }
    case "last30days":{ const s = new Date(today); s.setDate(s.getDate() - 29); return { startDate: fmt(s), endDate: fmt(today) }; }
    default:          return { startDate: fmt(today), endDate: fmt(today) };
  }
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getRoasColor(roas: number | null): string {
  if (roas === null) return "text-zinc-400";
  if (roas < 2.5)   return "text-red-400";
  if (roas < 3.5)   return "text-orange-400";
  if (roas < 5)     return "text-emerald-400";
  return "text-amber-300";
}

function getRoasBorderColor(roas: number | null): string {
  if (roas === null) return "";
  if (roas < 2.5)   return "border-red-700/50";
  if (roas < 3.5)   return "border-orange-700/50";
  if (roas < 5)     return "border-emerald-700/50";
  return "border-amber-600/50";
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE": return "badge badge-green";
    case "PAUSED": return "badge badge-zinc";
    default:       return "badge badge-red";
  }
}

// Auto-match campaigns to product by keyword overlap (weighted by spend)
function guessProductForCampaigns(campaigns: AdsCampaignRow[], products: Product[]): string | null {
  if (!products.length || !campaigns.length) return null;
  let bestId: string | null = null;
  let bestScore = 0;
  for (const product of products) {
    const productTokens = product.name
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[\s\-_.,;:!?()\[\]{}|\/]+/).filter((t) => t.length >= 4);
    if (product.sku) {
      const skuNorm = product.sku.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (skuNorm.length >= 3) productTokens.push(skuNorm);
    }
    let score = 0;
    for (const campaign of campaigns) {
      const campNorm = campaign.campaignName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const token of productTokens) {
        if (campNorm.includes(token)) { score += campaign.spend; break; }
      }
    }
    if (score > bestScore) { bestScore = score; bestId = product.id; }
  }
  return bestId;
}

type SortKey = "campaignName" | "spend" | "impressions" | "linkClicks" | "cpm" | "ctr" | "cpc" | "metaPurchases" | "metaPurchaseValue" | "metaRoas";

export default function AdsDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Superadmin-only guard
  useEffect(() => {
    if (status === "loading") return;
    const userRole = (session?.user as any)?.activeRole;
    const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;
    if (userRole !== "owner" || !isSuperadminOrg) router.push("/admin/dashboard");
  }, [session, status, router]);

  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [adAccounts, setAdAccounts] = useState<Array<{ id: string; name: string; currency: string }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [kpis, setKpis] = useState<AdsKPIs | null>(null);
  const [campaigns, setCampaigns] = useState<AdsCampaignRow[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortAsc, setSortAsc] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  const [landingPages, setLandingPages] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedLandingKey, setSelectedLandingKey] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [isAttributing, setIsAttributing] = useState(false);
  const [attributeMessage, setAttributeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === "custom" && customStart && customEnd) return { startDate: customStart, endDate: customEnd };
    return getDateRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  const isSingleDayNotToday = useMemo(() => {
    if (dateRange.startDate !== dateRange.endDate) return false;
    return dateRange.startDate !== new Date().toISOString().split("T")[0];
  }, [dateRange]);

  useEffect(() => {
    async function fetchLandingPages() {
      try {
        const res = await fetch("/api/landing-pages?limit=100");
        if (!res.ok) return;
        const data = await res.json();
        setLandingPages((data.landingPages || []).map((lp: any) => ({ id: lp.id, name: lp.name, slug: lp.slug })));
      } catch { /* silent */ }
    }
    fetchLandingPages();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) return;
        const data = await res.json();
        setProducts((data.products || []).filter((p: Product) => p.status === "active"));
      } catch { /* silent */ }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const hasToken = !!data.settings.meta_ads_access_token;
        setTokenExpiresAt(data.settings.meta_ads_token_expires_at || null);
        if (!hasToken) { setIsConfigured(false); return; }
        const accRes = await fetch("/api/ads/accounts");
        if (accRes.ok) {
          const accData = await accRes.json();
          const accounts = accData.accounts || [];
          setAdAccounts(accounts);
          setTokenExpired(false);
          const savedAccount = data.settings.meta_ads_account_id;
          if (savedAccount && accounts.some((a: any) => a.id === savedAccount)) setSelectedAccountId(savedAccount);
          else if (accounts.length > 0) setSelectedAccountId(accounts[0].id);
          setIsConfigured(accounts.length > 0);
        } else {
          setTokenExpired(true);
          const savedId = data.settings.meta_ads_account_id;
          if (savedId) { setAdAccounts([{ id: savedId, name: savedId, currency: "" }]); setSelectedAccountId(savedId); }
          setIsConfigured(!!savedId);
        }
      } catch { setIsConfigured(false); }
    }
    checkConfig();
  }, []);

  useEffect(() => {
    if (isConfigured !== true || !selectedAccountId) return;
    loadData();
  }, [isConfigured, selectedAccountId, dateRange.startDate, dateRange.endDate, selectedLandingKey]);

  async function loadData() {
    setIsLoadingData(true);
    setError(null);
    try {
      const lpParam = selectedLandingKey ? `&landingKey=${encodeURIComponent(selectedLandingKey)}` : "";
      const res = await fetch(`/api/ads/campaigns?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&adAccountId=${encodeURIComponent(selectedAccountId)}${lpParam}`);
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to load data"); }
      const data = await res.json();
      setKpis(data.kpis);
      setCampaigns(data.campaigns || []);
      setLastFetchedAt(data.lastFetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally { setIsLoadingData(false); }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/ads/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: dateRange.startDate, endDate: dateRange.endDate, adAccountId: selectedAccountId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to refresh"); }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh data");
    } finally { setIsRefreshing(false); }
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/ads/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpis: filteredKpis, campaigns: filteredCampaigns, dateRange }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to analyze"); }
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (err) {
      setAiAnalysis(`Eroare: ${err instanceof Error ? err.message : "Failed to analyze"}`);
    } finally { setIsAnalyzing(false); }
  }

  async function handleAttributeSpend() {
    if (!selectedProductId || !filteredKpis) return;
    setIsAttributing(true);
    setAttributeMessage(null);
    try {
      const res = await fetch("/api/roas/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, date: dateRange.startDate, amountSpent: filteredKpis.adSpend }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to attribute spend"); }
      const product = products.find((p) => p.id === selectedProductId);
      setAttributeMessage({ type: "success", text: `${formatNumber(filteredKpis.adSpend, 2)} RON atribuit la ${product?.name || "produs"} pentru ${dateRange.startDate}` });
      setTimeout(() => { setShowAttributeModal(false); setAttributeMessage(null); setSelectedProductId(""); setIsAttributing(false); }, 2000);
    } catch (err) {
      setAttributeMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to attribute spend" });
      setIsAttributing(false);
    }
  }

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;
    if (searchQuery.trim()) filtered = campaigns.filter((c) => c.campaignName.toLowerCase().includes(searchQuery.toLowerCase()));
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey], bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [campaigns, searchQuery, sortKey, sortAsc]);

  const filteredKpis = useMemo((): AdsKPIs | null => {
    if (!kpis) return null;
    if (!searchQuery.trim()) return kpis;
    const totalSpend = filteredCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = filteredCampaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = filteredCampaigns.reduce((s, c) => s + c.linkClicks, 0);
    const totalMetaRevenue = filteredCampaigns.reduce((s, c) => s + c.metaPurchaseValue, 0);
    return {
      adSpend: totalSpend, revenue: kpis.revenue,
      roas: totalSpend > 0 ? kpis.revenue / totalSpend : null,
      metaRevenue: totalMetaRevenue,
      metaRoas: totalSpend > 0 ? totalMetaRevenue / totalSpend : null,
      cpa: kpis.orders > 0 ? totalSpend / kpis.orders : null,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      impressions: totalImpressions, linkClicks: totalClicks, orders: kpis.orders,
    };
  }, [kpis, filteredCampaigns, searchQuery]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-zinc-600 ml-1">⇅</span>;
    return <span className="text-indigo-400 ml-1">{sortAsc ? "↑" : "↓"}</span>;
  }

  const lastSyncedText = useMemo(() => {
    if (!lastFetchedAt) return null;
    const mins = Math.floor((Date.now() - new Date(lastFetchedAt).getTime()) / 60000);
    if (mins < 1) return "acum";
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }, [lastFetchedAt]);

  const tokenExpiryInfo = useMemo(() => {
    if (!tokenExpiresAt) return null;
    const diffMs = new Date(tokenExpiresAt).getTime() - Date.now();
    if (diffMs <= 0) return { text: "Token expirat", color: "text-red-400", bgColor: "bg-red-900/30 border-red-700/50", daysLeft: 0, isExpired: true };
    const daysLeft = Math.floor(diffMs / 86400000);
    if (daysLeft <= 7) return { text: `${daysLeft}z rămase`, color: "text-amber-400", bgColor: "bg-amber-900/30 border-amber-700/50", daysLeft, isExpired: false };
    return { text: `${daysLeft}z rămase`, color: "text-zinc-400", bgColor: "bg-zinc-800 border-zinc-700", daysLeft, isExpired: false };
  }, [tokenExpiresAt]);

  async function handleRenewToken() {
    setIsRenewing(true);
    setError(null);
    try {
      const res = await fetch("/api/ads/renew-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to renew token");
      setTokenExpiresAt(data.expiresAt);
      setTokenExpired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to renew token");
    } finally { setIsRenewing(false); }
  }

  // ── Loading state ──
  if (isConfigured === null) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
        <p className="text-muted">Se încarcă...</p>
      </div>
    );
  }

  // ── Not configured ──
  if (isConfigured === false) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="section-title mb-2">Meta Ads neconectat</h2>
          <p className="text-muted mb-6">
            Conectează contul tău Meta Ads din Setări pentru a vizualiza performanța campaniilor.
          </p>
          <Link href="/admin/settings" className="btn btn-primary">
            Mergi la Setări
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard Ads</h1>
          <p className="page-subtitle">
            Performanța campaniilor Meta Ads
            {lastSyncedText && <span className="ml-2">· Actualizat: {lastSyncedText}</span>}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={isRefreshing} className="btn btn-secondary btn-sm shrink-0">
          <svg className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? "Se actualizează..." : "Actualizează"}
        </button>
      </div>

      {/* Filters card */}
      <div className="card p-4 space-y-3">
        {/* Ad account + token */}
        {adAccounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="input w-auto"
            >
              {adAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name} {acc.currency ? `(${acc.currency})` : ""}</option>
              ))}
            </select>

            {tokenExpiryInfo && (
              <>
                <span className={`flex items-center gap-1 px-2 py-1 border rounded text-[11px] ${tokenExpiryInfo.bgColor} ${tokenExpiryInfo.color}`}
                  title={tokenExpiresAt ? `Expiră: ${new Date(tokenExpiresAt).toLocaleDateString("ro-RO")}` : ""}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tokenExpiryInfo.text}
                </span>
                {!tokenExpiryInfo.isExpired && (
                  <button onClick={handleRenewToken} disabled={isRenewing}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-900/30 border border-emerald-700/50 rounded text-[11px] text-emerald-400 hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
                    title="Prelungește token-ul cu ~60 zile">
                    <svg className={`w-3 h-3 ${isRenewing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRenewing ? "..." : "Renew"}
                  </button>
                )}
                {tokenExpiryInfo.isExpired && (
                  <Link href="/admin/settings"
                    className="flex items-center gap-1 px-2 py-1 bg-amber-900/30 border border-amber-700/50 rounded text-[11px] text-amber-400 hover:bg-amber-900/50 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Setări
                  </Link>
                )}
              </>
            )}
            {tokenExpired && !tokenExpiryInfo && (
              <Link href="/admin/settings"
                className="flex items-center gap-1 px-2 py-1 bg-amber-900/30 border border-amber-700/50 rounded text-[11px] text-amber-400 hover:bg-amber-900/50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Token expirat
              </Link>
            )}
          </div>
        )}

        {/* Date presets */}
        <div className="flex flex-wrap gap-1.5">
          {([
            ["today",     "Azi"],
            ["yesterday", "Ieri"],
            ["last3days", "3 zile"],
            ["last7days", "7 zile"],
            ["last30days","30 zile"],
            ["custom",    "Custom"],
          ] as [DatePreset, string][]).map(([preset, label]) => (
            <button key={preset} onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                datePreset === preset ? "bg-indigo-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60"
              }`}>
              {label}
            </button>
          ))}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customStart}
                onChange={(e) => { const v = e.target.value; setCustomStart(v); if (v && (!customEnd || v > customEnd)) setCustomEnd(v); }}
                className="input w-auto" />
              <span className="text-zinc-500">–</span>
              <input type="date" value={customEnd}
                onChange={(e) => { const v = e.target.value; setCustomEnd(v); if (v && (!customStart || v < customStart)) setCustomStart(v); }}
                className="input w-auto" />
            </div>
          )}
        </div>

        {/* Product revenue filter */}
        {filteredKpis && landingPages.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="label mb-0 whitespace-nowrap">Revenue produs</span>
            <select value={selectedLandingKey} onChange={(e) => setSelectedLandingKey(e.target.value)} className="input w-auto">
              <option value="">Toate LP-urile</option>
              {landingPages.map((lp) => <option key={lp.id} value={lp.slug}>{lp.name}</option>)}
            </select>
            {selectedLandingKey && (
              <button onClick={() => setSelectedLandingKey("")} className="text-xs text-zinc-500 hover:text-white transition-colors">✕</button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-800/60">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoadingData && !kpis && (
        <div className="card p-10 text-center">
          <p className="text-muted text-sm">Se încarcă datele campaniilor...</p>
        </div>
      )}

      {/* KPI Cards */}
      {filteredKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <KPICard label="Cheltuieli" value={`${formatNumber(filteredKpis.adSpend, 2)} RON`} />
          <KPICard label="Revenue Meta" value={`${formatNumber(filteredKpis.metaRevenue, 2)} RON`} valueColor="text-emerald-400" />
          <KPICard label="ROAS Meta" value={filteredKpis.metaRoas !== null ? `${filteredKpis.metaRoas.toFixed(2)}x` : "N/A"}
            valueColor={getRoasColor(filteredKpis.metaRoas)} borderColor={getRoasBorderColor(filteredKpis.metaRoas)} />
          <KPICard
            label={selectedLandingKey ? `Revenue (${landingPages.find((lp) => lp.slug === selectedLandingKey)?.name ?? selectedLandingKey})` : "Revenue magazin"}
            value={`${formatNumber(filteredKpis.revenue, 2)} RON`} valueColor="text-emerald-400" />
          <KPICard
            label={selectedLandingKey ? "ROAS produs" : "ROAS magazin"}
            value={filteredKpis.roas !== null ? `${filteredKpis.roas.toFixed(2)}x` : "N/A"}
            valueColor={getRoasColor(filteredKpis.roas)} borderColor={getRoasBorderColor(filteredKpis.roas)} />
          <KPICard label="CTR" value={`${filteredKpis.ctr.toFixed(2)}%`} />
          <KPICard label="CPC" value={`${formatNumber(filteredKpis.cpc, 2)} RON`} />
          <KPICard label="Impresii" value={formatCompact(filteredKpis.impressions)} />
          <KPICard label="Clicuri" value={formatCompact(filteredKpis.linkClicks)} />
          <KPICard label="Comenzi" value={filteredKpis.orders.toString()} valueColor="text-emerald-400" />
        </div>
      )}

      {/* Search + AI */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută campanii..." className="input pl-8" />
          </div>
          <button onClick={handleAnalyze} disabled={isAnalyzing || !filteredKpis}
            className="btn btn-sm disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white border-transparent whitespace-nowrap">
            {isAnalyzing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Se analizează...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Analysis
              </>
            )}
          </button>
        </div>
      )}

      {/* Campaign Table */}
      {filteredCampaigns.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th className="cursor-pointer hover:text-white" onClick={() => handleSort("campaignName")}>
                  Campanie <SortIcon col="campaignName" />
                </th>
                <th className="text-center">Status</th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("spend")}>Spend <SortIcon col="spend" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("impressions")}>Impr. <SortIcon col="impressions" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("linkClicks")}>Clicuri <SortIcon col="linkClicks" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("cpm")}>CPM <SortIcon col="cpm" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("ctr")}>CTR <SortIcon col="ctr" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("cpc")}>CPA <SortIcon col="cpc" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("metaPurchases")}>Purch. <SortIcon col="metaPurchases" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("metaPurchaseValue")}>Meta Rev. <SortIcon col="metaPurchaseValue" /></th>
                <th className="text-right cursor-pointer hover:text-white" onClick={() => handleSort("metaRoas")}>ROAS <SortIcon col="metaRoas" /></th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((c) => (
                <tr key={c.campaignId}>
                  <td className="text-white font-medium max-w-[250px] truncate">{c.campaignName}</td>
                  <td className="text-center">
                    <span className={getStatusBadgeClass(c.campaignStatus)}>{c.campaignStatus}</span>
                  </td>
                  <td className="text-right">{formatNumber(c.spend, 2)}</td>
                  <td className="text-right">{formatCompact(c.impressions)}</td>
                  <td className="text-right">{formatCompact(c.linkClicks)}</td>
                  <td className="text-right">{formatNumber(c.cpm, 2)}</td>
                  <td className="text-right">{c.ctr.toFixed(2)}%</td>
                  <td className="text-right">{c.metaPurchases > 0 ? formatNumber(c.spend / c.metaPurchases, 2) : "—"}</td>
                  <td className="text-right">{c.metaPurchases}</td>
                  <td className="text-right">{formatNumber(c.metaPurchaseValue, 2)}</td>
                  <td className={`text-right font-medium ${getRoasColor(c.metaRoas)}`}>
                    {c.metaRoas !== null ? `${c.metaRoas.toFixed(2)}x` : "—"}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-zinc-900/60 font-semibold border-t-2 border-zinc-600">
                <td className="text-white">
                  TOTAL ({filteredCampaigns.length} campanii)
                </td>
                <td />
                <td className="text-right text-white">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{formatNumber(filteredCampaigns.reduce((s, c) => s + c.spend, 0), 2)}</span>
                    {isSingleDayNotToday && products.length > 0 && (
                      <button
                        onClick={() => {
                          if (!showAttributeModal) {
                            const guessed = guessProductForCampaigns(filteredCampaigns, products);
                            if (guessed) setSelectedProductId(guessed);
                          }
                          setShowAttributeModal(!showAttributeModal);
                          setAttributeMessage(null);
                        }}
                        title="Atribuie cheltuielile unui produs pentru ROAS"
                        className="p-0.5 rounded hover:bg-zinc-600 transition-colors text-indigo-400 hover:text-indigo-300"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
                <td className="text-right text-white">{formatCompact(filteredCampaigns.reduce((s, c) => s + c.impressions, 0))}</td>
                <td className="text-right text-white">{formatCompact(filteredCampaigns.reduce((s, c) => s + c.linkClicks, 0))}</td>
                <td className="text-right text-white">{filteredKpis ? formatNumber(filteredKpis.cpm, 2) : "–"}</td>
                <td className="text-right text-white">{filteredKpis ? `${filteredKpis.ctr.toFixed(2)}%` : "–"}</td>
                <td className="text-right text-white">{filteredKpis ? (filteredKpis.cpa !== null ? formatNumber(filteredKpis.cpa, 2) : "—") : "–"}</td>
                <td className="text-right text-white">{filteredCampaigns.reduce((s, c) => s + c.metaPurchases, 0)}</td>
                <td className="text-right text-white">{formatNumber(filteredCampaigns.reduce((s, c) => s + c.metaPurchaseValue, 0), 2)}</td>
                <td className={`text-right font-medium ${filteredKpis ? getRoasColor(filteredKpis.metaRoas) : "text-white"}`}>
                  {filteredKpis?.metaRoas != null ? `${filteredKpis.metaRoas.toFixed(2)}x` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* No data */}
      {!isLoadingData && kpis && campaigns.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-muted text-sm">
            Nicio campanie pentru perioada selectată. Apasă <strong className="text-white">Actualizează</strong> pentru a prelua date din Meta.
          </p>
        </div>
      )}

      {/* AI Analysis panel */}
      {showAnalysis && (
        <div className="card border-blue-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-900/20 border-b border-blue-700/50">
            <h3 className="text-sm font-medium text-blue-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Analysis
            </h3>
            <button onClick={() => setShowAnalysis(false)} className="text-zinc-400 hover:text-white text-xs transition-colors">
              Închide
            </button>
          </div>
          <div className="p-4">
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-muted text-sm">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Se analizează datele campaniei...
              </div>
            ) : aiAnalysis ? (
              <div className="prose prose-invert prose-sm max-w-none text-zinc-300 whitespace-pre-wrap">{aiAnalysis}</div>
            ) : null}
          </div>
        </div>
      )}

      {/* Spend Attribution Modal */}
      {showAttributeModal && isSingleDayNotToday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowAttributeModal(false); setAttributeMessage(null); setSelectedProductId(""); }} />
          <div className="relative card p-5 w-80 shadow-2xl">
            <h3 className="section-title mb-1">Atribuie cheltuieli</h3>
            <p className="text-muted text-xs mb-3">
              Atribuie <span className="text-white font-medium">{filteredKpis ? formatNumber(filteredKpis.adSpend, 2) : "0"} RON</span> unui produs pentru <span className="text-white font-medium">{dateRange.startDate}</span>
            </p>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="input mb-3">
              <option value="">Selectează produsul...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleAttributeSpend} disabled={!selectedProductId || isAttributing} className="btn btn-primary flex-1">
                {isAttributing ? "Se salvează..." : "Atribuie"}
              </button>
              <button onClick={() => { setShowAttributeModal(false); setAttributeMessage(null); setSelectedProductId(""); }} className="btn btn-secondary flex-1">
                Anulează
              </button>
            </div>
            {attributeMessage && (
              <p className={`text-xs mt-2 ${attributeMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {attributeMessage.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  valueColor = "text-white",
  borderColor = "",
}: {
  label: string;
  value: string;
  valueColor?: string;
  borderColor?: string;
}) {
  return (
    <div className={`card p-3 ${borderColor ? `border ${borderColor}` : ""}`}>
      <p className="label mb-1">{label}</p>
      <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
