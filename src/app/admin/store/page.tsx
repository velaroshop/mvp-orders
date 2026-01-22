"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Store {
  id: string;
  url: string;
  order_series: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_on_dark_color: string;
  fb_pixel_id?: string;
  fb_conversion_token?: string;
  client_side_tracking: boolean;
  server_side_tracking: boolean;
  duplicate_order_days: number;
  landing_pages_count?: number;
  created_at: string;
  updated_at: string;
}

export default function StorePage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  async function fetchStores() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stores");

      if (!response.ok) {
        throw new Error("Failed to fetch stores");
      }

      const data = await response.json();
      setStores(data.stores || []);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError(err instanceof Error ? err.message : "Failed to load stores");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(storeId: string) {
    if (!confirm("Are you sure you want to delete this store?")) {
      return;
    }

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete store");
      }

      // Refresh the list
      fetchStores();
    } catch (err) {
      console.error("Error deleting store:", err);
      alert(err instanceof Error ? err.message : "Failed to delete store");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Stores</h1>
        <p className="text-zinc-400 mt-2">
          Manage your stores and their settings
        </p>
      </div>

      {/* Add Store Button - Centered */}
      <div className="mb-6 flex justify-center">
        <Link
          href="/admin/store/new"
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium shadow-sm"
        >
          + Add New Store
        </Link>
      </div>

      {/* Stores List */}
      {isLoading ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Loading stores...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400 mb-4">No stores found.</p>
          <Link
            href="/admin/store/new"
            className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Create your first store
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                    Order Series
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                    Colors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                    Tracking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-zinc-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {store.url}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {store.order_series}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-zinc-600"
                          style={{ backgroundColor: store.primary_color }}
                          title={`Primary: ${store.primary_color}`}
                        />
                        <div
                          className="w-6 h-6 rounded border border-zinc-600"
                          style={{ backgroundColor: store.accent_color }}
                          title={`Accent: ${store.accent_color}`}
                        />
                        <div
                          className="w-6 h-6 rounded border border-zinc-600"
                          style={{ backgroundColor: store.background_color }}
                          title={`Background: ${store.background_color}`}
                        />
                        <div
                          className="w-6 h-6 rounded border border-zinc-600"
                          style={{ backgroundColor: store.text_on_dark_color }}
                          title={`Text on Dark: ${store.text_on_dark_color}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {store.client_side_tracking && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-800">
                            Pixel
                          </span>
                        )}
                        {store.server_side_tracking && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-900/50 text-purple-300 border border-purple-800">
                            API
                          </span>
                        )}
                        {!store.client_side_tracking && !store.server_side_tracking && (
                          <span className="text-xs text-zinc-500">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-400">
                        {formatDate(store.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        {/* Edit Button */}
                        <Link
                          href={`/admin/store/${store.id}/edit`}
                          className="text-emerald-500 hover:text-emerald-400 transition-colors"
                          title="Edit store"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>

                        {/* Delete Button - Only show if no landing pages */}
                        {(!store.landing_pages_count || store.landing_pages_count === 0) && (
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                            title="Delete store"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
