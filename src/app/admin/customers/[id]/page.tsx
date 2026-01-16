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

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Număr Comandă
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Nume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Adresă
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Dată
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {order.orderNumber || order.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {order.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-300">
                        {order.address}, {order.city}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {order.county}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {formatPrice(order.total)} RON
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/orders`}
                        className="text-emerald-400 hover:text-emerald-300"
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
    </div>
  );
}
