"use client";

export default function DashboardPage() {
  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-2">
          Overview of your store performance and key metrics
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Revenue</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Orders</h3>
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <span className="text-xl">📦</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Conversion Rate</h3>
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Average Order Value</h3>
            <div className="w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center">
              <span className="text-xl">💵</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Customers</h3>
            <div className="w-10 h-10 rounded-full bg-pink-600/20 flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>

        {/* Card 6 */}
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Pending Orders</h3>
            <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">-</p>
            <p className="text-xs text-zinc-500">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-8 bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          🚀 Advanced Analytics Coming Soon
        </h3>
        <p className="text-zinc-400 text-sm">
          We're working on bringing you detailed insights, charts, and reports to help you make better business decisions.
        </p>
      </div>
    </div>
  );
}
