"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Customer, Order } from "@/lib/types";

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracking Modal state
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingModalLoading, setTrackingModalLoading] = useState(false);
  const [trackingModalData, setTrackingModalData] = useState<{
    trackingStatus: string | null;
    trackingNumber: string | null;
    deliveryService: string | null;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ isOpen: boolean; type: "success" | "error"; message: string }>({
    isOpen: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

  // Auto-hide toast
  useEffect(() => {
    if (toast.isOpen) {
      const timer = setTimeout(() => {
        setToast({ ...toast, isOpen: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.isOpen]);

  async function fetchCustomerDetails() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch customer details");
      }

      setCustomer(data.customer);
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatPrice(price: number) {
    return price.toFixed(2);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400";
      case "confirmed":
        return "bg-blue-500/20 text-blue-400";
      case "pending":
        return "bg-amber-500/20 text-amber-400";
      case "cancelled":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "În așteptare",
      confirmed: "Confirmat",
      processing: "În procesare",
      shipped: "Expediat",
      completed: "Livrat",
      cancelled: "Anulat",
    };
    return labels[status] || status;
  }

  function getTrackingStatusColor(trackingStatus: string | null | undefined): string {
    if (!trackingStatus) return "bg-zinc-700/50 text-zinc-400";
    switch (trackingStatus.toLowerCase()) {
      case "delivered":
        return "bg-emerald-900/50 text-emerald-400 border border-emerald-700";
      case "intransit":
      case "in_transit":
        return "bg-blue-900/50 text-blue-400 border border-blue-700";
      case "returned":
        return "bg-red-900/50 text-red-400 border border-red-700";
      case "cancelled":
        return "bg-zinc-700/50 text-zinc-500 border border-zinc-600";
      default:
        return "bg-amber-900/50 text-amber-400 border border-amber-700";
    }
  }

  function getTrackingStatusLabel(trackingStatus: string | null | undefined): string {
    if (!trackingStatus) return "Necunoscut";
    const labels: Record<string, string> = {
      unknown: "Necunoscut",
      intransit: "În tranzit",
      in_transit: "În tranzit",
      delivered: "Livrat",
      returned: "Returnat",
      cancelled: "Anulat",
    };
    return labels[trackingStatus.toLowerCase()] || trackingStatus;
  }

  async function openTrackingModal(order: Order) {
    setTrackingModalOrder(order);
    setIsTrackingModalOpen(true);
    setTrackingModalLoading(true);
    setTrackingModalData(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/sync-tracking`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        setTrackingModalData({
          trackingStatus: result.trackingStatus,
          trackingNumber: result.trackingNumber,
          deliveryService: result.deliveryService,
        });
        // Update local order state if tracking status changed
        if (result.updated) {
          setOrders(prev => prev.map(o =>
            o.id === order.id ? { ...o, trackingStatus: result.trackingStatus } : o
          ));
        }
      } else {
        console.error("Failed to fetch tracking data");
      }
    } catch (error) {
      console.error("Error fetching tracking data:", error);
    } finally {
      setTrackingModalLoading(false);
    }
  }

  function closeTrackingModal() {
    setIsTrackingModalOpen(false);
    setTrackingModalOrder(null);
    setTrackingModalData(null);
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl">
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Se încarcă detaliile clientului...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-7xl">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error || "Client negăsit"}</p>
        </div>
        <div className="mt-4">
          <Link
            href="/admin/customers"
            className="text-emerald-400 hover:text-emerald-300"
          >
            ← Înapoi la listă
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/customers"
          className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-block"
        >
          ← Înapoi la listă
        </Link>
        <h1 className="text-3xl font-bold text-white">Detalii Client</h1>
      </div>

      {/* Customer Info Card */}
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-zinc-400 mb-1">Telefon</div>
            <div className="text-lg font-semibold text-white">
              {customer.phone}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400 mb-1">Total Comenzi</div>
            <div className="text-lg font-semibold text-white">
              {customer.totalOrders}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400 mb-1">Valoare Totală</div>
            <div className="text-lg font-semibold text-emerald-400">
              {formatPrice(customer.totalSpent)} RON
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400 mb-1">Valoare Medie/Comandă</div>
            <div className="text-lg font-semibold text-white">
              {customer.totalOrders > 0
                ? formatPrice(customer.totalSpent / customer.totalOrders)
                : "0.00"}{" "}
              RON
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-700 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-zinc-400 mb-1">Prima Comandă</div>
            <div className="text-sm text-zinc-300">
              {customer.firstOrderDate
                ? formatDate(customer.firstOrderDate)
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400 mb-1">Ultima Comandă</div>
            <div className="text-sm text-zinc-300">
              {customer.lastOrderDate
                ? formatDate(customer.lastOrderDate)
                : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          Comenzi ({orders.length})
        </h2>
      </div>

      {orders.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Acest client nu are comenzi încă.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Nr.
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Nume
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Adresă
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Tracking
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Dată
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-700/50 transition-colors"
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-white">
                        {order.orderNumber || order.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-zinc-300">
                        {order.fullName}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-zinc-300 max-w-45 truncate" title={`${order.address}, ${order.city}`}>
                        {order.address}, {order.city}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {order.county}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-white">
                        {formatPrice(order.total)} RON
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {order.status === "confirmed" && order.helpshipOrderId ? (
                        <button
                          onClick={() => openTrackingModal(order)}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-tight whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${getTrackingStatusColor(order.trackingStatus)}`}
                          title="Click pentru detalii tracking"
                        >
                          {order.trackingStatus ? (
                            <>
                              📦 {getTrackingStatusLabel(order.trackingStatus)}
                            </>
                          ) : (
                            "📦 Tracking"
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-zinc-300">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                      <Link
                        href={`/admin/orders`}
                        className="text-emerald-400 hover:text-emerald-300 text-xs"
                      >
                        Vezi
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {isTrackingModalOpen && trackingModalOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Detalii Tracking
              </h3>
              <button
                onClick={closeTrackingModal}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-sm text-zinc-400 mb-4">
              Comandă #{trackingModalOrder.orderNumber || trackingModalOrder.id.substring(0, 8)}
            </div>

            {trackingModalLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                <span className="ml-3 text-zinc-400">Se încarcă datele...</span>
              </div>
            ) : trackingModalData ? (
              <div className="space-y-4">
                {/* Tracking Status */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-sm">Status Tracking</span>
                  <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getTrackingStatusColor(trackingModalData.trackingStatus)}`}>
                    {getTrackingStatusLabel(trackingModalData.trackingStatus)}
                  </span>
                </div>

                {/* AWB / Tracking Number */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-sm">Nr. AWB</span>
                  {trackingModalData.trackingNumber ? (
                    <a
                      href={`https://gls-group.eu/RO/ro/urmarire-colet?match=${trackingModalData.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-mono text-sm flex items-center gap-1 transition-colors"
                    >
                      {trackingModalData.trackingNumber}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-zinc-500 text-sm">-</span>
                  )}
                </div>

                {/* Courier */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-sm">Curier</span>
                  <span className="text-white text-sm">
                    {trackingModalData.deliveryService || "-"}
                  </span>
                </div>

                {/* Postal Code */}
                {trackingModalOrder.postalCode && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-700">
                    <span className="text-zinc-400 text-sm">Cod Poștal</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(trackingModalOrder.postalCode || "");
                        setToast({
                          isOpen: true,
                          type: "success",
                          message: "Cod poștal copiat!",
                        });
                      }}
                      className="text-white font-mono text-sm hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1"
                      title="Click pentru a copia"
                    >
                      {trackingModalOrder.postalCode}
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400">
                Nu s-au putut obține datele de tracking.
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeTrackingModal}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-900/90 border border-emerald-700 text-emerald-300"
              : "bg-red-900/90 border border-red-700 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm">{toast.message}</span>
          <button
            onClick={() => setToast({ ...toast, isOpen: false })}
            className="ml-2 text-current opacity-70 hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
