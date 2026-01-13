"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import ConfirmOrderModal from "./ConfirmOrderModal";

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchOrders() {
    const response = await fetch("/api/orders/list");
    if (!response.ok) return;
    const data = await response.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  function handleConfirmClick(order: Order) {
    setSelectedOrder(order);
    setIsModalOpen(true);
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
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.status === "pending" ? "Pending" : "Confirmed"}
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
                      <span className="text-zinc-900">none</span>
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
                      <button
                        onClick={() => handleConfirmClick(order)}
                        disabled={confirming === order.id}
                        className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {confirming === order.id ? "Se confirmă..." : "Confirmă"}
                      </button>
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
      </main>
    </div>
  );
}

