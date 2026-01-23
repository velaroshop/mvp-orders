"use client";

import { useState, useEffect } from "react";
import type { Order } from "@/lib/types";
interface PostalCodeResult {
  postal_code: string;
  county: string;
  city: string;
  street_type: string;
  street_name: string;
  number: string;
  sector?: string;
  full_address: string;
  confidence: number;
  scores: {
    county: number;
    city: number;
    street: number;
  };
}
import { sanitizeStreet } from "@/lib/sanitizeStreet";

interface ConfirmOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updatedOrder: Partial<Order> & { streetNumber?: string }) => Promise<void>;
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
    streetNumber: "",
    postalCode: "",
    scheduledDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postalCodes, setPostalCodes] = useState<PostalCodeResult[]>([]);
  const [isLoadingPostalCodes, setIsLoadingPostalCodes] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Funcție pentru căutarea codurilor poștale
  async function searchPostalCodes(street?: string, city?: string, county?: string) {
    const searchStreet = street || formData.address;
    const searchCity = city || formData.city;
    const searchCounty = county || formData.county;

    if (!searchCity || !searchCounty) {
      setPostalCodeError("Completează orașul și județul pentru a căuta coduri poștale");
      return;
    }

    setIsLoadingPostalCodes(true);
    setPostalCodeError(null);

    try {
      const response = await fetch('/api/postal-code-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          county: searchCounty,
          city: searchCity,
          street: searchStreet || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search postal codes");
      }

      const data = await response.json();
      setPostalCodes(data.results || []);

      if (data.results && data.results.length === 0) {
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

  // Funcție pentru a elimina diacriticele din text
  function removeDiacritics(text: string): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ş/g, 's')
      .replace(/ș/g, 's')
      .replace(/ţ/g, 't')
      .replace(/ț/g, 't')
      .replace(/ă/g, 'a')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/Ş/g, 'S')
      .replace(/Ș/g, 'S')
      .replace(/Ţ/g, 'T')
      .replace(/Ț/g, 'T')
      .replace(/Ă/g, 'A')
      .replace(/Â/g, 'A')
      .replace(/Î/g, 'I');
  }

  // Funcție pentru selectarea unui cod poștal
  // Populează automat și județul și localitatea (fără diacritice)
  function selectPostalCode(result: PostalCodeResult) {
    setFormData((prev) => ({
      ...prev,
      postalCode: result.postal_code,
      county: removeDiacritics(result.county),
      city: removeDiacritics(result.city),
    }));
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
            streetNumber: "",
            postalCode: currentOrder.postalCode || "",
            scheduledDate: "",
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
              streetNumber: "",
              postalCode: postalCode,
              scheduledDate: "",
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
              streetNumber: "",
              postalCode: currentOrder.postalCode || "",
              scheduledDate: "",
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
            streetNumber: "",
            postalCode: currentOrder.postalCode || "",
            scheduledDate: "",
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
      const updatedOrder: Partial<Order> & { streetNumber?: string } = {
        fullName: formData.fullName,
        phone: formData.phone,
        county: formData.county,
        city: formData.city,
        address: formData.address,
        streetNumber: formData.streetNumber,
        postalCode: formData.postalCode,
        scheduledDate: formData.scheduledDate || undefined,
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
        <div className="sticky top-0 bg-zinc-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-zinc-700/50">
          <h2 className="text-base font-semibold">ORDER CONFIRM</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Personal Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">👤</span>
                <h3 className="text-sm font-semibold text-white">
                  Personal Information
                </h3>
              </div>

              {/* Full Name & Phone on same line */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-0.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-0.5">
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
                      className={`w-full rounded-md border bg-zinc-800 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 pr-9 ${
                        formData.phone.length === 0
                          ? 'border-zinc-700 focus:ring-emerald-500'
                          : formData.phone.length === 10 && formData.phone.startsWith('07')
                          ? 'border-emerald-500 focus:ring-emerald-500'
                          : 'border-red-500 focus:ring-red-500'
                      }`}
                      placeholder="07XXXXXXXX"
                    />
                    {formData.phone.length > 0 && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        {formData.phone.length === 10 && formData.phone.startsWith('07') ? (
                          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div className="mt-3 pt-3 border-t border-zinc-700/50">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Scheduling
                </h3>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-0.5">
                    Scheduled Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledDate: e.target.value })
                    }
                    min={(() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return tomorrow.toISOString().split('T')[0];
                    })()}
                    max={(() => {
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + 10);
                      return maxDate.toISOString().split('T')[0];
                    })()}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Leave empty to confirm immediately (max 10 days ahead)
                  </p>
                </div>
              </div>

              {/* Order Summary - moved to left column */}
              <div className="mt-3 pt-3 border-t border-zinc-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">📄</span>
                  <h4 className="text-xs font-semibold text-white">
                    Order Summary
                  </h4>
                </div>
                <div className="bg-zinc-800 rounded-lg p-2">
                  {/* Main Product */}
                  <div className="pb-2 border-b border-zinc-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium mb-0.5 truncate">
                          {order.productName || 'Produs'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          SKU: {order.productSku || 'N/A'} | Qty: {order.productQuantity || 1}
                        </p>
                      </div>
                      <p className="text-xs text-white font-medium ml-2">
                        {order.subtotal.toFixed(2)} RON
                      </p>
                    </div>
                  </div>

                  {/* Upsells - compact single column */}
                  {order.upsells && order.upsells.length > 0 && (
                    <div className="py-2 border-b border-zinc-700 space-y-1.5">
                      {order.upsells.filter((u: any) => u.type === 'presale').length > 0 && (
                        <div>
                          <p className="text-xs text-emerald-400 font-semibold mb-1">PRE-SALE</p>
                          <div className="space-y-0.5">
                            {order.upsells.filter((u: any) => u.type === 'presale').map((upsell: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-zinc-300 flex-1 pr-2 truncate">{upsell.title || upsell.name} x{upsell.quantity || 1}</span>
                                <span className="text-white whitespace-nowrap">{((upsell.price || 0) * (upsell.quantity || 1)).toFixed(2)} RON</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {order.upsells.filter((u: any) => u.type === 'postsale').length > 0 && (
                        <div>
                          <p className="text-xs text-purple-400 font-semibold mb-1">POST-SALE</p>
                          <div className="space-y-0.5">
                            {order.upsells.filter((u: any) => u.type === 'postsale').map((upsell: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-zinc-300 flex-1 pr-2 truncate">{upsell.title || upsell.name} x{upsell.quantity || 1}</span>
                                <span className="text-white whitespace-nowrap">{((upsell.price || 0) * (upsell.quantity || 1)).toFixed(2)} RON</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center text-white font-semibold mb-1">
                      <span className="text-xs">Subtotal + Shipping</span>
                      <span className="text-xs">
                        {(() => {
                          const productSubtotal = order.subtotal || 0;
                          const shipping = order.shippingCost || 0;
                          const upsellsTotal = order.upsells?.reduce((sum: number, upsell: any) => {
                            return sum + ((upsell.price || 0) * (upsell.quantity || 1));
                          }, 0) || 0;
                          return `${(productSubtotal + upsellsTotal).toFixed(2)} + ${shipping.toFixed(2)} RON`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white font-bold">
                      <span className="text-sm">TOTAL</span>
                      <span className="text-base">
                        {(() => {
                          const productSubtotal = order.subtotal || 0;
                          const shipping = order.shippingCost || 0;
                          const upsellsTotal = order.upsells?.reduce((sum: number, upsell: any) => {
                            return sum + ((upsell.price || 0) * (upsell.quantity || 1));
                          }, 0) || 0;
                          const total = productSubtotal + shipping + upsellsTotal;
                          return `${total.toFixed(2)} RON`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Shipping Address */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📍</span>
                  <h3 className="text-sm font-semibold text-white">
                    Shipping Address
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const result = sanitizeStreet(formData.address);
                    setFormData((prev) => ({ ...prev, address: result.street, streetNumber: result.number }));
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Clean & Autofill
                </button>
              </div>

              {/* County & City on same line */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-0.5">
                    County
                  </label>
                  <input
                    type="text"
                    value={formData.county}
                    onChange={(e) =>
                      setFormData({ ...formData, county: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="County"
                  />
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    Initial: {order.county || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-0.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="City"
                  />
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    Initial: {order.city || '-'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-0.5">
                  Street
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Street"
                  />
                  <input
                    type="text"
                    value={formData.streetNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, streetNumber: e.target.value })
                    }
                    className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Number"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Initial street: {order.address}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-0.5">
                  Post Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  readOnly
                  className="w-full rounded-md border border-zinc-700 bg-zinc-700/50 px-2.5 py-1.5 text-sm text-white cursor-not-allowed"
                  placeholder="Selectează din sugestii"
                />

                {/* Recommended postal codes */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1.5">
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
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {postalCodes.map((result, index) => {
                        const confidencePercent = (result.confidence * 100).toFixed(0);
                        const confidenceColor = result.confidence >= 0.9
                          ? 'text-emerald-400'
                          : result.confidence >= 0.7
                          ? 'text-amber-400'
                          : 'text-orange-400';
                        const icon = result.confidence >= 0.9
                          ? '✓'
                          : result.confidence >= 0.7
                          ? '⚠'
                          : '?';
                        const isTopResult = index === 0;
                        const isSelected = formData.postalCode === result.postal_code;

                        return (
                          <div
                            key={`${result.postal_code}-${index}`}
                            className={`p-2 border rounded-md cursor-pointer transition-all ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : isTopResult
                                ? 'border-blue-500/50 bg-blue-500/5 hover:border-blue-400 hover:bg-blue-500/10'
                                : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/30'
                            }`}
                            onClick={() => selectPostalCode(result)}
                          >
                            <div className="flex items-center gap-2">
                              {isTopResult && !isSelected && (
                                <span className="text-xs font-medium text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                                  TOP
                                </span>
                              )}
                              <span className="text-sm font-bold text-white">
                                {result.postal_code}
                              </span>
                              <span className="text-xs text-zinc-500">—</span>
                              <span className="text-xs text-zinc-300 flex-1 truncate">
                                {result.full_address}
                              </span>
                              <span className={`text-xs font-medium ${confidenceColor} shrink-0`}>
                                {icon} {confidencePercent}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
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
                   <div className="mt-3 p-2 bg-red-900/20 border border-red-700 rounded-md">
                     <p className="text-xs text-red-400 font-medium">Eroare</p>
                     <p className="text-xs text-red-300 mt-0.5">{submitError}</p>
                   </div>
                 )}

                 {/* Footer Buttons */}
                 <div className="mt-4 flex justify-end gap-2">
                   <button
                     type="button"
                     onClick={onClose}
                     className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white"
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     disabled={isSubmitting}
                     className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                   >
                     {isSubmitting ? "Se salvează..." : "Save & Send"}
                   </button>
                 </div>
        </form>
      </div>
    </div>
  );
}
