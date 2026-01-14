"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { OfferCode } from "@/lib/types";

export const dynamic = 'force-dynamic';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  srp: number;
  price_1: number;
  price_2: number;
  price_3: number;
  shipping_price: number;
  offer_heading_1: string;
  offer_heading_2: string;
  offer_heading_3: string;
  numeral_1: string;
  numeral_2: string;
  numeral_3: string;
  order_button_text: string;
  products?: {
    id: string;
    name: string;
    sku?: string;
  };
}

function WidgetFormContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<OfferCode>("offer_1");

  useEffect(() => {
    if (slug) {
      fetchLandingPage();
    } else {
      setError("Slug parameter is required");
      setLoading(false);
    }
  }, [slug]);

  async function fetchLandingPage() {
    try {
      setLoading(true);
      const response = await fetch(`/api/landing-pages/public/${slug}`);
      
      if (!response.ok) {
        throw new Error("Landing page not found");
      }

      const data = await response.json();
      setLandingPage(data.landingPage);
    } catch (err) {
      console.error("Error fetching landing page:", err);
      setError(err instanceof Error ? err.message : "Failed to load form");
    } finally {
      setLoading(false);
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "");
    
    if (digitsOnly.length > 0 && digitsOnly[0] !== "0") {
      const withZero = "0" + digitsOnly;
      const limited = withZero.slice(0, 10);
      setPhone(limited);
    } else {
      const limited = digitsOnly.slice(0, 10);
      setPhone(limited);
    }
  }

  function getCurrentPrice() {
    if (!landingPage) return 0;
    switch (selectedOffer) {
      case "offer_1":
        return landingPage.price_1;
      case "offer_2":
        return landingPage.price_2;
      case "offer_3":
        return landingPage.price_3;
      default:
        return landingPage.price_1;
    }
  }

  function getTotalPrice() {
    return getCurrentPrice() + (landingPage?.shipping_price || 0);
  }

  function calculateDiscount() {
    if (!landingPage) return 0;
    const currentPrice = getCurrentPrice();
    const discount = ((landingPage.srp - currentPrice) / landingPage.srp) * 100;
    return Math.round(discount);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!landingPage) return;

    setSubmitting(true);
    setError(null);

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length === 0) {
      setError("Numărul de telefon este obligatoriu.");
      setSubmitting(false);
      return;
    }
    if (phoneDigits[0] !== "0") {
      setError("Numărul de telefon trebuie să înceapă cu 0.");
      setSubmitting(false);
      return;
    }
    if (phoneDigits.length !== 10) {
      setError("Numărul de telefon trebuie să aibă exact 10 cifre.");
      setSubmitting(false);
      return;
    }

    const payload = {
      landingKey: landingPage.slug,
      offerCode: selectedOffer,
      phone: phoneDigits,
      fullName: fullName.trim(),
      county: county.trim(),
      city: city.trim(),
      address: address.trim(),
      upsells: [],
      subtotal: getCurrentPrice(),
      shippingCost: landingPage.shipping_price,
      total: getTotalPrice(),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Nu s-a putut trimite comanda.");
      }

      setSuccess(true);
      // Reset form
      setPhone("");
      setFullName("");
      setCounty("");
      setCity("");
      setAddress("");
      setSelectedOffer("offer_1");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "A apărut o eroare neașteptată. Încearcă din nou.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Se încarcă formularul...</p>
        </div>
      </div>
    );
  }

  if (error && !landingPage) {
    return (
      <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <p className="text-red-600 text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!landingPage) {
    return null;
  }

  if (success) {
    return (
      <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-2">Comandă plasată cu succes!</h2>
          <p className="text-sm sm:text-base text-zinc-600">Vă vom contacta în curând pentru confirmarea comenzii.</p>
        </div>
      </div>
    );
  }

  const currentPrice = getCurrentPrice();
  const totalPrice = getTotalPrice();
  const discount = calculateDiscount();

  return (
    <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Price Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="text-center mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">
                Preț: {currentPrice.toFixed(2)} Lei
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <span className="text-lg sm:text-xl text-zinc-400 line-through">
                {landingPage.srp.toFixed(2)} Lei
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                REDUCERE {discount}%
              </span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-xs sm:text-sm text-zinc-700 break-words">LIVRARE ÎN 2-3 ZILE</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs sm:text-sm text-zinc-700 break-words">PLATĂ CASH LA LIVRARE</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-xs sm:text-sm text-zinc-700 break-words">ASIGURARE COLET</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs sm:text-sm text-zinc-700 break-words">DREPT DE RETUR 14 ZILE</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-xs sm:text-sm text-zinc-700 break-words">CALITATE GARANTATĂ</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-xs sm:text-sm text-zinc-700 break-words">PREȚ REDUS CU {discount}%</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Delivery Information */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-3 sm:mb-4">
              Introduceți datele de livrare
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Număr Telefon*
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Necesar pentru a intră în legătură cu curierul"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base text-zinc-900 placeholder:text-zinc-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Nume și Prenume*
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Introduceți numele dvs. complet"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base text-zinc-900 placeholder:text-zinc-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-1">
                    Județ*
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="Introduceți județul"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base text-zinc-900 placeholder:text-zinc-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-1">
                    Localitate, comună sau sat*
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Introduceți localitatea / comuna / satul"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base text-zinc-900 placeholder:text-zinc-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Stradă, număr, bloc, scară, ap.*
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Introduceți adresa"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base text-zinc-900 placeholder:text-zinc-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-3 sm:mb-4">
              Selectați cantitatea
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setSelectedOffer("offer_1")}
                className={`p-3 sm:p-4 border-2 rounded-lg transition-all ${
                  selectedOffer === "offer_1"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="text-xs font-semibold text-zinc-600 uppercase mb-2">
                  {landingPage.offer_heading_1}
                </div>
                <div className="text-lg font-bold text-zinc-900 mb-1">
                  {landingPage.numeral_1}
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-600">
                  {landingPage.price_1.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_1" && (
                  <div className="mt-2 text-xs text-emerald-600 font-medium">
                    ✓ Selectat
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOffer("offer_2")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedOffer === "offer_2"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="text-xs font-semibold text-zinc-600 uppercase mb-2">
                  {landingPage.offer_heading_2}
                </div>
                <div className="text-lg font-bold text-zinc-900 mb-1">
                  {landingPage.numeral_2}
                </div>
                <div className="text-xl font-bold text-emerald-600">
                  {landingPage.price_2.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_2" && (
                  <div className="mt-2 text-xs text-emerald-600 font-medium">
                    ✓ Selectat
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOffer("offer_3")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedOffer === "offer_3"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="text-xs font-semibold text-zinc-600 uppercase mb-2">
                  {landingPage.offer_heading_3}
                </div>
                <div className="text-lg font-bold text-zinc-900 mb-1">
                  {landingPage.numeral_3}
                </div>
                <div className="text-xl font-bold text-emerald-600">
                  {landingPage.price_3.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_3" && (
                  <div className="mt-2 text-xs text-emerald-600 font-medium">
                    ✓ Selectat
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-3 sm:mb-4">
              Selectați metoda de livrare
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 sm:p-4 border border-zinc-200 rounded-lg">
              <div>
                <div className="font-medium text-sm sm:text-base text-zinc-900">Livrare Standard - GLS</div>
                <div className="text-xs sm:text-sm text-zinc-600">2-3 zile lucrătoare</div>
              </div>
              <div className="text-base sm:text-lg font-bold text-zinc-900">
                {landingPage.shipping_price.toFixed(2)} Lei
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-3 sm:mb-4">
              Rezumatul comenzii
            </h2>
            <div className="space-y-2 mb-3 sm:mb-4">
              <div className="flex justify-between text-sm sm:text-base text-zinc-700">
                <span className="break-words pr-2">• {landingPage.numeral_1}</span>
                <span className="whitespace-nowrap">{currentPrice.toFixed(2)} Lei</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base text-zinc-700">
                <span className="break-words pr-2">• Livrare Standard - GLS</span>
                <span className="whitespace-nowrap">{landingPage.shipping_price.toFixed(2)} Lei</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base text-zinc-700">
                <span className="break-words pr-2">• Oferte speciale</span>
                <span className="whitespace-nowrap">0.00 Lei</span>
              </div>
            </div>
            <div className="pt-3 sm:pt-4 border-t border-zinc-200">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-base sm:text-lg font-bold text-zinc-900">PREȚ TOTAL</span>
                <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {totalPrice.toFixed(2)} LEI
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-base sm:text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? "Se procesează..." : landingPage.order_button_text}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function WidgetFormPage() {
  return (
    <Suspense fallback={
      <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Se încarcă formularul...</p>
        </div>
      </div>
    }>
      <WidgetFormContent />
    </Suspense>
  );
}
