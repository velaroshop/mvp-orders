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

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Landing Pages</h1>
        <p className="text-zinc-600 mt-2">
          Manage your landing pages and campaigns
        </p>
      </div>

      {/* Add Landing Page Button - Centered */}
      <div className="mb-6 flex justify-center">
        <Link
          href="/admin/landing-pages/new"
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium shadow-sm"
        >
          + Add New Landing Page
        </Link>
      </div>

      {/* Landing Pages List */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-8 text-center">
          <p className="text-zinc-600">Loading landing pages...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : landingPages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-8 text-center">
          <p className="text-zinc-600 mb-4">No landing pages found.</p>
          <Link
            href="/admin/landing-pages/new"
            className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Create your first landing page
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {landingPages.map((page) => (
                  <tr key={page.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900">
                        {page.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-600">
                        {page.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-900">
                        {page.products?.name || "-"}
                      </div>
                      {page.products?.sku && (
                        <div className="text-xs text-zinc-500">
                          SKU: {page.products.sku}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-600">
                        {page.stores?.url || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          page.status === "published"
                            ? "bg-emerald-100 text-emerald-800"
                            : page.status === "archived"
                            ? "bg-zinc-100 text-zinc-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {page.status === "published"
                          ? "Published"
                          : page.status === "archived"
                          ? "Archived"
                          : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-600">
                        {formatDate(page.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/landing-pages/${page.id}/edit`}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
