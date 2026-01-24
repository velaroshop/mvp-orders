"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewStorePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    url: "",
    orderSeries: "VLR",
    orderEmail: "",
    primaryColor: "#FF6B00",
    accentColor: "#00A854",
    backgroundColor: "#2C3E50",
    textOnDarkColor: "#FFFFFF",
    duplicateOrderDays: 14,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create store");
      }

      setMessage({ type: "success", text: "Store created successfully!" });

      // Redirect to stores list after 1 second
      setTimeout(() => {
        router.push("/admin/store");
      }, 1000);
    } catch (error) {
      console.error("Error creating store:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create store",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create New Store</h1>
        <p className="text-zinc-400 mt-2">
          Configure your store details and customizations
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
                  value={formData.orderSeries}
                  onChange={(e) => setFormData({ ...formData, orderSeries: e.target.value })}
                  className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="e.g., VLR"
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Specify the order series for this store (e.g., ECM). This will be used in order numbering.
                </p>
              </div>

              {/* Order Email */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  E-mail comenzi
                </label>
                <input
                  type="email"
                  value={formData.orderEmail}
                  onChange={(e) => setFormData({ ...formData, orderEmail: e.target.value })}
                  className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="e.g., comenzi@store.com"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Adresa de email folosită la trimiterea comenzilor în Helpship.
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
                  value={formData.duplicateOrderDays}
                  onChange={(e) => setFormData({ ...formData, duplicateOrderDays: parseInt(e.target.value) || 14 })}
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

            <div className="grid grid-cols-2 gap-4">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Primary Color (Buton Submit)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
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
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
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
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
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
                    value={formData.textOnDarkColor}
                    onChange={(e) => setFormData({ ...formData, textOnDarkColor: e.target.value })}
                    className="h-10 w-16 rounded border border-zinc-600 cursor-pointer bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={formData.textOnDarkColor}
                    onChange={(e) => setFormData({ ...formData, textOnDarkColor: e.target.value })}
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
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-zinc-600 text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Creating..." : "Create Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
