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

const STATUS_CONFIG = {
  new: { label: "Nou", bg: "bg-red-900/30", text: "text-red-300", border: "border-red-700" },
  in_progress: { label: "In lucru", bg: "bg-amber-900/30", text: "text-amber-300", border: "border-amber-700" },
  completed: { label: "Finalizat", bg: "bg-emerald-900/30", text: "text-emerald-300", border: "border-emerald-700" },
};

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    loadRefunds();
  }, [statusFilter, search]);

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

  const statusCounts = {
    all: refunds.length,
    new: refunds.filter((r) => r.status === "new").length,
    in_progress: refunds.filter((r) => r.status === "in_progress").length,
    completed: refunds.filter((r) => r.status === "completed").length,
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Returnari</h1>
        <p className="text-zinc-400 mt-1">Gestioneaza cererile de returnare produse</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status tabs */}
        <div className="flex gap-2">
          {(["all", "new", "in_progress", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {s === "all" ? "Toate" : STATUS_CONFIG[s].label}
              {s === "new" && statusCounts.new > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {statusCounts.new}
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
            placeholder="Cauta dupa nume, email, telefon, tichet..."
            className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-zinc-700 text-white rounded-md text-sm hover:bg-zinc-600 transition-colors"
          >
            Cauta
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); }}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-md text-sm hover:text-white transition-colors"
            >
              X
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : refunds.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">
            {search ? "Nicio cerere gasita pentru cautarea ta." : "Nicio cerere de returnare."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400">
                  <th className="text-left px-4 py-3 font-medium">Tichet</th>
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Produs</th>
                  <th className="text-left px-4 py-3 font-medium">Motiv</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => {
                  const sc = STATUS_CONFIG[refund.status];
                  return (
                    <tr key={refund.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/refunds/${refund.id}`}
                          className="text-emerald-400 hover:text-emerald-300 font-mono text-xs"
                        >
                          {refund.ticket_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white">{refund.full_name}</div>
                        <div className="text-zinc-400 text-xs">{refund.email}</div>
                        {refund.phone && (
                          <div className="text-zinc-500 text-xs">{refund.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 max-w-[200px] truncate">
                        {refund.product_name}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-xs max-w-[150px] truncate">
                        {refund.motive}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(refund.created_at).toLocaleDateString("ro-RO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {refund.status === "new" && (
                            <button
                              onClick={() => updateStatus(refund.id, "in_progress")}
                              className="px-2 py-1 bg-amber-600/30 text-amber-300 border border-amber-700 rounded text-xs hover:bg-amber-600/50 transition-colors"
                            >
                              In lucru
                            </button>
                          )}
                          {refund.status === "in_progress" && (
                            <button
                              onClick={() => updateStatus(refund.id, "completed")}
                              className="px-2 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-700 rounded text-xs hover:bg-emerald-600/50 transition-colors"
                            >
                              Finalizeaza
                            </button>
                          )}
                          <Link
                            href={`/admin/refunds/${refund.id}`}
                            className="px-2 py-1 bg-zinc-700 text-zinc-300 border border-zinc-600 rounded text-xs hover:bg-zinc-600 transition-colors"
                          >
                            Detalii
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
