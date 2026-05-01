"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueData {
  period: string;
  totalRevenue: number;
  orderCount: number;
}

interface CompactRevenueChartProps {
  data: RevenueData[];
  yesterdayData?: RevenueData[];
  granularity: 'hourly' | 'daily' | 'monthly';
  loading?: boolean;
  hideRevenue?: boolean;
}

export default function CompactRevenueChart({ data, yesterdayData, granularity, loading, hideRevenue }: CompactRevenueChartProps) {
  // Build a map of yesterday's data by period (hour)
  const yesterdayMap = new Map<string, number>();
  const yesterdayOrdersMap = new Map<string, number>();
  if (yesterdayData) {
    yesterdayData.forEach(item => {
      yesterdayMap.set(item.period, item.totalRevenue);
      yesterdayOrdersMap.set(item.period, item.orderCount);
    });
  }

  // Format period for display based on granularity
  const formattedData = data.map(item => {
    let displayLabel = item.period;

    if (granularity === 'hourly') {
      displayLabel = item.period;
    } else if (granularity === 'daily') {
      const date = new Date(item.period);
      displayLabel = `${date.getUTCDate()} ${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}`;
    } else {
      const [year, month] = item.period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      displayLabel = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }

    return {
      ...item,
      displayLabel,
      yesterdayRevenue: yesterdayMap.get(item.period) ?? null,
      yesterdayOrders: yesterdayOrdersMap.get(item.period) ?? null,
    };
  });

  if (loading) {
    return (
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-4">
        <div className="text-center py-8">
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const hasYesterday = yesterdayData && yesterdayData.length > 0;

  // Calculate totals
  const todayTotal = data.reduce((sum, item) => sum + item.totalRevenue, 0);
  const todayOrders = data.reduce((sum, item) => sum + item.orderCount, 0);
  const yesterdayTotal = yesterdayData ? yesterdayData.reduce((sum, item) => sum + item.totalRevenue, 0) : 0;
  const yesterdayOrders = yesterdayData ? yesterdayData.reduce((sum, item) => sum + item.orderCount, 0) : 0;
  const diffPercent = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;
  const isUp = diffPercent >= 0;

  return (
    <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-4">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">{hideRevenue ? "Today's Orders" : "Today's Revenue"}</h3>
        <p className="text-xs text-zinc-400 mt-0.5">Hourly breakdown</p>
      </div>

      {/* Compact Line Chart */}
      <div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="displayLabel"
              stroke="#a1a1aa"
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              height={20}
            />
            <YAxis
              stroke="#a1a1aa"
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              width={35}
              allowDecimals={hideRevenue ? false : true}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: any, name: any) => {
                if (hideRevenue) {
                  if (name === 'Yesterday') return [`${Number(value)} comenzi`, 'Ieri'];
                  return [`${Number(value)} comenzi`, 'Azi'];
                }
                if (name === 'Yesterday') return [`${Number(value).toFixed(2)} RON`, 'Yesterday'];
                return [`${Number(value).toFixed(2)} RON`, 'Revenue'];
              }}
            />
            {hasYesterday && (
              <Line
                type="monotone"
                dataKey={hideRevenue ? "yesterdayOrders" : "yesterdayRevenue"}
                stroke="#71717a"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                name="Yesterday"
                dot={false}
                opacity={0.7}
                connectNulls={false}
              />
            )}
            <Line
              type="monotone"
              dataKey={hideRevenue ? "orderCount" : "totalRevenue"}
              stroke="#3b82f6"
              strokeWidth={2}
              name={hideRevenue ? "Orders" : "Revenue"}
              dot={{ fill: '#3b82f6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Today vs Yesterday summary */}
      <div className="mt-3 pt-3 border-t border-zinc-700">
        <div className="flex items-center justify-between text-xs">
          <div>
            {hideRevenue ? (
              <span className="text-white font-semibold">{todayOrders} comenzi</span>
            ) : (
              <>
                <span className="text-white font-semibold">{todayTotal.toFixed(2)} RON</span>
                <span className="text-zinc-500 ml-1">({todayOrders} comenzi)</span>
              </>
            )}
          </div>
          {hasYesterday && yesterdayTotal > 0 && !hideRevenue && (
            <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{diffPercent.toFixed(1)}%
            </span>
          )}
        </div>
        {hasYesterday && (
          <div className="flex items-center justify-between text-xs mt-1">
            <div>
              {hideRevenue ? (
                <span className="text-zinc-400">Ieri: {yesterdayOrders} comenzi</span>
              ) : (
                <>
                  <span className="text-zinc-400">Ieri: {yesterdayTotal.toFixed(2)} RON</span>
                  <span className="text-zinc-500 ml-1">({yesterdayOrders} comenzi)</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
