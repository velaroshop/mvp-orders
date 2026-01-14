"use client";

export default function LandingPagesPage() {
  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Landing Pages</h1>
        <p className="text-zinc-600 mt-2">
          Manage your landing pages and campaigns
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-12">
        <div className="text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-2">
            Coming Soon
          </h2>
          <p className="text-zinc-600 mb-6">
            Landing pages functionality will be available soon. This section will allow you to create, edit, and manage your landing pages.
          </p>
          <div className="inline-block px-4 py-2 bg-zinc-100 text-zinc-700 rounded-md text-sm">
            Implementation pending
          </div>
        </div>
      </div>

      {/* Feature preview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="font-semibold text-zinc-900 mb-2">📄 Page Builder</h3>
          <p className="text-sm text-zinc-600">
            Create beautiful landing pages with our drag-and-drop builder
          </p>
        </div>
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="font-semibold text-zinc-900 mb-2">🎨 Templates</h3>
          <p className="text-sm text-zinc-600">
            Start from pre-built templates optimized for conversions
          </p>
        </div>
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="font-semibold text-zinc-900 mb-2">📊 Analytics</h3>
          <p className="text-sm text-zinc-600">
            Track performance with built-in analytics and A/B testing
          </p>
        </div>
      </div>
    </div>
  );
}
