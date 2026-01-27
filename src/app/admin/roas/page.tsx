"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
  id: string;
  name: string;
  sku?: string;
}

interface RoasDataRow {
  date: string;
  adSpend: number;
  revenue: number;
  roas: number | null;
  orders: number;
  productsSold: number;
  avgOrderValue: number;
  metaPurchases: number;
  metaPurchaseValue: number;
}

interface RoasResponse {
  product: {
    id: string;
    name: string;
    sku: string;
  };
  month: string;
  includeUpsells: boolean;
  data: RoasDataRow[];
  totals: {
    adSpend: number;
    revenue: number;
    roas: number | null;
    orders: number;
    productsSold: number;
    avgOrderValue: number;
    metaPurchases: number;
    metaPurchaseValue: number;
  };
}

// ROAS color coding helper
function getRoasColor(roas: number | null): string {
  if (roas === null) return "text-zinc-500";
  if (roas < 2.5) return "text-red-500";
  if (roas < 3.5) return "text-orange-500";
  if (roas < 3.5) return "text-emerald-400"; // Target ROAS
  if (roas < 5) return "text-emerald-500";
  return "text-amber-400"; // Exceptional (gold-ish)
}

function getRoasBgColor(roas: number | null): string {
  if (roas === null) return "bg-zinc-800";
  if (roas < 2.5) return "bg-red-900/20";
  if (roas < 3.5) return "bg-orange-900/20";
  if (roas < 5) return "bg-emerald-900/20";
  return "bg-amber-900/30"; // Exceptional (gold-ish)
}

function getRoasBadge(roas: number | null): { text: string; className: string } | null {
  if (roas === null) return null;
  if (roas >= 5) {
    return {
      text: "Exceptional",
      className: "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold",
    };
  }
  if (roas >= 3.5) {
    return {
      text: "Target",
      className: "bg-emerald-600 text-white",
    };
  }
  return null;
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " RON";
}

// Format ROAS
function formatRoas(roas: number | null): string {
  if (roas === null) return "-";
  return roas.toFixed(2);
}

