"use client";

import { useEffect, useState } from "react";
import type { PartialOrder } from "@/lib/types";

export default function PartialsPage() {
  const [partialOrders, setPartialOrders] = useState<PartialOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function formatDate(dateString: string) {
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
    };
    return labels[status] || status.toUpperCase();
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Partial Orders</h1>
        <p className="text-zinc-400 mt-2">
          Track incomplete orders - {partialOrders.length} total
        </p>
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
                        <div className="text-zinc-400">
                          {partial.phone || "—"}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          Partial ID: {partial.id.substring(0, 8)}
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
                      <div className="text-xs text-zinc-400">
                        {formatDate(partial.createdAt)}
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
