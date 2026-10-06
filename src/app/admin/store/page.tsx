"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Store {
  id: string;
  url: string;
  order_series: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_on_dark_color: string;
  fb_pixel_id?: string;
  fb_conversion_token?: string;
  client_side_tracking: boolean;
  server_side_tracking: boolean;
  duplicate_order_days: number;
  landing_pages_count?: number;
  created_at: string;
  updated_at: string;
}

export default function StorePage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchStores(); }, []);

  async function fetchStores() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stores");
      if (!response.ok) throw new Error("Failed to fetch stores");
      const data = await response.json();
      setStores(data.stores || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stores");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(storeId: string) {
    if (!confirm("Ești sigur că vrei să ștergi acest magazin?")) return;
    try {
      const response = await fetch(`/api/stores/${storeId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete store");
      fetchStores();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete store");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ro-RO", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Magazine</h1>
          <p className="page-subtitle">Gestionează magazinele și configurațiile acestora</p>
        </div>
        <Link href="/admin/store/new" className="btn btn-primary shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Magazin nou
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card p-8 text-center">
          <p className="text-muted text-sm">Se încarcă magazinele...</p>
        </div>
      ) : error ? (
        <div className="card p-4 border-red-800/60">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted mb-4">Niciun magazin găsit.</p>
          <Link href="/admin/store/new" className="btn btn-primary">
            Creează primul magazin
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>URL</th>
                <th>Serie comenzi</th>
                <th>Culori</th>
                <th>Tracking</th>
                <th>Creat</th>
                <th className="text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="font-medium text-white">{store.url}</td>
                  <td>{store.order_series}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: store.primary_color,      label: "Primary" },
                        { color: store.accent_color,       label: "Accent" },
                        { color: store.background_color,   label: "Background" },
                        { color: store.text_on_dark_color, label: "Text on Dark" },
                      ].map((c) => (
                        <div
                          key={c.label}
                          className="w-5 h-5 rounded border border-zinc-600"
                          style={{ backgroundColor: c.color }}
                          title={`${c.label}: ${c.color}`}
                        />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {store.client_side_tracking && <span className="badge badge-blue">Pixel</span>}
                      {store.server_side_tracking && <span className="badge badge-purple">API</span>}
                      {!store.client_side_tracking && !store.server_side_tracking && (
                        <span className="text-faint text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="text-muted">{formatDate(store.created_at)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/store/${store.id}/edit`}
                        className="text-zinc-400 hover:text-indigo-400 transition-colors"
                        title="Editează"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      {(!store.landing_pages_count || store.landing_pages_count === 0) && (
                        <button
                          onClick={() => handleDelete(store.id)}
                          className="text-zinc-400 hover:text-red-400 transition-colors"
                          title="Șterge"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
