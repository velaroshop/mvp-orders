"use client";

import { useState, useEffect } from "react";
import type { PartialOrder, OfferCode } from "@/lib/types";

interface ConfirmPartialOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ConfirmPartialData) => void;
  partialOrder: PartialOrder | null;
  isConfirming: boolean;
}

export interface ConfirmPartialData {
  fullName: string;
  phone: string;
  county: string;
  city: string;
  address: string;
  selectedOffer: OfferCode;
}

export default function ConfirmPartialOrderModal({
  isOpen,
  onClose,
  onConfirm,
  partialOrder,
  isConfirming,
}: ConfirmPartialOrderModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<OfferCode>("offer_1");
  const [duplicateInfo, setDuplicateInfo] = useState<{
    hasOrders: boolean;
    hasPartials: boolean;
    ordersCount: number;
    partialsCount: number;
    duplicateCheckDays: number;
  } | null>(null);
  const [errors, setErrors] = useState<{
    fullName?: string;
    phone?: string;
    county?: string;
    city?: string;
    address?: string;
  }>({});

  function validatePhone(phoneValue: string): string | undefined {
    const phoneDigits = phoneValue.replace(/\D/g, "");
    if (!phoneDigits) {
      return "Numărul de telefon este obligatoriu";
    } else if (phoneDigits.length !== 10) {
      return "Numărul de telefon trebuie să aibă 10 cifre";
    } else if (!phoneDigits.startsWith("07")) {
      return "Numărul de telefon trebuie să înceapă cu 07";
    }
    return undefined;
  }

  // Populate form with partial order data
  useEffect(() => {
    if (partialOrder && isOpen) {
      const phoneValue = partialOrder.phone || "";
      setFullName(partialOrder.fullName || "");
      setPhone(phoneValue);
      setCounty(partialOrder.county || "");
      setCity(partialOrder.city || "");
      setAddress(partialOrder.address || "");
      setSelectedOffer(partialOrder.offerCode || "offer_1");

      // Validate phone immediately when modal opens
      const phoneError = validatePhone(phoneValue);
      setErrors({
        phone: phoneError,
      });

      // Check for duplicate orders and partials
      if (partialOrder.id) {
        fetchDuplicateInfo(partialOrder.id);
      }
    }
  }, [partialOrder, isOpen]);

  async function fetchDuplicateInfo(partialId: string) {
    try {
      const response = await fetch(`/api/partial-orders/${partialId}/check-duplicates`);
      if (response.ok) {
        const data = await response.json();
        setDuplicateInfo(data);
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }
  }

  function validateForm(): boolean {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Numele este obligatoriu";
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    if (!county.trim()) {
      newErrors.county = "Județul este obligatoriu";
    }

    if (!city.trim()) {
      newErrors.city = "Orașul este obligatoriu";
    }

    if (!address.trim()) {
      newErrors.address = "Adresa este obligatorie";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handlePhoneChange(value: string) {
    setPhone(value);
    // Real-time validation
    const phoneError = validatePhone(value);
    setErrors(prev => ({
      ...prev,
      phone: phoneError,
    }));
  }

  function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    onConfirm({
      fullName: fullName.trim(),
      phone: phone.replace(/\D/g, ""), // Send only digits
      county: county.trim(),
      city: city.trim(),
      address: address.trim(),
      selectedOffer,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-zinc-700 p-6">
          <h2 className="text-xl font-bold text-white">Partial Confirm</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information
            </h3>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-3 py-2 bg-zinc-800 border ${
                    errors.fullName ? "border-red-500" : "border-zinc-700"
                  } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="Aura Marin"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full px-3 py-2 bg-zinc-800 border ${
                    errors.phone ? "border-red-500" : "border-zinc-700"
                  } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="0712345678"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Duplicate Warnings */}
          {duplicateInfo && (duplicateInfo.hasOrders || duplicateInfo.hasPartials) && (
            <div className="space-y-3">
              {duplicateInfo.hasOrders && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-md">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">
                      Customer already has {duplicateInfo.ordersCount} order(s) in the last {duplicateInfo.duplicateCheckDays} days!
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(`/admin/customers?phone=${phone}`, '_blank')}
                      className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                    >
                      View customer orders →
                    </button>
                  </div>
                </div>
              )}

              {duplicateInfo.hasPartials && (
                <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-md">
                  <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-400">
                      {duplicateInfo.partialsCount} other partial order(s) with this phone number
                    </p>
                    <p className="mt-1 text-xs text-orange-300/70">
                      Check for potential duplicates before confirming
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shipping Address */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Shipping Address
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* County */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  County
                </label>
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className={`w-full px-3 py-2 bg-zinc-800 border ${
                    errors.county ? "border-red-500" : "border-zinc-700"
                  } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="Dambovita"
                />
                {errors.county && (
                  <p className="mt-1 text-sm text-red-400">{errors.county}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`w-full px-3 py-2 bg-zinc-800 border ${
                    errors.city ? "border-red-500" : "border-zinc-700"
                  } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="Sateni"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                )}
              </div>
            </div>

            {/* Street */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Street
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full px-3 py-2 bg-zinc-800 border ${
                  errors.address ? "border-red-500" : "border-zinc-700"
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                placeholder="Cerchez nr 4"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-400">{errors.address}</p>
              )}
            </div>
          </div>

          {/* Vendable (Product) */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Vendable</h3>
            <div className="bg-zinc-800 rounded-md p-4">
              <div className="text-white font-medium">
                {partialOrder?.productName || "—"}
              </div>
              {partialOrder?.productSku && (
                <div className="text-orange-400 text-sm mt-1">
                  {partialOrder.productSku}
                </div>
              )}
            </div>
          </div>

          {/* Quantity Display */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Quantity</h3>
            <div className="bg-zinc-800 rounded-md p-4">
              <div className="text-white font-medium">
                {partialOrder?.productQuantity ? (
                  `${partialOrder.productQuantity} bucăți`
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-700 p-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isConfirming}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isConfirming ? "Confirming..." : "Save & Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
