"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SimulatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Superadmin check
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

  // Editable KPI values
  const [totalRevenue, setTotalRevenue] = useState(6706.6);
  const [avgOrderValue, setAvgOrderValue] = useState(100.1);
  const [orderCount, setOrderCount] = useState(67);
  const [productsSold, setProductsSold] = useState(140);
  const [upsellRate, setUpsellRate] = useState(19.4);

  // Filter display values
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [activeFilter, setActiveFilter] = useState("today");

  if (status === "loading" || !isSuperadmin) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const quickFilters = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last3days", label: "Last Three Days" },
    { key: "wtd", label: "Week To Date" },
    { key: "mtd", label: "Month To Date" },
    { key: "all", label: "All Time" },
  ];

  // Format date for display (DD/MM/YYYY)
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="min-h-screen bg-zinc-900">
      <main className="mx-auto max-w-md px-4 py-8">
        {/* KPI Card - exact copy from orders page */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-3">
          {/* Filters Section */}
          <div className="mb-3">
            <h3 className="text-xs font-medium text-zinc-400 mb-2">Filters</h3>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1 mb-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.key}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    activeFilter === filter.key
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-700 text-zinc-300"
                  }`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Date Filters + Apply Button */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                  Start Date
                </label>
                <div className="w-full px-2 py-1 text-[10px] bg-zinc-900 border border-zinc-600 rounded text-white">
                  {formatDate(startDate)}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                  End Date
                </label>
                <div className="w-full px-2 py-1 text-[10px] bg-zinc-900 border border-zinc-600 rounded text-white">
                  {formatDate(endDate)}
                </div>
              </div>
              <div className="flex items-end">
                <div className="w-full px-3 py-1 text-[10px] bg-emerald-600 text-white rounded font-medium text-center">
                  Apply Filters
                </div>
              </div>
            </div>
          </div>

          {/* KPIs Section */}
          <div className="border-t border-zinc-700 pt-3">
            <h3 className="text-xs font-medium text-zinc-400 mb-3">Key Performance Indicators</h3>

            <div className="space-y-3">
              {/* Row 1: Revenue metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 rounded p-2">
                  <p className="text-[10px] text-zinc-400 mb-0.5">Total Revenue</p>
                  <p className="text-lg font-bold text-emerald-500">
                    {totalRevenue.toFixed(2)} <span className="text-xs text-zinc-500">RON</span>
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded p-2">
                  <p className="text-[10px] text-zinc-400 mb-0.5">Avg. Order Value</p>
                  <p className="text-lg font-bold text-white">
                    {avgOrderValue.toFixed(2)} <span className="text-xs text-zinc-500">RON</span>
                  </p>
                </div>
              </div>

              {/* Row 2: Count metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900/50 rounded p-2 text-center">
                  <p className="text-[10px] text-zinc-400 mb-0.5">Orders</p>
                  <p className="text-lg font-bold text-white">{orderCount}</p>
                </div>
                <div className="bg-zinc-900/50 rounded p-2 text-center">
                  <p className="text-[10px] text-zinc-400 mb-0.5">Products</p>
                  <p className="text-lg font-bold text-white">{productsSold}</p>
                </div>
                <div className="bg-zinc-900/50 rounded p-2 text-center">
                  <p className="text-[10px] text-zinc-400 mb-0.5">Upsell Rate</p>
                  <p className="text-lg font-bold text-white">{upsellRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="my-8 border-t border-zinc-700" />

        {/* Input Controls */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Editare Valori</h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Total Revenue</label>
                <input
                  type="number"
                  step="0.01"
                  value={totalRevenue}
                  onChange={(e) => setTotalRevenue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Avg. Order Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={avgOrderValue}
                  onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Orders</label>
                <input
                  type="number"
                  value={orderCount}
                  onChange={(e) => setOrderCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Products</label>
                <input
                  type="number"
                  value={productsSold}
                  onChange={(e) => setProductsSold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Upsell Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={upsellRate}
                  onChange={(e) => setUpsellRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                />
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-3 mt-3">
              <h4 className="text-xs text-zinc-400 mb-2">Filtre afișate</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Filtru activ</label>
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-600 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                  >
                    {quickFilters.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
