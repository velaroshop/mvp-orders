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
  is_in_use?: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
        throw new Error("Eroare la încărcarea produselor");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Nu s-au putut încărca produsele");
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
      title: "Promovează comenzile de test",
      message: `Ești sigur că vrei să promovezi ${count} ${count === 1 ? "comandă de test" : "comenzi de test"} în comenzi reale? Vor fi sincronizate cu Helpship.`,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        try {
          const response = await fetch(`/api/products/${productId}/promote-testing-orders`, {
            method: "POST",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Eroare la promovarea comenzilor");
          }

          const result = await response.json();

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({
            isOpen: true,
            type: "success",
            message: `${result.count} ${result.count === 1 ? "comandă promovată" : "comenzi promovate"} cu succes! ✓`,
          });

          await fetchProducts();
        } catch (error) {
          console.error("Error promoting orders:", error);
          const errorMessage = error instanceof Error ? error.message : "Eroare la promovarea comenzilor";

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({ isOpen: true, type: "error", message: errorMessage });
        }
      },
      isProcessing: false,
    });
  }

  async function handleCancelBulk(productId: string, count: number) {
    setConfirmModal({
      isOpen: true,
      title: "Anulează comenzile de test",
      message: `Ești sigur că vrei să anulezi ${count} ${count === 1 ? "comandă de test" : "comenzi de test"}? Această acțiune nu poate fi anulată.`,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        try {
          const response = await fetch(`/api/products/${productId}/cancel-testing-orders`, {
            method: "POST",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Eroare la anularea comenzilor");
          }

          const result = await response.json();

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({
            isOpen: true,
            type: "success",
            message: `${result.count} ${result.count === 1 ? "comandă anulată" : "comenzi anulate"} cu succes! ✓`,
          });

          await fetchProducts();
        } catch (error) {
          console.error("Error cancelling orders:", error);
          const errorMessage = error instanceof Error ? error.message : "Eroare la anularea comenzilor";

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({ isOpen: true, type: "error", message: errorMessage });
        }
      },
      isProcessing: false,
    });
  }

  async function handleDeleteProduct(productId: string, productName: string) {
    setConfirmModal({
      isOpen: true,
      title: "Șterge produsul",
      message: `Ești sigur că vrei să ștergi „${productName}"? Această acțiune nu poate fi anulată.`,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        try {
          const response = await fetch(`/api/products/${productId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Eroare la ștergerea produsului");
          }

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({
            isOpen: true,
            type: "success",
            message: `Produsul „${productName}" a fost șters cu succes! ✓`,
          });

          await fetchProducts();
        } catch (error) {
          console.error("Error deleting product:", error);
          const errorMessage = error instanceof Error ? error.message : "Eroare la ștergerea produsului";

          setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
          setToast({ isOpen: true, type: "error", message: errorMessage });
        }
      },
      isProcessing: false,
    });
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Produse</h1>
        <p className="text-zinc-400 mt-2">
          Gestionează catalogul de produse
        </p>
      </div>

      {/* Add Product Button */}
      <div className="mb-6 flex justify-center">
        <Link
          href="/admin/products/new"
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium shadow-sm"
        >
          + Adaugă produs nou
        </Link>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Se încarcă produsele...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400 mb-4">Niciun produs găsit.</p>
          <Link
            href="/admin/products/new"
            className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Creează primul produs
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Nume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Creat
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Acțiuni
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
                        <div className="text-sm font-medium text-white">
                          {product.name}
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
                            ? "Activ"
                            : product.status === "testing"
                            ? "Test"
                            : "Inactiv"}
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
                            title="Editează produsul"
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
                            title={expandedRows.has(product.id) ? "Restrânge" : "Extinde"}
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
                                Detalii produs
                              </h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">SKU</div>
                                  <div className="text-sm text-zinc-300">{product.sku || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">Status</div>
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
                                      ? "Activ"
                                      : product.status === "testing"
                                      ? "Test"
                                      : "Inactiv"}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">Creat</div>
                                  <div className="text-sm text-zinc-300">{formatDate(product.created_at)}</div>
                                </div>
                              </div>
                            </div>

                            {/* Testing Orders Section */}
                            <div className="pt-3 border-t border-zinc-700/50">
                              <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">
                                Comenzi de test
                              </h4>
                              <div className="bg-zinc-800/30 rounded border border-zinc-700/30 p-3">
                                {(product.testing_orders_count || 0) > 0 ? (
                                  <div className="space-y-3">
                                    <div className="text-sm font-medium text-blue-400">
                                      {product.testing_orders_count} {product.testing_orders_count === 1 ? "comandă de test" : "comenzi de test"}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePromoteBulk(product.id, product.testing_orders_count || 0);
                                        }}
                                        className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors font-medium"
                                      >
                                        🚀 Promovează toate
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelBulk(product.id, product.testing_orders_count || 0);
                                        }}
                                        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                                      >
                                        ✕ Anulează toate
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-zinc-400 italic">
                                    Nicio comandă de test pentru acest produs
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Delete Product Section */}
                            {!product.is_in_use && (
                              <div className="pt-3 border-t border-zinc-700/50">
                                <h4 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                                  Zonă periculoasă
                                </h4>
                                <div className="bg-red-900/10 rounded border border-red-700/30 p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs text-zinc-300 font-medium">Șterge acest produs</p>
                                      <p className="text-xs text-zinc-400 mt-0.5">
                                        Produsul nu este folosit în nicio pagină de landing sau upsell
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProduct(product.id, product.name);
                                      }}
                                      className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                                    >
                                      Șterge produsul
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false })}
        onConfirm={() => confirmModal.action && confirmModal.action()}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirmă"
        cancelText="Anulează"
        isProcessing={confirmModal.isProcessing}
      />

      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        type={toast.type}
        message={toast.message}
      />
    </div>
  );
}
