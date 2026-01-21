"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Order } from "@/lib/types";
import ConfirmOrderModal from "../components/ConfirmOrderModal";
import HoldOrderModal from "../components/HoldOrderModal";
import DuplicateOrderWarningModal from "../components/DuplicateOrderWarningModal";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [holdOrderId, setHoldOrderId] = useState<string | null>(null);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);

  // Duplicate detection state
  const [duplicateOrders, setDuplicateOrders] = useState<Order[]>([]);
  const [duplicateOrderDays, setDuplicateOrderDays] = useState(14);
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 50;

  // Finalize Queue Modal state
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [orderToFinalize, setOrderToFinalize] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ isOpen: boolean; type: "success" | "error" | "info"; message: string }>({
    isOpen: false,
    type: "success",
    message: "",
  });

  async function fetchOrders(query: string = "") {
    setIsSearching(true);
    const params = new URLSearchParams({
      q: query,
      limit: ordersPerPage.toString(),
      offset: ((currentPage - 1) * ordersPerPage).toString(),
    });

    const response = await fetch(`/api/orders/list?${params}`);
    if (!response.ok) {
      setIsSearching(false);
      return;
    }
    const data = await response.json();
    setOrders(data.orders ?? []);
    setTotalOrders(data.total ?? 0);
    setIsSearching(false);
  }

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on new search
      fetchOrders(query);
    }, 300);
  }, [currentPage]);

  // Handle search input change
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  }

  // Clear search
  function handleClearSearch() {
    setSearchQuery("");
    setCurrentPage(1);
    fetchOrders("");
  }

  useEffect(() => {
    fetchOrders(searchQuery);
  }, [currentPage]);

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

  async function handleConfirmClick(order: Order) {
    setSelectedOrder(order);
    setIsCheckingDuplicates(true);

    try {
      // Check for duplicate orders
      const params = new URLSearchParams({
        customerId: order.customerId,
        currentOrderId: order.id,
      });

      const response = await fetch(`/api/orders/check-duplicates?${params.toString()}`);

      if (!response.ok) {
        console.error("Failed to check duplicates, proceeding with confirmation");
        setIsModalOpen(true);
        return;
      }

      const data = await response.json();

      if (data.hasDuplicates && data.orders.length > 0) {
        // Show duplicate warning modal
        setDuplicateOrders(data.orders);
        setDuplicateOrderDays(data.duplicateOrderDays);
        setIsDuplicateWarningOpen(true);
      } else {
        // No duplicates, proceed with confirmation
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
      // On error, proceed with confirmation anyway
      setIsModalOpen(true);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }

  function handleDuplicateWarningProceed() {
    // Close duplicate warning and open confirm modal
    setIsDuplicateWarningOpen(false);
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

  // Format order number using store's order_series (e.g., "JMR-TEST-00076", "VELARO-00123")
  function formatOrderNumber(orderNumber?: number, orderSeries?: string, orderId?: string) {
    if (orderNumber && orderSeries) {
      // Ensure order_series ends with a hyphen
      const series = orderSeries.endsWith('-') ? orderSeries : `${orderSeries}-`;
      return `${series}${String(orderNumber).padStart(5, "0")}`;
    }
    if (orderNumber) {
      // Fallback to default series if not provided
      return `VLR-${String(orderNumber).padStart(5, "0")}`;
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

    if (action === "resync") {
      if (!confirm("Sigur vrei să re-sincronizezi această comandă cu Helpship?")) {
        setOpenDropdown(null);
        return;
      }

      setConfirming(orderId);
      try {
        const response = await fetch(`/api/orders/${orderId}/resync`, {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to resync order");
        }

        const result = await response.json();

        // Reîncarcă lista de comenzi
        await fetchOrders();
        alert(`✅ Comanda a fost sincronizată cu succes!\nHelpship Order ID: ${result.helpshipOrderId}`);
      } catch (error) {
        console.error("Error resyncing order:", error);
        const errorMessage = error instanceof Error ? error.message : "Eroare la re-sincronizarea comenzii";
        alert(`❌ ${errorMessage}`);
      } finally {
        setConfirming(null);
      }
      setOpenDropdown(null);
      return;
    }

    if (action === "finalize") {
      // Open elegant confirmation modal
      setOrderToFinalize(orderId);
      setIsFinalizeModalOpen(true);
      setOpenDropdown(null);
      return;
    }

    if (action === "promote") {
      handlePromoteTestingOrder(orderId);
      setOpenDropdown(null);
      return;
    }

    // Pentru restul acțiunilor, nu facem nimic momentan
    setOpenDropdown(null);
  }

  async function handleFinalizeQueue() {
    if (!orderToFinalize) return;

    setIsFinalizing(true);
    try {
      const response = await fetch(`/api/orders/${orderToFinalize}/finalize`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to finalize order");
      }

      const result = await response.json();

      // Close modal and reload orders
      setIsFinalizeModalOpen(false);
      setOrderToFinalize(null);
      await fetchOrders();

      // Show success toast
      setToast({
        isOpen: true,
        type: "success",
        message: `Order finalized successfully! ✓`,
      });
    } catch (error) {
      console.error("Error finalizing order:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to finalize order";

      // Show error toast
      setToast({
        isOpen: true,
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handlePromoteTestingOrder(orderId: string) {
    if (!confirm("Are you sure you want to promote this testing order to a real order? It will be synced to Helpship.")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/promote`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to promote order");
      }

      await fetchOrders();

      setToast({
        isOpen: true,
        type: "success",
        message: "Testing order promoted to real order successfully! ✓",
      });
    } catch (error) {
      console.error("Error promoting order:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to promote order";

      setToast({
        isOpen: true,
        type: "error",
        message: errorMessage,
      });
    }
  }

  // Calculate pagination (server-side now)
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const currentOrders = orders; // No slicing needed, API returns paginated data

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-zinc-900">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Comenzi – MVP
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                {totalOrders} total comenzi{searchQuery && ` (${orders.length} rezultate)`} • Pagina {currentPage} din {totalPages}
              </p>
            </div>
            <button
              onClick={() => fetchOrders(searchQuery)}
              disabled={isSearching}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? "Se încarcă..." : "REFRESH"}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-zinc-400"
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
              onChange={handleSearchChange}
              placeholder="Caută după telefon, nume, județ, oraș, adresă..."
              className="w-full pl-10 pr-10 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {isSearching && (
              <div className="absolute inset-y-0 right-10 flex items-center pr-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
              </div>
            )}
          </div>
        </header>

        <div className="overflow-x-auto rounded-lg bg-zinc-800 shadow-xl border border-zinc-700">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-700 bg-zinc-900 text-xs font-semibold uppercase text-zinc-400">
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
              {currentOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-sm text-zinc-400"
                  >
                    {orders.length === 0 ? "Nu există comenzi încă." : "Nu există comenzi pe această pagină."}
                  </td>
                </tr>
              ) : (
                currentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-zinc-700 text-xs text-zinc-300 last:border-b hover:bg-zinc-700/50"
                  >
                    {/* Order ID */}
                    <td className="px-3 py-2">
                      <span className="font-medium text-white">
                        {formatOrderNumber(order.orderNumber, order.orderSeries, order.id)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                            order.status === "queue"
                              ? "bg-violet-600 text-white"
                              : order.status === "testing"
                              ? "bg-blue-600 text-white"
                              : order.status === "confirmed"
                              ? "bg-emerald-600 text-white"
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
                            : order.status === "cancelled"
                            ? "Cancelled"
                            : order.status === "hold"
                            ? "Hold"
                            : order.status === "sync_error"
                            ? "Sync Error"
                            : "Confirmed"}
                        </span>
                        {/* Show source for PENDING orders */}
                        {order.status === "pending" && (order.fromPartialId || order.promotedFromTesting) && (
                          <span className="text-[10px] font-medium">
                            <span className="text-zinc-400">from </span>
                            {order.fromPartialId ? (
                              <span className="text-emerald-400">Partials</span>
                            ) : (
                              <span className="text-amber-400">Testing</span>
                            )}
                          </span>
                        )}
                        {/* Show confirmer + source for CONFIRMED orders */}
                        {order.status === "confirmed" && order.confirmerName && (
                          <span className="text-[10px] font-medium">
                            <span className="text-zinc-400">by {order.confirmerName}</span>
                            {order.fromPartialId && (
                              <>
                                <span className="text-zinc-400"> from </span>
                                <span className="text-emerald-400">Partials</span>
                              </>
                            )}
                            {order.promotedFromTesting && !order.fromPartialId && (
                              <>
                                <span className="text-zinc-400"> from </span>
                                <span className="text-amber-400">Testing</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-3 py-2">
                      <div>
                        <p className="font-medium text-white">{order.fullName}</p>
                        <p className="text-zinc-400">{order.phone}</p>
                      </div>
                    </td>

                    {/* Order Note */}
                    <td className="px-3 py-2">
                      <span className="text-zinc-300">
                        {order.orderNote || "none"}
                      </span>
                    </td>

                    {/* Order Source */}
                    <td className="px-3 py-2">
                      <span className="text-zinc-300">{order.landingKey}</span>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white">
                          Total: {(() => {
                            // Calculate total dynamically including all upsells
                            const productSubtotal = order.subtotal || 0;
                            const shipping = order.shippingCost || 0;
                            const upsellsTotal = order.upsells?.reduce((sum: number, upsell: any) => {
                              return sum + ((upsell.price || 0) * (upsell.quantity || 1));
                            }, 0) || 0;
                            const total = productSubtotal + shipping + upsellsTotal;
                            return total.toFixed(2);
                          })()} RON
                        </p>
                        <p className="text-zinc-400">
                          Items: {order.subtotal.toFixed(2)} RON ({order.productQuantity || 1}x)
                        </p>
                        {(() => {
                          const upsellsArray = Array.isArray(order.upsells) ? order.upsells : [];

                          // Calculate PRE total (presale or no type - defaults to presale)
                          const preTotal = upsellsArray
                            .filter((upsell: any) => !upsell.type || upsell.type === "presale")
                            .reduce((sum: number, upsell: any) => {
                              return sum + ((upsell.price || 0) * (upsell.quantity || 1));
                            }, 0);

                          // Calculate POST total (explicitly postsale only)
                          const postTotal = upsellsArray
                            .filter((upsell: any) => upsell.type === "postsale")
                            .reduce((sum: number, upsell: any) => {
                              return sum + ((upsell.price || 0) * (upsell.quantity || 1));
                            }, 0);

                          return (
                            <>
                              {preTotal > 0 && (
                                <p className="font-semibold" style={{ color: '#22c55e' }}>
                                  PRE: {preTotal.toFixed(2)} RON
                                </p>
                              )}
                              {postTotal > 0 && (
                                <p className="font-semibold" style={{ color: '#8b5cf6' }}>
                                  POST: {postTotal.toFixed(2)} RON
                                </p>
                              )}
                            </>
                          );
                        })()}
                        <p className="text-zinc-400">
                          Shipping: {order.shippingCost.toFixed(2)} RON
                        </p>
                        <p className="text-zinc-400">Discount: 0,00 RON</p>
                      </div>
                    </td>

                    {/* Order Date */}
                    <td className="px-3 py-2">
                      <span className="text-zinc-300">{formatDate(order.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-2">
                        {/* CONFIRM Button - Always visible, disabled if queue, testing or confirmed */}
                        <button
                          onClick={() => handleActionClick(order.id, "confirm")}
                          disabled={order.status === "queue" || order.status === "testing" || order.status === "confirmed" || confirming === order.id}
                          className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all ${
                            order.status === "queue"
                              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                              : order.status === "testing"
                              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                              : order.status === "confirmed"
                              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg"
                          }`}
                        >
                          {confirming === order.id ? "..." : order.status === "confirmed" ? "✓ CONFIRMED" : order.status === "queue" ? "QUEUE" : order.status === "testing" ? "🧪 TESTING" : "CONFIRM"}
                        </button>

                        {/* Actions Dropdown */}
                        <div className="relative actions-dropdown">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                            className="rounded-md bg-zinc-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-500 w-full"
                          >
                            Actions ▼
                          </button>
                          {openDropdown === order.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-zinc-700 border border-zinc-600 rounded-md shadow-lg z-10">
                              <div className="py-1">
                                {/* Hide Order Confirm for testing orders */}
                                {order.status !== "testing" && (
                                  <button
                                    onClick={() => handleActionClick(order.id, "confirm")}
                                    disabled={order.status === "queue" || confirming === order.id}
                                    className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {confirming === order.id ? "Order Confirm..." : "Order Confirm"}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleActionClick(order.id, "cancel")}
                                  className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600"
                                >
                                  Order Cancel
                                </button>
                                <button
                                  onClick={() => handleActionClick(order.id, "uncancel")}
                                  className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600"
                                >
                                  Order Uncancel
                                </button>
                                <button
                                  onClick={() => handleActionClick(order.id, "hold")}
                                  className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600"
                                >
                                  Order Hold
                                </button>
                                <button
                                  onClick={() => handleActionClick(order.id, "unhold")}
                                  className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600"
                                >
                                  Order Unhold
                                </button>
                                <button
                                  onClick={() => handleActionClick(order.id, "note")}
                                  className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600"
                                >
                                  Order Note
                                </button>
                                {order.status === "queue" && (
                                  <button
                                    onClick={() => handleActionClick(order.id, "finalize")}
                                    className="w-full text-left px-3 py-2 text-xs text-violet-400 hover:bg-violet-900/30 font-medium border-t border-zinc-600"
                                  >
                                    ⚡ Finalize Queue
                                  </button>
                                )}
                                {order.status === "testing" && (
                                  <button
                                    onClick={() => handleActionClick(order.id, "promote")}
                                    className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-900/30 font-medium border-t border-zinc-600"
                                  >
                                    🚀 Make Real Order
                                  </button>
                                )}
                                {order.status === "sync_error" && (
                                  <button
                                    onClick={() => handleActionClick(order.id, "resync")}
                                    className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-900/30 font-medium border-t border-zinc-600"
                                  >
                                    🔄 Resync to Helpship
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Afișare {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, totalOrders)} din {totalOrders} comenzi
            </div>

            <div className="flex gap-2">
              {/* Previous button */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2);

                  if (!showPage) {
                    // Show ellipsis
                    if (page === currentPage - 3 || page === currentPage + 3) {
                      return (
                        <span key={page} className="px-3 py-1 text-sm text-zinc-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        currentPage === page
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Next button */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Următor
              </button>
            </div>
          </div>
        )}

              {/* Duplicate Warning Modal */}
              <DuplicateOrderWarningModal
                isOpen={isDuplicateWarningOpen}
                onClose={() => {
                  setIsDuplicateWarningOpen(false);
                  setSelectedOrder(null);
                  setDuplicateOrders([]);
                }}
                onProceed={handleDuplicateWarningProceed}
                duplicateOrders={duplicateOrders}
                duplicateOrderDays={duplicateOrderDays}
                customerId={selectedOrder?.customerId || ""}
              />

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

              {/* Finalize Queue Modal */}
              <ConfirmModal
                isOpen={isFinalizeModalOpen}
                onClose={() => {
                  setIsFinalizeModalOpen(false);
                  setOrderToFinalize(null);
                }}
                onConfirm={handleFinalizeQueue}
                title="Finalize Queue Order"
                message="Are you sure you want to finalize this order without postsale? The order will be synced to Helpship."
                confirmText="Finalize"
                cancelText="Cancel"
                confirmButtonClass="bg-violet-600 hover:bg-violet-700"
                isProcessing={isFinalizing}
              />

              {/* Toast Notifications */}
              <Toast
                isOpen={toast.isOpen}
                onClose={() => setToast({ ...toast, isOpen: false })}
                type={toast.type}
                message={toast.message}
                duration={3000}
              />
            </main>
          </div>
        );
      }

