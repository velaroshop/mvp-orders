"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    status: "active" as "active" | "testing",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      setMessage({ type: "success", text: "Product created successfully!" });
      
      // Redirect to products list after 1 second
      setTimeout(() => {
        router.push("/admin/products");
      }, 1000);
    } catch (error) {
      console.error("Error creating product:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create product",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Create Product</h1>
        <p className="text-zinc-600 mt-2">
          Add a new product to your catalog
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-zinc-200">
        <form onSubmit={handleSubmit}>
          {/* Product Details */}
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Product Details
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter product name"
                  required
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter product SKU (optional)"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Stock Keeping Unit - unique identifier for this product
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "testing" })}
                  className="w-full max-w-md px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="active">Active</option>
                  <option value="testing">Testing</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Active: Product is live and available. Testing: Product is in testing phase.
                </p>
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
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
