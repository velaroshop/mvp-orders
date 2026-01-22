"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueData {
  period: string;
  totalRevenue: number;
  upsellRevenue: number;
  orderCount: number;
}

interface RevenueGrowthChartProps {
  data: RevenueData[];
  granularity: 'hourly' | 'daily' | 'monthly';
  loading?: boolean;
}

export default function RevenueGrowthChart({ data, granularity, loading }: RevenueGrowthChartProps) {
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
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
        <div className="text-center py-12">
          <p className="text-zinc-400">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Revenue Growth</h3>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md font-medium">
            Total
          </button>
        </div>
      </div>

      {/* Line Chart */}
      <div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="displayLabel"
              stroke="#a1a1aa"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              angle={granularity === 'daily' ? -45 : 0}
              textAnchor={granularity === 'daily' ? 'end' : 'middle'}
              height={granularity === 'daily' ? 80 : 30}
            />
            <YAxis
              stroke="#a1a1aa"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '0.5rem',
                color: '#fff'
              }}
              formatter={(value: any) => `${Number(value).toFixed(2)} RON`}
            />
            <Legend
              wrapperStyle={{ color: '#a1a1aa' }}
            />
            <Line
              type="monotone"
              dataKey="totalRevenue"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Revenue"
              dot={{ fill: '#3b82f6', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="upsellRevenue"
              stroke="#f97316"
              strokeWidth={2}
              name="Upsell Revenue"
              dot={{ fill: '#f97316', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
