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
  text_on_dark_color: string;
  duplicate_order_days: number;
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
          textOnDarkColor: formData.text_on_dark_color,
          duplicateOrderDays: formData.duplicate_order_days,
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
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">Store not found</p>
          <Link href="/admin/store" className="text-emerald-500 hover:text-emerald-400 mt-2 inline-block">
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
        <h1 className="text-3xl font-bold text-white">Edit Store</h1>
        <p className="text-zinc-400 mt-2">
          Update your store details and customizations
        </p>
      </div>

      {/* Form */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700">
        <form onSubmit={handleSubmit}>
          {/* Store Details */}
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Store Details
            </h2>

            <div className="space-y-4">
              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  URL *
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="e.g., yourstore.com"
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Enter the unique URL for this store. (e.g., yoursite.com)
                </p>
              </div>

              {/* Order Series */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Order Series *
                </label>
                <input
                  type="text"
                  value={formData.order_series}
                  onChange={(e) => setFormData({ ...formData, order_series: e.target.value })}
                  className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="e.g., VLR"
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Specify the order series for this store (e.g., ECM). This will be used in order numbering.
                </p>
              </div>

              {/* Duplicate Order Detection Days */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Zile pentru Detectare Comenzi Duplicate *
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.duplicate_order_days}
                  onChange={(e) => setFormData({ ...formData, duplicate_order_days: parseInt(e.target.value) || 14 })}
                  className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="14"
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Numărul de zile înapoi pentru detectarea comenzilor duplicate de la același client (implicit: 14 zile).
                </p>
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Color Scheme
            </h2>

            {/* Color Presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Palete predefinite (click pentru a aplica)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Preset 1: Urgență & Încredere */}
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    primary_color: "#ff6b35",
                    accent_color: "#00d68f",
                    background_color: "#1a1f36",
                    text_on_dark_color: "#f8f9fa"
                  })}
                  className="group relative p-3 rounded-lg border border-zinc-600 hover:border-emerald-500 transition-all bg-zinc-900 hover:bg-zinc-800"
                >
                  <div className="text-xs font-semibold text-white mb-2 text-center">Urgență & Încredere</div>
                  <div className="flex justify-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#ff6b35" }} title="Buton"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#00d68f" }} title="Accent"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#1a1f36" }} title="Background"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#f8f9fa" }} title="Text"></div>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-center">Amazon style</div>
                </button>

                {/* Preset 2: Premium & Exclusivitate */}
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    primary_color: "#ffc107",
                    accent_color: "#00e5cc",
                    background_color: "#0d0d0d",
                    text_on_dark_color: "#ffffff"
                  })}
                  className="group relative p-3 rounded-lg border border-zinc-600 hover:border-emerald-500 transition-all bg-zinc-900 hover:bg-zinc-800"
                >
                  <div className="text-xs font-semibold text-white mb-2 text-center">Premium Gold</div>
                  <div className="flex justify-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#ffc107" }} title="Buton"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#00e5cc" }} title="Accent"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#0d0d0d" }} title="Background"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#ffffff" }} title="Text"></div>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-center">Luxury brands</div>
                </button>

                {/* Preset 3: Energie & Dinamism */}
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    primary_color: "#e53935",
                    accent_color: "#ffeb3b",
                    background_color: "#212121",
                    text_on_dark_color: "#fafafa"
                  })}
                  className="group relative p-3 rounded-lg border border-zinc-600 hover:border-emerald-500 transition-all bg-zinc-900 hover:bg-zinc-800"
                >
                  <div className="text-xs font-semibold text-white mb-2 text-center">Energie & Dinamism</div>
                  <div className="flex justify-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#e53935" }} title="Buton"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#ffeb3b" }} title="Accent"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#212121" }} title="Background"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#fafafa" }} title="Text"></div>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-center">Flash sales</div>
                </button>

                {/* Preset 4: Natural & Sănătate */}
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    primary_color: "#43a047",
                    accent_color: "#26c6da",
                    background_color: "#1b3a2f",
                    text_on_dark_color: "#e8f5e9"
                  })}
                  className="group relative p-3 rounded-lg border border-zinc-600 hover:border-emerald-500 transition-all bg-zinc-900 hover:bg-zinc-800"
                >
                  <div className="text-xs font-semibold text-white mb-2 text-center">Natural & Fresh</div>
                  <div className="flex justify-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#43a047" }} title="Buton"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#26c6da" }} title="Accent"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#1b3a2f" }} title="Background"></div>
                    <div className="w-6 h-6 rounded-full border border-zinc-500" style={{ backgroundColor: "#e8f5e9" }} title="Text"></div>
                  </div>
                  <div className="text-[10px] text-zinc-500 text-center">Health & wellness</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Primary Color (Buton Submit)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Accent Color (Verde - Badge, Iconițe, Prețuri)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Background Color (Header & Rezumat)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {/* Text on Dark Color */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Text on Dark Color (Text pe Header & Rezumat)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.text_on_dark_color}
                    onChange={(e) => setFormData({ ...formData, text_on_dark_color: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.text_on_dark_color}
                    onChange={(e) => setFormData({ ...formData, text_on_dark_color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              Please allow a couple minutes for changes to take place & refresh your local cache (CMD/CTRL + SHIFT + R)
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className="p-6 border-b border-zinc-700">
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-emerald-900/20 border border-emerald-800 text-emerald-400"
                    : "bg-red-900/20 border border-red-800 text-red-400"
                }`}
              >
                {message.text}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-6 bg-zinc-900 flex justify-between">
            <Link
              href="/admin/store"
              className="px-6 py-2 border border-zinc-600 text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
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
