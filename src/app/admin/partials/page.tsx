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

  useEffect(() => {
    fetchPartialOrders();
  }, []);

  async function fetchPartialOrders() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/partial-orders/list");

      if (!response.ok) {
        throw new Error("Failed to fetch partial orders");
      }

      const data = await response.json();
      setPartialOrders(data.partialOrders || []);
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

      // Close modal and refresh list
      setIsModalOpen(false);
      setSelectedPartial(null);
      await fetchPartialOrders();
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
      <div className="max-w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Partial Orders</h1>
          <p className="text-zinc-400 mt-2">
            Track and recover incomplete orders
          </p>
        </div>
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Loading partial orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Partial Orders</h1>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Partial Orders</h1>
          <p className="text-zinc-400 mt-2">
            Track incomplete orders - {partialOrders.length} total
          </p>
        </div>
        <button
          onClick={fetchPartialOrders}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
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

      {/* Table */}
      {partialOrders.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">No partial orders found.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Vendable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Landing Page
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Note
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {partialOrders.map((partial) => (
                  <tr
                    key={partial.id}
                    className="hover:bg-zinc-700/50 transition-colors"
                  >
                    {/* Customer */}
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-white">
                          {partial.fullName || "—"}
                        </div>
                        {partial.phone ? (
                          <a
                            href={`/admin/customers?phone=${partial.phone}`}
                            className="text-emerald-400 hover:text-emerald-300 hover:underline"
                          >
                            {partial.phone}
                          </a>
                        ) : (
                          <div className="text-zinc-400">—</div>
                        )}
                        <div className="text-xs text-zinc-500 mt-1">
                          Partial ID: {partial.partialNumber || "—"}
                        </div>
                      </div>
                    </td>

                    {/* Vendable (Product) */}
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="text-white font-medium">
                          {partial.productName || "—"}
                        </div>
                        {partial.productSku && (
                          <div className="text-orange-400 text-xs font-medium">
                            {partial.productSku}
                          </div>
                        )}
                        <div className="text-zinc-400 text-xs">
                          Quantity: {partial.productQuantity || "—"}
                        </div>
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="text-white font-medium">
                          Total: {formatPrice(partial.total)}
                        </div>
                        <div className="text-zinc-400 text-xs">
                          {formatPrice(partial.subtotal)} +{" "}
                          {formatPrice(partial.shippingCost)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Shipping price: {formatPrice(partial.shippingCost)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Discount: 0.00 RON
                        </div>
                      </div>
                    </td>

                    {/* Landing Page */}
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="text-blue-400">
                          {partial.landingKey || "—"}
                        </div>
                        {partial.productName && (
                          <div className="text-white text-xs font-medium">
                            {partial.productName}
                          </div>
                        )}
                        <div className="text-zinc-400 text-xs">Romania</div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-4">
                      <div className="text-sm max-w-xs">
                        {partial.county || partial.city || partial.address ? (
                          <>
                            <div className="text-white">
                              County:{" "}
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
                            <div className="text-white">
                              City:{" "}
                              <span
                                className={
                                  partial.city ? "text-white" : "text-red-400"
                                }
                              >
                                {partial.city || "?"}
                              </span>
                            </div>
                            <div className="text-white">
                              Street:{" "}
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
                          </>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </div>
                    </td>

                    {/* Note (Time since created) */}
                    <td className="px-4 py-4">
                      <div className="text-xs text-white font-medium">
                        {formatFullDateTime(partial.createdAt)}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {formatRelativeTime(partial.createdAt)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {partial.completionPercentage}% complete
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold border ${getStatusColor(partial.status)}`}
                      >
                        {getStatusLabel(partial.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Confirm Button */}
                        <button
                          onClick={() => handleConfirm(partial.id)}
                          disabled={confirmingId === partial.id}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {confirmingId === partial.id ? "..." : "Confirm"}
                        </button>

                        {/* Actions Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === partial.id ? null : partial.id
                              )
                            }
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>

                          {openDropdown === partial.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 py-1 z-10">
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "call_later")
                                }
                                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Partial Later
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "refused")
                                }
                                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Partial Refuse
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "unanswered")
                                }
                                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Partial Mark Unanswered
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(partial.id, "duplicate")
                                }
                                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                              >
                                Partial Mark Duplicate
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
