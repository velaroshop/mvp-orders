"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Customer, Order } from "@/lib/types";
import { getTrackingUrl } from "@/lib/tracking-url";
import ConfirmOrderModal from "../../components/ConfirmOrderModal";

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

  // Order Details Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ isOpen: boolean; type: "success" | "error"; message: string }>({
    isOpen: false,
    type: "success",
    message: "",
  });

  // Actions state
  const [confirming, setConfirming] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [confirmModalOrder, setConfirmModalOrder] = useState<Order | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

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

  function formatOrderNumber(
    orderNumber: number | string | undefined | null,
    orderSeries: string | undefined | null,
    orderId: string
  ): string {
    if (orderNumber && orderSeries) {
      return `${orderSeries}-${String(orderNumber).padStart(5, "0")}`;
    }
    return orderId.substring(0, 8);
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (openDropdown && !(e.target as Element)?.closest(".actions-dropdown")) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  async function handleConfirmOrder(updatedOrder: Partial<Order> & { streetNumber?: string }) {
    if (!confirmModalOrder) return;
    setConfirming(confirmModalOrder.id);
    try {
      const response = await fetch(`/api/orders/${confirmModalOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedOrder),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to confirm order");
      }
      setToast({ isOpen: true, type: "success", message: "Comanda a fost confirmată cu succes" });
      fetchCustomerDetails();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Eroare la confirmarea comenzii";
      setToast({ isOpen: true, type: "error", message: msg });
    } finally {
      setConfirming(null);
    }
  }

  async function handleOrderAction(orderId: string, action: string) {
    setOpenDropdown(null);

    if (action === "confirm") {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setConfirmModalOrder(order);
        setIsConfirmModalOpen(true);
      }
      return;
    }

    if (action === "cancel") {
      if (!confirm("Sigur vrei să anulezi această comandă?")) return;
      try {
        const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        setToast({ isOpen: true, type: "success", message: "Comanda a fost anulată" });
        fetchCustomerDetails();
      } catch (error) {
        setToast({ isOpen: true, type: "error", message: error instanceof Error ? error.message : "Eroare" });
      }
      return;
    }

    if (action === "uncancel") {
      try {
        const res = await fetch(`/api/orders/${orderId}/uncancel`, { method: "POST" });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        setToast({ isOpen: true, type: "success", message: "Comanda a fost restabilită" });
        fetchCustomerDetails();
      } catch (error) {
        setToast({ isOpen: true, type: "error", message: error instanceof Error ? error.message : "Eroare" });
      }
      return;
    }

    if (action === "hold") {
      if (!confirm("Sigur vrei să pui comanda pe hold?")) return;
      try {
        const res = await fetch(`/api/orders/${orderId}/hold`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        setToast({ isOpen: true, type: "success", message: "Comanda a fost pusă pe hold" });
        fetchCustomerDetails();
      } catch (error) {
        setToast({ isOpen: true, type: "error", message: error instanceof Error ? error.message : "Eroare" });
      }
      return;
    }

    if (action === "unhold") {
      try {
        const res = await fetch(`/api/orders/${orderId}/unhold`, { method: "POST" });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        setToast({ isOpen: true, type: "success", message: "Comanda a fost scoasă din hold" });
        fetchCustomerDetails();
      } catch (error) {
        setToast({ isOpen: true, type: "error", message: error instanceof Error ? error.message : "Eroare" });
      }
      return;
    }
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
                    Order ID
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
                    Dată
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-700/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsOrderModalOpen(true);
                    }}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-cyan-400">
                        {formatOrderNumber(order.orderNumber, order.orderSeries, order.id)}
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
                        className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight whitespace-nowrap ${
                          order.status === "queue"
                            ? "bg-violet-600 text-white"
                            : order.status === "testing"
                            ? "bg-blue-600 text-white"
                            : order.status === "confirmed"
                            ? "bg-emerald-600 text-white"
                            : order.status === "scheduled"
                            ? "bg-cyan-600 text-white"
                            : order.status === "cancelled"
                            ? "bg-red-600 text-white"
                            : order.status === "hold"
                            ? "bg-orange-600 text-white"
                            : order.status === "sync_error"
                            ? "bg-rose-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {order.status === "queue"
                          ? "Queue"
                          : order.status === "testing"
                          ? "🧪 Testing"
                          : order.status === "pending"
                          ? "Pending"
                          : order.status === "scheduled"
                          ? "Scheduled"
                          : order.status === "cancelled"
                          ? "Cancelled"
                          : order.status === "hold"
                          ? "Hold"
                          : order.status === "sync_error"
                          ? "Sync Error"
                          : "Confirmed"}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-zinc-300">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOrderAction(order.id, "confirm")}
                          disabled={order.status === "queue" || order.status === "testing" || order.status === "confirmed" || order.status === "cancelled" || order.status === "sync_error" || confirming === order.id}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap w-fit ${
                            order.status === "queue" || order.status === "testing" || order.status === "confirmed" || order.status === "cancelled" || order.status === "sync_error"
                              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                              : order.status === "scheduled"
                              ? "bg-cyan-600 text-white hover:bg-cyan-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {confirming === order.id ? "..." : order.status === "confirmed" ? "✓" : order.status === "queue" ? "QUEUE" : order.status === "testing" ? "🧪" : order.status === "cancelled" ? "✕" : order.status === "sync_error" ? "⚠" : order.status === "scheduled" ? "NOW" : "CONFIRM"}
                        </button>
                        <div className="relative actions-dropdown">
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPos({ top: rect.bottom + 4, left: rect.right - 176 });
                              setOpenDropdown(openDropdown === order.id ? null : order.id);
                            }}
                            className="rounded bg-zinc-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-zinc-500"
                          >
                            Actions ▼
                          </button>
                          {openDropdown === order.id && (
                            <div style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }} className="w-44 bg-zinc-700 border border-zinc-600 rounded-md shadow-lg z-50">
                              <div className="py-1">
                                {order.status !== "testing" && order.status !== "cancelled" && order.status !== "sync_error" && (
                                  <button onClick={() => handleOrderAction(order.id, "confirm")} disabled={order.status === "queue"} className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Order Confirm
                                  </button>
                                )}
                                <button onClick={() => handleOrderAction(order.id, "cancel")} className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600">
                                  Order Cancel
                                </button>
                                <button onClick={() => handleOrderAction(order.id, "uncancel")} disabled={order.status !== "cancelled"} className={`w-full text-left px-3 py-2 text-xs ${order.status !== "cancelled" ? "text-zinc-500 cursor-not-allowed" : "text-zinc-200 hover:bg-zinc-600"}`}>
                                  Order Uncancel
                                </button>
                                <button onClick={() => handleOrderAction(order.id, "hold")} className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600">
                                  Order Hold
                                </button>
                                <button onClick={() => handleOrderAction(order.id, "unhold")} disabled={order.status !== "hold"} className={`w-full text-left px-3 py-2 text-xs ${order.status !== "hold" ? "text-zinc-500 cursor-not-allowed" : "text-zinc-200 hover:bg-zinc-600"}`}>
                                  Order Unhold
                                </button>
                              </div>
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

      {/* Tracking Details Modal */}
      {isTrackingModalOpen && trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">Detalii Tracking</h3>
              <button
                onClick={closeTrackingModal}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Order Info */}
              <div className="text-sm text-zinc-400">
                Comandă: <span className="text-white font-medium">{trackingModalOrder.orderNumber || trackingModalOrder.id.substring(0, 8)}</span>
              </div>

              {trackingModalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  <span className="ml-3 text-zinc-400">Se încarcă...</span>
                </div>
              ) : trackingModalData ? (
                <div className="space-y-3">
                  {/* Tracking Status */}
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <span className="text-zinc-400 text-sm">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                      trackingModalData.trackingStatus === "Delivered"
                        ? "bg-green-900/50 text-green-300"
                        : trackingModalData.trackingStatus === "InTransit"
                        ? "bg-blue-900/50 text-blue-300"
                        : trackingModalData.trackingStatus === "OnDelivery"
                        ? "bg-cyan-900/50 text-cyan-300"
                        : trackingModalData.trackingStatus === "Returned"
                        ? "bg-red-900/50 text-red-300"
                        : trackingModalData.trackingStatus === "Returning"
                        ? "bg-orange-900/50 text-orange-300"
                        : trackingModalData.trackingStatus === "WrongAddress"
                        ? "bg-amber-900/50 text-amber-300"
                        : trackingModalData.trackingStatus === "Disruptions"
                        ? "bg-rose-900/50 text-rose-300"
                        : "bg-zinc-700 text-zinc-300"
                    }`}>
                      {trackingModalData.trackingStatus || "Necunoscut"}
                    </span>
                  </div>

                  {/* Tracking Number */}
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <span className="text-zinc-400 text-sm">AWB / Tracking</span>
                    {trackingModalData.trackingNumber ? (
                      (() => {
                        const trackingUrl = getTrackingUrl(trackingModalData.deliveryService, trackingModalData.trackingNumber);
                        return trackingUrl ? (
                          <a
                            href={trackingUrl}
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
                          <span className="text-white font-mono text-sm">{trackingModalData.trackingNumber}</span>
                        );
                      })()
                    ) : (
                      <span className="text-white font-mono text-sm">-</span>
                    )}
                  </div>

                  {/* Postal Code */}
                  {trackingModalOrder.postalCode && (
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <span className="text-zinc-400 text-sm">Cod poștal</span>
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

                  {/* Delivery Service */}
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <span className="text-zinc-400 text-sm">Curier</span>
                    <span className="text-white text-sm">
                      {trackingModalData.deliveryService || "-"}
                    </span>
                  </div>

                  {/* Last Updated */}
                  {trackingModalOrder.trackingUpdatedAt && (
                    <div className="text-xs text-zinc-500 text-center pt-2">
                      Ultima actualizare în DB: {new Date(trackingModalOrder.trackingUpdatedAt).toLocaleString("ro-RO")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  Nu s-au putut obține datele de tracking
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-zinc-700">
              <button
                onClick={closeTrackingModal}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-600 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {isOrderModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-700 sticky top-0 bg-zinc-900">
              <h3 className="text-lg font-semibold text-white">
                Comandă {formatOrderNumber(selectedOrder.orderNumber, selectedOrder.orderSeries, selectedOrder.id)}
              </h3>
              <button
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Status & Date */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusLabel(selectedOrder.status)}
                </span>
                <span className="text-xs text-zinc-400">
                  {formatDate(selectedOrder.createdAt)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Nume</span>
                  <span className="text-white text-sm font-medium">{selectedOrder.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Telefon</span>
                  <span className="text-white text-sm font-mono">{selectedOrder.phone}</span>
                </div>
              </div>

              {/* Address */}
              <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                <div className="text-zinc-400 text-sm mb-1">Adresă</div>
                <div className="text-white text-sm">{selectedOrder.address}</div>
                <div className="text-zinc-300 text-sm">
                  {selectedOrder.city}, {selectedOrder.county}
                </div>
                {selectedOrder.postalCode && (
                  <div className="text-zinc-400 text-sm">
                    Cod poștal: <span className="text-white font-mono">{selectedOrder.postalCode}</span>
                  </div>
                )}
              </div>

              {/* Products */}
              <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                <div className="text-zinc-400 text-sm mb-1">Produse</div>
                {selectedOrder.productName && (
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">
                      {selectedOrder.productName}
                      {selectedOrder.productQuantity && selectedOrder.productQuantity > 1 && (
                        <span className="text-zinc-400"> x{selectedOrder.productQuantity}</span>
                      )}
                    </span>
                  </div>
                )}
                {selectedOrder.upsells && selectedOrder.upsells.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-700">
                    <div className="text-zinc-500 text-xs mb-1">Upsells:</div>
                    {selectedOrder.upsells.map((upsell: any, idx: number) => (
                      <div key={idx} className="text-zinc-300 text-sm">
                        {upsell.name || upsell.productName}
                        {upsell.quantity && upsell.quantity > 1 && (
                          <span className="text-zinc-400"> x{upsell.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Subtotal</span>
                  <span className="text-white text-sm">{formatPrice(selectedOrder.subtotal)} RON</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Transport</span>
                  <span className="text-white text-sm">{formatPrice(selectedOrder.shippingCost)} RON</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                  <span className="text-white text-sm font-medium">Total</span>
                  <span className="text-emerald-400 text-sm font-semibold">{formatPrice(selectedOrder.total)} RON</span>
                </div>
              </div>

              {/* Order Note */}
              {selectedOrder.orderNote && (
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <div className="text-zinc-400 text-sm mb-1">Notă comandă</div>
                  <div className="text-white text-sm">{selectedOrder.orderNote}</div>
                </div>
              )}

              {/* Tracking - if confirmed */}
              {selectedOrder.status === "confirmed" && selectedOrder.helpshipOrderId && (
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Tracking</span>
                    <button
                      onClick={() => {
                        setIsOrderModalOpen(false);
                        openTrackingModal(selectedOrder);
                      }}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium uppercase cursor-pointer hover:opacity-80 transition-opacity ${getTrackingStatusColor(selectedOrder.trackingStatus)}`}
                    >
                      📦 {selectedOrder.trackingStatus ? getTrackingStatusLabel(selectedOrder.trackingStatus) : "Vezi tracking"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-zinc-700">
              <button
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-600 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Order Modal */}
      <ConfirmOrderModal
        order={confirmModalOrder}
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setConfirmModalOrder(null);
        }}
        onConfirm={handleConfirmOrder}
        onNoteSaved={() => fetchCustomerDetails()}
      />

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
