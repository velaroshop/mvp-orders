"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { AdsKPIs, AdsCampaignRow } from "@/lib/types";

type DatePreset = "today" | "yesterday" | "last3days" | "last7days" | "last30days" | "custom";

function getDateRange(preset: DatePreset): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { startDate: fmt(today), endDate: fmt(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case "last3days": {
      const s = new Date(today);
      s.setDate(s.getDate() - 2);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "last7days": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "last30days": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    default:
      return { startDate: fmt(today), endDate: fmt(today) };
  }
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getRoasColor(roas: number | null): string {
  if (roas === null) return "text-zinc-400";
  if (roas < 2.5) return "text-red-400";
  if (roas < 3.5) return "text-orange-400";
  if (roas < 5) return "text-emerald-400";
  return "text-amber-300";
}

function getRoasBg(roas: number | null): string {
  if (roas === null) return "border-zinc-700";
  if (roas < 2.5) return "border-red-700/50";
  if (roas < 3.5) return "border-orange-700/50";
  if (roas < 5) return "border-emerald-700/50";
  return "border-amber-600/50";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/20 text-emerald-400";
    case "PAUSED":
      return "bg-zinc-500/20 text-zinc-400";
    default:
      return "bg-red-500/20 text-red-400";
  }
}

type SortKey = "campaignName" | "spend" | "impressions" | "linkClicks" | "cpm" | "ctr" | "cpc" | "metaPurchases" | "metaPurchaseValue" | "metaRoas";

export default function AdsDashboardPage() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [adAccounts, setAdAccounts] = useState<Array<{ id: string; name: string; currency: string }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("last7days");
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

  const dateRange = useMemo(() => {
    if (datePreset === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return getDateRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  // Check if configured and load ad accounts
  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const hasToken = !!data.settings.meta_ads_access_token;
        if (!hasToken) {
          setIsConfigured(false);
          return;
        }
        // Fetch available ad accounts
        const accRes = await fetch("/api/ads/accounts");
        if (accRes.ok) {
          const accData = await accRes.json();
          const accounts = accData.accounts || [];
          setAdAccounts(accounts);
          // Default to saved account or first account
          const savedAccount = data.settings.meta_ads_account_id;
          if (savedAccount && accounts.some((a: any) => a.id === savedAccount)) {
            setSelectedAccountId(savedAccount);
          } else if (accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
          }
          setIsConfigured(accounts.length > 0);
        } else {
          setIsConfigured(!!data.settings.meta_ads_account_id);
          setSelectedAccountId(data.settings.meta_ads_account_id || "");
        }
      } catch {
        setIsConfigured(false);
      }
    }
    checkConfig();
  }, []);

  // Load data when date range or account changes
  useEffect(() => {
    if (isConfigured !== true || !selectedAccountId) return;
    loadData();
  }, [isConfigured, selectedAccountId, dateRange.startDate, dateRange.endDate]);

  async function loadData() {
    setIsLoadingData(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ads/campaigns?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&adAccountId=${encodeURIComponent(selectedAccountId)}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load data");
      }
      const data = await res.json();
      setKpis(data.kpis);
      setCampaigns(data.campaigns || []);
      setLastFetchedAt(data.lastFetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoadingData(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/ads/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          adAccountId: selectedAccountId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to refresh");
      }
      // Reload cached data
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/ads/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpis: filteredKpis,
          campaigns: filteredCampaigns,
          dateRange,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze");
      }
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (err) {
      setAiAnalysis(
        `Error: ${err instanceof Error ? err.message : "Failed to analyze"}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Client-side filtering
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = campaigns.filter((c) =>
        c.campaignName.toLowerCase().includes(q)
      );
    }
    // Sort
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return filtered;
  }, [campaigns, searchQuery, sortKey, sortAsc]);

  // Recalculate KPIs for filtered campaigns
  const filteredKpis = useMemo((): AdsKPIs | null => {
    if (!kpis) return null;
    // If no search filter, return original KPIs (includes real order data)
    if (!searchQuery.trim()) return kpis;

    const totalSpend = filteredCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = filteredCampaigns.reduce(
      (s, c) => s + c.impressions,
      0
    );
    const totalClicks = filteredCampaigns.reduce(
      (s, c) => s + c.linkClicks,
      0
    );
    const totalMetaRevenue = filteredCampaigns.reduce(
      (s, c) => s + c.metaPurchaseValue,
      0
    );

    return {
      adSpend: totalSpend,
      revenue: kpis.revenue, // Can't split revenue per campaign
      roas: totalSpend > 0 ? kpis.revenue / totalSpend : null,
      metaRevenue: totalMetaRevenue,
      metaRoas: totalSpend > 0 ? totalMetaRevenue / totalSpend : null,
      cpa: kpis.orders > 0 ? totalSpend / kpis.orders : null,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      ctr: totalImpressions > 0
        ? (totalClicks / totalImpressions) * 100
        : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      impressions: totalImpressions,
      linkClicks: totalClicks,
      orders: kpis.orders,
    };
  }, [kpis, filteredCampaigns, searchQuery]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-zinc-600 ml-1">{"\u21C5"}</span>;
    return (
      <span className="text-emerald-400 ml-1">
        {sortAsc ? "\u2191" : "\u2193"}
      </span>
    );
  }

  // Last synced time ago
  const lastSyncedText = useMemo(() => {
    if (!lastFetchedAt) return null;
    const diff = Date.now() - new Date(lastFetchedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }, [lastFetchedAt]);

  // Loading state
  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // Not configured state
  if (isConfigured === false) {
    return (
      <div className="max-w-2xl mx-auto mt-20">
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Meta Ads Not Connected
          </h2>
          <p className="text-zinc-400 mb-6">
            Conectează contul tău Meta Ads din Settings pentru a vizualiza
            performanța campaniilor.
          </p>
          <Link
            href="/admin/settings"
            className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ads Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Campaign performance from Meta Ads
            {lastSyncedText && (
              <span className="ml-2 text-zinc-500">
                &middot; Last synced: {lastSyncedText}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
        >
          {isRefreshing ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
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
              Refreshing...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Data
            </>
          )}
        </button>
      </div>

      {/* Ad Account Selector + Date Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {adAccounts.length > 1 && (
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {adAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["today", "Today"],
            ["yesterday", "Yesterday"],
            ["last3days", "Last 3 Days"],
            ["last7days", "Last 7 Days"],
            ["last30days", "Last 30 Days"],
            ["custom", "Custom"],
          ] as [DatePreset, string][]
        ).map(([preset, label]) => (
          <button
            key={preset}
            onClick={() => setDatePreset(preset)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              datePreset === preset
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white"
            />
            <span className="text-zinc-500">-</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white"
            />
          </div>
        )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700 rounded-md text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoadingData && !kpis && (
        <div className="flex items-center justify-center h-40">
          <div className="text-zinc-400">Loading campaign data...</div>
        </div>
      )}

      {/* KPI Cards */}
      {filteredKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <KPICard
            label="Ad Spend"
            value={`${formatNumber(filteredKpis.adSpend, 2)} RON`}
          />
          <KPICard
            label="Meta Revenue"
            value={`${formatNumber(filteredKpis.metaRevenue, 2)} RON`}
            valueColor="text-emerald-400"
          />
          <KPICard
            label="Meta ROAS"
            value={
              filteredKpis.metaRoas !== null
                ? `${filteredKpis.metaRoas.toFixed(2)}x`
                : "N/A"
            }
            valueColor={getRoasColor(filteredKpis.metaRoas)}
            borderColor={getRoasBg(filteredKpis.metaRoas)}
          />
          <KPICard
            label="CPA"
            value={
              filteredKpis.cpa !== null
                ? `${formatNumber(filteredKpis.cpa, 2)} RON`
                : "N/A"
            }
          />
          <KPICard
            label="CPM"
            value={`${formatNumber(filteredKpis.cpm, 2)} RON`}
          />
          <KPICard
            label="CTR"
            value={`${filteredKpis.ctr.toFixed(2)}%`}
          />
          <KPICard
            label="CPC"
            value={`${formatNumber(filteredKpis.cpc, 2)} RON`}
          />
          <KPICard
            label="Impressions"
            value={formatCompact(filteredKpis.impressions)}
          />
          <KPICard
            label="Link Clicks"
            value={formatCompact(filteredKpis.linkClicks)}
          />
          <KPICard
            label="Orders"
            value={filteredKpis.orders.toString()}
            valueColor="text-emerald-400"
          />
        </div>
      )}

      {/* Search + AI Button */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !filteredKpis}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
          >
            {isAnalyzing ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
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
                Analyzing...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                AI Analysis
              </>
            )}
          </button>
        </div>
      )}

      {/* Campaign Table */}
      {filteredCampaigns.length > 0 && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 text-xs uppercase">
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-white"
                    onClick={() => handleSort("campaignName")}
                  >
                    Campaign <SortIcon col="campaignName" />
                  </th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("spend")}
                  >
                    Spend <SortIcon col="spend" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("impressions")}
                  >
                    Impr. <SortIcon col="impressions" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("linkClicks")}
                  >
                    Clicks <SortIcon col="linkClicks" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("cpm")}
                  >
                    CPM <SortIcon col="cpm" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("ctr")}
                  >
                    CTR <SortIcon col="ctr" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("cpc")}
                  >
                    CPC <SortIcon col="cpc" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("metaPurchases")}
                  >
                    Purch. <SortIcon col="metaPurchases" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("metaPurchaseValue")}
                  >
                    Meta Rev. <SortIcon col="metaPurchaseValue" />
                  </th>
                  <th
                    className="px-3 py-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("metaRoas")}
                  >
                    ROAS <SortIcon col="metaRoas" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {filteredCampaigns.map((c) => (
                  <tr
                    key={c.campaignId}
                    className="hover:bg-zinc-750 hover:bg-zinc-700/30"
                  >
                    <td className="px-4 py-2.5 text-white font-medium max-w-[250px] truncate">
                      {c.campaignName}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(c.campaignStatus)}`}
                      >
                        {c.campaignStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {formatNumber(c.spend, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {formatCompact(c.impressions)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {formatCompact(c.linkClicks)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {formatNumber(c.cpm, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {c.ctr.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {formatNumber(c.cpc, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {c.metaPurchases}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-300">
                      {formatNumber(c.metaPurchaseValue, 2)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${getRoasColor(c.metaRoas)}`}>
                      {c.metaRoas !== null ? `${c.metaRoas.toFixed(2)}x` : "—"}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-zinc-900/50 font-medium">
                  <td className="px-4 py-2.5 text-white">
                    TOTAL ({filteredCampaigns.length} campaigns)
                  </td>
                  <td />
                  <td className="px-3 py-2.5 text-right text-white">
                    {formatNumber(
                      filteredCampaigns.reduce((s, c) => s + c.spend, 0),
                      2
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {formatCompact(
                      filteredCampaigns.reduce((s, c) => s + c.impressions, 0)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {formatCompact(
                      filteredCampaigns.reduce((s, c) => s + c.linkClicks, 0)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {filteredKpis ? formatNumber(filteredKpis.cpm, 2) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {filteredKpis ? `${filteredKpis.ctr.toFixed(2)}%` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {filteredKpis ? formatNumber(filteredKpis.cpc, 2) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {filteredCampaigns.reduce(
                      (s, c) => s + c.metaPurchases,
                      0
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white">
                    {formatNumber(
                      filteredCampaigns.reduce((s, c) => s + c.metaPurchaseValue, 0),
                      2
                    )}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${filteredKpis ? getRoasColor(filteredKpis.metaRoas) : "text-white"}`}>
                    {filteredKpis?.metaRoas !== null && filteredKpis?.metaRoas !== undefined
                      ? `${filteredKpis.metaRoas.toFixed(2)}x`
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No data */}
      {!isLoadingData && kpis && campaigns.length === 0 && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">
            No campaign data for this period. Click{" "}
            <strong className="text-white">Refresh Data</strong> to pull from
            Meta.
          </p>
        </div>
      )}

      {/* AI Analysis Panel */}
      {showAnalysis && (
        <div className="bg-zinc-800 rounded-lg border border-blue-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-900/20 border-b border-blue-700/50">
            <h3 className="text-sm font-medium text-blue-300 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              AI Analysis
            </h3>
            <button
              onClick={() => setShowAnalysis(false)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>
          <div className="p-4">
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <svg
                  className="w-4 h-4 animate-spin"
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
                Analyzing campaign data...
              </div>
            ) : aiAnalysis ? (
              <div className="prose prose-invert prose-sm max-w-none text-zinc-300 whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            ) : null}
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
  borderColor = "border-zinc-700",
}: {
  label: string;
  value: string;
  valueColor?: string;
  borderColor?: string;
}) {
  return (
    <div
      className={`bg-zinc-800 rounded-lg border ${borderColor} p-3`}
    >
      <p className="text-[10px] text-zinc-500 uppercase font-medium mb-1">
        {label}
      </p>
      <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
