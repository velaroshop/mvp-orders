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
  product: { id: string; name: string; sku: string };
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

interface ManualEntryModalData {
  date: string;
  amountSpent: string;
  existingData?: UploadedDate;
}

type TabType = "upload" | "report";

function getRoasColor(roas: number | null): string {
  if (roas === null) return "text-zinc-500";
  if (roas < 2.5)  return "text-red-500";
  if (roas < 3.5)  return "text-orange-500";
  if (roas < 5)    return "text-emerald-500";
  return "text-amber-400";
}

function getRoasBgColor(roas: number | null): string {
  if (roas === null) return "";
  if (roas < 2.5)  return "bg-red-900/20";
  if (roas < 3.5)  return "bg-orange-900/20";
  if (roas < 5)    return "bg-emerald-900/20";
  return "bg-amber-900/30";
}

function getRoasBadge(roas: number | null): { text: string; className: string } | null {
  if (roas === null) return null;
  if (roas >= 5)   return { text: "MONSTER",  className: "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold" };
  if (roas >= 3.5) return { text: "TARGET",   className: "bg-emerald-600 text-white" };
  if (roas >= 2.5) return { text: "MODERATE", className: "bg-orange-600 text-white" };
  return { text: "POOR", className: "bg-red-600 text-white" };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " RON";
}

function formatRoas(roas: number | null): string {
  if (roas === null) return "-";
  return roas.toFixed(2);
}

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
}

function getDaysInMonth(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum, 0).getDate();
}

