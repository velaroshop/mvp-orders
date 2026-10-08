"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ChevronDown, Pencil, Package } from "lucide-react";
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

const statusBadge: Record<string, string> = {
  active:   "badge badge-green",
  testing:  "badge badge-orange",
  inactive: "badge badge-zinc",
};

const statusLabel: Record<string, string> = {
  active:   "Activ",
  testing:  "Test",
  inactive: "Inactiv",
};

export default function ProductsPage() {
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
  }>({ isOpen: false, title: "", message: "", action: null, isProcessing: false });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "info";
    message: string;
  }>({ isOpen: false, type: "success", message: "" });

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Eroare la încărcarea produselor");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu s-au putut încărca produsele");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleRow(id: string) {
    const next = new Set(expandedRows);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedRows(next);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("ro-RO", { year: "numeric", month: "short", day: "numeric" });
  }

  function closeModal() {
    setConfirmModal({ isOpen: false, title: "", message: "", action: null, isProcessing: false });
  }

  async function handlePromoteBulk(productId: string, count: number) {
    setConfirmModal({
      isOpen: true,
      title: "Promovează comenzile de test",
      message: `Ești sigur că vrei să promovezi ${count} ${count === 1 ? "comandă de test" : "comenzi de test"} în comenzi reale? Vor fi sincronizate cu Helpship.`,
      action: async () => {
        setConfirmModal(p => ({ ...p, isProcessing: true }));
        try {
          const res = await fetch(`/api/products/${productId}/promote-testing-orders`, { method: "POST" });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Eroare"); }
          const result = await res.json();
          closeModal();
          setToast({ isOpen: true, type: "success", message: `${result.count} ${result.count === 1 ? "comandă promovată" : "comenzi promovate"} cu succes! ✓` });
          await fetchProducts();
        } catch (e) {
          closeModal();
          setToast({ isOpen: true, type: "error", message: e instanceof Error ? e.message : "Eroare la promovare" });
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
        setConfirmModal(p => ({ ...p, isProcessing: true }));
        try {
          const res = await fetch(`/api/products/${productId}/cancel-testing-orders`, { method: "POST" });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Eroare"); }
          const result = await res.json();
          closeModal();
          setToast({ isOpen: true, type: "success", message: `${result.count} ${result.count === 1 ? "comandă anulată" : "comenzi anulate"} cu succes! ✓` });
          await fetchProducts();
        } catch (e) {
          closeModal();
          setToast({ isOpen: true, type: "error", message: e instanceof Error ? e.message : "Eroare la anulare" });
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
        setConfirmModal(p => ({ ...p, isProcessing: true }));
        try {
          const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Eroare"); }
          closeModal();
          setToast({ isOpen: true, type: "success", message: `Produsul „${productName}" a fost șters. ✓` });
          await fetchProducts();
        } catch (e) {
          closeModal();
          setToast({ isOpen: true, type: "error", message: e instanceof Error ? e.message : "Eroare la ștergere" });
        }
      },
      isProcessing: false,
    });
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Produse</h1>
          <p className="page-subtitle">Gestionează catalogul de produse</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          Produs nou
        </Link>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="card p-8 text-center">
          <p className="text-faint text-sm">Se încarcă produsele...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-800/60 bg-red-900/20 p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-muted text-sm mb-4">Niciun produs adăugat încă.</p>
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            Creează primul produs
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-zinc-800/60">
            <span className="label mb-0">Nume</span>
            <span className="label mb-0">SKU</span>
            <span className="label mb-0">Status</span>
            <span className="label mb-0">Creat</span>
            <span className="label mb-0 w-16 text-right">Acțiuni</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-800/60">
            {products.map((product) => (
              <div key={product.id}>
                {/* Main row */}
                <div
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => toggleRow(product.id)}
                >
                  <span className="text-sm font-medium text-white truncate">{product.name}</span>
                  <span className="text-sm text-zinc-400 font-mono">{product.sku || "—"}</span>
                  <span className={statusBadge[product.status]}>{statusLabel[product.status]}</span>
                  <span className="text-xs text-zinc-500">{formatDate(product.created_at)}</span>
                  <div className="flex items-center justify-end gap-1 w-16">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-colors"
                      title="Editează"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRow(product.id); }}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700/60 rounded-lg transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedRows.has(product.id) ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {expandedRows.has(product.id) && (
                  <div className="px-5 pb-5 pt-1 bg-zinc-950/60 border-t border-zinc-800/60">
                    <div className="space-y-4 pt-3">

                      {/* Details */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="label">SKU</p>
                          <p className="text-sm text-zinc-300 font-mono">{product.sku || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Status</p>
                          <span className={statusBadge[product.status]}>{statusLabel[product.status]}</span>
                        </div>
                        <div>
                          <p className="label">Creat la</p>
                          <p className="text-sm text-zinc-300">{formatDate(product.created_at)}</p>
                        </div>
                      </div>

                      {/* Testing orders */}
                      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                        <p className="label mb-2">Comenzi de test</p>
                        {(product.testing_orders_count || 0) > 0 ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-blue-400 font-medium">
                              {product.testing_orders_count} {product.testing_orders_count === 1 ? "comandă" : "comenzi"}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePromoteBulk(product.id, product.testing_orders_count || 0); }}
                              className="btn btn-sm"
                              style={{ backgroundColor: "rgb(5 150 105 / 0.2)", color: "rgb(52 211 153)", borderColor: "rgb(6 78 59 / 0.6)" }}
                            >
                              🚀 Promovează toate
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelBulk(product.id, product.testing_orders_count || 0); }}
                              className="btn btn-sm btn-danger"
                            >
                              ✕ Anulează toate
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 italic">Nicio comandă de test pentru acest produs.</p>
                        )}
                      </div>

                      {/* Danger zone */}
                      {!product.is_in_use && (
                        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
                          <p className="label text-red-500 mb-2">Zonă periculoasă</p>
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm text-zinc-300 font-medium">Șterge produsul</p>
                              <p className="text-xs text-zinc-500 mt-0.5">Nu este folosit în nicio pagină de landing sau upsell.</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name); }}
                              className="btn btn-sm btn-danger shrink-0"
                            >
                              Șterge
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeModal}
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
