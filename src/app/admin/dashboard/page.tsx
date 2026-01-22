"use client";

import { useEffect, useState } from "react";
import RevenueGrowthChart from "../components/RevenueGrowthChart";

interface ProductRevenue {
  name: string;
  revenue: number;
}

interface UpsellSplit {
  name: string;
  presale: number;
  postsale: number;
  total: number;
  presaleRevenue: number;
  postsaleRevenue: number;
  totalRevenue: number;
}

interface ProductStockAnalysis {
  name: string;
  totalSold: number;
  dailyAverage: number;
  daysInPeriod: number;
  currentStock?: number | null;
  daysUntilStockout?: number | null;
}

interface DashboardStats {
  totalRevenue: number;
  avgOrderValue: number;
  orderCount: number;
  productsSold: number;
  upsellRate: number;
  ordersByStatus: Record<string, number>;
  revenueByProduct: ProductRevenue[];
  upsellsSplit: UpsellSplit[];
  productStockAnalysis: ProductStockAnalysis[];
}

interface LandingPage {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
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
    revenueByProduct: [],
    upsellsSplit: [],
    productStockAnalysis: [],
  });
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showAllUpsells, setShowAllUpsells] = useState(false);
  const [upsellFilter, setUpsellFilter] = useState<"all" | "pre" | "post">("all");
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLandingPage, setSelectedLandingPage] = useState("all");
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Stock Analysis independent filters
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [stockAnalysisPeriod, setStockAnalysisPeriod] = useState<1 | 3 | 7 | 14>(7);
  const [stockAnalysisLoading, setStockAnalysisLoading] = useState(false);
  const [stockAnalysisData, setStockAnalysisData] = useState<ProductStockAnalysis | null>(null);

  // Revenue Growth data
  const [revenueGrowthLoading, setRevenueGrowthLoading] = useState(false);
  const [revenueGrowthData, setRevenueGrowthData] = useState<{
    hourlyRevenue: Array<{
      hour: string;
      totalRevenue: number;
      upsellRevenue: number;
      orderCount: number;
    }>;
    upsellSplit: {
      presale: number;
      postsale: number;
    };
  }>({
    hourlyRevenue: [],
    upsellSplit: { presale: 0, postsale: 0 },
  });

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

  // Fetch active products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products/active");
        if (response.ok) {
          const data = await response.json();
          const productList = data.products || [];
          setProducts(productList);

          // Auto-select first product if not already selected
          if (productList.length > 0 && !selectedProduct) {
            setSelectedProduct(productList[0].name);
          }
        } else {
          console.error("Failed to fetch products, using fallback");
          // Fallback: use productStockAnalysis from stats if available
          if (stats.productStockAnalysis.length > 0) {
            const fallbackProducts = stats.productStockAnalysis.map(p => ({
              id: p.name,
              name: p.name
            }));
            setProducts(fallbackProducts);
            if (!selectedProduct) {
              setSelectedProduct(fallbackProducts[0].name);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, [stats.productStockAnalysis]);

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

  // Fetch stock analysis for selected product
  const fetchStockAnalysis = async (product: string, period: number) => {
    if (!product) return;

    setStockAnalysisLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("productName", product);
      params.set("days", period.toString());

      const response = await fetch(`/api/dashboard/stock-analysis?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStockAnalysisData(data);
      } else {
        console.error("Failed to fetch stock analysis:", response.status);
      }
    } catch (error) {
      console.error("Error fetching stock analysis:", error);
    } finally {
      setStockAnalysisLoading(false);
    }
  };

  // Fetch revenue growth data
  const fetchRevenueGrowth = async (start: string, end: string) => {
    setRevenueGrowthLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("startDate", start);
      params.set("endDate", end);

      const response = await fetch(`/api/dashboard/revenue-growth?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRevenueGrowthData(data);
      } else {
        console.error("Failed to fetch revenue growth:", response.status);
      }
    } catch (error) {
      console.error("Error fetching revenue growth:", error);
    } finally {
      setRevenueGrowthLoading(false);
    }
  };

  // Auto-apply quick filters
  useEffect(() => {
    const { start, end } = getDateRange(quickFilter);
    console.log("Quick filter changed:", quickFilter, "Date range:", { start, end });
    setStartDate(start);
    setEndDate(end);
    fetchStats(start, end, selectedLandingPage);
    fetchRevenueGrowth(start, end);
  }, [quickFilter]);

  // Handle manual Apply Filters
  const handleApplyFilters = () => {
    fetchStats(startDate, endDate, selectedLandingPage);
    fetchRevenueGrowth(startDate, endDate);
  };

  // Handle quick filter button click
  const handleQuickFilterClick = (filter: QuickFilter) => {
    setQuickFilter(filter);
  };

  // Fetch stock analysis when product or period changes
  useEffect(() => {
    if (selectedProduct) {
      fetchStockAnalysis(selectedProduct, stockAnalysisPeriod);
    }
  }, [selectedProduct, stockAnalysisPeriod]);

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
        <div className="lg:col-span-2 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-4">
        {/* Filters Section */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-zinc-400 mb-3">Filters</h3>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1.5 mb-3">
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Landing Page
              </label>
              <select
                value={selectedLandingPage}
                onChange={(e) => setSelectedLandingPage(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
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
          <div className="mt-3">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* KPIs Section */}
        <div className="border-t border-zinc-700 pt-4">
          <h3 className="text-xs font-medium text-zinc-400 mb-3">Key Performance Indicators</h3>

          {loading ? (
            <div className="text-center py-6">
              <p className="text-zinc-400 text-sm">Loading stats...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Total Revenue */}
              <div>
                <p className="text-[10px] text-zinc-400 mb-0.5">Total</p>
                <p className="text-xl font-bold text-emerald-500">
                  {stats.totalRevenue.toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-500">RON</p>
              </div>

              {/* Average Order Value */}
              <div>
                <p className="text-[10px] text-zinc-400 mb-0.5">Avg. Value</p>
                <p className="text-xl font-bold text-white">
                  {stats.avgOrderValue.toFixed(2)} RON
                </p>
              </div>

              {/* Orders */}
              <div>
                <p className="text-[10px] text-zinc-400 mb-0.5">Orders</p>
                <p className="text-xl font-bold text-white">{stats.orderCount}</p>
              </div>

              {/* Products Sold */}
              <div>
                <p className="text-[10px] text-zinc-400 mb-0.5">Products Sold</p>
                <p className="text-xl font-bold text-white">{stats.productsSold}</p>
              </div>

              {/* Upsell Rate */}
              <div>
                <p className="text-[10px] text-zinc-400 mb-0.5">Upsell Rate</p>
                <p className="text-xl font-bold text-white">
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

      {/* Revenue Growth Chart - Full width */}
      <div className="mb-6">
        <RevenueGrowthChart
          hourlyRevenue={revenueGrowthData.hourlyRevenue}
          upsellSplit={revenueGrowthData.upsellSplit}
          loading={revenueGrowthLoading}
        />
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Revenue by Product Card */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Product</h3>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Product bars */}
              {(showAllProducts ? stats.revenueByProduct : stats.revenueByProduct.slice(0, 6)).map((product, index) => {
                const maxRevenue = stats.revenueByProduct[0]?.revenue || 1;
                const widthPercentage = (product.revenue / maxRevenue) * 100;

                // Color palette for bars
                const colors = [
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-emerald-500',
                  'bg-orange-500',
                  'bg-cyan-500',
                  'bg-pink-500',
                  'bg-yellow-500',
                  'bg-red-500',
                  'bg-indigo-500',
                  'bg-teal-500',
                ];
                const barColor = colors[index % colors.length];

                return (
                  <div key={product.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white truncate max-w-[60%]">{product.name}</span>
                      <span className="text-white font-semibold">{product.revenue.toFixed(2)} RON</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div
                        className={`${barColor} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${widthPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}

              {/* Show All / Show Less link */}
              {stats.revenueByProduct.length > 6 && (
                <button
                  onClick={() => setShowAllProducts(!showAllProducts)}
                  className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors mt-2"
                >
                  {showAllProducts ? 'Show less' : `Show all (${stats.revenueByProduct.length} products)`}
                </button>
              )}

              {/* Show message if no products */}
              {stats.revenueByProduct.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">No products found</p>
              )}
            </div>
          )}
        </div>

        {/* Upsells Split Card */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Upsells Split</h3>

            {/* Filter buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => setUpsellFilter("pre")}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  upsellFilter === "pre"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                Pre
              </button>
              <button
                onClick={() => setUpsellFilter("post")}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  upsellFilter === "post"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                Post
              </button>
              <button
                onClick={() => setUpsellFilter("all")}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  upsellFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Total Upsells Revenue */}
          {!loading && stats.upsellsSplit.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-zinc-400">
                Total Revenue:{" "}
                <span className="font-semibold text-emerald-500">
                  {stats.upsellsSplit.reduce((sum, u) => {
                    if (upsellFilter === "all") return sum + u.totalRevenue;
                    if (upsellFilter === "pre") return sum + u.presaleRevenue;
                    return sum + u.postsaleRevenue;
                  }, 0).toFixed(2)} RON
                </span>
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upsell bars */}
              {(showAllUpsells ? stats.upsellsSplit : stats.upsellsSplit.slice(0, 6)).map((upsell, index) => {
                // Calculate count and revenue based on filter
                let count = 0;
                let revenue = 0;
                if (upsellFilter === "all") {
                  count = upsell.total;
                  revenue = upsell.totalRevenue;
                } else if (upsellFilter === "pre") {
                  count = upsell.presale;
                  revenue = upsell.presaleRevenue;
                } else if (upsellFilter === "post") {
                  count = upsell.postsale;
                  revenue = upsell.postsaleRevenue;
                }

                // Skip if count is 0
                if (count === 0) return null;

                // Calculate max for percentage
                const maxCount = stats.upsellsSplit.reduce((max, u) => {
                  const c = upsellFilter === "all" ? u.total : upsellFilter === "pre" ? u.presale : u.postsale;
                  return Math.max(max, c);
                }, 1);
                const widthPercentage = (count / maxCount) * 100;

                // Color palette for bars
                const colors = [
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-emerald-500',
                  'bg-orange-500',
                  'bg-cyan-500',
                  'bg-pink-500',
                  'bg-yellow-500',
                  'bg-red-500',
                  'bg-indigo-500',
                  'bg-teal-500',
                ];
                const barColor = colors[index % colors.length];

                return (
                  <div key={upsell.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white truncate max-w-[45%]">{upsell.name}</span>
                      <span className="text-white font-semibold">
                        {count} units ({revenue.toFixed(2)} RON)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div
                        className={`${barColor} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${widthPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}

              {/* Show All / Show Less link */}
              {stats.upsellsSplit.length > 6 && (
                <button
                  onClick={() => setShowAllUpsells(!showAllUpsells)}
                  className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors mt-2"
                >
                  {showAllUpsells ? 'Show less' : `Show all (${stats.upsellsSplit.length} upsells)`}
                </button>
              )}

              {/* Show message if no upsells */}
              {stats.upsellsSplit.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">No upsells found</p>
              )}
            </div>
          )}
        </div>

        {/* Products Stock Analysis Card */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Products Stock Analysis</h3>

          {/* Filters */}
          <div className="space-y-4 mb-6">
            {/* Product Dropdown */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Select Product
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={products.length === 0}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {products.length === 0 ? (
                  <option value="">No products available</option>
                ) : (
                  products.map((product) => (
                    <option key={product.id} value={product.name}>
                      {product.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Period Buttons */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Analysis Period
              </label>
              <div className="flex gap-2">
                {[1, 3, 7, 14].map((period) => (
                  <button
                    key={period}
                    onClick={() => setStockAnalysisPeriod(period as 1 | 3 | 7 | 14)}
                    disabled={!selectedProduct}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      stockAnalysisPeriod === period
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                  >
                    {period} {period === 1 ? 'day' : 'days'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {stockAnalysisLoading ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">Loading analysis...</p>
            </div>
          ) : stockAnalysisData ? (
            <div className="space-y-4">
              <div className="bg-zinc-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">{stockAnalysisData.name}</h4>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Total Sold</p>
                    <p className="text-2xl font-bold text-emerald-500">{stockAnalysisData.totalSold}</p>
                  </div>
                </div>

                {/* Sales metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-zinc-800 rounded p-3">
                    <p className="text-xs text-zinc-400 mb-1">Daily Average</p>
                    <p className="text-lg font-semibold text-white">
                      {stockAnalysisData.dailyAverage.toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-500">units/day</p>
                  </div>
                  <div className="bg-zinc-800 rounded p-3">
                    <p className="text-xs text-zinc-400 mb-1">Weekly Estimate</p>
                    <p className="text-lg font-semibold text-white">
                      {(stockAnalysisData.dailyAverage * 7).toFixed(0)}
                    </p>
                    <p className="text-xs text-zinc-500">units/week</p>
                  </div>
                </div>

                {/* Stock information from HelpShip */}
                {stockAnalysisData.currentStock !== null && stockAnalysisData.currentStock !== undefined ? (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Current Stock</p>
                        <p className="text-2xl font-bold text-white">{stockAnalysisData.currentStock}</p>
                        <p className="text-xs text-zinc-500">units available</p>
                      </div>
                      {stockAnalysisData.daysUntilStockout !== null && stockAnalysisData.daysUntilStockout !== undefined ? (
                        <div className="text-right">
                          <p className="text-xs text-zinc-400 mb-1">Stock Duration</p>
                          <p className={`text-2xl font-bold ${
                            stockAnalysisData.daysUntilStockout <= 7
                              ? 'text-red-500'
                              : stockAnalysisData.daysUntilStockout <= 14
                              ? 'text-yellow-500'
                              : 'text-emerald-500'
                          }`}>
                            {stockAnalysisData.daysUntilStockout}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {stockAnalysisData.daysUntilStockout === 1 ? 'day left' : 'days left'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    {stockAnalysisData.daysUntilStockout !== null && stockAnalysisData.daysUntilStockout !== undefined ? (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        {stockAnalysisData.daysUntilStockout <= 7 ? (
                          <p className="text-xs text-red-400">
                            ⚠️ Critical: Stock will run out in {stockAnalysisData.daysUntilStockout} {stockAnalysisData.daysUntilStockout === 1 ? 'day' : 'days'}. Order immediately!
                          </p>
                        ) : stockAnalysisData.daysUntilStockout <= 14 ? (
                          <p className="text-xs text-yellow-400">
                            ⚡ Warning: Stock will run out in {stockAnalysisData.daysUntilStockout} days. Consider ordering soon.
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-400">
                            ✓ Stock is sufficient for the next {stockAnalysisData.daysUntilStockout} days
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <p className="text-xs text-zinc-400 text-center">Stock data not available from HelpShip</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-400 text-sm">Select a product to view analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
