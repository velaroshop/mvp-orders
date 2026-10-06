"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueData {
  period: string;
  totalRevenue: number;
  orderCount: number;
}

interface RevenueGrowthChartProps {
  data: RevenueData[];
  comparisonData?: RevenueData[];
  comparisonLabel?: string;
  granularity: 'hourly' | 'daily' | 'monthly';
  loading?: boolean;
}

export default function RevenueGrowthChart({ data, comparisonData, comparisonLabel = "Yesterday", granularity, loading }: RevenueGrowthChartProps) {
  // Build a map of comparison data by period
  const comparisonMap = new Map<string, number>();
  if (comparisonData) {
    comparisonData.forEach(item => {
      comparisonMap.set(item.period, item.totalRevenue);
    });
  }

  const hasComparison = comparisonData && comparisonData.length > 0;

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
      comparisonRevenue: comparisonMap.get(item.period) ?? null,
    };
  });

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full min-h-45">
        <p className="text-zinc-400 text-sm">Se încarcă...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Revenue Growth</h3>
        <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md font-medium">
          Total
        </button>
      </div>

      {/* Line Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={formattedData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="displayLabel"
              stroke="#71717a"
              tick={{ fill: '#71717a', fontSize: 10 }}
              angle={granularity === 'daily' ? -45 : 0}
              textAnchor={granularity === 'daily' ? 'end' : 'middle'}
              height={granularity === 'daily' ? 60 : 24}
            />
            <YAxis
              stroke="#71717a"
              tick={{ fill: '#71717a', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(value: any, name: any) => {
                if (name === comparisonLabel) {
                  return [`${Number(value).toFixed(2)} RON`, comparisonLabel];
                }
                return [`${Number(value).toFixed(2)} RON`, 'Revenue'];
              }}
            />
            <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '11px' }} />
            {hasComparison && (
              <Line
                type="monotone"
                dataKey="comparisonRevenue"
                stroke="#71717a"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                name={comparisonLabel}
                dot={false}
                opacity={0.7}
                connectNulls={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="totalRevenue"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Revenue"
              dot={{ fill: '#3b82f6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
