"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [embedModalOpen, setEmbedModalOpen] = useState<string | null>(null);

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
    } catch (err) {
      console.error("Error fetching landing pages:", err);
      setError(err instanceof Error ? err.message : "Failed to load landing pages");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(landingPageId: string) {
    if (!confirm("Are you sure you want to delete this landing page?")) {
      return;
    }

    try {
      const response = await fetch(`/api/landing-pages/${landingPageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete landing page");
      }

      // Refresh the list
      fetchLandingPages();
    } catch (err) {
      console.error("Error deleting landing page:", err);
      alert(err instanceof Error ? err.message : "Failed to delete landing page");
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
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleStatus(page.id, page.status)}
                            className={`text-xs ${
                              page.status === "published"
                                ? "text-amber-400 hover:text-amber-300"
                                : "text-emerald-400 hover:text-emerald-300"
                            }`}
                          >
                            {page.status === "published" ? "Draft" : "Publish"}
                          </button>
                          <Link
                            href={`/admin/landing-pages/${page.id}/edit`}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
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
                                  onClick={() => router.push(`/admin/landing-pages/${page.id}/upsells/presale`)}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                  + Adaugă Presale
                                </button>
                              </div>
                              <div className="bg-zinc-800/30 rounded border border-zinc-700/30 p-3">
                                <p className="text-xs text-zinc-400 italic">
                                  Nu există upsells presale configurate
                                </p>
                              </div>
                            </div>

                            {/* Postsale Section */}
                            <div className="pt-3 border-t border-zinc-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-white uppercase tracking-wide">
                                  Postsale Upsells
                                </h4>
                                <button
                                  onClick={() => router.push(`/admin/landing-pages/${page.id}/upsells/postsale`)}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                  + Adaugă Postsale
                                </button>
                              </div>
                              <div className="bg-zinc-800/30 rounded border border-zinc-700/30 p-3">
                                <p className="text-xs text-zinc-400 italic">
                                  Nu există upsells postsale configurate
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-3 border-t border-zinc-700/50">
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
    </div>
  );
}
