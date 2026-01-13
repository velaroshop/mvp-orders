"use client";

import { useState, useEffect } from "react";
import type { Order } from "@/lib/types";

interface ConfirmOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updatedOrder: Partial<Order>) => Promise<void>;
}

export default function ConfirmOrderModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: ConfirmOrderModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    county: "",
    city: "",
    address: "",
    postalCode: "",
    shippingPrice: 0,
    discount: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populează formularul când se deschide modalul
  useEffect(() => {
    if (order && isOpen) {
      setFormData({
        fullName: order.fullName || "",
        phone: order.phone || "",
        county: order.county || "",
        city: order.city || "",
        address: order.address || "",
        postalCode: order.postalCode || "",
        shippingPrice: order.shippingCost || 0,
        discount: 0, // TODO: adăugăm discount în Order type dacă e necesar
      });
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Pentru moment, doar logăm datele (nu facem update efectiv)
      console.log("Order data to confirm:", {
        ...order,
        ...formData,
      });

      // TODO: Aici vom face update efectiv în Helpship când suntem gata
      // await onConfirm({ ...order, ...formData });

      alert("Pentru moment, doar afișăm datele. Update-ul efectiv va fi implementat în pasul următor.");
      onClose();
    } catch (error) {
      console.error("Error confirming order", error);
      alert("Eroare la confirmarea comenzii");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">ORDER CONFIRM</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">👤</span>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Personal Information
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Phone Number"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  {formData.phone.replace(/\D/g, "").length} digits
                </p>
              </div>
            </div>

            {/* Right Column - Shipping Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Shipping Address
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clean & Autofill
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  County
                </label>
                <input
                  type="text"
                  value={formData.county}
                  onChange={(e) =>
                    setFormData({ ...formData, county: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="County"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Street
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Street"
                  />
                  <input
                    type="text"
                    className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Number"
                  />
                </div>
                <p className="text-xs text-zinc-600 mt-1">
                  Initial street: {order.address}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Post Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Post code"
                />
                {formData.postalCode && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ✓ Cod poștal sugerat de Helpship
                  </p>
                )}
              </div>

              {/* Order Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-zinc-900">
                    Order Summary
                  </h4>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    View contents ▼
                  </button>
                </div>
                <div className="text-sm text-zinc-800">
                  <p>• {order.offerCode}</p>
                  <p>Subtotal: {order.subtotal.toFixed(2)} Lei</p>
                  <p>Shipping: {order.shippingCost.toFixed(2)} Lei</p>
                  <p className="font-semibold text-zinc-900">
                    Total: {order.total.toFixed(2)} Lei
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Shipping & Scheduling */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              Shipping & Scheduling
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Shipping Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shippingPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippingPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Discount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? "Se salvează..." : "Save & Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
