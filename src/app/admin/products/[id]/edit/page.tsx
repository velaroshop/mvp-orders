"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku?: string;
  status: "active" | "testing" | "inactive";
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [formData, setFormData] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  async function fetchProduct() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/products");
      
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      const product = data.products?.find((p: Product) => p.id === productId);
      
      if (!product) {
        throw new Error("Product not found");
      }

      setFormData(product);
    } catch (err) {
      console.error("Error fetching product:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load product",
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
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update product");
      }

      setMessage({ type: "success", text: "Product updated successfully!" });
      
      // Redirect to products list after 1 second
      setTimeout(() => {
        router.push("/admin/products");
      }, 1000);
    } catch (error) {
      console.error("Error updating product:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update product",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">Product not found</p>
          <Link href="/admin/products" className="text-emerald-400 hover:text-emerald-300 mt-2 inline-block">
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Edit Product</h1>
        <p className="text-zinc-400 mt-2">
          Update your product details
        </p>
      </div>

      {/* Form */}
      <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700">
        <form onSubmit={handleSubmit}>
          {/* Product Details */}
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Product Details
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500"
                  placeholder="Enter product name"
                  maxLength={50}
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Maximum 50 characters
                </p>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku || ""}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-zinc-500 uppercase"
                  placeholder="XXX-123"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Stock Keeping Unit - unique identifier (automatically converted to uppercase, max 10 characters)
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "testing" | "inactive" })}
                  className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  required
                >
                  <option value="active">Active</option>
                  <option value="testing">Testing</option>
                  <option value="inactive">Inactive</option>
                </select>
                <p className="text-xs text-zinc-400 mt-1">
                  Active: Product is live and available. Testing: Product is in testing phase. Inactive: Product is disabled.
                </p>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="p-6 border-b border-zinc-700">
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
                    : "bg-red-900/30 border border-red-700 text-red-300"
                }`}
              >
                {message.text}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-6 bg-zinc-900/50 flex justify-between">
            <Link
              href="/admin/products"
              className="px-6 py-2 border border-zinc-600 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors"
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
