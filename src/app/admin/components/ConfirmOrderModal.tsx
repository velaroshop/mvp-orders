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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 rounded-lg shadow-xl">
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
                <h3 className="text-lg font-semibold text-white">
                  Personal Information
                </h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      // Accept only digits and max 10 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: value });
                    }}
                    maxLength={10}
                    pattern="07[0-9]{8}"
                    className={`w-full rounded-md border bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 pr-10 ${
                      formData.phone.length === 0
                        ? 'border-zinc-700 focus:ring-emerald-500'
                        : formData.phone.length === 10 && formData.phone.startsWith('07')
                        ? 'border-emerald-500 focus:ring-emerald-500'
                        : 'border-red-500 focus:ring-red-500'
                    }`}
                    placeholder="07XXXXXXXX"
                  />
                  {formData.phone.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {formData.phone.length === 10 && formData.phone.startsWith('07') ? (
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                <p className={`text-xs mt-1 ${
                  formData.phone.length === 0
                    ? 'text-zinc-500'
                    : formData.phone.length === 10 && formData.phone.startsWith('07')
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}>
                  {formData.phone.length} digits
                </p>
              </div>

              {/* Shipping & Scheduling */}
              <div className="mt-6 pt-6 border-t border-zinc-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Shipping & Scheduling
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
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
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
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
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t border-zinc-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📄</span>
                  <h4 className="text-sm font-semibold text-white">
                    Order Summary
                  </h4>
                </div>
                <div className="space-y-3 bg-zinc-800 rounded-lg p-4">
                  {/* Main Product */}
                  <div className="pb-3 border-b border-zinc-700">
                    <p className="text-sm text-white font-medium mb-1">
                      {order.productName || 'Produs'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      SKU: {order.productSku || 'N/A'} | Qty: {order.productQuantity || 1}
                    </p>
                    <p className="text-sm text-white mt-2">
                      {order.subtotal.toFixed(2)} RON
                    </p>
                  </div>

                  {/* PRE-SALE Upsells */}
                  {order.upsells && order.upsells.filter((u: any) => u.type === 'presale').length > 0 && (
                    <div className="pb-3 border-b border-zinc-700">
                      <p className="text-xs text-emerald-400 font-semibold mb-2">PRE-SALE</p>
                      <div className="space-y-1">
                        {order.upsells.filter((u: any) => u.type === 'presale').map((upsell: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-zinc-300">{upsell.title || upsell.name} x{upsell.quantity || 1}</span>
                            <span className="text-white">{((upsell.price || 0) * (upsell.quantity || 1)).toFixed(2)} RON</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* POST-SALE Upsells */}
                  {order.upsells && order.upsells.filter((u: any) => u.type === 'postsale').length > 0 && (
                    <div className="pb-3 border-b border-zinc-700">
                      <p className="text-xs text-purple-400 font-semibold mb-2">POST-SALE</p>
                      <div className="space-y-1">
                        {order.upsells.filter((u: any) => u.type === 'postsale').map((upsell: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-zinc-300">{upsell.title || upsell.name} x{upsell.quantity || 1}</span>
                            <span className="text-white">{((upsell.price || 0) * (upsell.quantity || 1)).toFixed(2)} RON</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center text-white font-semibold">
                      <span>Total</span>
                      <span className="text-lg">{order.total.toFixed(2)} RON</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      including {order.shippingCost.toFixed(2)} RON shipping
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Shipping Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <h3 className="text-lg font-semibold text-white">
                    Shipping Address
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clean & Autofill
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  County
                </label>
                <input
                  type="text"
                  value={formData.county}
                  onChange={(e) =>
                    setFormData({ ...formData, county: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="County"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Street
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Street"
                  />
                  <input
                    type="text"
                    className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Number"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Initial street: {order.address}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Post Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => {
                    // Accept only digits and max 6 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, postalCode: value });
                  }}
                  maxLength={6}
                  pattern="[0-9]{1,6}"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="@ Post code (max 6 digits)"
                />
                
                {/* Recommended postal codes */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-zinc-300">
                      Recommended postal codes:
                    </label>
                    <button
                      type="button"
                      onClick={() => searchPostalCodes()}
                      disabled={isLoadingPostalCodes}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingPostalCodes ? "Loading..." : "Reload"}
                    </button>
                  </div>

                  {isLoadingPostalCodes && (
                    <p className="text-xs text-zinc-500">Căutare coduri poștale...</p>
                  )}

                  {postalCodeError && (
                    <p className="text-xs text-red-400">{postalCodeError}</p>
                  )}

                  {!isLoadingPostalCodes && postalCodes.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {postalCodes.map((result, index) => (
                        <div
                          key={`${result.postcode}-${index}`}
                          className="p-2 border border-zinc-700 rounded-md hover:bg-zinc-700/50 cursor-pointer transition-colors"
                          onClick={() => selectPostalCode(result.postcode)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">
                                {result.postcode}
                              </p>
                              <p className="text-xs text-zinc-400 mt-1">
                                {result.formatted}
                              </p>
                            </div>
                            {formData.postalCode === result.postcode && (
                              <span className="text-emerald-400 text-xs">✓</span>
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

            </div>
          </div>

                 {/* Error Message */}
                 {submitError && (
                   <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
                     <p className="text-sm text-red-400 font-medium">Eroare</p>
                     <p className="text-sm text-red-300 mt-1">{submitError}</p>
                   </div>
                 )}

                 {/* Footer Buttons */}
                 <div className="mt-6 flex justify-end gap-3">
                   <button
                     type="button"
                     onClick={onClose}
                     className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white"
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
