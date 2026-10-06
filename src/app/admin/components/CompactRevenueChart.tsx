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

interface RevenueData {
  period: string;
  totalRevenue: number;
  orderCount: number;
}

interface CompactRevenueChartProps {
  data: RevenueData[];
  yesterdayData?: RevenueData[];
  granularity: "hourly" | "daily" | "monthly";
  loading?: boolean;
  hideRevenue?: boolean;
}

export default function CompactRevenueChart({
  data,
  yesterdayData,
  granularity,
  loading,
  hideRevenue,
}: CompactRevenueChartProps) {
  // Build yesterday maps
  const yesterdayMap = new Map<string, number>();
  const yesterdayOrdersMap = new Map<string, number>();
  if (yesterdayData) {
    yesterdayData.forEach((item) => {
      yesterdayMap.set(item.period, item.totalRevenue);
      yesterdayOrdersMap.set(item.period, item.orderCount);
    });
  }

  // Format period label
  const formattedData = data.map((item) => {
    let displayLabel = item.period;
    if (granularity === "daily") {
      const date = new Date(item.period);
      displayLabel = `${date.getUTCDate()} ${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}`;
    } else if (granularity === "monthly") {
      const [year, month] = item.period.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      displayLabel = date.toLocaleString("en-US", { month: "short", year: "numeric" });
    }
    return {
      ...item,
      displayLabel,
      yesterdayRevenue: yesterdayMap.get(item.period) ?? null,
      yesterdayOrders: yesterdayOrdersMap.get(item.period) ?? null,
    };
  });

  // Totals
  const todayTotal = data.reduce((s, d) => s + d.totalRevenue, 0);
  const todayOrders = data.reduce((s, d) => s + d.orderCount, 0);
  const yesterdayTotal = yesterdayData
    ? yesterdayData.reduce((s, d) => s + d.totalRevenue, 0)
    : 0;
  const yesterdayOrders = yesterdayData
    ? yesterdayData.reduce((s, d) => s + d.orderCount, 0)
    : 0;
  const hasYesterday = yesterdayData && yesterdayData.length > 0;
  const diffPercent =
    yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : null;
  const isUp = diffPercent !== null && diffPercent >= 0;

  const mainKey = hideRevenue ? "orderCount" : "totalRevenue";
  const yestKey = hideRevenue ? "yesterdayOrders" : "yesterdayRevenue";

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
        <h3 className="text-sm font-semibold text-white">
          {hideRevenue ? "Comenzi azi" : "Venituri azi"}
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">Azi vs. ieri</p>
      </div>

      {/* Totals */}
      <div className="flex items-start justify-between mb-4 gap-3">
        {/* Today */}
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Azi</p>
          {hideRevenue ? (
            <p className="text-xl font-bold text-white leading-none">
              {todayOrders}
              <span className="text-sm font-normal text-zinc-400 ml-1">comenzi</span>
            </p>
          ) : (
            <p className="text-xl font-bold text-white leading-none">
              {todayTotal.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-normal text-zinc-400 ml-1">RON</span>
            </p>
          )}
          {!hideRevenue && (
            <p className="text-xs text-zinc-500 mt-0.5">{todayOrders} comenzi</p>
          )}
        </div>

        {/* % badge */}
        {hasYesterday && diffPercent !== null && !hideRevenue && (
          <div className={`shrink-0 px-2.5 py-1.5 rounded-lg text-sm font-bold ${
            isUp
              ? "bg-green-900/30 border border-green-700/50 text-green-400"
              : "bg-red-900/30 border border-red-800/50 text-red-400"
          }`}>
            {isUp ? "+" : ""}{diffPercent.toFixed(1)}%
          </div>
        )}

        {/* Yesterday */}
        {hasYesterday && (
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Ieri</p>
            {hideRevenue ? (
              <p className="text-sm font-semibold text-zinc-400 leading-none">
                {yesterdayOrders}
                <span className="text-xs font-normal text-zinc-500 ml-1">comenzi</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-zinc-400 leading-none">
                {yesterdayTotal.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-zinc-500 ml-1">RON</span>
              </p>
            )}
            {!hideRevenue && (
              <p className="text-xs text-zinc-500 mt-0.5">{yesterdayOrders} comenzi</p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-indigo-400 rounded-full" />
          <span className="text-[10px] text-zinc-400">Azi</span>
        </div>
        {hasYesterday && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 bg-zinc-500 rounded-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #71717a 0px, #71717a 4px, transparent 4px, transparent 8px)",
              }}
            />
            <span className="text-[10px] text-zinc-500">Ieri</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={formattedData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="todayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis
              dataKey="displayLabel"
              stroke="#52525b"
              tick={{ fill: "#52525b", fontSize: 9 }}
              tickLine={false}
              interval={granularity === "hourly" ? 3 : "preserveStartEnd"}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fill: "#52525b", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={!hideRevenue}
              tickFormatter={(v) =>
                hideRevenue ? v : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "0.5rem",
                color: "#fff",
                fontSize: "11px",
              }}
              labelFormatter={(label) => `${label}`}
              formatter={(value: any, name: any) => {
                if (value === null) return ["-", name];
                if (hideRevenue) {
                  return [`${Number(value)} comenzi`, name === yestKey ? "Ieri" : "Azi"];
                }
                return [
                  `${Number(value).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`,
                  name === yestKey ? "Ieri" : "Azi",
                ];
              }}
            />
            {/* Yesterday — dashed, behind */}
            {hasYesterday && (
              <Area
                type="monotone"
                dataKey={yestKey}
                stroke="#52525b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {/* Today — solid, in front */}
            <Area
              type="monotone"
              dataKey={mainKey}
              stroke="#818cf8"
              strokeWidth={2}
              fill="url(#todayGrad)"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
