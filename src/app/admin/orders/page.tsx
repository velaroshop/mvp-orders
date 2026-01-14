"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import ConfirmOrderModal from "../components/ConfirmOrderModal";
import HoldOrderModal from "../components/HoldOrderModal";

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [holdOrderId, setHoldOrderId] = useState<string | null>(null);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);

  async function fetchOrders() {
    const response = await fetch("/api/orders/list");
    if (!response.ok) return;
    const data = await response.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  // Închide dropdown-ul când se face click în afara lui
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".actions-dropdown")) {
        setOpenDropdown(null);
      }
    }

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openDropdown]);

  function handleConfirmClick(order: Order) {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }

  async function handleHoldConfirm(note: string): Promise<void> {
    if (!holdOrderId) return;

    setConfirming(holdOrderId);

    try {
      const response = await fetch(`/api/orders/${holdOrderId}/hold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to hold order");
      }

      await fetchOrders();
      setIsHoldModalOpen(false);
      setHoldOrderId(null);
    } catch (error) {
      console.error("Error holding order:", error);
      throw error; // Re-aruncă pentru a fi prins de modal
    } finally {
      setConfirming(null);
    }
  }

  async function handleModalConfirm(updatedOrder: Partial<Order>): Promise<void> {
    if (!selectedOrder) return;

    setConfirming(selectedOrder.id);

    try {
      // Trimite datele actualizate la endpoint-ul de confirmare
      const response = await fetch(`/api/orders/${selectedOrder.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedOrder),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to confirm order";
        throw new Error(errorMessage);
      }

      // Reîncarcă lista de comenzi
      await fetchOrders();
      
      setIsModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error confirming order:", error);
      // Eroarea va fi afișată în modal prin setSubmitError
      // Re-aruncăm eroarea pentru a fi prinsă de modal
      throw error;
    } finally {
      setConfirming(null);
    }
  }

  // Format order number (JMR-TEST-XXXXX)
  function formatOrderNumber(orderNumber?: number, orderId?: string) {
    if (orderNumber) {
      return `JMR-TEST-${String(orderNumber).padStart(5, "0")}`;
    }
    return orderId ? orderId.substring(0, 8) : "-";
  }

  // Format date
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleActionClick(orderId: string, action: string) {
    if (action === "confirm") {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        handleConfirmClick(order);
      }
      setOpenDropdown(null);
      return;
    }

    if (action === "cancel") {
      try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to cancel order");
        }

        // Reîncarcă lista de comenzi
        await fetchOrders();
        alert("Comanda a fost anulată cu succes");
      } catch (error) {
        console.error("Error canceling order:", error);
        const errorMessage = error instanceof Error ? error.message : "Eroare la anularea comenzii";
        alert(errorMessage);
      }
      setOpenDropdown(null);
      return;
    }

    if (action === "uncancel") {
      try {
        const response = await fetch(`/api/orders/${orderId}/uncancel`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to uncancel order");
        }

        // Reîncarcă lista de comenzi
        await fetchOrders();
        alert("Anularea comenzii a fost anulată cu succes");
      } catch (error) {
        console.error("Error uncanceling order:", error);
        const errorMessage = error instanceof Error ? error.message : "Eroare la anularea anulării comenzii";
        alert(errorMessage);
      }
      setOpenDropdown(null);
      return;
    }

    if (action === "hold") {
      setHoldOrderId(orderId);
      setIsHoldModalOpen(true);
      setOpenDropdown(null);
      return;
    }

    if (action === "unhold") {
      try {
        const response = await fetch(`/api/orders/${orderId}/unhold`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to unhold order");
        }

        // Reîncarcă lista de comenzi
        await fetchOrders();
        alert("Comanda a fost scoasă din hold cu succes (status: pending)");
      } catch (error) {
        console.error("Error unholding order:", error);
        const errorMessage = error instanceof Error ? error.message : "Eroare la scoaterea comenzii din hold";
        alert(errorMessage);
      }
      setOpenDropdown(null);
      return;
    }

    // Pentru restul acțiunilor, nu facem nimic momentan
    setOpenDropdown(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Comenzi – MVP
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Pagină foarte simplă pentru a vedea comenzile primite prin formular.
          </p>
        </header>

        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-zinc-100 text-xs font-semibold uppercase text-zinc-600">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Order Note</th>
                <th className="px-3 py-2">Order Source</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Order Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-sm text-zinc-500"
                  >
                    Nu există comenzi încă.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t text-xs text-zinc-800 last:border-b"
                  >
                    {/* Order ID */}
                    <td className="px-3 py-2">
                      <span className="font-medium text-zinc-900">
                        {formatOrderNumber(order.orderNumber, order.id)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          order.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : order.status === "hold"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.status === "pending" 
                          ? "Pending" 
                          : order.status === "cancelled" 
                          ? "Cancelled" 
                          : order.status === "hold"
                          ? "Hold"
                          : "Confirmed"}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-3 py-2">
                      <div>
                        <p className="font-medium text-zinc-900">{order.fullName}</p>
                        <p className="text-zinc-600">{order.phone}</p>
                      </div>
                    </td>

                    {/* Order Note */}
                    <td className="px-3 py-2">
                      <span className="text-zinc-900">
                        {order.orderNote || "none"}
                      </span>
                    </td>

                    {/* Order Source */}
                    <td className="px-3 py-2">
                      <span className="text-zinc-900">{order.landingKey}</span>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-zinc-900">
                          Total: {order.total.toFixed(2)} RON
                        </p>
                        <p className="text-zinc-600">
                          Items: {order.subtotal.toFixed(2)} RON (1x)
                        </p>
                        <p className="text-zinc-600">Pre purchase: 0,00 RON</p>
                        <p className="text-zinc-600">
                          Shipping: {order.shippingCost.toFixed(2)} RON
                        </p>
                        <p className="text-zinc-600">Discount: 0,00 RON</p>
                      </div>
                    </td>

                    {/* Order Date */}
                    <td className="px-3 py-2">
                      <span className="text-zinc-900">{formatDate(order.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="relative actions-dropdown">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                          className="rounded-md bg-zinc-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-700"
                        >
                          Actions ▼
                        </button>
                        {openDropdown === order.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-zinc-200 rounded-md shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handleActionClick(order.id, "confirm")}
                                disabled={confirming === order.id}
                                className="w-full text-left px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {confirming === order.id ? "Order Confirm..." : "Order Confirm"}
                              </button>
                              <button
                                onClick={() => handleActionClick(order.id, "cancel")}
                                className="w-full text-left px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-50"
                              >
                                Order Cancel
                              </button>
                              <button
                                onClick={() => handleActionClick(order.id, "uncancel")}
                                className="w-full text-left px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-50"
                              >
                                Order Uncancel
                              </button>
                              <button
                                onClick={() => handleActionClick(order.id, "hold")}
                                className="w-full text-left px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-50"
                              >
                                Order Hold
                              </button>
                              <button
                                onClick={() => handleActionClick(order.id, "unhold")}
                                className="w-full text-left px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-50"
                              >
                                Order Unhold
                              </button>
                              <button
                                onClick={() => handleActionClick(order.id, "note")}
                                className="w-full text-left px-3 py-2 text-xs text-zinc-900 hover:bg-zinc-50"
                              >
                                Order Note
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

              {/* Confirm Order Modal */}
              <ConfirmOrderModal
                order={selectedOrder}
                isOpen={isModalOpen}
                onClose={() => {
                  setIsModalOpen(false);
                  setSelectedOrder(null);
                }}
                onConfirm={handleModalConfirm}
              />

              {/* Hold Order Modal */}
              <HoldOrderModal
                isOpen={isHoldModalOpen}
                onClose={() => {
                  setIsHoldModalOpen(false);
                  setHoldOrderId(null);
                }}
                onConfirm={handleHoldConfirm}
                orderId={holdOrderId || ""}
              />
            </main>
          </div>
        );
      }

