"use client";

import { useEffect, useState } from "react";
import type { PartialOrder, PartialOrderStatus } from "@/lib/types";
import ConfirmPartialOrderModal, {
  type ConfirmPartialData,
} from "../components/ConfirmPartialOrderModal";

function partialStatusBadgeColor(status: string) {
  switch (status) {
    case "pending":    return "badge-blue";
    case "accepted":   return "badge-green";
    case "refused":    return "badge-red";
    case "unanswered": return "badge-orange";
    case "call_later": return "badge-purple";
    case "duplicate":  return "badge-yellow";
    default:           return "badge-zinc";
  }
}

function partialStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending:    "În așteptare",
    accepted:   "Acceptat",
    refused:    "Refuzat",
    unanswered: "Fără răspuns",
    call_later: "Sună mai târziu",
    duplicate:  "Duplicat",
  };
  return labels[status] || status;
}

export default function PartialsPage() {
  const [partialOrders, setPartialOrders] = useState<PartialOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, openUp: false });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPartial, setSelectedPartial] = useState<PartialOrder | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const partialsPerPage = 25;

  // Status filter state
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchDateRange, setSearchDateRange] = useState<number | "all">(30);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchPartialOrders();
  }, [currentPage, selectedStatuses, debouncedSearch]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".status-filter-dropdown")) {
        setIsStatusDropdownOpen(false);
      }
    }
    if (isStatusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isStatusDropdownOpen]);

  async function fetchPartialOrders() {
    try {
      if (debouncedSearch) setIsSearching(true);
      setIsLoading(true);
      const offset = (currentPage - 1) * partialsPerPage;
      const params = new URLSearchParams({
        limit: partialsPerPage.toString(),
        offset: offset.toString(),
      });
      if (selectedStatuses.length > 0) {
        params.append("statuses", selectedStatuses.join(","));
      }
      if (debouncedSearch.trim()) {
        params.append("q", debouncedSearch.trim());
        if (searchDateRange !== "all") {
          params.append("dateRange", searchDateRange.toString());
        }
      }
      const response = await fetch(`/api/partial-orders/list?${params}`);
      if (!response.ok) throw new Error("Failed to fetch partial orders");
      const data = await response.json();
      setPartialOrders(data.partialOrders || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }

  function formatFullDateTime(dateString: string) {
    return new Date(dateString).toLocaleString("ro-RO", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }

  function formatRelativeTime(dateString: string) {
    const diffInMs = new Date().getTime() - new Date(dateString).getTime();
    const m = Math.floor(diffInMs / 60000);
    const h = Math.floor(diffInMs / 3600000);
    const d = Math.floor(diffInMs / 86400000);
    if (m < 60) return `${m} min ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  function isPartialTooNew(createdAt: string): boolean {
    return (new Date().getTime() - new Date(createdAt).getTime()) / 60000 < 10;
  }

  function getMinutesUntilConfirmable(createdAt: string): number {
    return Math.max(0, Math.ceil(10 - (new Date().getTime() - new Date(createdAt).getTime()) / 60000));
  }

  function formatPrice(price?: number) {
    if (!price) return "—";
    return `${price.toFixed(2)} RON`;
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setCurrentPage(1);
  }

  function clearStatusFilters() {
    setSelectedStatuses([]);
    setCurrentPage(1);
  }

  function handleConfirm(partialId: string) {
    const partial = partialOrders.find((p) => p.id === partialId);
    if (partial) {
      setSelectedPartial(partial);
      setIsModalOpen(true);
    }
  }

  async function handleModalConfirm(data: ConfirmPartialData) {
    if (!selectedPartial) return;
    try {
      setConfirmingId(selectedPartial.id);
      const response = await fetch(`/api/partial-orders/${selectedPartial.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || "Failed to confirm partial order");
      }
      setIsModalOpen(false);
      setSelectedPartial(null);
      await fetchPartialOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm partial order");
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleStatusChange(partialId: string, newStatus: PartialOrderStatus) {
    try {
      const response = await fetch(`/api/partial-orders/${partialId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }
      await fetchPartialOrders();
      setOpenDropdown(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Comenzi Parțiale</h1>
            <p className="page-subtitle">Se încarcă...</p>
          </div>
        </div>
        <div className="card p-6 text-center">
          <p className="text-muted text-sm">Se încarcă comenzile parțiale...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        <h1 className="page-title">Comenzi Parțiale</h1>
        <div className="card p-4 border-red-800/60">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / partialsPerPage);

  return (
    <div className="max-w-7xl mx-auto space-y-5 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Comenzi Parțiale</h1>
          <p className="page-subtitle">
            {totalCount} total
            {selectedStatuses.length > 0 && ` · ${partialOrders.length} filtrate`}
          </p>
        </div>
        <button
          onClick={fetchPartialOrders}
          disabled={isLoading}
          className="btn btn-secondary btn-sm shrink-0"
        >
          <svg
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reîncarcă
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Caută telefon, nume, județ, localitate, adresă..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input !pl-8"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-3.5 w-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {/* Date range — shown only when searching */}
          {searchQuery && (
            <select
              value={searchDateRange}
              onChange={(e) => {
                setSearchDateRange(e.target.value === "all" ? "all" : parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="input w-auto"
            >
              <option value={7}>Ultimele 7 zile</option>
              <option value={30}>Ultimele 30 zile</option>
              <option value={90}>Ultimele 90 zile</option>
              <option value="all">Tot istoricul</option>
            </select>
          )}

          {/* Status filter */}
          <div className="relative status-filter-dropdown">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className={`btn btn-secondary btn-sm ${selectedStatuses.length > 0 ? "ring-2 ring-indigo-500" : ""}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Status
              {selectedStatuses.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full leading-none">
                  {selectedStatuses.length}
                </span>
              )}
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-52 card shadow-xl z-50 p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="section-title text-xs">Filtrează după status</span>
                  {selectedStatuses.length > 0 && (
                    <button onClick={clearStatusFilters} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                      Șterge tot
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {[
                    { value: "pending",    label: "În așteptare",    color: "bg-blue-500" },
                    { value: "accepted",   label: "Acceptat",        color: "bg-green-500" },
                    { value: "refused",    label: "Refuzat",         color: "bg-red-500" },
                    { value: "unanswered", label: "Fără răspuns",    color: "bg-orange-500" },
                    { value: "call_later", label: "Sună mai târziu", color: "bg-purple-500" },
                    { value: "duplicate",  label: "Duplicat",        color: "bg-yellow-500" },
                  ].map((s) => (
                    <label key={s.value} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700/50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(s.value)}
                        onChange={() => toggleStatus(s.value)}
                        className="w-3 h-3 rounded border-zinc-600 bg-zinc-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color}`} />
                      <span className="text-xs text-zinc-300">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table / Empty state */}
      {partialOrders.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted text-sm">
            {debouncedSearch
              ? `Nicio comandă parțială pentru "${debouncedSearch}"${searchDateRange !== "all" ? ` în ultimele ${searchDateRange} zile` : ""}.`
              : "Nicio comandă parțială găsită."}
          </p>
          {debouncedSearch && (
            <button
              onClick={() => { setSearchQuery(""); setSearchDateRange(30); }}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
            >
              Șterge căutarea
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Client</th>
                <th>Produs</th>
                <th>Valoare</th>
                <th>Landing Page</th>
                <th>Adresă</th>
                <th>Data</th>
                <th>Status</th>
                <th className="text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {partialOrders.map((partial) => (
                <tr key={partial.id}>
                  {/* Client */}
                  <td>
                    <div className="font-medium text-white text-sm">
                      {partial.fullName || "—"}
                    </div>
                    {partial.phone ? (
                      <a
                        href={`/admin/customers?phone=${partial.phone}`}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline text-xs"
                      >
                        {partial.phone}
                      </a>
                    ) : (
                      <span className="text-faint text-xs">—</span>
                    )}
                    <div className="text-faint text-[10px] mt-0.5">
                      #{partial.partialNumber || "—"}
                    </div>
                  </td>

                  {/* Produs */}
                  <td>
                    <div className="font-medium text-white text-sm">
                      {partial.productName || "—"}
                    </div>
                    {partial.productSku && (
                      <div className="text-orange-400 text-xs font-medium">
                        {partial.productSku}
                      </div>
                    )}
                    <div className="text-muted text-xs">
                      Qty: {partial.productQuantity || "—"}
                    </div>
                  </td>

                  {/* Valoare */}
                  <td>
                    <div className="font-medium text-white text-sm">
                      {formatPrice(partial.total)}
                    </div>
                    <div className="text-muted text-xs">
                      {formatPrice(partial.subtotal)} + {formatPrice(partial.shippingCost)}
                    </div>
                    {partial.upsells && partial.upsells.length > 0 && (
                      <div className="text-green-400 text-xs font-medium mt-0.5">
                        +{partial.upsells.length} upsell{partial.upsells.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </td>

                  {/* Landing Page */}
                  <td>
                    <div className="text-blue-400 text-xs">
                      {partial.storeUrl || "—"}
                    </div>
                  </td>

                  {/* Adresă */}
                  <td>
                    <div className="text-xs space-y-0.5">
                      <div>
                        <span className="text-faint">J:</span>{" "}
                        <span className={partial.county ? "text-zinc-300" : "text-red-400"}>
                          {partial.county || "?"}
                        </span>
                      </div>
                      <div>
                        <span className="text-faint">L:</span>{" "}
                        <span className={partial.city ? "text-zinc-300" : "text-red-400"}>
                          {partial.city || "?"}
                        </span>
                      </div>
                      <div>
                        <span className="text-faint">S:</span>{" "}
                        <span className={partial.address ? "text-zinc-300" : "text-red-400"}>
                          {partial.address || "?"}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Data */}
                  <td>
                    <div className="text-sm text-zinc-300">
                      {formatFullDateTime(partial.createdAt)}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {formatRelativeTime(partial.createdAt)}
                    </div>
                    <div className="text-xs text-faint mt-0.5">
                      {partial.completionPercentage}% completat
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`badge ${partialStatusBadgeColor(partial.status)}`}>
                      {partialStatusLabel(partial.status)}
                    </span>
                  </td>

                  {/* Acțiuni */}
                  <td className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {isPartialTooNew(partial.createdAt) ? (
                        <button
                          disabled
                          title={`Clientul probabil completează formularul. Mai așteaptă ${getMinutesUntilConfirmable(partial.createdAt)} min.`}
                          className="btn btn-sm opacity-60 cursor-not-allowed border border-orange-500/30 bg-orange-900/20 text-orange-400"
                        >
                          ⏳ {getMinutesUntilConfirmable(partial.createdAt)}m
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConfirm(partial.id)}
                          disabled={confirmingId === partial.id}
                          className="btn btn-primary btn-sm"
                          title="Confirmă — au trecut 10 minute de la creare"
                        >
                          {confirmingId === partial.id ? "..." : "Confirmă"}
                        </button>
                      )}

                      {/* Actions dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            if (openDropdown === partial.id) {
                              setOpenDropdown(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openUp = spaceBelow < 250;
                              setDropdownPos({
                                top: openUp ? rect.top : rect.bottom + 4,
                                left: rect.right - 176,
                                openUp,
                              });
                              setOpenDropdown(partial.id);
                            }
                          }}
                          className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>

                        {openDropdown === partial.id && (
                          <div
                            style={{
                              position: "fixed",
                              top: dropdownPos.openUp ? undefined : dropdownPos.top,
                              bottom: dropdownPos.openUp
                                ? window.innerHeight - dropdownPos.top + 4
                                : undefined,
                              left: Math.max(4, dropdownPos.left),
                            }}
                            className="w-44 card shadow-xl py-1 z-50"
                          >
                            {[
                              { status: "call_later" as PartialOrderStatus, label: "Sună mai târziu" },
                              { status: "refused"    as PartialOrderStatus, label: "Refuză" },
                              { status: "unanswered" as PartialOrderStatus, label: "Fără răspuns" },
                              { status: "duplicate"  as PartialOrderStatus, label: "Duplicat" },
                            ].map((item) => (
                              <button
                                key={item.status}
                                onClick={() => handleStatusChange(partial.id, item.status)}
                                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700/60 hover:text-white transition-colors"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalCount > partialsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700/60">
              <span className="text-xs text-muted">
                {(currentPage - 1) * partialsPerPage + 1}–{Math.min(currentPage * partialsPerPage, totalCount)} din {totalCount}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Următor →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmPartialOrderModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedPartial(null); }}
        onConfirm={handleModalConfirm}
        partialOrder={selectedPartial}
        isConfirming={confirmingId === selectedPartial?.id}
      />
    </div>
  );
}
