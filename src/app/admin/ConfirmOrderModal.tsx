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
      const initialData = {
        fullName: order.fullName || "",
        phone: order.phone || "",
        county: order.county || "",
        city: order.city || "",
        address: order.address || "",
        postalCode: order.postalCode || "",
        shippingPrice: order.shippingCost || 0,
        discount: 0,
      };
      setFormData(initialData);
      
      // Caută automat codurile poștale când se deschide modalul (dacă avem adresa completă)
      if (initialData.address && initialData.city && initialData.county) {
        searchPostalCodes(initialData.address, initialData.city, initialData.county);
      }
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
  );
}
