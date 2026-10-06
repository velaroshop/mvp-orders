"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RefundRequest {
  id: string;
  ticket_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  order_number: string | null;
  product_name: string;
  motive: string;
  description: string | null;
  status: "new" | "in_progress" | "completed";
  admin_notes: string | null;
  created_at: string;
}

function statusBadgeClass(status: RefundRequest["status"]) {
  return {
    new:         "badge badge-red",
    in_progress: "badge badge-orange",
    completed:   "badge badge-green",
  }[status];
}

function statusLabel(status: RefundRequest["status"]) {
  return { new: "Nou", in_progress: "În lucru", completed: "Finalizat" }[status];
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => { loadRefunds(); }, [statusFilter, search]);

  async function loadRefunds() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/refunds?${params}`);
      if (!res.ok) throw new Error("Failed to load refunds");
      const data = await res.json();
      setRefunds(data.refunds);
    } catch (error) {
      console.error("Error loading refunds:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/refunds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      loadRefunds();
    } catch (error) {
      console.error("Error updating refund:", error);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  const newCount = refunds.filter((r) => r.status === "new").length;

  const tabs = [
    { key: "all",         label: "Toate" },
    { key: "new",         label: "Noi" },
    { key: "in_progress", label: "În lucru" },
    { key: "completed",   label: "Finalizate" },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Returnări</h1>
        <p className="page-subtitle">Gestionează cererile de returnare produse</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === key
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                {label}
                {key === "new" && newCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                    {newCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Caută după nume, email, telefon, tichet..."
              className="input flex-1"
            />
            <button type="submit" className="btn btn-secondary">
              Caută
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSearchInput(""); }}
                className="btn btn-secondary"
              >
                ✕
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-8 text-center">
          <p className="text-muted text-sm">Se încarcă returnările...</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted">
            {search ? "Nicio cerere găsită pentru căutarea ta." : "Nicio cerere de returnare."}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Tichet</th>
                <th>Client</th>
                <th>Produs</th>
                <th>Motiv</th>
                <th>Status</th>
                <th>Data</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td>
                    <Link
                      href={`/admin/refunds/${refund.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                    >
                      {refund.ticket_number}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium text-white">{refund.full_name}</div>
                    <div className="text-xs text-muted">{refund.email}</div>
                    {refund.phone && <div className="text-xs text-faint">{refund.phone}</div>}
                  </td>
                  <td className="max-w-50 truncate">{refund.product_name}</td>
                  <td className="text-xs max-w-37.5 truncate text-muted">{refund.motive}</td>
                  <td>
                    <span className={statusBadgeClass(refund.status)}>
                      {statusLabel(refund.status)}
                    </span>
                  </td>
                  <td className="text-muted text-xs whitespace-nowrap">
                    {new Date(refund.created_at).toLocaleDateString("ro-RO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {refund.status === "new" && (
                        <button
                          onClick={() => updateStatus(refund.id, "in_progress")}
                          className="btn btn-sm btn-secondary"
                        >
                          În lucru
                        </button>
                      )}
                      {refund.status === "in_progress" && (
                        <button
                          onClick={() => updateStatus(refund.id, "completed")}
                          className="btn btn-sm btn-primary"
                        >
                          Finalizează
                        </button>
                      )}
                      <Link href={`/admin/refunds/${refund.id}`} className="btn btn-sm btn-secondary">
                        Detalii
                      </Link>
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