// Get available months (last 12 months)
function getAvailableMonths(): { value: string; label: string }[] {
  const months = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  return months;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

export default function RoasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [includeUpsells, setIncludeUpsells] = useState(true);

  const [roasData, setRoasData] = useState<RoasResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableMonths = getAvailableMonths();

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.products || []);
        // Auto-select first product if available
        if (data.products?.length > 0 && !selectedProductId) {
          setSelectedProductId(data.products[0].id);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products");
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  // Fetch ROAS data when filters change
  useEffect(() => {
    if (!selectedProductId || !selectedMonth) return;

    async function fetchRoasData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          productId: selectedProductId,
          month: selectedMonth,
          includeUpsells: includeUpsells.toString(),
        });

        const response = await fetch(`/api/roas/data?${params}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch ROAS data");
        }

        const data = await response.json();
        setRoasData(data);
      } catch (err: any) {
        console.error("Error fetching ROAS data:", err);
        setError(err.message || "Failed to load ROAS data");
        setRoasData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoasData();
  }, [selectedProductId, selectedMonth, includeUpsells]);

  // Handle CSV upload
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedProductId) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Read file content as text
      const csvContent = await file.text();

      const response = await fetch("/api/roas/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvContent,
          productId: selectedProductId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadResult({
        success: true,
        message: `Imported ${result.summary.rowsImported} days of data (${result.summary.dateRange.start} - ${result.summary.dateRange.end}). Total spend: ${formatCurrency(result.summary.totalSpent)}`,
      });

      // Refresh data - trigger re-fetch by toggling includeUpsells temporarily
      const currentUpsells = includeUpsells;
      setIncludeUpsells(!currentUpsells);
      setTimeout(() => setIncludeUpsells(currentUpsells), 100);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setUploadResult({
        success: false,
        message: err.message || "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  }

  // Clear upload result after 5 seconds
  useEffect(() => {
    if (uploadResult) {
      const timer = setTimeout(() => setUploadResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadResult]);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ROAS Calculator</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track your real Return on Ad Spend based on actual sales
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700">
        <div className="flex flex-wrap items-center gap-4">
          {/* Product Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-zinc-400 mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={isLoadingProducts}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.sku ? `(${product.sku})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="min-w-[180px]">
            <label className="block text-xs text-zinc-400 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Include Upsells Checkbox */}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="includeUpsells"
              checked={includeUpsells}
              onChange={(e) => setIncludeUpsells(e.target.checked)}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-700 rounded bg-zinc-900"
            />
            <label htmlFor="includeUpsells" className="text-sm text-white">
              Include upsells
            </label>
          </div>

          {/* Upload CSV Button */}
          <div className="pt-5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={!selectedProductId || isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedProductId || isUploading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Result Message */}
        {uploadResult && (
          <div
            className={`mt-4 p-3 rounded-md text-sm ${
              uploadResult.success
                ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
                : "bg-red-900/30 border border-red-700 text-red-300"
            }`}
          >
            {uploadResult.message}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-md p-4 mb-6">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700 text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-emerald-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-zinc-400 mt-2">Loading ROAS data...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && selectedProductId && roasData && roasData.data.length === 0 && (
        <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700 text-center">
          <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">No ad spend data</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Upload a Meta Ads CSV export to see your ROAS data for this month.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload CSV
          </button>
        </div>
      )}

      {/* No Product Selected */}
      {!isLoading && !selectedProductId && (
        <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700 text-center">
          <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Select a product</h3>
          <p className="text-zinc-400 text-sm">
            Choose a product from the dropdown to view ROAS data.
          </p>
        </div>
      )}

      {/* ROAS Data Table */}
      {!isLoading && roasData && roasData.data.length > 0 && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wide">Ad Spend</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wide">Sales Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wide">Avg. Order</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wide">ROAS</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wide">Orders</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wide">Products</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {roasData.data.map((row) => {
                  const roasColor = getRoasColor(row.roas);
                  const roasBg = getRoasBgColor(row.roas);
                  const roasBadge = getRoasBadge(row.roas);
                  const ordersDiff = row.orders - row.metaPurchases;

                  return (
                    <tr key={row.date} className={`${roasBg} hover:bg-zinc-700/50 transition-colors`}>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 text-right">
                        {formatCurrency(row.adSpend)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right font-medium">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 text-right">
                        {formatCurrency(row.avgOrderValue)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-sm font-bold ${roasColor}`}>
                            {formatRoas(row.roas)}
                          </span>
                          {roasBadge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${roasBadge.className}`}>
                              {roasBadge.text}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="text-white font-medium">{row.orders}</span>
                        {row.metaPurchases > 0 && (
                          <span className="text-zinc-500 text-xs ml-1">
                            (vs {row.metaPurchases}{" "}
                            <span className={ordersDiff >= 0 ? "text-emerald-400" : "text-red-400"}>
                              {ordersDiff >= 0 ? "+" : ""}{ordersDiff}
                            </span>
                            )
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 text-right">
                        {row.productsSold}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Row */}
              <tfoot className="bg-zinc-900 border-t-2 border-zinc-600">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-white">TOTAL</td>
                  <td className="px-4 py-3 text-sm text-white text-right font-bold">
                    {formatCurrency(roasData.totals.adSpend)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right font-bold">
                    {formatCurrency(roasData.totals.revenue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300 text-right">
                    {formatCurrency(roasData.totals.avgOrderValue)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-sm font-bold ${getRoasColor(roasData.totals.roas)}`}>
                        {formatRoas(roasData.totals.roas)}
                      </span>
                      {getRoasBadge(roasData.totals.roas) && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRoasBadge(roasData.totals.roas)!.className}`}>
                          {getRoasBadge(roasData.totals.roas)!.text}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="text-white font-bold">{roasData.totals.orders}</span>
                    {roasData.totals.metaPurchases > 0 && (
                      <span className="text-zinc-500 text-xs ml-1">
                        (vs {roasData.totals.metaPurchases}{" "}
                        <span className={(roasData.totals.orders - roasData.totals.metaPurchases) >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {(roasData.totals.orders - roasData.totals.metaPurchases) >= 0 ? "+" : ""}
                          {roasData.totals.orders - roasData.totals.metaPurchases}
                        </span>
                        )
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right font-bold">
                    {roasData.totals.productsSold}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ROAS Legend */}
      {!isLoading && roasData && roasData.data.length > 0 && (
        <div className="mt-4 bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <h3 className="text-sm font-medium text-white mb-3">ROAS Legend</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500"></span>
              <span className="text-zinc-400">&lt; 2.5 - Poor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-500"></span>
              <span className="text-zinc-400">2.5 - 3.5 - Moderate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-zinc-400">3.5 - 5 - Good (Target)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-amber-500 to-yellow-400"></span>
              <span className="text-zinc-400">&gt; 5 - Exceptional</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
