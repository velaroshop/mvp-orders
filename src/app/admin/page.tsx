"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function fetchOrders() {
    const response = await fetch("/api/orders/list");
    if (!response.ok) return;
    const data = await response.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  async function handleConfirm(orderId: string) {
    if (!confirm("Ești sigur că vrei să confirmi această comandă?")) {
      return;
    }

    setConfirming(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Eroare la confirmarea comenzii");
        return;
      }

      // Reîncarcă lista de comenzi
      await fetchOrders();
    } catch (error) {
      console.error("Error confirming order", error);
      alert("Eroare la confirmarea comenzii");
    } finally {
      setConfirming(null);
    }
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
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Dată</th>
                <th className="px-3 py-2">Landing</th>
                <th className="px-3 py-2">Ofertă</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Telefon</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
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
                    <td className="max-w-[120px] truncate px-3 py-2">
                      {order.id}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(order.createdAt).toLocaleString("ro-RO")}
                    </td>
                    <td className="px-3 py-2">{order.landingKey}</td>
                    <td className="px-3 py-2">{order.offerCode}</td>
                    <td className="px-3 py-2">{order.fullName}</td>
                    <td className="px-3 py-2">{order.phone}</td>
                    <td className="px-3 py-2">
                      {order.total.toFixed(2)} Lei
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          order.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleConfirm(order.id)}
                          disabled={confirming === order.id}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {confirming === order.id ? "Se confirmă..." : "Confirmă"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

