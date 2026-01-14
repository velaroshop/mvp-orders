"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Store {
  id: string;
  url: string;
  order_series: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  fb_pixel_id?: string;
  fb_conversion_token?: string;
  client_side_tracking: boolean;
  server_side_tracking: boolean;
}

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id as string;

  const [formData, setFormData] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (storeId) {
      fetchStore();
    }
  }, [storeId]);

  async function fetchStore() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stores");
      
      if (!response.ok) {
        throw new Error("Failed to fetch stores");
      }

      const data = await response.json();
      const store = data.stores?.find((s: Store) => s.id === storeId);
      
      if (!store) {
        throw new Error("Store not found");
      }

      setFormData(store);
    } catch (err) {
      console.error("Error fetching store:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load store",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formData.url,
          orderSeries: formData.order_series,
          primaryColor: formData.primary_color,
          accentColor: formData.accent_color,
          backgroundColor: formData.background_color,
          fbPixelId: formData.fb_pixel_id || "",
          fbConversionToken: formData.fb_conversion_token || "",
          clientSideTracking: formData.client_side_tracking,
          serverSideTracking: formData.server_side_tracking,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update store");
      }

      setMessage({ type: "success", text: "Store updated successfully!" });
      
      // Redirect to stores list after 1 second
      setTimeout(() => {
        router.push("/admin/store");
      }, 1000);
    } catch (error) {
      console.error("Error updating store:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update store",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-8 text-center">
          <p className="text-zinc-600">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Store not found</p>
          <Link href="/admin/store" className="text-emerald-600 hover:text-emerald-900 mt-2 inline-block">
            ← Back to Stores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Edit Store</h1>
        <p className="text-zinc-600 mt-2">
          Update your store details and customizations
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-zinc-200">
        <form onSubmit={handleSubmit}>
          {/* Store Details */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Store Details
            </h2>

            <div className="space-y-4">
              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  URL *
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-700"
                  placeholder="e.g., yourstore.com"
                  required
                />
                <p className="text-xs text-zinc-700 mt-1">
                  Enter the unique URL for this store. (e.g., yoursite.com)
                </p>
              </div>

              {/* Order Series */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Order Series *
                </label>
                <input
                  type="text"
                  value={formData.order_series}
                  onChange={(e) => setFormData({ ...formData, order_series: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-700"
                  placeholder="e.g., VLR"
                  required
                />
                <p className="text-xs text-zinc-700 mt-1">
                  Specify the order series for this store (e.g., ECM). This will be used in order numbering.
                </p>
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Color Scheme
            </h2>

            <div className="grid grid-cols-3 gap-4">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-700"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-700 mt-4">
              Please allow a couple minutes for changes to take place & refresh your local cache (CMD/CTRL + SHIFT + R)
            </p>
          </div>

          {/* Conversion Tracking */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Conversion Tracking
            </h2>

            <div className="space-y-4">
              {/* Facebook Pixel ID */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  value={formData.fb_pixel_id || ""}
                  onChange={(e) => setFormData({ ...formData, fb_pixel_id: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-700"
                  placeholder="Enter your Facebook Pixel ID for tracking"
                />
              </div>

              {/* Conversion API Token */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Conversion API Token
                </label>
                <input
                  type="text"
                  value={formData.fb_conversion_token || ""}
                  onChange={(e) => setFormData({ ...formData, fb_conversion_token: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 placeholder:text-zinc-700"
                  placeholder="Enter your Facebook Conversion API Token"
                />
              </div>

              {/* Client-side Tracking */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="clientSideTracking"
                  checked={formData.client_side_tracking}
                  onChange={(e) => setFormData({ ...formData, client_side_tracking: e.target.checked })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 rounded"
                />
                <label htmlFor="clientSideTracking" className="ml-2">
                  <span className="block text-sm font-medium text-zinc-900">
                    Client-side Tracking Enabled (Facebook Pixel)
                  </span>
                  <span className="block text-xs text-zinc-700">
                    This automatically installs the Facebook Pixel code to your website
                  </span>
                </label>
              </div>

              {/* Server-side Tracking */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="serverSideTracking"
                  checked={formData.server_side_tracking}
                  onChange={(e) => setFormData({ ...formData, server_side_tracking: e.target.checked })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 rounded"
                />
                <label htmlFor="serverSideTracking" className="ml-2">
                  <span className="block text-sm font-medium text-zinc-900">
                    Server-side Tracking Enabled (Conversion API)
                  </span>
                  <span className="block text-xs text-zinc-700">
                    Enable server-side tracking via Facebook Conversion API
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="p-6 border-b border-zinc-200">
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {message.text}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-6 bg-zinc-50 flex justify-between">
            <Link
              href="/admin/store"
              className="px-6 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
