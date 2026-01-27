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

interface UploadedDate {
  date: string;
  amountSpent: number;
  metaPurchases: number;
  metaPurchaseValue: number;
  updatedAt: string;
}

type TabType = "upload" | "report";

// ROAS color coding helper
function getRoasColor(roas: number | null): string {
  if (roas === null) return "text-zinc-500";
  if (roas < 2.5) return "text-red-500";
  if (roas < 3.5) return "text-orange-500";
  if (roas < 5) return "text-emerald-500";
  return "text-amber-400";
}

function getRoasBgColor(roas: number | null): string {
  if (roas === null) return "bg-zinc-800";
  if (roas < 2.5) return "bg-red-900/20";
  if (roas < 3.5) return "bg-orange-900/20";
  if (roas < 5) return "bg-emerald-900/20";
  return "bg-amber-900/30";
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

// Format full date
function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
}

// Get days in month
function getDaysInMonth(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum, 0).getDate();
}

// Get day of week for first day of month (0 = Monday, 6 = Sunday)
function getFirstDayOfWeek(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  const day = new Date(year, monthNum - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function RoasPage() {
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [includeUpsells, setIncludeUpsells] = useState(true);

  // Upload tab state
  const [uploadedDates, setUploadedDates] = useState<UploadedDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report tab state
  const [roasData, setRoasData] = useState<RoasResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Common state
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableMonths = getAvailableMonths();

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.products || []);
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

  // Fetch uploaded dates when product or month changes (for Upload tab)
  useEffect(() => {
    if (!selectedProductId || activeTab !== "upload") return;

    async function fetchUploadedDates() {
      setIsLoadingDates(true);
      try {
        const params = new URLSearchParams({
          productId: selectedProductId,
          month: selectedMonth,
        });
        const response = await fetch(`/api/roas/dates?${params}`);
        if (!response.ok) throw new Error("Failed to fetch dates");
        const data = await response.json();
        setUploadedDates(data.dates || []);
      } catch (err) {
        console.error("Error fetching dates:", err);
      } finally {
        setIsLoadingDates(false);
      }
    }
    fetchUploadedDates();
  }, [selectedProductId, selectedMonth, activeTab]);

  // Handle CSV upload
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedProductId) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const csvContent = await file.text();
      const response = await fetch("/api/roas/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, productId: selectedProductId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      setUploadResult({
        success: true,
        message: `Imported ${result.summary.rowsImported} days (${result.summary.dateRange.start} - ${result.summary.dateRange.end}). Total: ${formatCurrency(result.summary.totalSpent)}`,
      });

      // Refresh dates
      const params = new URLSearchParams({
        productId: selectedProductId,
        month: selectedMonth,
      });
      const datesResponse = await fetch(`/api/roas/dates?${params}`);
      if (datesResponse.ok) {
        const datesData = await datesResponse.json();
        setUploadedDates(datesData.dates || []);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message || "Upload failed" });
    } finally {
      setIsUploading(false);
    }
  }

  // Handle delete dates
  async function handleDeleteDate(date: string) {
    if (!selectedProductId || !confirm(`Delete ad spend data for ${formatFullDate(date)}?`)) return;

    try {
      const response = await fetch("/api/roas/dates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, dates: [date] }),
      });

      if (!response.ok) throw new Error("Delete failed");

      setUploadedDates((prev) => prev.filter((d) => d.date !== date));
    } catch (err) {
      console.error("Error deleting date:", err);
    }
  }

  // Handle show report
  async function handleShowReport() {
    if (!selectedProductId || !selectedMonth) return;

    setIsLoadingReport(true);
    setError(null);
    setShowReport(false);

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
      setShowReport(true);
    } catch (err: any) {
      setError(err.message || "Failed to load ROAS data");
      setRoasData(null);
    } finally {
      setIsLoadingReport(false);
    }
  }

  // Clear upload result after 5 seconds
  useEffect(() => {
    if (uploadResult) {
      const timer = setTimeout(() => setUploadResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadResult]);

  // Build calendar data
  const daysInMonth = getDaysInMonth(selectedMonth);
  const firstDayOfWeek = getFirstDayOfWeek(selectedMonth);
  const uploadedDatesSet = new Set(uploadedDates.map((d) => d.date));
  const uploadedDatesMap = new Map(uploadedDates.map((d) => [d.date, d]));

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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-800 p-1 rounded-lg w-fit border border-zinc-700">
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "upload"
              ? "bg-emerald-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "report"
              ? "bg-emerald-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          Report
        </button>
      </div>

      {/* Product Selector (common for both tabs) */}
      <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-zinc-400 mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setShowReport(false);
              }}
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

          <div className="min-w-[180px]">
            <label className="block text-xs text-zinc-400 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setShowReport(false);
              }}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Upload tab specific controls */}
          {activeTab === "upload" && (
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
          )}

          {/* Report tab specific controls */}
          {activeTab === "report" && (
            <>
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

              <div className="pt-5">
                <button
                  onClick={handleShowReport}
                  disabled={!selectedProductId || isLoadingReport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  {isLoadingReport ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    "Show Report"
                  )}
                </button>
              </div>
            </>
          )}
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

      {/* UPLOAD TAB CONTENT */}
      {activeTab === "upload" && selectedProductId && (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Uploaded Ad Spend Data - {availableMonths.find((m) => m.value === selectedMonth)?.label}
          </h2>

          {isLoadingDates ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 mx-auto text-emerald-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Calendar View */}
              <div className="mb-6">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
                    <div key={day} className="text-center text-xs text-zinc-500 font-medium py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before first day of month */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {/* Days of month */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                    const hasData = uploadedDatesSet.has(dateStr);
                    const dateData = uploadedDatesMap.get(dateStr);

                    return (
                      <div
                        key={day}
                        className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs relative group cursor-pointer transition-colors ${
                          hasData
                            ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-300"
                            : "bg-zinc-900 border border-zinc-700 text-zinc-500"
                        }`}
                        title={hasData ? `${formatCurrency(dateData!.amountSpent)}` : "No data"}
                      >
                        <span className="font-medium">{day}</span>
                        {hasData && (
                          <>
                            <span className="text-[9px] mt-0.5 opacity-75">
                              {dateData!.amountSpent.toFixed(0)}
                            </span>
                            {/* Delete button on hover */}
                            <button
                              onClick={() => handleDeleteDate(dateStr)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              title="Delete"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-md">
                <div>
                  <span className="text-zinc-400 text-sm">Days with data:</span>
                  <span className="text-white font-medium ml-2">{uploadedDates.length} / {daysInMonth}</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-sm">Total Ad Spend:</span>
                  <span className="text-emerald-400 font-medium ml-2">
                    {formatCurrency(uploadedDates.reduce((sum, d) => sum + d.amountSpent, 0))}
                  </span>
                </div>
              </div>

              {/* Data List */}
              {uploadedDates.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Detailed Data</h3>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-900 sticky top-0">
                        <tr>
                          <th className="text-left text-xs text-zinc-500 font-medium px-3 py-2">Date</th>
                          <th className="text-right text-xs text-zinc-500 font-medium px-3 py-2">Ad Spend</th>
                          <th className="text-right text-xs text-zinc-500 font-medium px-3 py-2">Meta Purchases</th>
                          <th className="text-right text-xs text-zinc-500 font-medium px-3 py-2">Meta Value</th>
                          <th className="text-right text-xs text-zinc-500 font-medium px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-700">
                        {uploadedDates.map((row) => (
                          <tr key={row.date} className="hover:bg-zinc-700/30">
                            <td className="px-3 py-2 text-white">{formatFullDate(row.date)}</td>
                            <td className="px-3 py-2 text-zinc-300 text-right">{formatCurrency(row.amountSpent)}</td>
                            <td className="px-3 py-2 text-zinc-300 text-right">{row.metaPurchases}</td>
                            <td className="px-3 py-2 text-zinc-300 text-right">{formatCurrency(row.metaPurchaseValue)}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleDeleteDate(row.date)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploadedDates.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-zinc-500">No ad spend data uploaded for this month.</p>
                  <p className="text-zinc-600 text-sm mt-1">Upload a Meta Ads CSV to get started.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* REPORT TAB CONTENT */}
      {activeTab === "report" && (
        <>
          {!showReport && !isLoadingReport && (
            <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700 text-center">
              <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">Select filters and click "Show Report"</h3>
              <p className="text-zinc-400 text-sm">
                Choose a product and month, then click the button to generate your ROAS report.
              </p>
            </div>
          )}

          {isLoadingReport && (
            <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-emerald-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-zinc-400 mt-2">Loading ROAS data...</p>
            </div>
          )}

          {showReport && roasData && roasData.data.length === 0 && (
            <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700 text-center">
              <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">No ad spend data</h3>
              <p className="text-zinc-400 text-sm">
                Go to the Upload tab to import Meta Ads CSV data for this month.
              </p>
            </div>
          )}

          {showReport && roasData && roasData.data.length > 0 && (
            <>
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
                            <td className="px-4 py-3 text-sm text-white font-medium">{formatDate(row.date)}</td>
                            <td className="px-4 py-3 text-sm text-zinc-300 text-right">{formatCurrency(row.adSpend)}</td>
                            <td className="px-4 py-3 text-sm text-white text-right font-medium">{formatCurrency(row.revenue)}</td>
                            <td className="px-4 py-3 text-sm text-zinc-300 text-right">{formatCurrency(row.avgOrderValue)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`text-sm font-bold ${roasColor}`}>{formatRoas(row.roas)}</span>
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
                                  </span>)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-300 text-right">{row.productsSold}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-zinc-900 border-t-2 border-zinc-600">
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold text-white">TOTAL</td>
                        <td className="px-4 py-3 text-sm text-white text-right font-bold">{formatCurrency(roasData.totals.adSpend)}</td>
                        <td className="px-4 py-3 text-sm text-white text-right font-bold">{formatCurrency(roasData.totals.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-zinc-300 text-right">{formatCurrency(roasData.totals.avgOrderValue)}</td>
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
                              </span>)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-white text-right font-bold">{roasData.totals.productsSold}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ROAS Legend */}
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
            </>
          )}
        </>
      )}

      {/* No Product Selected */}
      {!selectedProductId && (
        <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700 text-center">
          <svg className="w-12 h-12 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Select a product</h3>
          <p className="text-zinc-400 text-sm">
            Choose a product from the dropdown to view or upload ROAS data.
          </p>
        </div>
      )}
    </div>
  );
}
