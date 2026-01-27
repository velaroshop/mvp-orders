"use client";

import { useEffect, useState } from "react";
import type { PartialOrder, PartialOrderStatus } from "@/lib/types";
import ConfirmPartialOrderModal, {
  type ConfirmPartialData,
} from "../components/ConfirmPartialOrderModal";

export default function PartialsPage() {
  const [partialOrders, setPartialOrders] = useState<PartialOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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

  useEffect(() => {
    fetchPartialOrders();
  }, [currentPage, selectedStatuses]);

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
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isStatusDropdownOpen]);

  async function fetchPartialOrders() {
    try {
      setIsLoading(true);
      const offset = (currentPage - 1) * partialsPerPage;
      const params = new URLSearchParams({
        limit: partialsPerPage.toString(),
        offset: offset.toString(),
      });

      // Add status filters if any are selected
      if (selectedStatuses.length > 0) {
        params.append("statuses", selectedStatuses.join(","));
      }

      const response = await fetch(`/api/partial-orders/list?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch partial orders");
      }

      const data = await response.json();
      console.log("📥 [Frontend] Received partial orders:", {
        total: data.total,
        count: data.partialOrders?.length || 0,
        page: currentPage,
        partialNumbers: data.partialOrders?.map((p: PartialOrder) => p.partialNumber),
      });
      setPartialOrders(data.partialOrders || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error("Error fetching partial orders:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function formatFullDateTime(dateString: string) {
    return new Date(dateString).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  }

  function isPartialTooNew(createdAt: string): boolean {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffInMinutes < 10;
  }

  function getMinutesUntilConfirmable(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return Math.max(0, Math.ceil(10 - diffInMinutes));
  }

  function formatPrice(price?: number) {
    if (!price) return "—";
    return `${price.toFixed(2)} RON`;
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "pending":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "accepted":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "refused":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "unanswered":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "call_later":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "duplicate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "PENDING",
      accepted: "ACCEPTED",
      refused: "REFUSED",
      unanswered: "UNANSWERED",
      call_later: "CALL LATER",
      duplicate: "DUPLICATE",
    };
    return labels[status] || status.toUpperCase();
  }

  // Toggle status filter
  function toggleStatus(status: string) {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
    setCurrentPage(1); // Reset to first page when filter changes
  }

  // Clear all status filters
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
      console.log("🔄 [Frontend] Confirming partial order:", selectedPartial.partialNumber);

      const response = await fetch(
        `/api/partial-orders/${selectedPartial.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || "Failed to confirm partial order");
      }

      const result = await response.json();
      console.log("✅ [Frontend] Confirmed successfully, refreshing list...");

      // Close modal and refresh list
      setIsModalOpen(false);
      setSelectedPartial(null);
      await fetchPartialOrders();
      console.log("🔄 [Frontend] List refreshed");
    } catch (err) {
      console.error("Error confirming partial order:", err);
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

      // Refresh the list
      await fetchPartialOrders();
      setOpenDropdown(null);
    } catch (err) {
      console.error("Error updating status:", err);
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Partial Orders</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Track and recover incomplete orders
          </p>
        </div>
        <div className="bg-zinc-800 rounded-md shadow-sm border border-zinc-700 p-4 text-center">
          <p className="text-zinc-400 text-sm">Loading partial orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Partial Orders</h1>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded-md p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Partial Orders</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {totalCount} total{selectedStatuses.length > 0 && ` (${partialOrders.length} filtered)`}
            </p>
          </div>
          <button
            onClick={fetchPartialOrders}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Status Filter */}
        <div className="relative status-filter-dropdown inline-block">
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className={`px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-xs font-medium hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors flex items-center gap-1.5 ${
              selectedStatuses.length > 0 ? "ring-2 ring-emerald-500" : ""
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Status
            {selectedStatuses.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded-full">
                {selectedStatuses.length}
              </span>
            )}
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-56 bg-zinc-800 border border-zinc-700 rounded-md shadow-xl z-50">
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Filtrează după status</span>
                  {selectedStatuses.length > 0 && (
                    <button
                      onClick={clearStatusFilters}
                      className="text-[10px] text-emerald-500 hover:text-emerald-400"
                    >
                      Șterge
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {[
                    { value: "pending", label: "Pending", color: "bg-blue-500" },
                    { value: "accepted", label: "Accepted", color: "bg-emerald-500" },
                    { value: "refused", label: "Refused", color: "bg-red-500" },
                    { value: "unanswered", label: "Unanswered", color: "bg-orange-500" },
                    { value: "call_later", label: "Call Later", color: "bg-purple-500" },
                    { value: "duplicate", label: "Duplicate", color: "bg-yellow-500" },
                  ].map((status) => (
                    <label
                      key={status.value}
                      className="flex items-center gap-1.5 cursor-pointer hover:bg-zinc-700 px-1.5 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status.value)}
                        onChange={() => toggleStatus(status.value)}
                        className="w-3 h-3 rounded border-zinc-600 bg-zinc-700 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.color}`}></span>
                      <span className="text-xs text-white">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {partialOrders.length === 0 ? (
        <div className="bg-zinc-800 rounded-md shadow-sm border border-zinc-700 p-4 text-center">
          <p className="text-zinc-400 text-sm">No partial orders found.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-md shadow-sm border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Vendable
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Pricing
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Landing Page
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Address
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Note
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {partialOrders.map((partial, partialIndex) => (
                  <tr
                    key={partial.id}
                    className="hover:bg-zinc-700/50 transition-colors"
                  >
                    {/* Customer */}
                    <td className="px-2 py-2">
                      <div className="text-xs">
                        <div className="font-medium text-white">
                          {partial.fullName || "—"}
                        </div>
                        {partial.phone ? (
                          <a
                            href={`/admin/customers?phone=${partial.phone}`}
                            className="text-emerald-400 hover:text-emerald-300 hover:underline text-[10px]"
                          >
                            {partial.phone}
                          </a>
                        ) : (
                          <div className="text-zinc-400 text-[10px]">—</div>
                        )}
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          ID: {partial.partialNumber || "—"}
                        </div>
                      </div>
                    </td>

                    {/* Vendable (Product) */}
                    <td className="px-2 py-2">
                      <div className="text-xs">
                        <div className="text-white font-medium">
                          {partial.productName || "—"}
                        </div>
                        {partial.productSku && (
                          <div className="text-orange-400 text-[10px] font-medium">
                            {partial.productSku}
                          </div>
                        )}
                        <div className="text-zinc-400 text-[10px]">
                          Qty: {partial.productQuantity || "—"}
                        </div>
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="px-2 py-2">
                      <div className="text-xs">
                        <div className="text-white font-medium">
                          {formatPrice(partial.total)}
                        </div>
                        <div className="text-zinc-400 text-[10px]">
                          {formatPrice(partial.subtotal)} +{" "}
                          {formatPrice(partial.shippingCost)}
                        </div>
                        {partial.upsells && partial.upsells.length > 0 && (
                          <div className="text-emerald-400 text-[10px] font-medium mt-0.5">
                            + {partial.upsells.length} upsell{partial.upsells.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Landing Page */}
                    <td className="px-2 py-2">
                      <div className="text-xs">
                        <div className="text-blue-400 text-[10px]">
                          {partial.storeUrl || "—"}
                        </div>
                        {partial.productName && (
                          <div className="text-white text-[10px] font-medium">
                            {partial.productName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-2 py-2">
                      <div className="text-[10px] max-w-xs">
                        <div className="text-zinc-300">
                          <span className="text-zinc-500">J:</span>{" "}
                          <span
                            className={
                              partial.county
                                ? "text-white"
                                : "text-red-400"
                            }
                          >
                            {partial.county || "?"}
                          </span>
                        </div>
                        <div className="text-zinc-300">
                          <span className="text-zinc-500">L:</span>{" "}
                          <span
                            className={
                              partial.city ? "text-white" : "text-red-400"
                            }
                          >
                            {partial.city || "?"}
                          </span>
                        </div>
                        <div className="text-zinc-300">
                          <span className="text-zinc-500">S:</span>{" "}
                          <span
                            className={
                              partial.address
                                ? "text-white"
                                : "text-red-400"
                            }
                          >
                            {partial.address || "?"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Note (Time since created) */}
                    <td className="px-2 py-2">
                      <div className="text-[10px] text-white font-medium">
                        {formatFullDateTime(partial.createdAt)}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {formatRelativeTime(partial.createdAt)}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {partial.completionPercentage}% done
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold border ${getStatusColor(partial.status)}`}
                      >
                        {getStatusLabel(partial.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        {/* Confirm Button */}
                        {isPartialTooNew(partial.createdAt) ? (
                          <button
                            disabled
                            className="px-1.5 py-0.5 bg-orange-900/30 text-orange-400 text-[10px] font-medium rounded cursor-not-allowed border border-orange-500/30"
                            title={`Customer is likely still completing the form. Wait ${getMinutesUntilConfirmable(partial.createdAt)} more minute(s).`}
                          >
                            ⏳ {getMinutesUntilConfirmable(partial.createdAt)}m
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConfirm(partial.id)}
                            disabled={confirmingId === partial.id}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-medium rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Ready to confirm - 10 minutes have passed since creation"
                          >
                            {confirmingId === partial.id ? "..." : "Confirm"}
                          </button>
                        )}

                        {/* Actions Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === partial.id ? null : partial.id
                              )
                            }
                            className="p-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                              />
                            </svg>
                          </button>

                          {openDropdown === partial.id && (
                            <div className={`absolute right-0 w-44 bg-zinc-800 rounded-md shadow-lg border border-zinc-700 py-0.5 z-50 ${
                              partialIndex < 3 ? 'top-full mt-1' : 'bottom-full mb-1'
                            }`}>
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "call_later")
                                }
                                className="w-full text-left px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Call Later
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "refused")
                                }
                                className="w-full text-left px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Refuse
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "unanswered")
                                }
                                className="w-full text-left px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Unanswered
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "duplicate")
                                }
                                className="w-full text-left px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Duplicate
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - Simple Previous/Next */}
          {totalCount > partialsPerPage && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-700">
              <div className="text-xs text-zinc-400">
                {(currentPage - 1) * partialsPerPage + 1}-{Math.min(currentPage * partialsPerPage, totalCount)} / {totalCount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.ceil(totalCount / partialsPerPage), p + 1)
                    )
                  }
                  disabled={currentPage >= Math.ceil(totalCount / partialsPerPage)}
                  className="px-2 py-1 text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmPartialOrderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPartial(null);
        }}
        onConfirm={handleModalConfirm}
        partialOrder={selectedPartial}
        isConfirming={confirmingId === selectedPartial?.id}
      />
    </div>
  );
}
