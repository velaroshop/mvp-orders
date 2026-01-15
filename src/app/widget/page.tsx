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
  stores?: {
    id: string;
    url: string;
    primary_color: string;
    accent_color: string;
    background_color: string;
    text_on_dark_color: string;
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
  
  // Error states for validation
  const [errors, setErrors] = useState<{
    phone?: string;
    fullName?: string;
    county?: string;
    city?: string;
    address?: string;
  }>({});

  useEffect(() => {
    if (slug) {
      fetchLandingPage();
    } else {
      setError("Slug parameter is required");
      setLoading(false);
    }
  }, [slug]);

  // Send height to parent window if in iframe
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sendHeight = () => {
      try {
        if (window.parent && window.parent !== window) {
          const height = document.documentElement.scrollHeight;
          window.parent.postMessage(
            { type: 'velaro-widget-height', height },
            '*' // Consider restricting to specific origin in production
          );
        }
      } catch (error) {
        // Silently fail if cross-origin restrictions prevent communication
        console.debug('Could not send height to parent:', error);
      }
    };

    // Send height on initial render and when content changes
    sendHeight();
    
    // Send height on resize
    window.addEventListener('resize', sendHeight);
    
    // Send height after a delay to account for dynamic content
    const timeout = setTimeout(sendHeight, 100);
    const interval = setInterval(sendHeight, 500);

    return () => {
      window.removeEventListener('resize', sendHeight);
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [loading, success, landingPage, selectedOffer, phone, fullName, county, city, address]);

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

  function calculateSavings() {
    if (!landingPage) return 0;
    const currentPrice = getCurrentPrice();
    return landingPage.srp - currentPrice;
  }

  // Validation function
  function validateField(fieldName: string, value: string): string | undefined {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      switch (fieldName) {
        case "phone":
          return "Introduceți numărul de telefon";
        case "fullName":
          return "Introduceți numele complet";
        case "county":
          return "Introduceți județul";
        case "city":
          return "Introduceți localitatea";
        case "address":
          return "Introduceți adresa";
        default:
          return "Acest câmp este obligatoriu";
      }
    }
    return undefined;
  }

  // Handle field blur for validation
  function handleFieldBlur(fieldName: string, value: string) {
    const error = validateField(fieldName, value);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!landingPage) return;

    // Validate all fields
    const phoneDigits = phone.replace(/\D/g, "");
    const newErrors: typeof errors = {};
    
    if (!phoneDigits) {
      newErrors.phone = "Introduceți numărul de telefon";
    }
    if (!fullName.trim()) {
      newErrors.fullName = "Introduceți numele complet";
    }
    if (!county.trim()) {
      newErrors.county = "Introduceți județul";
    }
    if (!city.trim()) {
      newErrors.city = "Introduceți localitatea";
    }
    if (!address.trim()) {
      newErrors.address = "Introduceți adresa";
    }

    // If there are errors, set them and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setError(null);
    setErrors({});

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

  // Get colors from store with fallback to defaults
  const storeColors = landingPage.stores;
  const backgroundColor = storeColors?.background_color || "#000000";
  const accentColor = storeColors?.accent_color || "#10b981"; // emerald-600
  const primaryColor = storeColors?.primary_color || "#10b981"; // emerald-600 fallback
  const textOnDarkColor = storeColors?.text_on_dark_color || "#FFFFFF";
  
  // Helper function to create lighter variant of accent color for selected states
  const getAccentLightColor = (color: string) => {
    // Simple approach: add opacity or use a lighter variant
    // For now, we'll use a CSS variable approach or inline style
    return color;
  };

  return (
    <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Price Header */}
        <div className="rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6" style={{ backgroundColor }}>
          <div className="text-center mb-4 sm:mb-6">
            {/* Product Name */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4" style={{ color: textOnDarkColor }}>
              {landingPage.products?.name || landingPage.name}
            </h1>
            
            {/* Price */}
            <div className="mb-3">
              <div className="text-sm sm:text-base mb-1" style={{ color: textOnDarkColor, opacity: 0.8 }}>Preț:</div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: textOnDarkColor }}>
                {landingPage.price_1.toFixed(2)} Lei
              </span>
            </div>
            
            {/* Original Price - More Visible */}
            <div className="mb-3">
              <div className="text-sm sm:text-base mb-1" style={{ color: textOnDarkColor, opacity: 0.8 }}>Preț întreg:</div>
              <span className="text-xl sm:text-2xl md:text-3xl font-bold line-through decoration-2" style={{ color: textOnDarkColor, opacity: 0.6, textDecorationColor: textOnDarkColor }}>
                {landingPage.srp.toFixed(2)} Lei
              </span>
            </div>
            
            {/* Discount Badge */}
            <div className="flex justify-center">
              <span className="px-4 py-2 text-white rounded-full text-base sm:text-lg font-bold whitespace-nowrap shadow-lg" style={{ backgroundColor: accentColor }}>
                REDUCERE {discount}%
              </span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: accentColor }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-xs sm:text-sm break-words" style={{ color: textOnDarkColor, opacity: 0.8 }}>LIVRARE ÎN 1-3 ZILE</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: accentColor }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs sm:text-sm break-words" style={{ color: textOnDarkColor, opacity: 0.8 }}>PLATĂ LA LIVRARE</span>
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
                  onChange={(e) => {
                    handlePhoneChange(e);
                    // Clear error when user starts typing
                    if (errors.phone) {
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="Necesar pentru a intră în legătură cu curierul"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 text-base text-zinc-900 placeholder:text-zinc-500 ${
                    errors.phone 
                      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                      : 'border-zinc-300'
                  }`}
                  style={errors.phone ? {} : { 
                    '--tw-ring-color': accentColor 
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                  onFocus={(e) => {
                    if (!errors.phone) {
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = '';
                    handleFieldBlur("phone", phone);
                  }}
                  required
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Nume și Prenume*
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    // Clear error when user starts typing
                    if (errors.fullName) {
                      setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  placeholder="Introduceți numele dvs. complet"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 text-base text-zinc-900 placeholder:text-zinc-500 ${
                    errors.fullName 
                      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                      : 'border-zinc-300'
                  }`}
                  style={errors.fullName ? {} : { 
                    '--tw-ring-color': accentColor 
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                  onFocus={(e) => {
                    if (!errors.fullName) {
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = '';
                    handleFieldBlur("fullName", fullName);
                  }}
                  required
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-1">
                    Județ*
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => {
                      setCounty(e.target.value);
                      // Clear error when user starts typing
                      if (errors.county) {
                        setErrors((prev) => ({ ...prev, county: undefined }));
                      }
                    }}
                    placeholder="Introduceți județul"
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 text-base text-zinc-900 placeholder:text-zinc-500 ${
                      errors.county 
                        ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                        : 'border-zinc-300'
                    }`}
                    style={errors.county ? {} : { 
                      '--tw-ring-color': accentColor 
                    } as React.CSSProperties & { '--tw-ring-color': string }}
                    onFocus={(e) => {
                      if (!errors.county) {
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = '';
                      handleFieldBlur("county", county);
                    }}
                    required
                  />
                  {errors.county && (
                    <p className="mt-1 text-sm text-red-600">{errors.county}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-1">
                    Localitate, comună sau sat*
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      // Clear error when user starts typing
                      if (errors.city) {
                        setErrors((prev) => ({ ...prev, city: undefined }));
                      }
                    }}
                    placeholder="Introduceți localitatea / comuna / satul"
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 text-base text-zinc-900 placeholder:text-zinc-500 ${
                      errors.city 
                        ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                        : 'border-zinc-300'
                    }`}
                    style={errors.city ? {} : { 
                      '--tw-ring-color': accentColor 
                    } as React.CSSProperties & { '--tw-ring-color': string }}
                    onFocus={(e) => {
                      if (!errors.city) {
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = '';
                      handleFieldBlur("city", city);
                    }}
                    required
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Stradă, număr, bloc, scară, ap.*
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    // Clear error when user starts typing
                    if (errors.address) {
                      setErrors((prev) => ({ ...prev, address: undefined }));
                    }
                  }}
                  placeholder="Introduceți adresa"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 text-base text-zinc-900 placeholder:text-zinc-500 ${
                    errors.address 
                      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                      : 'border-zinc-300'
                  }`}
                  style={errors.address ? {} : { 
                    '--tw-ring-color': accentColor 
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                  onFocus={(e) => {
                    if (!errors.address) {
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = '';
                    handleFieldBlur("address", address);
                  }}
                  required
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
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
                className={`p-2.5 sm:p-3 border-2 rounded-lg transition-all ${
                  selectedOffer === "offer_1"
                    ? ""
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                style={selectedOffer === "offer_1" ? {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}15` // 15 = ~8% opacity
                } : {}}
              >
                <div className="text-xs font-bold text-white uppercase mb-2 px-2 py-1 rounded inline-block" style={{ backgroundColor: backgroundColor, opacity: 0.7 }}>
                  {landingPage.offer_heading_1}
                </div>
                <div className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
                  {landingPage.numeral_1}
                </div>
                <div className="text-base sm:text-lg font-bold" style={{ color: accentColor }}>
                  {landingPage.price_1.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_1" && (
                  <div className="mt-2 text-xs font-medium" style={{ color: accentColor }}>
                    ✓ Selectat
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOffer("offer_2")}
                className={`p-2.5 sm:p-3 border-2 rounded-lg transition-all ${
                  selectedOffer === "offer_2"
                    ? ""
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                style={selectedOffer === "offer_2" ? {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}15` // 15 = ~8% opacity
                } : {}}
              >
                <div className="text-sm font-bold text-white uppercase mb-2 px-3 py-1.5 rounded inline-block" style={{ backgroundColor: backgroundColor, opacity: 0.8 }}>
                  {landingPage.offer_heading_2}
                </div>
                <div className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
                  {landingPage.numeral_2}
                </div>
                <div className="text-base sm:text-lg font-bold" style={{ color: accentColor }}>
                  {landingPage.price_2.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_2" && (
                  <div className="mt-2 text-xs font-medium" style={{ color: accentColor }}>
                    ✓ Selectat
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOffer("offer_3")}
                className={`p-2.5 sm:p-3 border-2 rounded-lg transition-all ${
                  selectedOffer === "offer_3"
                    ? ""
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                style={selectedOffer === "offer_3" ? {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}15` // 15 = ~8% opacity
                } : {}}
              >
                <div className="text-base font-bold text-white uppercase mb-2 px-4 py-2 rounded inline-block" style={{ backgroundColor: backgroundColor }}>
                  {landingPage.offer_heading_3}
                </div>
                <div className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
                  {landingPage.numeral_3}
                </div>
                <div className="text-base sm:text-lg font-bold" style={{ color: accentColor }}>
                  {landingPage.price_3.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_3" && (
                  <div className="mt-2 text-xs font-medium" style={{ color: accentColor }}>
                    ✓ Selectat
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 sm:p-4 border border-zinc-200 rounded-lg">
              <div>
                <div className="font-medium text-sm sm:text-base text-zinc-900">Livrare Standard - Curier rapid (1-3 zile lucrătoare)</div>
              </div>
              <div className="text-base sm:text-lg font-bold text-zinc-900">
                {landingPage.shipping_price.toFixed(2)} Lei
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg shadow-lg p-4 sm:p-6" style={{ backgroundColor }}>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4" style={{ color: textOnDarkColor }}>
              Rezumatul comenzii
            </h2>
            <div className="space-y-2 mb-3 sm:mb-4">
              <div className="flex justify-between text-sm sm:text-base" style={{ color: textOnDarkColor, opacity: 0.8 }}>
                <span className="break-words pr-2">• Preț produse:</span>
                <span className="whitespace-nowrap">{currentPrice.toFixed(2)} Lei</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base" style={{ color: textOnDarkColor, opacity: 0.8 }}>
                <span className="break-words pr-2">• Livrare Standard - Curier rapid</span>
                <span className="whitespace-nowrap">{landingPage.shipping_price.toFixed(2)} Lei</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base" style={{ color: textOnDarkColor, opacity: 0.8 }}>
                <span className="break-words pr-2">• Oferte speciale</span>
                <span className="whitespace-nowrap">0.00 Lei</span>
              </div>
            </div>
            <div className="pt-3 sm:pt-4 border-t" style={{ borderColor: `${textOnDarkColor}40` }}>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-base sm:text-lg font-bold" style={{ color: textOnDarkColor }}>PREȚ TOTAL</span>
                <span className="text-xl sm:text-2xl font-bold" style={{ color: accentColor }}>
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
          <div className="space-y-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full text-white font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-lg text-base sm:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 ${
                !submitting ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: primaryColor,
                ...(!submitting ? {
                  boxShadow: `0 0 0 0 ${primaryColor}B3`,
                  animation: 'pulse-button 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                } : {})
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  // Darken color on hover (reduce brightness by ~10%)
                  const rgb = primaryColor.match(/\d+/g);
                  if (rgb && rgb.length === 3) {
                    const r = Math.max(0, parseInt(rgb[0]) - 20);
                    const g = Math.max(0, parseInt(rgb[1]) - 20);
                    const b = Math.max(0, parseInt(rgb[2]) - 20);
                    e.currentTarget.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = primaryColor;
                }
              }}
            >
              {submitting ? "Se procesează..." : landingPage.order_button_text}
            </button>
            <p className="text-center text-xs sm:text-sm text-zinc-600 italic">
              cu reducere aplicată
            </p>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes pulse-button {
              0%, 100% {
                box-shadow: 0 0 0 0 ${primaryColor}B3, 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              }
              50% {
                box-shadow: 0 0 0 10px ${primaryColor}00, 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              }
            }
          `}} />
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
