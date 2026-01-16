"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/customers/list");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch customers");
      }

      setCustomers(data.customers);
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
    });
  }

  function formatPrice(price: number) {
    return price.toFixed(2);
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Clienți</h1>
        <p className="text-zinc-400 mt-2">
          Lista completă a clienților și istoricul comenzilor
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <div className="text-sm text-zinc-400 mb-1">Total Clienți</div>
          <div className="text-3xl font-bold text-white">{customers.length}</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <div className="text-sm text-zinc-400 mb-1">Total Comenzi</div>
          <div className="text-3xl font-bold text-white">
            {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
          </div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <div className="text-sm text-zinc-400 mb-1">Valoare Totală</div>
          <div className="text-3xl font-bold text-white">
            {formatPrice(customers.reduce((sum, c) => sum + c.totalSpent, 0))} RON
          </div>
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Se încarcă clienții...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Nu există clienți înregistrați încă.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Total Comenzi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Valoare Totală
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Prima Comandă
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Ultima Comandă
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-zinc-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {customer.totalOrders}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-emerald-400">
                        {formatPrice(customer.totalSpent)} RON
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {customer.firstOrderDate
                          ? formatDate(customer.firstOrderDate)
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {customer.lastOrderDate
                          ? formatDate(customer.lastOrderDate)
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Vezi detalii
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
