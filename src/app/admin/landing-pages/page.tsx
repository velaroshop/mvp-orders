"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Upsell {
  id: string;
  title: string;
  description?: string;
  type: "presale" | "postsale";
  quantity: number;
  price: number;
  srp: number;
  active: boolean;
  display_order: number;
  media_url?: string;
  product_id: string;
  landing_page_id: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    status?: string;
  };
  landing_page?: {
    id: string;
    slug: string;
    name?: string;
  };
}

interface Product {
  id: string;
  name: string;
  sku?: string;
}

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  product_id: string;
  store_id: string;
  price_1?: number;
  price_2?: number;
  price_3?: number;
  shipping_price?: number;
  post_purchase_status?: boolean;
  products?: {
    id: string;
    name: string;
    sku?: string;
    status?: string;
  };
  stores?: {
    id: string;
    url: string;
  };
  created_at: string;
  updated_at: string;
}

export default function LandingPagesPage() {
  const router = useRouter();
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [upsellsByLandingPage, setUpsellsByLandingPage] = useState<Record<string, Upsell[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [embedModalOpen, setEmbedModalOpen] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editUpsellModal, setEditUpsellModal] = useState<Upsell | null>(null);
  const [isEditingUpsell, setIsEditingUpsell] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [deleteUpsellModal, setDeleteUpsellModal] = useState<Upsell | null>(null);
  const [isDeletingUpsell, setIsDeletingUpsell] = useState(false);

  useEffect(() => {
    fetchLandingPages();
  }, []);

  async function fetchLandingPages() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/landing-pages");

      if (!response.ok) {
        throw new Error("Failed to fetch landing pages");
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || "Failed to fetch landing pages";
        throw new Error(errorMsg);
      }

      setLandingPages(data.landingPages || []);

      // Fetch upsells for all landing pages
      fetchAllUpsells();
    } catch (err) {
      console.error("Error fetching landing pages:", err);
      setError(err instanceof Error ? err.message : "Failed to load landing pages");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAllUpsells() {
    try {
      const response = await fetch("/api/upsells");

      if (!response.ok) {
        console.error("Failed to fetch upsells", response.status);
        return;
      }

      const data = await response.json();
      const upsells: Upsell[] = data.upsells || [];

      console.log("📦 Fetched upsells:", upsells);

      // Group upsells by landing page ID
      const grouped: Record<string, Upsell[]> = {};
      upsells.forEach((upsell: any) => {
        const landingPageId = upsell.landing_page_id;
        if (!grouped[landingPageId]) {
          grouped[landingPageId] = [];
        }
        grouped[landingPageId].push({
          id: upsell.id,
          title: upsell.title,
          description: upsell.description,
          type: upsell.type,
          quantity: upsell.quantity,
          price: upsell.price,
          srp: upsell.srp,
          active: upsell.active,
          display_order: upsell.display_order,
          media_url: upsell.media_url,
          product_id: upsell.product_id,
          landing_page_id: upsell.landing_page_id,
          product: upsell.product,
          landing_page: upsell.landing_page,
        });
      });

      console.log("📊 Grouped upsells:", grouped);
      setUpsellsByLandingPage(grouped);
    } catch (err) {
      console.error("Error fetching upsells:", err);
    }
  }

  async function handleDelete() {
    if (!deleteModalOpen) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/landing-pages/${deleteModalOpen}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete landing page");
      }

      // Close modal and refresh the list
      setDeleteModalOpen(null);
      fetchLandingPages();
    } catch (err) {
      console.error("Error deleting landing page:", err);
      alert(err instanceof Error ? err.message : "Failed to delete landing page");
    } finally {
      setIsDeleting(false);
    }
  }

  async function fetchProducts() {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        console.error("Failed to fetch products");
        return;
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  }

  async function handleUpdateUpsell(e: React.FormEvent) {
    e.preventDefault();
    if (!editUpsellModal) return;

    try {
      setIsEditingUpsell(true);
      const response = await fetch(`/api/upsells/${editUpsellModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editUpsellModal.title,
          description: editUpsellModal.description,
          product_id: editUpsellModal.product_id,
          quantity: editUpsellModal.quantity,
          srp: editUpsellModal.srp,
          price: editUpsellModal.price,
          media_url: editUpsellModal.media_url,
          active: editUpsellModal.active,
          display_order: editUpsellModal.display_order,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update upsell");
      }

      setEditUpsellModal(null);
      fetchAllUpsells();
    } catch (err) {
      console.error("Error updating upsell:", err);
      alert(err instanceof Error ? err.message : "Failed to update upsell");
    } finally {
      setIsEditingUpsell(false);
    }
  }

  function openEditUpsellModal(upsell: Upsell) {
    setEditUpsellModal({ ...upsell });
    if (products.length === 0) {
      fetchProducts();
    }
  }

  async function handleDeleteUpsell() {
    if (!deleteUpsellModal) return;

    try {
      setIsDeletingUpsell(true);
      const response = await fetch(`/api/upsells/${deleteUpsellModal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete upsell");
      }

      setDeleteUpsellModal(null);
      fetchAllUpsells();
    } catch (err) {
      console.error("Error deleting upsell:", err);
      alert(err instanceof Error ? err.message : "Failed to delete upsell");
    } finally {
      setIsDeletingUpsell(false);
    }
  }

  async function handleToggleStatus(landingPageId: string, currentStatus: string) {
    try {
      // Toggle between 'draft' and 'published'
      const newStatus = currentStatus === "published" ? "draft" : "published";

      const response = await fetch(`/api/landing-pages/${landingPageId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      // Refresh the list
      fetchLandingPages();
    } catch (err) {
      console.error("Error updating landing page status:", err);
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatPrice(price: number | undefined) {
    if (price === undefined || price === null) return "-";
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  function toggleRowExpansion(pageId: string) {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedRows(newExpanded);
  }

  function getWidgetUrl(slug: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/widget?slug=${slug}`;
  }

  function getEmbedCode(slug: string) {
    const widgetUrl = getWidgetUrl(slug);
    const iframeId = `velaro-widget-${slug}`;
    return `<iframe id="${iframeId}" src="${widgetUrl}" width="100%" style="border: none; display: block; min-height: 600px;" scrolling="no"></iframe>
<script>
  (function() {
    var iframe = document.getElementById('${iframeId}');
    if (!iframe) return;
    
    function adjustHeight(event) {
      if (event.data && event.data.type === 'velaro-widget-height' && event.data.height) {
        iframe.style.height = event.data.height + 'px';
      }
    }
    
    window.addEventListener('message', adjustHeight);
    
    // Initial height adjustment after iframe loads
    iframe.onload = function() {
      setTimeout(function() {
        if (iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({ type: 'request-height' }, '*');
          } catch (e) {
            console.debug('Could not request height from iframe');
          }
        }
      }, 500);
    };
  })();
</script>`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert("Cod copiat în clipboard!");
    });
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Landing Pages</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage your landing pages and campaigns
          </p>
        </div>
        <Link
          href="/admin/landing-pages/new"
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          + Add Landing Page
        </Link>
      </div>

      {/* Landing Pages List */}
      {isLoading ? (
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-6 text-center">
          <p className="text-zinc-400 text-sm">Loading landing pages...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
      </div>
      ) : landingPages.length === 0 ? (
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-6 text-center">
          <p className="text-zinc-400 text-sm mb-3">No landing pages found.</p>
          <Link
            href="/admin/landing-pages/new"
            className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm"
          >
            Create your first landing page
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900/50 border-b border-zinc-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {landingPages.map((page) => (
                  <>
                    <tr
                      key={page.id}
                      onClick={() => toggleRowExpansion(page.id)}
                      className="hover:bg-zinc-700/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {page.name}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {page.slug}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {page.products?.name || "-"}
                        </div>
                        {page.products?.sku && (
                          <div className="text-xs text-zinc-400">
                            SKU: {page.products.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              page.status === "published"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : page.status === "archived"
                                ? "bg-zinc-500/20 text-zinc-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {page.status === "published"
                              ? "Published"
                              : page.status === "archived"
                              ? "Archived"
                              : "Draft"}
                          </span>
                          {page.products?.status === "inactive" && (
                            <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] rounded uppercase font-medium">
                              ⚠️ Produs Inactiv
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {/* Actions moved to expanded details */}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Details Row */}
                    {expandedRows.has(page.id) && (
                      <tr key={`${page.id}-details`} className="bg-zinc-900/50 border-t border-zinc-700/50">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="space-y-3">
                            {/* Pricing Details */}
                            <div>
                              <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">
                                Detalii prețuri
                              </h4>
                              <div className="grid grid-cols-5 gap-3">
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    Preț 1
                                  </div>
                                  <div className="text-sm text-zinc-300">
                                    {formatPrice(page.price_1)} RON
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    Preț 2
                                  </div>
                                  <div className="text-sm text-zinc-300">
                                    {formatPrice(page.price_2)} RON
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    Preț 3
                                  </div>
                                  <div className="text-sm text-zinc-300">
                                    {formatPrice(page.price_3)} RON
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    Preț livrare
                                  </div>
                                  <div className="text-sm text-zinc-300">
                                    {formatPrice(page.shipping_price)} RON
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-medium text-zinc-400 uppercase mb-1">
                                    Post-purchase
                                  </div>
                                  <div className="flex items-center">
                                    {page.post_purchase_status ? (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20">
                                        <svg
                                          className="w-3 h-3 text-emerald-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-600">
                                        <svg
                                          className="w-3 h-3 text-zinc-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                          />
                                        </svg>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Presale Section */}
                            <div className="pt-3 border-t border-zinc-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-white uppercase tracking-wide">
                                  Presale Upsells
                                </h4>
                                <button
                                  onClick={() => router.push(`/admin/landing-pages/${page.id}/upsells/add?type=presale`)}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                  + Adaugă Presale
                                </button>
                              </div>
                              <div className="bg-zinc-800/30 rounded border border-zinc-700/30 p-3">
                                {(() => {
                                  const presaleUpsells = (upsellsByLandingPage[page.id] || []).filter(u => u.type === "presale");
                                  if (presaleUpsells.length === 0) {
                                    return (
                                      <p className="text-xs text-zinc-400 italic">
                                        Nu există upsells presale configurate
                                      </p>
                                    );
                                  }
                                  return (
                                    <div className="space-y-2">
                                      {presaleUpsells.map((upsell) => (
                                        <div key={upsell.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-sm font-medium text-white">{upsell.title}</p>
                                              {!upsell.active && (
                                                <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-[10px] rounded uppercase">
                                                  Inactiv
                                                </span>
                                              )}
                                              {upsell.product?.status === "inactive" && (
                                                <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] rounded uppercase font-medium">
                                                  ⚠️ Produs Inactiv
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                              <p className="text-xs text-zinc-400">
                                                {upsell.product?.name} {upsell.product?.sku && `(${upsell.product.sku})`}
                                              </p>
                                              <p className="text-xs text-zinc-400">
                                                Cant: {upsell.quantity}
                                              </p>
                                              <p className="text-xs text-emerald-400 font-medium">
                                                {formatPrice(upsell.price)} RON
                                              </p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditUpsellModal(upsell);
                                            }}
                                            className="ml-2 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                                            title="Editează upsell"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Postsale Section */}
                            <div className="pt-3 border-t border-zinc-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-white uppercase tracking-wide">
                                  Postsale Upsells
                                </h4>
                                {(() => {
                                  const postsaleUpsells = (upsellsByLandingPage[page.id] || []).filter(u => u.type === "postsale");
                                  const hasPostsale = postsaleUpsells.length > 0;
                                  return (
                                    <button
                                      onClick={() => router.push(`/admin/landing-pages/${page.id}/upsells/add?type=postsale`)}
                                      disabled={hasPostsale}
                                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                        hasPostsale
                                          ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                                      }`}
                                      title={hasPostsale ? "Poți avea doar un singur postsale upsell" : "Adaugă postsale upsell"}
                                    >
                                      + Adaugă Postsale
                                    </button>
                                  );
                                })()}
                              </div>
                              <div className="bg-zinc-800/30 rounded border border-zinc-700/30 p-3">
                                {(() => {
                                  const postsaleUpsells = (upsellsByLandingPage[page.id] || []).filter(u => u.type === "postsale");
                                  if (postsaleUpsells.length === 0) {
                                    return (
                                      <p className="text-xs text-zinc-400 italic">
                                        Nu există upsells postsale configurate
                                      </p>
                                    );
                                  }
                                  return (
                                    <div className="space-y-2">
                                      {postsaleUpsells.map((upsell) => (
                                        <div key={upsell.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-sm font-medium text-white">{upsell.title}</p>
                                              {!upsell.active && (
                                                <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-[10px] rounded uppercase">
                                                  Inactiv
                                                </span>
                                              )}
                                              {upsell.product?.status === "inactive" && (
                                                <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] rounded uppercase font-medium">
                                                  ⚠️ Produs Inactiv
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                              <p className="text-xs text-zinc-400">
                                                {upsell.product?.name} {upsell.product?.sku && `(${upsell.product.sku})`}
                                              </p>
                                              <p className="text-xs text-zinc-400">
                                                Cant: {upsell.quantity}
                                              </p>
                                              <p className="text-xs text-emerald-400 font-medium">
                                                {formatPrice(upsell.price)} RON
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openEditUpsellModal(upsell);
                                              }}
                                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                                              title="Editează upsell"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteUpsellModal(upsell);
                                              }}
                                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                              title="Șterge upsell"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-700/50">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={getWidgetUrl(page.slug)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                  Vezi formular
                                </Link>
                                <button
                                  onClick={() => setEmbedModalOpen(page.id)}
                                  className="px-3 py-1.5 bg-zinc-600 text-white rounded text-xs font-medium hover:bg-zinc-700 transition-colors"
                                >
                                  Cod embed
                                </button>
                                <button
                                  onClick={() => toggleRowExpansion(page.id)}
                                  className="px-3 py-1.5 text-zinc-400 hover:text-zinc-300 text-xs transition-colors"
                                >
                                  Ascunde detalii
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/admin/landing-pages/${page.id}/edit`}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => setDeleteModalOpen(page.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                                >
                                  Delete
                                </button>
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

      {/* Embed Code Modal */}
      {embedModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-zinc-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Cod embed pentru formular
                </h3>
                <button
                  onClick={() => setEmbedModalOpen(null)}
                  className="text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-zinc-300 mb-4">
                Copiază acest cod și inserează-l în pagina ta de vânzare pentru a afișa formularul. Iframe-ul se va adapta automat la înălțimea conținutului.
              </p>
              <div className="bg-zinc-900 rounded-md p-4 mb-4 border border-zinc-600">
                <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap break-words">
                  <code>{embedModalOpen && getEmbedCode(landingPages.find(p => p.id === embedModalOpen)?.slug || "")}</code>
                </pre>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const page = landingPages.find(p => p.id === embedModalOpen);
                    if (page) {
                      copyToClipboard(getEmbedCode(page.slug));
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  Copiază cod
                </button>
                <button
                  onClick={() => setEmbedModalOpen(null)}
                  className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600 transition-colors text-sm font-medium"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-zinc-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Confirmă ștergerea
                </h3>
                <button
                  onClick={() => setDeleteModalOpen(null)}
                  className="text-zinc-400 hover:text-zinc-300 transition-colors"
                  disabled={isDeleting}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-zinc-300 mb-6">
                Ești sigur că vrei să ștergi acest landing page? Această acțiune nu poate fi anulată.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteModalOpen(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isDeleting ? "Se șterge..." : "Șterge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Upsell Modal */}
      {editUpsellModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdateUpsell}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    Editează Upsell
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditUpsellModal(null)}
                    className="text-zinc-400 hover:text-zinc-300 transition-colors"
                    disabled={isEditingUpsell}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Product */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Produs *
                    </label>
                    <select
                      value={editUpsellModal.product_id}
                      onChange={(e) => setEditUpsellModal({ ...editUpsellModal, product_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Selectează produs</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.sku && `(${product.sku})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Titlu *
                    </label>
                    <input
                      type="text"
                      value={editUpsellModal.title}
                      onChange={(e) => setEditUpsellModal({ ...editUpsellModal, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description - only for postsale */}
                  {editUpsellModal.type === "postsale" && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Descriere
                      </label>
                      <textarea
                        value={editUpsellModal.description || ""}
                        onChange={(e) => setEditUpsellModal({ ...editUpsellModal, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Quantity, SRP, Price */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Cantitate *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editUpsellModal.quantity}
                        onChange={(e) => setEditUpsellModal({ ...editUpsellModal, quantity: parseInt(e.target.value) })}
                        required
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        SRP (RON) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editUpsellModal.srp}
                        onChange={(e) => setEditUpsellModal({ ...editUpsellModal, srp: parseFloat(e.target.value) })}
                        required
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Preț (RON) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editUpsellModal.price}
                        onChange={(e) => setEditUpsellModal({ ...editUpsellModal, price: parseFloat(e.target.value) })}
                        required
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Media URL */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      URL Media
                    </label>
                    <input
                      type="url"
                      value={editUpsellModal.media_url || ""}
                      onChange={(e) => setEditUpsellModal({ ...editUpsellModal, media_url: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  {/* Display Order and Active */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Ordine afișare
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editUpsellModal.display_order}
                        onChange={(e) => setEditUpsellModal({ ...editUpsellModal, display_order: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Status
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={editUpsellModal.active}
                          onChange={(e) => setEditUpsellModal({ ...editUpsellModal, active: e.target.checked })}
                          className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-zinc-300">Activ</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setEditUpsellModal(null)}
                    disabled={isEditingUpsell}
                    className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isEditingUpsell}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isEditingUpsell ? "Se salvează..." : "Salvează"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Upsell Confirmation Modal */}
      {deleteUpsellModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Confirmă ștergerea
                </h3>
                <button
                  onClick={() => setDeleteUpsellModal(null)}
                  className="text-zinc-400 hover:text-zinc-300 transition-colors"
                  disabled={isDeletingUpsell}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-zinc-300 mb-2">
                Ești sigur că vrei să ștergi upsell-ul <strong className="text-white">{deleteUpsellModal.title}</strong>?
              </p>
              <p className="text-sm text-zinc-400 mb-6">
                Această acțiune nu poate fi anulată.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteUpsellModal(null)}
                  disabled={isDeletingUpsell}
                  className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDeleteUpsell}
                  disabled={isDeletingUpsell}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isDeletingUpsell ? "Se șterge..." : "Șterge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
