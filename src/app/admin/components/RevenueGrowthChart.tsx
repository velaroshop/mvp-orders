"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface HourlyData {
  hour: string;
  totalRevenue: number;
  upsellRevenue: number;
  orderCount: number;
}

interface UpsellSplit {
  presale: number;
  postsale: number;
}

interface RevenueGrowthChartProps {
  hourlyRevenue: HourlyData[];
  upsellSplit: UpsellSplit;
  loading?: boolean;
}

export default function RevenueGrowthChart({ hourlyRevenue, upsellSplit, loading }: RevenueGrowthChartProps) {
  // Format hour for display (show only time)
  const formattedData = hourlyRevenue.map(item => ({
    ...item,
    hourDisplay: item.hour.split(' ')[1] || item.hour, // Extract time part
  }));

  // Prepare bar chart data
  const barData = [
    {
      name: 'Upsell Split',
      'Pre-Purchase': upsellSplit.presale,
      'Post-Purchase': upsellSplit.postsale,
    },
  ];

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
      <div className="mb-8">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="hourDisplay"
              stroke="#a1a1aa"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
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

      {/* Bar Chart */}
      <div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              type="number"
              stroke="#a1a1aa"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
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
            <Bar
              dataKey="Pre-Purchase"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="Post-Purchase"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      {hourlyRevenue.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Total Revenue</p>
              <p className="text-lg font-bold text-emerald-500">
                {hourlyRevenue.reduce((sum, h) => sum + h.totalRevenue, 0).toFixed(2)} RON
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1">Upsell Revenue</p>
              <p className="text-lg font-bold text-orange-500">
                {hourlyRevenue.reduce((sum, h) => sum + h.upsellRevenue, 0).toFixed(2)} RON
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1">Pre-Purchase</p>
              <p className="text-lg font-bold text-blue-500">
                {upsellSplit.presale.toFixed(2)} RON
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1">Post-Purchase</p>
              <p className="text-lg font-bold text-purple-500">
                {upsellSplit.postsale.toFixed(2)} RON
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
