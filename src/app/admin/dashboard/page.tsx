"use client";

import { useEffect, useState } from "react";

interface DashboardStats {
  totalRevenue: number;
  avgOrderValue: number;
  orderCount: number;
  productsSold: number;
  upsellRate: number;
  ordersByStatus: Record<string, number>;
}

interface LandingPage {
  id: string;
  name: string;
}

type QuickFilter = "today" | "yesterday" | "last3days" | "wtd" | "mtd" | "all";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    avgOrderValue: 0,
    orderCount: 0,
    productsSold: 0,
    upsellRate: 0,
    ordersByStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLandingPage, setSelectedLandingPage] = useState("all");
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);

  // Calculate date ranges for quick filters
  const getDateRange = (filter: QuickFilter): { start: string; end: string } => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    switch (filter) {
      case "today":
        return { start: todayStr, end: todayStr };

      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        return { start: yesterdayStr, end: yesterdayStr };
      }

      case "last3days": {
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
        const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];
        return { start: threeDaysAgoStr, end: todayStr };
      }

      case "wtd": {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split("T")[0];
        return { start: weekStartStr, end: todayStr };
      }

      case "mtd": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthStartStr = monthStart.toISOString().split("T")[0];
        return { start: monthStartStr, end: todayStr };
      }

      case "all":
        return { start: "2000-01-01", end: todayStr };

      default:
        return { start: todayStr, end: todayStr };
    }
  };

  // Fetch landing pages
  useEffect(() => {
    const fetchLandingPages = async () => {
      try {
        const response = await fetch("/api/landing-pages");
        if (response.ok) {
          const data = await response.json();
          setLandingPages(data.landingPages || []);
        }
      } catch (error) {
        console.error("Error fetching landing pages:", error);
      }
    };
    fetchLandingPages();
  }, []);

  // Fetch stats when filters change
  const fetchStats = async (start?: string, end?: string, landingPage?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("startDate", start || startDate);
      params.set("endDate", end || endDate);
      params.set("landingPage", landingPage || selectedLandingPage);

      console.log("Fetching dashboard stats with params:", {
        startDate: start || startDate,
        endDate: end || endDate,
        landingPage: landingPage || selectedLandingPage,
      });

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Dashboard stats received:", data);
        setStats(data);
      } else {
        console.error("Failed to fetch stats:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-apply quick filters
  useEffect(() => {
    const { start, end } = getDateRange(quickFilter);
    console.log("Quick filter changed:", quickFilter, "Date range:", { start, end });
    setStartDate(start);
    setEndDate(end);
    fetchStats(start, end, selectedLandingPage);
  }, [quickFilter]);

  // Handle manual Apply Filters
  const handleApplyFilters = () => {
    fetchStats(startDate, endDate, selectedLandingPage);
  };

  // Handle quick filter button click
  const handleQuickFilterClick = (filter: QuickFilter) => {
    setQuickFilter(filter);
  };

  // Status configuration with colors
  const statusConfig = [
    { key: "pending", label: "Pending", color: "bg-yellow-500" },
    { key: "confirmed", label: "Confirmed", color: "bg-emerald-500" },
    { key: "hold", label: "Hold", color: "bg-orange-500" },
    { key: "cancelled", label: "Cancelled", color: "bg-red-500" },
    { key: "queue", label: "Queue", color: "bg-purple-500" },
    { key: "scheduled", label: "Scheduled", color: "bg-cyan-500" },
    { key: "testing", label: "Testing", color: "bg-blue-500" },
    { key: "sync_error", label: "Sync Error", color: "bg-pink-500" },
  ];

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-2">
          Overview of your store performance and key metrics
        </p>
      </div>

      {/* Main Grid: Filters & KPIs (2/3) + Orders by Status (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Filters & KPIs Card - 2/3 width */}
        <div className="lg:col-span-2 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
        {/* Filters Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Filters</h3>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "last3days", label: "Last Three Days" },
              { key: "wtd", label: "Week To Date" },
              { key: "mtd", label: "Month To Date" },
              { key: "all", label: "All Time" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleQuickFilterClick(filter.key as QuickFilter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  quickFilter === filter.key
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Manual Date & Landing Page Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Landing Page
              </label>
              <select
                value={selectedLandingPage}
                onChange={(e) => setSelectedLandingPage(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
              >
                <option value="all">All Landing Pages</option>
                {landingPages.map((lp) => (
                  <option key={lp.id} value={lp.id}>
                    {lp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-4">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* KPIs Section */}
        <div className="border-t border-zinc-700 pt-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Key Performance Indicators</h3>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">Loading stats...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {/* Total Revenue */}
              <div>
                <p className="text-xs text-zinc-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {stats.totalRevenue.toFixed(2)} RON
                </p>
              </div>

              {/* Average Order Value */}
              <div>
                <p className="text-xs text-zinc-400 mb-1">Avg. Value</p>
                <p className="text-2xl font-bold text-white">
                  {stats.avgOrderValue.toFixed(2)} RON
                </p>
              </div>

              {/* Orders */}
              <div>
                <p className="text-xs text-zinc-400 mb-1">Orders</p>
                <p className="text-2xl font-bold text-white">{stats.orderCount}</p>
              </div>

              {/* Products Sold */}
              <div>
                <p className="text-xs text-zinc-400 mb-1">Products Sold</p>
                <p className="text-2xl font-bold text-white">{stats.productsSold}</p>
              </div>

              {/* Upsell Rate */}
              <div>
                <p className="text-xs text-zinc-400 mb-1">Upsell Rate</p>
                <p className="text-2xl font-bold text-white">
                  {stats.upsellRate.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Orders by Status Card - 1/3 width */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Orders by Status</h3>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">Loading...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-zinc-700">
                <p className="text-xs font-medium text-zinc-400 uppercase">Status</p>
                <p className="text-xs font-medium text-zinc-400 uppercase text-right">Count</p>
              </div>

              {/* Status Rows */}
              {statusConfig.map((status) => {
                const count = stats.ordersByStatus[status.key] || 0;
                if (count === 0) return null;

                return (
                  <div key={status.key} className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                      <span className="text-sm text-white">{status.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-white text-right">{count}</p>
                  </div>
                );
              })}

              {/* Show message if no orders */}
              {Object.keys(stats.ordersByStatus).length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">No orders found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Revenue</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Orders</h3>
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <span className="text-xl">📦</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Conversion Rate</h3>
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Average Order Value</h3>
            <div className="w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center">
              <span className="text-xl">💵</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Customers</h3>
            <div className="w-10 h-10 rounded-full bg-pink-600/20 flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 6 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Pending Orders</h3>
            <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-8 bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          🚀 Advanced Analytics Coming Soon
        </h3>
        <p className="text-zinc-400 text-sm">
          We're working on bringing you detailed insights, charts, and reports to help you make better business decisions.
        </p>
      </div>
    </div>
  );
}
