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

interface QuantityOption {
  code: OfferCode;
  quantity: number;
  price: number;
  label: string;
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
  const [quantityOptions, setQuantityOptions] = useState<QuantityOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
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

      // Fetch landing page data for quantity options
      fetchQuantityOptions(partialOrder.landingKey);
    }
  }, [partialOrder, isOpen]);

  async function fetchQuantityOptions(landingKey: string) {
    try {
      setIsLoadingOptions(true);
      console.log("Fetching landing page data for:", landingKey);
      const response = await fetch(`/api/landing-pages/public/${landingKey}`);

      if (!response.ok) {
        console.error("Failed to fetch landing page:", response.status, response.statusText);
        throw new Error("Failed to fetch landing page data");
      }

      const data = await response.json();
      console.log("Landing page data:", data);
      const lp = data.landingPage;

      const options: QuantityOption[] = [];

      if (lp.quantity_offer_1 && lp.price_offer_1) {
        options.push({
          code: "offer_1",
          quantity: lp.quantity_offer_1,
          price: lp.price_offer_1,
          label: `${lp.quantity_offer_1}x - ${lp.price_offer_1} RON`,
        });
      }

      if (lp.quantity_offer_2 && lp.price_offer_2) {
        options.push({
          code: "offer_2",
          quantity: lp.quantity_offer_2,
          price: lp.price_offer_2,
          label: `${lp.quantity_offer_2}x - ${lp.price_offer_2} RON`,
        });
      }

      if (lp.quantity_offer_3 && lp.price_offer_3) {
        options.push({
          code: "offer_3",
          quantity: lp.quantity_offer_3,
          price: lp.price_offer_3,
          label: `${lp.quantity_offer_3}x - ${lp.price_offer_3} RON`,
        });
      }

      console.log("Quantity options built:", options);
      setQuantityOptions(options);
    } catch (error) {
      console.error("Error fetching quantity options:", error);
    } finally {
      setIsLoadingOptions(false);
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

          {/* Quantity Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Quantity
            </label>
            {isLoadingOptions ? (
              <div className="text-zinc-400 text-sm">Loading options...</div>
            ) : quantityOptions.length === 0 ? (
              <div className="text-red-400 text-sm">No quantity options available</div>
            ) : (
              <div className="flex gap-2">
                {quantityOptions.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => setSelectedOffer(option.code)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedOffer === option.code
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
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