function getFirstDayOfWeek(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  const day = new Date(year, monthNum - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function RoasPage() {
  const [activeTab, setActiveTab] = useState<TabType>("report");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [includeUpsells, setIncludeUpsells] = useState(true);

  // Upload tab state
  const [uploadedDates, setUploadedDates] = useState<UploadedDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar ROAS data
  const [calendarRoasData, setCalendarRoasData] = useState<RoasDataRow[]>([]);
  const [isLoadingCalendarRoas, setIsLoadingCalendarRoas] = useState(false);

  // Manual entry modal
  const [manualEntryModal, setManualEntryModal] = useState<ManualEntryModalData | null>(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Report tab state
  const [roasData, setRoasData] = useState<RoasResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableMonths = getAvailableMonths();

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
        setError("Failed to load products");
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!selectedProductId || selectedProductId === "all" || activeTab !== "upload") return;

    async function fetchUploadedDates() {
      setIsLoadingDates(true);
      try {
        const params = new URLSearchParams({ productId: selectedProductId, month: selectedMonth });
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

    async function fetchCalendarRoasData() {
      setIsLoadingCalendarRoas(true);
      try {
        const params = new URLSearchParams({ productId: selectedProductId, month: selectedMonth, includeUpsells: "true" });
        const response = await fetch(`/api/roas/data?${params}`);
        if (!response.ok) throw new Error("Failed to fetch ROAS data");
        const data = await response.json();
        setCalendarRoasData(data.data || []);
      } catch (err) {
        setCalendarRoasData([]);
      } finally {
        setIsLoadingCalendarRoas(false);
      }
    }

    fetchUploadedDates();
    fetchCalendarRoasData();
  }, [selectedProductId, selectedMonth, activeTab]);

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
      if (!response.ok) throw new Error(result.error || "Upload eșuat");
      setUploadResult({
        success: true,
        message: `Importate ${result.summary.rowsImported} zile (${result.summary.dateRange.start} - ${result.summary.dateRange.end}). Total: ${formatCurrency(result.summary.totalSpent)}`,
      });
      const params = new URLSearchParams({ productId: selectedProductId, month: selectedMonth });
      const [datesResponse, roasResponse] = await Promise.all([
        fetch(`/api/roas/dates?${params}`),
        fetch(`/api/roas/data?${params.toString()}&includeUpsells=true`),
      ]);
      if (datesResponse.ok) setUploadedDates((await datesResponse.json()).dates || []);
      if (roasResponse.ok) setCalendarRoasData((await roasResponse.json()).data || []);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message || "Upload eșuat" });
    } finally {
      setIsUploading(false);
    }
  }

  function handleDayClick(day: number) {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const existingData = uploadedDatesMap.get(dateStr);
    setManualEntryModal({ date: dateStr, amountSpent: existingData ? existingData.amountSpent.toString() : "", existingData });
  }

  async function handleSaveManualEntry() {
    if (!selectedProductId || !manualEntryModal) return;
    const amountSpent = parseFloat(manualEntryModal.amountSpent);
    if (isNaN(amountSpent) || amountSpent < 0) { alert("Introdu o sumă validă"); return; }
    setIsSavingManual(true);
    try {
      const response = await fetch("/api/roas/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId, date: manualEntryModal.date, amountSpent }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Failed to save");
      const result = await response.json();
      setUploadedDates((prev) => {
        const filtered = prev.filter((d) => d.date !== manualEntryModal.date);
        return [...filtered, result.data].sort((a, b) => a.date.localeCompare(b.date));
      });
      const params = new URLSearchParams({ productId: selectedProductId, month: selectedMonth, includeUpsells: "true" });
      const roasResponse = await fetch(`/api/roas/data?${params}`);
      if (roasResponse.ok) setCalendarRoasData((await roasResponse.json()).data || []);
      setManualEntryModal(null);
      setUploadResult({ success: true, message: `Salvat ${formatCurrency(amountSpent)} pentru ${formatFullDate(manualEntryModal.date)}` });
    } catch (err: any) {
      alert(err.message || "Eroare la salvare");
    } finally {
      setIsSavingManual(false);
    }
  }

  async function handleDeleteDate(date: string) {
    if (!selectedProductId || !confirm(`Ștergi datele pentru ${formatFullDate(date)}?`)) return;
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
      if (!response.ok) throw new Error((await response.json()).error || "Failed to fetch ROAS data");
      setRoasData(await response.json());
      setShowReport(true);
    } catch (err: any) {
      setError(err.message || "Eroare la încărcarea datelor ROAS");
      setRoasData(null);
    } finally {
      setIsLoadingReport(false);
    }
  }

  useEffect(() => {
    if (uploadResult) {
      const timer = setTimeout(() => setUploadResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadResult]);

  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (activeTab === "report" && selectedMonth && !hasAutoLoaded.current && !isLoadingProducts) {
      hasAutoLoaded.current = true;
      handleShowReport();
    }
  }, [activeTab, selectedMonth, isLoadingProducts]);

  const daysInMonth = getDaysInMonth(selectedMonth);
  const firstDayOfWeek = getFirstDayOfWeek(selectedMonth);
  const uploadedDatesSet = new Set(uploadedDates.map((d) => d.date));
  const uploadedDatesMap = new Map(uploadedDates.map((d) => [d.date, d]));
  const calendarRoasMap = new Map(calendarRoasData.map((d) => [d.date, d]));

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Calculator ROAS</h1>
          <p className="page-subtitle">Urmărește rentabilitatea reală a cheltuielilor publicitare</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-800/60 p-1 rounded-lg w-fit border border-zinc-700/60">
        <button
          onClick={() => {
            setActiveTab("upload");
            if (selectedProductId === "all") setSelectedProductId("");
          }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "upload"
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-700/60"
          }`}
        >
          Încarcă
        </button>
        <button
          onClick={() => {
            setActiveTab("report");
            if (!selectedProductId) setSelectedProductId("all");
          }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "report"
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-700/60"
          }`}
        >
          Raport
        </button>
      </div>

      {/* Filters card */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Product */}
          <div className="flex-1 min-w-[200px]">
            <label className="label">Produs</label>
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); setShowReport(false); }}
              disabled={isLoadingProducts}
              className="input"
            >
              {activeTab === "upload" ? (
                <option value="">Selectează produsul</option>
              ) : (
                <option value="all">Toate produsele</option>
              )}
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.sku ? `(${product.sku})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className="min-w-[180px]">
            <label className="label">Lună</label>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setShowReport(false); }}
              className="input"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          {/* Upload tab controls */}
          {activeTab === "upload" && (
            <>
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
                className="btn btn-primary"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Se încarcă...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Încarcă CSV
                  </>
                )}
              </button>
            </>
          )}

          {/* Report tab controls */}
          {activeTab === "report" && (
            <>
              <label className="flex items-center gap-2 cursor-pointer pb-0.5">
                <input
                  type="checkbox"
                  id="includeUpsells"
                  checked={includeUpsells}
                  onChange={(e) => setIncludeUpsells(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-zinc-700 rounded bg-zinc-900"
                />
                <span className="text-sm text-zinc-300">Include upsell-uri</span>
              </label>
              <button
                onClick={handleShowReport}
                disabled={!selectedProductId || isLoadingReport}
                className="btn btn-primary"
              >
                {isLoadingReport ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Se încarcă...
                  </>
                ) : "Generează Raport"}
              </button>
            </>
          )}
        </div>

        {/* Upload result message */}
        {uploadResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            uploadResult.success
              ? "bg-green-900/20 border border-green-700/60 text-green-300"
              : "bg-red-900/20 border border-red-700/60 text-red-300"
          }`}>
            {uploadResult.message}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-800/60">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── UPLOAD TAB ── */}
      {activeTab === "upload" && !selectedProductId && (
        <div className="card p-10 text-center">
          <svg className="w-10 h-10 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="section-title mb-1">Selectează un produs</h3>
          <p className="text-muted text-sm">Alege un produs din meniu pentru a încărca date publicitare.</p>
        </div>
      )}

      {activeTab === "upload" && selectedProductId && (
        <div className="card p-6">
          <h2 className="section-title mb-5">
            Date publicitare — {availableMonths.find((m) => m.value === selectedMonth)?.label}
          </h2>

          {isLoadingDates ? (
            <div className="text-center py-10">
              <svg className="animate-spin h-8 w-8 mx-auto text-indigo-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Calendar */}
              <div className="mb-6">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
                    <div key={day} className="text-center text-xs text-zinc-500 font-medium py-1">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[100px]" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                    const hasData = uploadedDatesSet.has(dateStr);
                    const dateData = uploadedDatesMap.get(dateStr);
                    const roasRow = calendarRoasMap.get(dateStr);

                    let cellBgClass = "bg-zinc-900 border-zinc-700";
                    if (hasData && roasRow) {
                      if (roasRow.roas !== null) {
                        if (roasRow.roas >= 5)        cellBgClass = "bg-gradient-to-br from-amber-900/50 to-yellow-900/40 border-amber-500/50";
                        else if (roasRow.roas >= 3.5)  cellBgClass = "bg-emerald-900/50 border-emerald-500/50";
                        else if (roasRow.roas >= 2.5)  cellBgClass = "bg-orange-900/50 border-orange-500/50";
                        else                            cellBgClass = "bg-red-900/50 border-red-500/50";
                      } else {
                        cellBgClass = "bg-zinc-700/50 border-zinc-600";
                      }
                    } else if (hasData) {
                      cellBgClass = "bg-zinc-700/50 border-zinc-600";
                    }

                    return (
                      <div
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`min-h-[100px] rounded-lg flex flex-col items-center justify-between py-2 px-1 relative group cursor-pointer hover:ring-2 hover:ring-white/30 border ${cellBgClass} hover:brightness-110 transition-all`}
                        title="Clic pentru editare"
                      >
                        <span className="font-bold text-sm text-white">{day}</span>

                        {hasData && roasRow ? (
                          <>
                            <div className="flex flex-col items-center text-[9px] text-zinc-400 leading-tight">
                              <span>Chelt: <span className="text-zinc-300">{Math.round(roasRow.adSpend)}</span></span>
                              <span>Ven: <span className="text-zinc-300">{Math.round(roasRow.revenue).toLocaleString("ro-RO")}</span></span>
                              <span>Cmd: <span className="text-zinc-300">{roasRow.orders}</span></span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className={`font-bold text-base ${getRoasColor(roasRow.roas)}`}>
                                {formatRoas(roasRow.roas)}
                              </span>
                              {getRoasBadge(roasRow.roas) && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded mt-0.5 ${getRoasBadge(roasRow.roas)!.className}`}>
                                  {getRoasBadge(roasRow.roas)!.text}
                                </span>
                              )}
                            </div>
                          </>
                        ) : hasData && dateData ? (
                          <>
                            <div className="flex flex-col items-center text-[9px] text-zinc-400">
                              <span>Chelt: <span className="text-zinc-300">{Math.round(dateData.amountSpent)}</span></span>
                              <span className="text-zinc-500">Fără comenzi</span>
                            </div>
                            <span className="text-zinc-600 text-sm">-</span>
                          </>
                        ) : (
                          <>
                            <span className="text-zinc-600 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">+ Adaugă</span>
                            <span className="text-zinc-700 text-sm">-</span>
                          </>
                        )}

                        {hasData && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDate(dateStr); }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            title="Șterge"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-5 text-[10px]">
                {[
                  { cls: "bg-red-900/50 border border-red-500/50",                             label: "POOR (<2.5)" },
                  { cls: "bg-orange-900/50 border border-orange-500/50",                       label: "MODERATE (2.5–3.5)" },
                  { cls: "bg-emerald-900/50 border border-emerald-500/50",                     label: "TARGET (3.5–5)" },
                  { cls: "bg-gradient-to-br from-amber-900/50 to-yellow-900/40 border border-amber-500/50", label: "MONSTER (>5)" },
                  { cls: "bg-zinc-700/50 border border-zinc-600",                              label: "Fără comenzi" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded ${item.cls}`} />
                    <span className="text-zinc-400">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-900/60 rounded-lg border border-zinc-700/60">
                <div>
                  <span className="label">Zile cu date</span>
                  <span className="text-white font-semibold">{uploadedDates.length} / {daysInMonth}</span>
                </div>
                <div>
                  <span className="label">Chelt. totale</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(uploadedDates.reduce((sum, d) => sum + d.amountSpent, 0))}
                  </span>
                </div>
                <div>
                  <span className="label">Venituri totale</span>
                  <span className="text-white font-semibold">
                    {isLoadingCalendarRoas
                      ? <span className="text-zinc-500">Se încarcă...</span>
                      : formatCurrency(calendarRoasData.reduce((sum, d) => sum + d.revenue, 0))}
                  </span>
                </div>
                <div>
                  <span className="label">ROAS lunar</span>
                  {isLoadingCalendarRoas ? (
                    <span className="text-zinc-500 font-semibold">Se încarcă...</span>
                  ) : (() => {
                    const totalSpend = calendarRoasData.reduce((sum, d) => sum + d.adSpend, 0);
                    const totalRevenue = calendarRoasData.reduce((sum, d) => sum + d.revenue, 0);
                    const monthRoas = totalSpend > 0 ? totalRevenue / totalSpend : null;
                    return <span className={`font-bold text-lg ${getRoasColor(monthRoas)}`}>{formatRoas(monthRoas)}</span>;
                  })()}
                </div>
              </div>

              {/* Detailed data table */}
              {uploadedDates.length > 0 && (
                <div className="mt-6">
                  <h3 className="section-title mb-3">Date detaliate</h3>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-700/60">
                    <table className="table-dark">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th className="text-right">Chelt. pub.</th>
                          <th className="text-right">Achiziții Meta</th>
                          <th className="text-right">Valoare Meta</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedDates.map((row) => (
                          <tr key={row.date}>
                            <td className="text-white">{formatFullDate(row.date)}</td>
                            <td className="text-right">{formatCurrency(row.amountSpent)}</td>
                            <td className="text-right">{row.metaPurchases}</td>
                            <td className="text-right">{formatCurrency(row.metaPurchaseValue)}</td>
                            <td className="text-right">
                              <button onClick={() => handleDeleteDate(row.date)} className="text-red-400 hover:text-red-300 text-xs">
                                Șterge
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
                <div className="text-center py-8 mt-4">
                  <p className="text-muted text-sm">Nicio dată publiciatară încărcată pentru această lună.</p>
                  <p className="text-faint text-xs mt-1">Încarcă un CSV Meta Ads pentru a începe.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {activeTab === "report" && (
        <>
          {!showReport && !isLoadingReport && (
            <div className="card p-10 text-center">
              <svg className="w-10 h-10 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="section-title mb-1">Selectează filtrele și apasă „Generează Raport"</h3>
              <p className="text-muted text-sm">Alege un produs și o lună, apoi generează raportul ROAS.</p>
            </div>
          )}

          {isLoadingReport && (
            <div className="card p-10 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-indigo-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-muted mt-3 text-sm">Se încarcă datele ROAS...</p>
            </div>
          )}

          {showReport && roasData && roasData.data.length === 0 && (
            <div className="card p-10 text-center">
              <svg className="w-10 h-10 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="section-title mb-1">Nicio cheltuială publicitară</h3>
              <p className="text-muted text-sm">Mergi la tab-ul „Încarcă" pentru a importa date Meta Ads pentru această lună.</p>
            </div>
          )}

          {showReport && roasData && roasData.data.length > 0 && (
            <>
              <div className="card overflow-x-auto">
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th className="text-right">Chelt. pub.</th>
                      <th className="text-right">Venituri</th>
                      <th className="text-right">Medie coș</th>
                      <th className="text-center">ROAS</th>
                      <th className="text-right">Comenzi</th>
                      <th className="text-right">Produse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roasData.data.map((row) => {
                      const roasBadge = getRoasBadge(row.roas);
                      const ordersDiff = row.orders - row.metaPurchases;
                      return (
                        <tr key={row.date} className={getRoasBgColor(row.roas)}>
                          <td className="text-white font-medium">{formatDate(row.date)}</td>
                          <td className="text-right">{formatCurrency(row.adSpend)}</td>
                          <td className="text-right font-medium text-white">{formatCurrency(row.revenue)}</td>
                          <td className="text-right">{formatCurrency(row.avgOrderValue)}</td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`font-bold ${getRoasColor(row.roas)}`}>{formatRoas(row.roas)}</span>
                              {roasBadge && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${roasBadge.className}`}>
                                  {roasBadge.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right">
                            <span className="text-white font-medium">{row.orders}</span>
                            {row.metaPurchases > 0 && (
                              <span className="text-faint text-xs ml-1">
                                (vs {row.metaPurchases}{" "}
                                <span className={ordersDiff >= 0 ? "text-green-400" : "text-red-400"}>
                                  {ordersDiff >= 0 ? "+" : ""}{ordersDiff}
                                </span>)
                              </span>
                            )}
                          </td>
                          <td className="text-right">{row.productsSold}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-zinc-900/80 border-t-2 border-zinc-600">
                    <tr>
                      <td className="font-bold text-white">TOTAL</td>
                      <td className="text-right font-bold text-white">{formatCurrency(roasData.totals.adSpend)}</td>
                      <td className="text-right font-bold text-white">{formatCurrency(roasData.totals.revenue)}</td>
                      <td className="text-right">{formatCurrency(roasData.totals.avgOrderValue)}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-bold ${getRoasColor(roasData.totals.roas)}`}>
                            {formatRoas(roasData.totals.roas)}
                          </span>
                          {getRoasBadge(roasData.totals.roas) && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRoasBadge(roasData.totals.roas)!.className}`}>
                              {getRoasBadge(roasData.totals.roas)!.text}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="text-white font-bold">{roasData.totals.orders}</span>
                        {roasData.totals.metaPurchases > 0 && (
                          <span className="text-faint text-xs ml-1">
                            (vs {roasData.totals.metaPurchases}{" "}
                            <span className={(roasData.totals.orders - roasData.totals.metaPurchases) >= 0 ? "text-green-400" : "text-red-400"}>
                              {(roasData.totals.orders - roasData.totals.metaPurchases) >= 0 ? "+" : ""}
                              {roasData.totals.orders - roasData.totals.metaPurchases}
                            </span>)
                          </span>
                        )}
                      </td>
                      <td className="text-right font-bold text-white">{roasData.totals.productsSold}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ROAS Legend */}
              <div className="card p-4">
                <h3 className="section-title mb-3">Legendă ROAS</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                  {[
                    { cls: "bg-red-500",                                          label: "< 2.5 — Slab" },
                    { cls: "bg-orange-500",                                       label: "2.5–3.5 — Moderat" },
                    { cls: "bg-emerald-500",                                      label: "3.5–5 — Bun (Target)" },
                    { cls: "bg-gradient-to-r from-amber-500 to-yellow-400",       label: "> 5 — Excepțional" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded ${item.cls}`} />
                      <span className="text-zinc-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Manual Entry Modal */}
      {manualEntryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm shadow-2xl">
            <h3 className="section-title mb-0.5">
              {manualEntryModal.existingData ? "Editează" : "Adaugă"} cheltuieli
            </h3>
            <p className="text-muted text-sm mb-4">{formatFullDate(manualEntryModal.date)}</p>

            <div className="mb-4">
              <label className="label">Sumă cheltuită (RON)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualEntryModal.amountSpent}
                onChange={(e) => setManualEntryModal({ ...manualEntryModal, amountSpent: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveManualEntry();
                  if (e.key === "Escape") setManualEntryModal(null);
                }}
                autoFocus
                placeholder="0.00"
                className="input text-lg"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setManualEntryModal(null)}
                disabled={isSavingManual}
                className="btn btn-secondary flex-1"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveManualEntry}
                disabled={isSavingManual || !manualEntryModal.amountSpent}
                className="btn btn-primary flex-1"
              >
                {isSavingManual ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Se salvează...
                  </>
                ) : "Salvează"}
              </button>
            </div>

            {manualEntryModal.existingData && (
              <p className="text-xs text-faint mt-3 text-center">
                Actual: {formatCurrency(manualEntryModal.existingData.amountSpent)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
