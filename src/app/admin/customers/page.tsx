"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Customer } from "@/lib/types";

function CustomersPageContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const phoneFilter = searchParams.get("phone");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const customersPerPage = 25;

  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchCustomers();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  async function fetchCustomers() {
    try {
      setIsLoading(true);
      const offset = (currentPage - 1) * customersPerPage;
      const params = new URLSearchParams({
        limit: customersPerPage.toString(),
        offset: offset.toString(),
      });

      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      const response = await fetch(`/api/customers/list?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch customers");
      }

      setCustomers(data.customers);
      setTotalCustomers(data.total);

      // If phone filter is present, check for matching customer
      if (phoneFilter && data.customers.length > 0) {
        const matchingCustomer = data.customers.find(
          (c: Customer) => c.phone === phoneFilter
        );

        if (matchingCustomer) {
          // Redirect to customer details page
          router.push(`/admin/customers/${matchingCustomer.id}`);
        } else {
          // Show error if no matching customer found
          setError(`Nu s-a găsit niciun client cu numărul de telefon: ${phoneFilter}`);
        }
      }
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

  const totalPages = Math.ceil(totalCustomers / customersPerPage);
  const startIndex = (currentPage - 1) * customersPerPage + 1;
  const endIndex = Math.min(currentPage * customersPerPage, totalCustomers);

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

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
          <div className="text-3xl font-bold text-white">{totalCustomers}</div>
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după nume sau telefon..."
            className="block w-full pl-10 pr-10 py-3 border border-zinc-700 rounded-lg bg-zinc-800 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg
                className="h-5 w-5 text-zinc-400 hover:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
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
        <>
          <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900 border-b border-zinc-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Nume
                    </th>
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
                          {customer.name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-300">
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

          {/* Pagination - Simple Previous/Next */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                Afișare {startIndex}-{endIndex} din {totalCustomers} clienți
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Următor →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Clienți</h1>
          <p className="text-zinc-400 mt-2">
            Lista completă a clienților și istoricul comenzilor
          </p>
        </div>
        <div className="bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 p-8 text-center">
          <p className="text-zinc-400">Se încarcă clienții...</p>
        </div>
      </div>
    }>
      <CustomersPageContent />
    </Suspense>
  );
}
