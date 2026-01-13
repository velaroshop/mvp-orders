"use client";

import { useState, useEffect } from "react";
import type { Order } from "@/lib/types";
import type { PostalCodeResult } from "@/lib/postal-code/types";

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
  const [postalCodes, setPostalCodes] = useState<PostalCodeResult[]>([]);
  const [isLoadingPostalCodes, setIsLoadingPostalCodes] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Funcție pentru căutarea codurilor poștale
  async function searchPostalCodes(address?: string, city?: string, county?: string) {
    const searchAddress = address || formData.address;
    const searchCity = city || formData.city;
    const searchCounty = county || formData.county;

    if (!searchAddress || !searchCity || !searchCounty) {
      setPostalCodeError("Completează adresa, orașul și județul pentru a căuta coduri poștale");
      return;
    }

    setIsLoadingPostalCodes(true);
    setPostalCodeError(null);

    try {
      const params = new URLSearchParams({
        address: searchAddress,
        city: searchCity,
        county: searchCounty,
        country: "Romania",
      });

      const response = await fetch(`/api/postal-code/search?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to search postal codes");
      }

      const data = await response.json();
      setPostalCodes(data.postalCodes || []);
      
      if (data.postalCodes && data.postalCodes.length === 0) {
        setPostalCodeError("Nu s-au găsit coduri poștale pentru această adresă");
      }
    } catch (error) {
      console.error("Error searching postal codes:", error);
      setPostalCodeError(
        error instanceof Error ? error.message : "Eroare la căutarea codurilor poștale"
      );
      setPostalCodes([]);
    } finally {
      setIsLoadingPostalCodes(false);
    }
  }

  // Funcție pentru selectarea unui cod poștal
  function selectPostalCode(postalCode: string) {
    setFormData({ ...formData, postalCode });
  }

  // Populează formularul când se deschide modalul
  useEffect(() => {
    if (order && isOpen) {
      // Obține datele din Helpship pentru a prelua codul poștal
      async function fetchHelpshipData() {
        const currentOrder = order; // Salvează referința pentru a evita problemele cu closure
        if (!currentOrder) return;

        if (!currentOrder.helpshipOrderId) {
          // Dacă nu avem helpshipOrderId, folosim datele din DB
          const initialData = {
            fullName: currentOrder.fullName || "",
            phone: currentOrder.phone || "",
            county: currentOrder.county || "",
            city: currentOrder.city || "",
            address: currentOrder.address || "",
            postalCode: currentOrder.postalCode || "",
            shippingPrice: currentOrder.shippingCost || 0,
            discount: 0,
          };
          setFormData(initialData);
          
          if (initialData.address && initialData.city && initialData.county) {
            searchPostalCodes(initialData.address, initialData.city, initialData.county);
          }
          return;
        }

        try {
          // Obține datele din Helpship
          const response = await fetch(`/api/orders/${currentOrder.id}/helpship`);
          if (response.ok) {
            const helpshipData = await response.json();
            const helpshipOrder = helpshipData.order;
            
            // Extrage codul poștal din Helpship
            const postalCode = helpshipOrder?.mailingAddress?.zip || 
                              currentOrder.postalCode || 
                              "";

            const initialData = {
              fullName: helpshipOrder?.mailingAddress?.name || 
                       (helpshipOrder?.mailingAddress?.firstName && helpshipOrder?.mailingAddress?.lastName
                         ? `${helpshipOrder.mailingAddress.firstName} ${helpshipOrder.mailingAddress.lastName}`
                         : currentOrder.fullName || ""),
              phone: helpshipOrder?.mailingAddress?.phone || currentOrder.phone || "",
              county: helpshipOrder?.mailingAddress?.province || currentOrder.county || "",
              city: helpshipOrder?.mailingAddress?.city || currentOrder.city || "",
              address: helpshipOrder?.mailingAddress?.addressLine1 || currentOrder.address || "",
              postalCode: postalCode,
              shippingPrice: currentOrder.shippingCost || 0,
              discount: 0,
            };
            setFormData(initialData);
            
            // Caută automat codurile poștale dacă avem adresa completă
            if (initialData.address && initialData.city && initialData.county) {
              searchPostalCodes(initialData.address, initialData.city, initialData.county);
            }
          } else {
            // Dacă nu putem obține datele din Helpship, folosim datele din DB
            const initialData = {
              fullName: currentOrder.fullName || "",
              phone: currentOrder.phone || "",
              county: currentOrder.county || "",
              city: currentOrder.city || "",
              address: currentOrder.address || "",
              postalCode: currentOrder.postalCode || "",
              shippingPrice: currentOrder.shippingCost || 0,
              discount: 0,
            };
            setFormData(initialData);
            
            if (initialData.address && initialData.city && initialData.county) {
              searchPostalCodes(initialData.address, initialData.city, initialData.county);
            }
          }
        } catch (error) {
          console.error("Error fetching Helpship data:", error);
          // Dacă apare o eroare, folosim datele din DB
          const initialData = {
            fullName: currentOrder.fullName || "",
            phone: currentOrder.phone || "",
            county: currentOrder.county || "",
            city: currentOrder.city || "",
            address: currentOrder.address || "",
            postalCode: currentOrder.postalCode || "",
            shippingPrice: currentOrder.shippingCost || 0,
            discount: 0,
          };
          setFormData(initialData);
          
          if (initialData.address && initialData.city && initialData.county) {
            searchPostalCodes(initialData.address, initialData.city, initialData.county);
          }
        }
      }

      fetchHelpshipData();
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Trimite datele actualizate la onConfirm
      const updatedOrder: Partial<Order> = {
        fullName: formData.fullName,
        phone: formData.phone,
        county: formData.county,
        city: formData.city,
        address: formData.address,
        postalCode: formData.postalCode,
        shippingCost: formData.shippingPrice,
      };

      await onConfirm(updatedOrder);
      onClose();
    } catch (error) {
      console.error("Error confirming order", error);
      const errorMessage = error instanceof Error ? error.message : "Eroare la confirmarea comenzii";
      
      // Verificăm dacă eroarea este despre status
      if (errorMessage.includes("nu mai poate fi modificată") || errorMessage.includes("cannot be modified")) {
        setSubmitError("Comanda nu mai poate fi modificată. Statusul comenzii în Helpship nu permite modificări.");
      } else {
        setSubmitError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Format order number (JMR-TEST-XXXXX)
  const formatOrderNumber = (orderNumber?: number) => {
    if (!orderNumber) return order.id.substring(0, 8);
    return `JMR-TEST-${String(orderNumber).padStart(5, "0")}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
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

        {/* Content - Order Information Grid */}
        <div className="p-6">
          <div className="grid grid-cols-8 gap-4 mb-6">
            {/* Order ID */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Order ID</p>
              <p className="text-sm font-medium text-zinc-900">
                {formatOrderNumber(order.orderNumber)}
              </p>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Status</p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  order.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {order.status === "pending" ? "Pending" : "Confirmed"}
              </span>
            </div>

            {/* Customer */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Customer</p>
              <p className="text-sm font-medium text-zinc-900">{order.fullName}</p>
              <p className="text-xs text-zinc-600">{order.phone}</p>
            </div>

            {/* Order Note */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Order Note</p>
              <p className="text-sm text-zinc-900">none</p>
            </div>

            {/* Order Source */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Order Source</p>
              <p className="text-sm text-zinc-900">{order.landingKey}</p>
            </div>

            {/* Price */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Price</p>
              <div className="text-sm text-zinc-900 space-y-0.5">
                <p className="font-semibold">Total: {order.total.toFixed(2)} RON</p>
                <p className="text-xs">Items: {order.subtotal.toFixed(2)} RON (1x)</p>
                <p className="text-xs">Pre purchase: 0,00 RON</p>
                <p className="text-xs">Shipping: {order.shippingCost.toFixed(2)} RON</p>
                <p className="text-xs">Discount: 0,00 RON</p>
              </div>
            </div>

            {/* Order Date */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Order Date</p>
              <p className="text-sm text-zinc-900">{formatDate(order.createdAt)}</p>
            </div>

            {/* Actions */}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Actions</p>
              <div className="space-y-1">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  View
                </button>
              </div>
            </div>
          </div>

          {/* Form for editing */}
          <form onSubmit={handleSubmit} className="border-t pt-6">
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
                  placeholder="@ Post code"
                />
                
                {/* Recommended postal codes */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-zinc-900">
                      Recommended postal codes:
                    </label>
                    <button
                      type="button"
                      onClick={() => searchPostalCodes()}
                      disabled={isLoadingPostalCodes}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingPostalCodes ? "Loading..." : "Reload"}
                    </button>
                  </div>
                  
                  {isLoadingPostalCodes && (
                    <p className="text-xs text-zinc-500">Căutare coduri poștale...</p>
                  )}
                  
                  {postalCodeError && (
                    <p className="text-xs text-red-600">{postalCodeError}</p>
                  )}
                  
                  {!isLoadingPostalCodes && postalCodes.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {postalCodes.map((result, index) => (
                        <div
                          key={`${result.postcode}-${index}`}
                          className="p-2 border border-zinc-200 rounded-md hover:bg-zinc-50 cursor-pointer transition-colors"
                          onClick={() => selectPostalCode(result.postcode)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-zinc-900">
                                {result.postcode}
                              </p>
                              <p className="text-xs text-zinc-600 mt-1">
                                {result.formatted}
                              </p>
                            </div>
                            {formData.postalCode === result.postcode && (
                              <span className="text-emerald-600 text-xs">✓</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!isLoadingPostalCodes && postalCodes.length === 0 && !postalCodeError && (
                    <p className="text-xs text-zinc-500">
                      Apasă "Reload" pentru a căuta coduri poștale
                    </p>
                  )}
                </div>
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

            {/* Error Message */}
            {submitError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">Eroare</p>
                <p className="text-sm text-red-700 mt-1">{submitError}</p>
              </div>
            )}

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
    </div>
  );
}
