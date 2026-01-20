"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

interface Product {
  id: string;
  name: string;
  sku?: string;
  status: "active" | "testing" | "inactive";
  created_at: string;
  updated_at: string;
  testing_orders_count?: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk action state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
    isProcessing: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    action: null,
    isProcessing: false,
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "info";
    message: string;
  }>({
    isOpen: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/products");

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleRowExpansion(productId: string) {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  }

  async function handleDelete(productId: string) {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      setDeleteModalOpen(null);
      setToast({
        isOpen: true,
        type: "success",
        message: "Product deleted successfully! ✓",
      });

      // Refresh the list
      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
      setToast({
        isOpen: true,
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete product",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function handlePromoteBulk(productId: string, count: number) {
    setConfirmModal({
      isOpen: true,
      title: "Promote Testing Orders",
      message: `Are you sure you want to promote ${count} testing ${count === 1 ? "order" : "orders"} to real orders? They will be synced to Helpship.`,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        try {
          const response = await fetch(`/api/products/${productId}/promote-testing-orders`, {
            method: "POST",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to promote orders");
          }

          const result = await response.json();

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({
            isOpen: true,
            type: "success",
            message: `Successfully promoted ${result.count} testing ${result.count === 1 ? "order" : "orders"}! ✓`,
          });

          // Refresh products list
          await fetchProducts();
        } catch (error) {
          console.error("Error promoting orders:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to promote orders";

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({
            isOpen: true,
            type: "error",
            message: errorMessage,
          });
        }
      },
      isProcessing: false,
    });
  }

  async function handleCancelBulk(productId: string, count: number) {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Testing Orders",
      message: `Are you sure you want to cancel ${count} testing ${count === 1 ? "order" : "orders"}? This action cannot be undone.`,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        try {
          const response = await fetch(`/api/products/${productId}/cancel-testing-orders`, {
            method: "POST",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to cancel orders");
          }

          const result = await response.json();

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({
            isOpen: true,
            type: "success",
            message: `Successfully cancelled ${result.count} testing ${result.count === 1 ? "order" : "orders"}! ✓`,
          });

          // Refresh products list
          await fetchProducts();
        } catch (error) {
          console.error("Error cancelling orders:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to cancel orders";

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({
            isOpen: true,
            type: "error",
            message: errorMessage,
          });
        }
      },
      isProcessing: false,
    });
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Products</h1>
        <p className="text-zinc-400 mt-2">
          Manage your product catalog
        </p>
      </div>

      {/* Add Product Button - Centered */}
      <div className="mb-6 flex justify-center">
        <Link
          href="/admin/products/new"
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium shadow-sm"
        >
          + Add New Product
        </Link>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Loading products...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400 mb-4">No products found.</p>
          <Link
            href="/admin/products/new"
            className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {products.map((product) => (
                  <>
                    <tr
                      key={product.id}
                      onClick={() => toggleRowExpansion(product.id)}
                      className="hover:bg-zinc-700/50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-white">
                            {product.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-300">
                          {product.sku || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                            product.status === "active"
                              ? "bg-emerald-600 text-white"
                              : product.status === "testing"
                              ? "bg-amber-600 text-white"
                              : "bg-zinc-600 text-white"
                          }`}
                        >
                          {product.status === "active"
                            ? "Active"
                            : product.status === "testing"
                            ? "Testing"
                            : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-300">
                          {formatDate(product.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                            title="Edit product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(product.id);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                            title={expandedRows.has(product.id) ? "Collapse" : "Expand"}
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedRows.has(product.id) ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedRows.has(product.id) && (
                      <tr key={`${product.id}-details`} className="bg-zinc-900/50 border-t border-zinc-700/50">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="space-y-4">
                            {/* Product Details */}
                            <div>
                              <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">
                                Product Details
                              </h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    SKU
                                  </div>
                                  <div className="text-sm text-zinc-300">
                                    {product.sku || "-"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    Status
                                  </div>
                                  <span
                                    className={`inline-flex rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                                      product.status === "active"
                                        ? "bg-emerald-600 text-white"
                                        : product.status === "testing"
                                        ? "bg-amber-600 text-white"
                                        : "bg-zinc-600 text-white"
                                    }`}
                                  >
                                    {product.status === "active"
                                      ? "Active"
                                      : product.status === "testing"
                                      ? "Testing"
                                      : "Inactive"}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    Created
                                  </div>
                                  <div className="text-sm text-zinc-300">
                                    {formatDate(product.created_at)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Testing Orders Section */}
                            <div className="pt-3 border-t border-zinc-700/50">
                              <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">
                                Testing Orders
                              </h4>
                              <div className="bg-zinc-800/30 rounded border border-zinc-700/30 p-3">
                                {(product.testing_orders_count || 0) > 0 ? (
                                  <div className="space-y-3">
                                    <div className="text-sm font-medium text-blue-400">
                                      {product.testing_orders_count} testing {product.testing_orders_count === 1 ? "order" : "orders"}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePromoteBulk(product.id, product.testing_orders_count || 0);
                                        }}
                                        className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors font-medium"
                                      >
                                        🚀 Promote All
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelBulk(product.id, product.testing_orders_count || 0);
                                        }}
                                        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                                      >
                                        ✕ Cancel All
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-zinc-400 italic">
                                    No testing orders for this product
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-3 border-t border-zinc-700/50">
                              <h4 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                                Danger Zone
                              </h4>
                              <div className="bg-red-900/10 rounded border border-red-700/30 p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-white">Delete Product</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                      This action cannot be undone. This will permanently delete the product.
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteModalOpen(product.id);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium text-sm"
                                  >
                                    🗑️ Delete Product
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen !== null}
        onClose={() => setDeleteModalOpen(null)}
        onConfirm={() => deleteModalOpen && handleDelete(deleteModalOpen)}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isProcessing={isDeleting}
      />

      {/* Bulk Actions Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false })}
        onConfirm={() => confirmModal.action && confirmModal.action()}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        cancelText="Cancel"
        isProcessing={confirmModal.isProcessing}
      />

      {/* Toast */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        type={toast.type}
        message={toast.message}
      />
    </div>
  );
}
