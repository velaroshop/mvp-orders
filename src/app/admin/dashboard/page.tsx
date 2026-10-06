"use client";

import { useEffect, useState } from "react";
import MonthlyRevenueChart from "../components/MonthlyRevenueChart";

interface ProductRevenue {
  name: string;
  revenue: number;
  unitsSold: number;
  orders: number;
  partialOrders: number;
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
  slug?: string;
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

  // Monthly revenue comparison
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [thisMonthData, setThisMonthData] = useState<Array<{ period: string; totalRevenue: number; orderCount: number }>>([]);
  const [lastMonthData, setLastMonthData] = useState<Array<{ period: string; totalRevenue: number; orderCount: number }>>([]);
  const [thisMonthLabel, setThisMonthLabel] = useState("");
  const [lastMonthLabel, setLastMonthLabel] = useState("");


  // Helper to format date in local timezone as YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate date ranges for quick filters (using local timezone)
  const getDateRange = (filter: QuickFilter): { start: string; end: string } => {
    const today = new Date();
    const todayStr = formatLocalDate(today);

    switch (filter) {
      case "today":
        return { start: todayStr, end: todayStr };

      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDate(yesterday);
        return { start: yesterdayStr, end: yesterdayStr };
      }

      case "last3days": {
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
        const threeDaysAgoStr = formatLocalDate(threeDaysAgo);
        return { start: threeDaysAgoStr, end: todayStr };
      }

      case "wtd": {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = formatLocalDate(weekStart);
        return { start: weekStartStr, end: todayStr };
      }

      case "mtd": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthStartStr = formatLocalDate(monthStart);
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

  // Fetch monthly revenue comparison (independent of quick filter)
  const fetchMonthlyComparison = async () => {
    setMonthlyLoading(true);
    try {
      const today = new Date();
      const thisStart = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
      const thisEnd = formatLocalDate(today);
      const lastStart = formatLocalDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const lastEnd = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 0));

      const monthNames = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
      setThisMonthLabel(`${monthNames[today.getMonth()]} ${today.getFullYear()}`);
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setLastMonthLabel(`${monthNames[lastMonthDate.getMonth()]} ${lastMonthDate.getFullYear()}`);

      const [thisRes, lastRes] = await Promise.all([
        fetch(`/api/dashboard/revenue-growth?startDate=${thisStart}&endDate=${thisEnd}`),
        fetch(`/api/dashboard/revenue-growth?startDate=${lastStart}&endDate=${lastEnd}`),
      ]);

      if (thisRes.ok) {
        const d = await thisRes.json();
        setThisMonthData(d.data || []);
      }
      if (lastRes.ok) {
        const d = await lastRes.json();
        setLastMonthData(d.data || []);
      }
    } catch (error) {
      console.error("Error fetching monthly comparison:", error);
    } finally {
      setMonthlyLoading(false);
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

  // Fetch monthly comparison on mount (independent of quick filter)
  useEffect(() => {
    fetchMonthlyComparison();
  }, []);

  // Handle manual Apply Filters
  const handleApplyFilters = () => {
    fetchStats(startDate, endDate, selectedLandingPage);
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

  const cardCls = "bg-zinc-800/60 rounded-xl border border-zinc-700/60 shadow-sm";
  const inputCls = "w-full max-w-full min-w-0 px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white";
  const labelCls = "block text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1.5";

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Performanța magazinului</p>
      </div>

      {/* Top row: Filters & KPIs (2/3) + Revenue Chart (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Filters & KPIs */}
        <div className={`lg:col-span-2 ${cardCls} p-4 space-y-3 overflow-hidden`}>

          {/* Quick Filters */}
          <div>
            <p className={labelCls}>Perioadă</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "today", label: "Azi" },
                { key: "yesterday", label: "Ieri" },
                { key: "last3days", label: "3 zile" },
                { key: "wtd", label: "Săptămâna" },
                { key: "mtd", label: "Luna" },
                { key: "all", label: "Tot" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => handleQuickFilterClick(filter.key as QuickFilter)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    quickFilter === filter.key
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-700/60 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Landing Page + Apply — toate pe același rând */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
            <div className="min-w-0">
              <label className={labelCls}>De la</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls} text-xs sm:text-sm`} />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Până la</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${inputCls} text-xs sm:text-sm`} />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Landing Page</label>
              <select value={selectedLandingPage} onChange={(e) => setSelectedLandingPage(e.target.value)} className={inputCls}>
                <option value="all">Toate</option>
                {landingPages.map((lp) => (
                  <option key={lp.id} value={lp.id}>{lp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] invisible mb-1.5">_</label>
              <button
                onClick={handleApplyFilters}
                className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Aplică
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="border-t border-zinc-700/60 pt-3">
            <p className={labelCls}>Indicatori</p>
            {loading ? (
              <p className="text-sm text-zinc-400 py-2">Se încarcă...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div>
                  <p className="text-[11px] text-zinc-400 mb-0.5">Total venituri</p>
                  <p className="text-xl font-bold text-emerald-400">{stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-[10px] text-zinc-400">RON</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 mb-0.5">Valoare medie</p>
                  <p className="text-xl font-bold text-white">{stats.avgOrderValue.toFixed(2)}</p>
                  <p className="text-[10px] text-zinc-400">RON / cmd</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 mb-0.5">Comenzi</p>
                  <p className="text-xl font-bold text-white">{stats.orderCount}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 mb-0.5">Produse vândute</p>
                  <p className="text-xl font-bold text-white">{stats.productsSold}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 mb-0.5">Upsell rate</p>
                  <p className="text-xl font-bold text-white">{stats.upsellRate.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        <div className={`${cardCls} overflow-hidden`}>
          <MonthlyRevenueChart
            thisMonthData={thisMonthData}
            lastMonthData={lastMonthData}
            thisMonthLabel={thisMonthLabel}
            lastMonthLabel={lastMonthLabel}
            loading={monthlyLoading}
          />
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Revenue by Product */}
        <div className={`${cardCls} p-5`}>
          <p className="text-sm font-semibold text-white mb-4">Venituri pe produs</p>
          {loading ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Se încarcă...</p>
          ) : (
            <div className="space-y-3">
              {(showAllProducts ? stats.revenueByProduct : stats.revenueByProduct.slice(0, 6)).map((product, index) => {
                const maxRevenue = stats.revenueByProduct[0]?.revenue || 1;
                const widthPercentage = (product.revenue / maxRevenue) * 100;
                const colors = ['bg-indigo-500','bg-purple-500','bg-emerald-500','bg-orange-500','bg-cyan-500','bg-pink-500','bg-yellow-500','bg-red-500','bg-blue-500','bg-teal-500'];
                return (
                  <div key={product.name} className="space-y-1">
                    <div className="text-sm text-white truncate">{product.name}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        {product.orders} comenzi · {product.unitsSold} buc
                        {product.partialOrders > 0 && <span className="text-indigo-400"> · {product.partialOrders} parțiale</span>}
                      </span>
                      <span className="text-zinc-300 font-medium">{product.revenue.toFixed(2)} RON</span>
                    </div>
                    <div className="w-full bg-zinc-700/50 rounded-full h-1.5">
                      <div className={`${colors[index % colors.length]} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${widthPercentage}%` }} />
                    </div>
                  </div>
                );
              })}
              {stats.revenueByProduct.length > 6 && (
                <button onClick={() => setShowAllProducts(!showAllProducts)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                  {showAllProducts ? 'Arată mai puțin' : `Arată toate (${stats.revenueByProduct.length})`}
                </button>
              )}
              {stats.revenueByProduct.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Niciun produs</p>
              )}
            </div>
          )}
        </div>

        {/* Upsells Split */}
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Upsells Split</p>
            <div className="flex gap-1">
              {(["pre", "post", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setUpsellFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    upsellFilter === f ? "bg-indigo-600 text-white" : "bg-zinc-700/60 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {f === "all" ? "Toate" : f === "pre" ? "Pre" : "Post"}
                </button>
              ))}
            </div>
          </div>

          {!loading && stats.upsellsSplit.length > 0 && (
            <p className="text-xs text-zinc-400 mb-3">
              Total:{" "}
              <span className="font-semibold text-emerald-400">
                {stats.upsellsSplit.reduce((sum, u) => {
                  if (upsellFilter === "all") return sum + u.totalRevenue;
                  if (upsellFilter === "pre") return sum + u.presaleRevenue;
                  return sum + u.postsaleRevenue;
                }, 0).toFixed(2)} RON
              </span>
            </p>
          )}

          {loading ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Se încarcă...</p>
          ) : (
            <div className="space-y-3">
              {(showAllUpsells ? stats.upsellsSplit : stats.upsellsSplit.slice(0, 6)).map((upsell, index) => {
                let count = upsellFilter === "all" ? upsell.total : upsellFilter === "pre" ? upsell.presale : upsell.postsale;
                let revenue = upsellFilter === "all" ? upsell.totalRevenue : upsellFilter === "pre" ? upsell.presaleRevenue : upsell.postsaleRevenue;
                if (count === 0) return null;
                const maxCount = stats.upsellsSplit.reduce((max, u) => {
                  const c = upsellFilter === "all" ? u.total : upsellFilter === "pre" ? u.presale : u.postsale;
                  return Math.max(max, c);
                }, 1);
                const colors = ['bg-indigo-500','bg-purple-500','bg-emerald-500','bg-orange-500','bg-cyan-500','bg-pink-500','bg-yellow-500','bg-red-500','bg-blue-500','bg-teal-500'];
                return (
                  <div key={upsell.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white truncate max-w-[50%]">{upsell.name}</span>
                      <span className="text-zinc-300 text-xs font-medium">{count} · {revenue.toFixed(2)} RON</span>
                    </div>
                    <div className="w-full bg-zinc-700/50 rounded-full h-1.5">
                      <div className={`${colors[index % colors.length]} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              }).filter(Boolean)}
              {stats.upsellsSplit.length > 6 && (
                <button onClick={() => setShowAllUpsells(!showAllUpsells)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                  {showAllUpsells ? 'Arată mai puțin' : `Arată toate (${stats.upsellsSplit.length})`}
                </button>
              )}
              {stats.upsellsSplit.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Niciun upsell</p>
              )}
            </div>
          )}
        </div>

        {/* Stock Analysis */}
        <div className={`${cardCls} p-5`}>
          <p className="text-sm font-semibold text-white mb-4">Analiză stoc</p>

          <div className="space-y-3 mb-5">
            <div>
              <label className={labelCls}>Produs</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={products.length === 0}
                className={inputCls}
              >
                {products.length === 0 ? (
                  <option value="">Niciun produs disponibil</option>
                ) : (
                  products.map((product) => (
                    <option key={product.id} value={product.name}>{product.name}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className={labelCls}>Perioadă analiză</label>
              <div className="flex gap-1.5">
                {[1, 3, 7, 14].map((period) => (
                  <button
                    key={period}
                    onClick={() => setStockAnalysisPeriod(period as 1 | 3 | 7 | 14)}
                    disabled={!selectedProduct}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      stockAnalysisPeriod === period
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-700/60 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {period}z
                  </button>
                ))}
              </div>
            </div>
          </div>

          {stockAnalysisLoading ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Se încarcă...</p>
          ) : stockAnalysisData ? (
            <div className="bg-zinc-900/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400 truncate">{stockAnalysisData.name}</p>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-400">Vândut total</p>
                  <p className="text-xl font-bold text-emerald-400">{stockAnalysisData.totalSold}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-400 mb-0.5">Medie zilnică</p>
                  <p className="text-base font-semibold text-white">{stockAnalysisData.dailyAverage.toFixed(2)}</p>
                  <p className="text-[10px] text-zinc-600">buc/zi</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-400 mb-0.5">Estimat / săpt</p>
                  <p className="text-base font-semibold text-white">{(stockAnalysisData.dailyAverage * 7).toFixed(0)}</p>
                  <p className="text-[10px] text-zinc-600">buc/săptămână</p>
                </div>
              </div>

              {stockAnalysisData.currentStock !== null && stockAnalysisData.currentStock !== undefined ? (
                <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] text-zinc-400">Stoc curent</p>
                      <p className="text-xl font-bold text-white">{stockAnalysisData.currentStock}</p>
                      <p className="text-[10px] text-zinc-600">buc disponibile</p>
                    </div>
                    {stockAnalysisData.daysUntilStockout !== null && stockAnalysisData.daysUntilStockout !== undefined && (
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-400">Zile rămase</p>
                        <p className={`text-xl font-bold ${
                          stockAnalysisData.daysUntilStockout <= 7 ? 'text-red-400'
                          : stockAnalysisData.daysUntilStockout <= 14 ? 'text-yellow-400'
                          : 'text-emerald-400'
                        }`}>
                          {stockAnalysisData.daysUntilStockout}
                        </p>
                      </div>
                    )}
                  </div>
                  {stockAnalysisData.daysUntilStockout !== null && stockAnalysisData.daysUntilStockout !== undefined && (
                    <p className={`text-xs mt-1 ${
                      stockAnalysisData.daysUntilStockout <= 7 ? 'text-red-400'
                      : stockAnalysisData.daysUntilStockout <= 14 ? 'text-yellow-400'
                      : 'text-emerald-400'
                    }`}>
                      {stockAnalysisData.daysUntilStockout <= 7
                        ? `Critic: stoc în ${stockAnalysisData.daysUntilStockout} zile. Comandă urgent!`
                        : stockAnalysisData.daysUntilStockout <= 14
                        ? `Atenție: stoc în ${stockAnalysisData.daysUntilStockout} zile.`
                        : `Stoc suficient pentru ${stockAnalysisData.daysUntilStockout} zile.`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-2">Date stoc indisponibile</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-8">Selectează un produs</p>
          )}
        </div>
      </div>

    </div>
  );
}
