"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueData {
  period: string;
  totalRevenue: number;
  upsellRevenue: number;
  orderCount: number;
}

interface CompactRevenueChartProps {
  data: RevenueData[];
  granularity: 'hourly' | 'daily' | 'monthly';
  loading?: boolean;
}

export default function CompactRevenueChart({ data, granularity, loading }: CompactRevenueChartProps) {
  // Format period for display based on granularity
  const formattedData = data.map(item => {
    let displayLabel = item.period;

    if (granularity === 'hourly') {
      // Already in format "HH:00"
      displayLabel = item.period;
    } else if (granularity === 'daily') {
      // Format: "YYYY-MM-DD" -> "DD MMM"
      const date = new Date(item.period);
      displayLabel = `${date.getUTCDate()} ${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}`;
    } else {
      // Format: "YYYY-MM" -> "MMM YYYY"
      const [year, month] = item.period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      displayLabel = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }

    return {
      ...item,
      displayLabel,
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

  return (
    <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-4">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Today's Revenue</h3>
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: any) => `${Number(value).toFixed(2)} RON`}
            />
            <Line
              type="monotone"
              dataKey="totalRevenue"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Revenue"
              dot={{ fill: '#3b82f6', r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="upsellRevenue"
              stroke="#f97316"
              strokeWidth={2}
              name="Upsell Revenue"
              dot={{ fill: '#f97316', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
