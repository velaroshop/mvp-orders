"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyRevenue {
  period: string; // YYYY-MM-DD
  totalRevenue: number;
  orderCount: number;
}

interface MonthlyRevenueChartProps {
  thisMonthData: DailyRevenue[];
  lastMonthData: DailyRevenue[];
  thisMonthLabel: string; // e.g. "Octombrie 2026"
  lastMonthLabel: string; // e.g. "Septembrie 2026"
  loading?: boolean;
}

export default function MonthlyRevenueChart({
  thisMonthData,
  lastMonthData,
  thisMonthLabel,
  lastMonthLabel,
  loading,
}: MonthlyRevenueChartProps) {
  // Totals
  const thisTotal = thisMonthData.reduce((s, d) => s + d.totalRevenue, 0);
  const lastTotal = lastMonthData.reduce((s, d) => s + d.totalRevenue, 0);
  const thisOrders = thisMonthData.reduce((s, d) => s + d.orderCount, 0);
  const lastOrders = lastMonthData.reduce((s, d) => s + d.orderCount, 0);
  const diffPct = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : null;
  const isUp = diffPct !== null && diffPct >= 0;

  // Merge by day-of-month so both lines align on the X axis
  const thisMap = new Map<number, { rev: number; orders: number }>();
  thisMonthData.forEach((d) => {
    const day = new Date(d.period + "T12:00:00Z").getUTCDate();
    thisMap.set(day, { rev: d.totalRevenue, orders: d.orderCount });
  });
  const lastMap = new Map<number, { rev: number; orders: number }>();
  lastMonthData.forEach((d) => {
    const day = new Date(d.period + "T12:00:00Z").getUTCDate();
    lastMap.set(day, { rev: d.totalRevenue, orders: d.orderCount });
  });

  const maxDay = Math.max(
    thisMonthData.length > 0
      ? new Date(thisMonthData[thisMonthData.length - 1].period + "T12:00:00Z").getUTCDate()
      : 0,
    lastMonthData.length > 0
      ? new Date(lastMonthData[lastMonthData.length - 1].period + "T12:00:00Z").getUTCDate()
      : 0,
    28
  );

  const chartData = Array.from({ length: maxDay }, (_, i) => {
    const day = i + 1;
    return {
      day,
      thisMonth: thisMap.get(day)?.rev ?? null,
      lastMonth: lastMap.get(day)?.rev ?? null,
    };
  });

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full min-h-60">
        <p className="text-zinc-400 text-sm">Se încarcă...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Venituri lunare</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Luna curentă vs luna trecută</p>
      </div>

      {/* Totals */}
      <div className="flex items-start justify-between mb-4 gap-3">
        {/* This month */}
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">{thisMonthLabel}</p>
          <p className="text-xl font-bold text-white leading-none">
            {thisTotal.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm font-normal text-zinc-400 ml-1">RON</span>
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{thisOrders} comenzi</p>
        </div>

        {/* % diff badge */}
        {diffPct !== null && (
          <div className={`shrink-0 px-2.5 py-1.5 rounded-lg text-sm font-bold ${
            isUp
              ? "bg-green-900/30 border border-green-700/50 text-green-400"
              : "bg-red-900/30 border border-red-800/50 text-red-400"
          }`}>
            {isUp ? "+" : ""}{diffPct.toFixed(1)}%
          </div>
        )}

        {/* Last month */}
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">{lastMonthLabel}</p>
          <p className="text-sm font-semibold text-zinc-400 leading-none">
            {lastTotal.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-zinc-500 ml-1">RON</span>
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{lastOrders} comenzi</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-indigo-400 rounded-full" />
          <span className="text-[10px] text-zinc-400">{thisMonthLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-zinc-500 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #71717a 0px, #71717a 4px, transparent 4px, transparent 8px)" }} />
          <span className="text-[10px] text-zinc-500">{lastMonthLabel}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="thisMonthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#52525b"
              tick={{ fill: "#52525b", fontSize: 9 }}
              tickLine={false}
              interval={4}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fill: "#52525b", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "0.5rem",
                color: "#fff",
                fontSize: "11px",
              }}
              labelFormatter={(label) => `Ziua ${label}`}
              formatter={(value: any, name: any) => {
                if (value === null) return ["-", name];
                return [
                  `${Number(value).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`,
                  name === "thisMonth" ? thisMonthLabel : lastMonthLabel,
                ];
              }}
            />
            {/* Last month — dashed, behind */}
            <Area
              type="monotone"
              dataKey="lastMonth"
              stroke="#52525b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {/* This month — solid, in front */}
            <Area
              type="monotone"
              dataKey="thisMonth"
              stroke="#818cf8"
              strokeWidth={2}
              fill="url(#thisMonthGrad)"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
