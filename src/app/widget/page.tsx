"use client";

import { FormEvent, useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { OfferCode } from "@/lib/types";
import {
  initFacebookPixel,
  trackPageView,
  trackViewContent,
  trackInitiateCheckout,
  trackPurchase,
} from "@/lib/facebook-pixel";

export const dynamic = 'force-dynamic';

interface Upsell {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  price: number;
  srp: number;
  media_url?: string;
  active: boolean;
  product?: {
    name: string;
    sku?: string;
    status?: string;
  };
}

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  thank_you_path?: string;
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
  post_purchase_status: boolean;
  fb_pixel_id?: string;
  client_side_tracking?: boolean;
  meta_test_mode?: boolean;
  meta_test_event_code?: string;
  products?: {
    id: string;
    name: string;
    sku?: string;
    status?: string;
  };
  stores?: {
    id: string;
    url: string;
    primary_color: string;
    accent_color: string;
    background_color: string;
    text_on_dark_color: string;
    thank_you_slug?: string;
    organization_id: string;
  };
}

function WidgetFormContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [presaleUpsells, setPresaleUpsells] = useState<Upsell[]>([]);
  const [postsaleUpsells, setPostsaleUpsells] = useState<Upsell[]>([]);
  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showPostsaleOffer, setShowPostsaleOffer] = useState(false);
  const [postsaleCountdown, setPostsaleCountdown] = useState(180);
  const [queueExpiresAt, setQueueExpiresAt] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [postsaleProcessing, setPostsaleProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [willShowPostsale, setWillShowPostsale] = useState(false);

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<OfferCode>("offer_1");

  // Partial order tracking
  const [partialOrderId, setPartialOrderId] = useState<string | null>(null);
  const [lastSaveTimeout, setLastSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Meta tracking data from URL params
  const [trackingData, setTrackingData] = useState<{
    fbclid?: string;
    fbp?: string;
    gclid?: string;
    ttclid?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    landing_url?: string;
  }>({});

  // Error states for validation
  const [errors, setErrors] = useState<{
    phone?: string;
    fullName?: string;
    county?: string;
    city?: string;
    address?: string;
  }>({});

  // Helper function to capitalize first letter of each word
  function toTitleCase(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  useEffect(() => {
    if (slug) {
      fetchLandingPage();
    } else {
      setError("Slug parameter is required");
      setLoading(false);
    }
  }, [slug]);

  // Initialize Facebook Pixel when landing page is loaded (only once)
  useEffect(() => {
    // Only initialize if tracking is enabled, pixel ID exists, and not already initialized
    if (landingPage?.client_side_tracking && landingPage?.fb_pixel_id) {
      // initFacebookPixel already has window.__fbPixelInitialized check inside it
      // Pass test event code if test mode is enabled
      const testEventCode = landingPage.meta_test_mode ? landingPage.meta_test_event_code : undefined;
      initFacebookPixel(landingPage.fb_pixel_id, testEventCode);
      trackPageView();

      // Track ViewContent with product info (use default offer_1 price for initial tracking)
      if (landingPage.products?.name) {
        trackViewContent({
          content_name: landingPage.products.name,
          content_ids: landingPage.products.sku ? [landingPage.products.sku] : undefined,
          content_type: 'product',
          value: landingPage.price_1, // Always use first offer price for ViewContent
          currency: 'RON',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingPage]);

  // Extract tracking parameters from URL on mount
  // First check iframe URL params (from embed.js), then fallback to parent page URL (document.referrer)
  useEffect(() => {
    const tracking: typeof trackingData = {};

    // Helper to get param from searchParams first, then from referrer URL as fallback
    const getParam = (name: string): string | null => {
      // First try from iframe URL (set by embed.js)
      const fromUrl = searchParams.get(name);
      if (fromUrl) return fromUrl;

      // Fallback: try to extract from parent page URL (document.referrer)
      // This handles cases where widget is embedded with hardcoded iframe without embed.js
      if (typeof window !== 'undefined' && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          return referrerUrl.searchParams.get(name);
        } catch {
          // Invalid referrer URL, ignore
        }
      }
      return null;
    };

    // Facebook tracking
    const fbclid = getParam('fbclid');
    if (fbclid) tracking.fbclid = fbclid;

    const fbp = getParam('fbp');
    if (fbp) tracking.fbp = fbp;

    // UTM parameters
    const utmSource = getParam('utm_source');
    if (utmSource) tracking.utm_source = utmSource;

    const utmMedium = getParam('utm_medium');
    if (utmMedium) tracking.utm_medium = utmMedium;

    const utmCampaign = getParam('utm_campaign');
    if (utmCampaign) tracking.utm_campaign = utmCampaign;

    const utmTerm = getParam('utm_term');
    if (utmTerm) tracking.utm_term = utmTerm;

    const utmContent = getParam('utm_content');
    if (utmContent) tracking.utm_content = utmContent;

    // Google Ads tracking
    const gclid = getParam('gclid');
    if (gclid) tracking.gclid = gclid;

    // TikTok tracking
    const ttclid = getParam('ttclid');
    if (ttclid) tracking.ttclid = ttclid;

    // Landing page URL - prefer referrer as it's the actual parent page URL
    const landingUrl = getParam('landing_url') || (typeof window !== 'undefined' ? document.referrer : null);
    if (landingUrl) tracking.landing_url = landingUrl;

    setTrackingData(tracking);
  }, [searchParams]);

  // Countdown timer for postsale offer - based on absolute timestamp
  useEffect(() => {
    if (!showPostsaleOffer || !queueExpiresAt) return;

    const calculateTimeRemaining = () => {
      const expiresAt = new Date(queueExpiresAt).getTime();
      const now = Date.now();
      const remaining = Math.floor((expiresAt - now) / 1000);
      return Math.max(0, remaining);
    };

    // Set initial countdown
    setPostsaleCountdown(calculateTimeRemaining());

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setPostsaleCountdown(remaining);

      if (remaining <= 0) {
        // Time's up! Finalize order without postsale and redirect
        clearInterval(interval);
        finalizeOrderAndRedirect();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showPostsaleOffer, queueExpiresAt]);

  // Helper function to scroll parent to widget
  const scrollParentToWidget = () => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: 'scroll-to-widget' },
          '*'
        );
      }
    } catch (error) {
      console.debug('Could not send scroll message to parent:', error);
    }
  };

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
  }, [loading, success, landingPage, selectedOffer, selectedUpsells, phone, fullName, county, city, address]);

  // Auto-save partial order with debouncing
  useEffect(() => {
    // Don't save if form is empty or already submitted successfully
    if (!landingPage || success || !phone) return;

    // Clear previous timeout
    if (lastSaveTimeout) {
      clearTimeout(lastSaveTimeout);
    }

    // Save after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      let lastField = "phone";
      if (address) lastField = "address";
      else if (city) lastField = "city";
      else if (county) lastField = "county";
      else if (fullName) lastField = "fullName";

      savePartialOrder(lastField);
    }, 3000);

    setLastSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [phone, fullName, county, city, address, selectedOffer, selectedUpsells, landingPage, success]);

  async function fetchLandingPage() {
    try {
      setLoading(true);
      const response = await fetch(`/api/landing-pages/public/${slug}`);

      if (!response.ok) {
        throw new Error("Landing page not found");
      }

      const data = await response.json();
      setLandingPage(data.landingPage);

      // Use presale upsells from the same response (optimized - no extra request)
      if (data.presaleUpsells) {
        setPresaleUpsells(data.presaleUpsells);
      }
    } catch (err) {
      console.error("Error fetching landing page:", err);
      setError(err instanceof Error ? err.message : "Failed to load form");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPostsaleUpsells(landingPageId: string): Promise<Upsell[]> {
    try {
      const response = await fetch(`/api/upsells/public/${landingPageId}?type=postsale`);

      if (!response.ok) {
        console.error("Failed to fetch postsale upsells", response.status);
        return [];
      }

      const data = await response.json();
      const upsells = data.upsells || [];
      setPostsaleUpsells(upsells);
      return upsells;
    } catch (err) {
      console.error("Error fetching postsale upsells:", err);
      return [];
    }
  }

  async function finalizeOrderAndRedirect() {
    if (postsaleProcessing) return; // Prevent double click

    setPostsaleProcessing(true);

    // If we have a created order ID, finalize it (no postsale)
    if (createdOrderId) {
      try {
        console.log('[Finalize] Finalizing order without postsale:', createdOrderId);
        const response = await fetch(`/api/orders/${createdOrderId}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          console.error('[Finalize] Failed to finalize order');
        } else {
          console.log('[Finalize] Order finalized successfully');

          // Send client-side Purchase event (deduplicated with server-side CAPI)
          await sendClientSidePurchaseEvent(createdOrderId, getTotalPrice());
        }
      } catch (error) {
        console.error('[Finalize] Error finalizing order:', error);
      }
    }

    // Redirect to thank you page
    redirectToThankYouPage();
  }

  /**
   * Send client-side Purchase event to Meta Pixel with deduplication
   * Uses same eventID as server-side CAPI for deduplication
   */
  async function sendClientSidePurchaseEvent(orderId: string, totalAmount: number) {
    if (!landingPage?.client_side_tracking || !landingPage?.fb_pixel_id) {
      return; // Tracking not enabled
    }

    try {
      // Fetch order details to get accurate product info
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        console.warn('[Purchase Tracking] Could not fetch order details');
        return;
      }

      const orderData = await response.json();
      const order = orderData.order;

      // Build content_ids array (main product + upsells)
      const contentIds: string[] = [];
      if (order.product_sku) {
        contentIds.push(order.product_sku);
      }
      if (order.upsells && Array.isArray(order.upsells)) {
        order.upsells.forEach((upsell: any) => {
          if (upsell.productSku) {
            contentIds.push(upsell.productSku);
          }
        });
      }

      // Calculate total items
      const numItems = (order.product_quantity || 1) +
        (order.upsells?.reduce((sum: number, u: any) => sum + (u.quantity || 1), 0) || 0);

      // Send Purchase event with same eventID as CAPI for deduplication
      trackPurchase({
        value: totalAmount,
        currency: 'RON',
        content_ids: contentIds.length > 0 ? contentIds : undefined,
        content_name: order.product_name || landingPage.products?.name,
        num_items: numItems,
        eventID: `purchase_${orderId}`, // SAME as server-side CAPI - Meta will deduplicate
      });

      console.log('[Purchase Tracking] Client-side Purchase event sent with deduplication:', {
        orderId,
        eventID: `purchase_${orderId}`,
        value: totalAmount,
        contentIds,
      });
    } catch (error) {
      console.error('[Purchase Tracking] Error sending client-side Purchase event:', error);
      // Don't block redirect on tracking error
    }
  }

  function redirectToThankYouPage() {
    setShowPostsaleOffer(false);
    if (landingPage?.stores?.url && createdOrderId) {
      const thankYouSlug = landingPage.thank_you_path || "thank-you";
      let storeUrl = landingPage.stores.url;
      if (!storeUrl.startsWith('http://') && !storeUrl.startsWith('https://')) {
        storeUrl = `https://${storeUrl}`;
      }
      storeUrl = storeUrl.replace(/\/$/, '');
      // Add order ID as query parameter
      const thankYouUrl = `${storeUrl}/${thankYouSlug}?order=${createdOrderId}`;
      if (window.parent && window.parent !== window) {
        window.parent.location.href = thankYouUrl;
      } else {
        window.location.href = thankYouUrl;
      }
    }
  }

  function toggleUpsell(upsellId: string) {
    setSelectedUpsells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(upsellId)) {
        newSet.delete(upsellId);
      } else {
        newSet.add(upsellId);
      }
      return newSet;
    });
  }

  function getUpsellsTotal() {
    return presaleUpsells
      .filter(upsell => selectedUpsells.has(upsell.id))
      .reduce((total, upsell) => total + upsell.price, 0);
  }


  // Save partial order (auto-save as user fills form)
  async function savePartialOrder(lastField?: string) {
    if (!landingPage || !landingPage.stores?.organization_id) return;

    try {
      const selectedUpsellsData = presaleUpsells
        .filter(upsell => selectedUpsells.has(upsell.id))
        .map(upsell => ({
          upsellId: upsell.id,
          title: upsell.title,
          quantity: upsell.quantity,
          price: upsell.price,
          productSku: upsell.product?.sku || null,
          type: "presale",
        }));

      const payload = {
        partialOrderId,
        organizationId: landingPage.stores.organization_id,
        landingKey: landingPage.slug,
        offerCode: selectedOffer,
        phone: phone || undefined,
        fullName: fullName.trim() || undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        productName: landingPage.products?.name,
        productSku: landingPage.products?.sku,
        productQuantity: selectedOffer === "offer_1" ? 1 : selectedOffer === "offer_2" ? 2 : 3,
        upsells: selectedUpsellsData,
        subtotal: getCurrentPrice(),
        shippingCost: landingPage.shipping_price,
        total: getTotalPrice(),
        lastCompletedField: lastField,
      };

      const response = await fetch("/api/partial-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (!partialOrderId && data.partialOrder?.id) {
          setPartialOrderId(data.partialOrder.id);
        }
      }
    } catch (error) {
      console.error("Error saving partial order:", error);
      // Silently fail - don't interrupt user experience
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
    return getCurrentPrice() + (landingPage?.shipping_price || 0) + getUpsellsTotal();
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

    // Track InitiateCheckout event
    if (landingPage.client_side_tracking && landingPage.fb_pixel_id) {
      const selectedPrice = selectedOffer === 'offer_1' ? landingPage.price_1 :
                           selectedOffer === 'offer_2' ? landingPage.price_2 :
                           landingPage.price_3;

      trackInitiateCheckout({
        content_ids: landingPage.products?.sku ? [landingPage.products.sku] : undefined,
        content_name: landingPage.products?.name,
        num_items: 1 + selectedUpsells.size,
        value: getTotalPrice(),
        currency: 'RON',
      });
    }

    // Prepare selected upsells data
    const selectedUpsellsData = presaleUpsells
      .filter(upsell => selectedUpsells.has(upsell.id))
      .map(upsell => ({
        upsellId: upsell.id,
        title: upsell.title,
        quantity: upsell.quantity,
        price: upsell.price,
        productSku: upsell.product?.sku || null,
        type: "presale",
      }));

    const payload = {
      landingKey: landingPage.slug,
      offerCode: selectedOffer,
      phone: phoneDigits,
      fullName: fullName.trim(),
      county: county.trim(),
      city: city.trim(),
      address: address.trim(),
      upsells: selectedUpsellsData,
      subtotal: getCurrentPrice(),
      shippingCost: landingPage.shipping_price,
      total: getTotalPrice(),
      // Meta tracking data
      tracking: trackingData,
      // Use parent page URL (where widget is embedded) for accurate Meta CAPI attribution
      eventSourceUrl: typeof window !== 'undefined'
        ? (document.referrer || window.location.href)
        : undefined,
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

      // Get order ID from response
      const orderData = await response.json();
      const orderId = orderData.orderId;
      setCreatedOrderId(orderId);

      // Show processing popup
      setShowSuccessPopup(true);

      // Scroll parent page to widget so popup is visible
      scrollParentToWidget();

      // Send client-side Purchase event (deduplicated with server-side CAPI)
      // Then redirect immediately after tracking completes
      try {
        await sendClientSidePurchaseEvent(orderId, getTotalPrice());
      } catch (err) {
        console.error("[Order] Failed to send purchase event:", err);
        // Continue with redirect even if tracking fails
      }

      // Redirect to thank you page immediately after tracking
      if (landingPage.stores?.url) {
        const thankYouSlug = landingPage.thank_you_path || "thank-you";
        let storeUrl = landingPage.stores.url;
        if (!storeUrl.startsWith('http://') && !storeUrl.startsWith('https://')) {
          storeUrl = `https://${storeUrl}`;
        }
        storeUrl = storeUrl.replace(/\/$/, '');
        // Add order ID to URL for thank you page to process
        const thankYouUrl = `${storeUrl}/${thankYouSlug}?order=${orderId}`;

        if (window.parent && window.parent !== window) {
          window.parent.location.href = thankYouUrl;
        } else {
          window.location.href = thankYouUrl;
        }
      } else {
        // Fallback to success message if no store URL
        setSuccess(true);
        setShowSuccessPopup(false);
        // Reset form
        setPhone("");
        setFullName("");
        setCounty("");
        setCity("");
        setAddress("");
        setSelectedOffer("offer_1");
      }
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

  // Check if product is inactive
  if (landingPage.products?.status === "inactive") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">
            Produsul nu mai este disponibil
          </h1>
          <p className="text-zinc-600 mb-6">
            Ne pare rău, acest produs nu se mai află în catalogul nostru de produse.
          </p>
          <div className="text-sm text-zinc-500">
            Pentru informații suplimentare, vă rugăm să ne contactați.
          </div>
        </div>
      </div>
    );
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
      <div className="max-w-xl mx-auto">
        {/* Price Header - COMPACT & EYE-CATCHING */}
        <div className="rounded-lg shadow-lg p-3 sm:p-4 mb-4 sm:mb-6" style={{ backgroundColor }}>
          {/* Discount Badge - Gradient - 30% larger - Separate row on desktop */}
          <div className="flex items-center justify-center mb-3">
            <span
              className="px-5 py-2.5 text-white rounded-md text-xl sm:text-2xl font-black whitespace-nowrap shadow-lg animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
              }}
            >
              ⚡ REDUCERE {discount}% ⚡
            </span>
          </div>

          {/* Prices - 30% larger */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3">
            <span className="text-xl sm:text-2xl font-bold line-through" style={{ color: textOnDarkColor, opacity: 0.5 }}>
              {landingPage.srp.toFixed(2)} Lei
            </span>
            <span className="text-2xl sm:text-3xl" style={{ color: textOnDarkColor, opacity: 0.7 }}>→</span>
            <span className="text-3xl sm:text-4xl font-black" style={{ color: textOnDarkColor }}>
              {landingPage.price_1.toFixed(2)} LEI
            </span>
          </div>

          {/* Trust Signals - Multiple Rows */}
          <div className="space-y-2">
            {/* First Row: Delivery & Payment */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-base sm:text-lg" style={{ color: textOnDarkColor, opacity: 0.85 }}>
              <div className="flex items-center gap-1.5">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <span className="font-semibold">Livrare 1-3 zile</span>
              </div>
              <div className="hidden sm:block" style={{ color: textOnDarkColor, opacity: 0.3 }}>|</div>
              <div className="flex items-center gap-1.5">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-semibold">Plată la livrare</span>
              </div>
            </div>

            {/* Second Row: Stars */}
            <div className="flex items-center justify-center" style={{ color: textOnDarkColor, opacity: 0.9 }}>
              <span className="text-yellow-400 text-xl sm:text-2xl">⭐⭐⭐⭐⭐</span>
            </div>

            {/* Third Row: Social Proof Text */}
            <div className="flex items-center justify-center text-sm sm:text-base" style={{ color: textOnDarkColor, opacity: 0.9 }}>
              <span className="font-medium">Peste 9.847 clienți mulțumiți de magazinul nostru</span>
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
                <label className="block text-base sm:text-lg font-medium text-zinc-900 mb-1.5">
                  Număr Telefon
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
                  placeholder="Introduceți aici numărul de telefon"
                  className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:outline-none focus:ring-2 text-base sm:text-lg text-zinc-900 placeholder:text-base sm:placeholder:text-lg placeholder:text-zinc-500 ${
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
                <label className="block text-base sm:text-lg font-medium text-zinc-900 mb-1.5">
                  Nume și Prenume
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(toTitleCase(e.target.value));
                    // Clear error when user starts typing
                    if (errors.fullName) {
                      setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  placeholder="Introduceți aici numele complet"
                  className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:outline-none focus:ring-2 text-base sm:text-lg text-zinc-900 placeholder:text-base sm:placeholder:text-lg placeholder:text-zinc-500 ${
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
                  <label className="block text-base sm:text-lg font-medium text-zinc-900 mb-1.5">
                    Județ
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => {
                      setCounty(toTitleCase(e.target.value));
                      // Clear error when user starts typing
                      if (errors.county) {
                        setErrors((prev) => ({ ...prev, county: undefined }));
                      }
                    }}
                    placeholder="Introduceți aici județul"
                    className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:outline-none focus:ring-2 text-base sm:text-lg text-zinc-900 placeholder:text-base sm:placeholder:text-lg placeholder:text-zinc-500 ${
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
                  <label className="block text-base sm:text-lg font-medium text-zinc-900 mb-1.5">
                    Localitate, comună sau sat
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(toTitleCase(e.target.value));
                      // Clear error when user starts typing
                      if (errors.city) {
                        setErrors((prev) => ({ ...prev, city: undefined }));
                      }
                    }}
                    placeholder="Introduceți aici localitatea / comuna / satul"
                    className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:outline-none focus:ring-2 text-base sm:text-lg text-zinc-900 placeholder:text-base sm:placeholder:text-lg placeholder:text-zinc-500 ${
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
                <label className="block text-base sm:text-lg font-medium text-zinc-900 mb-1.5">
                  Stradă, număr, bloc, scară, ap.
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(toTitleCase(e.target.value));
                    // Clear error when user starts typing
                    if (errors.address) {
                      setErrors((prev) => ({ ...prev, address: undefined }));
                    }
                  }}
                  placeholder="Introduceți aici adresa completă"
                  className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:outline-none focus:ring-2 text-base sm:text-lg text-zinc-900 placeholder:text-base sm:placeholder:text-lg placeholder:text-zinc-500 ${
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

          {/* Quantity Selection - COMPACT */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 mb-3 sm:mb-4">
              SELECTAȚI OFERTA DORITĂ
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSelectedOffer("offer_1")}
                className="relative p-3 sm:p-4 pt-5 sm:pt-6 border-2 rounded-lg transition-all text-center"
                style={selectedOffer === "offer_1" ? {
                  borderColor: primaryColor,
                  backgroundColor: backgroundColor,
                } : {
                  borderColor: '#e5e7eb',
                  backgroundColor: '#fff'
                }}
              >
                {/* Label on border */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white uppercase whitespace-nowrap"
                  style={{ backgroundColor: selectedOffer === "offer_1" ? primaryColor : backgroundColor }}
                >
                  {landingPage.offer_heading_1}
                </div>

                <div className="text-base sm:text-lg font-bold mb-1" style={{ color: selectedOffer === "offer_1" ? textOnDarkColor : '#18181b' }}>
                  {landingPage.numeral_1}
                </div>
                <div className="text-lg sm:text-xl font-bold" style={{ color: selectedOffer === "offer_1" ? accentColor : accentColor }}>
                  {landingPage.price_1.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_1" && (
                  <div className="mt-1 text-[10px] sm:text-xs font-medium" style={{ color: textOnDarkColor }}>
                    ✓ Selectat
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedOffer("offer_2")}
                className="relative p-3 sm:p-4 pt-5 sm:pt-6 border-2 rounded-lg transition-all text-center"
                style={selectedOffer === "offer_2" ? {
                  borderColor: primaryColor,
                  backgroundColor: backgroundColor,
                } : {
                  borderColor: '#e5e7eb',
                  backgroundColor: '#fff'
                }}
              >
                {/* Label on border */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white uppercase whitespace-nowrap"
                  style={{ backgroundColor: selectedOffer === "offer_2" ? primaryColor : backgroundColor }}
                >
                  {landingPage.offer_heading_2}
                </div>

                <div className="text-base sm:text-lg font-bold mb-1" style={{ color: selectedOffer === "offer_2" ? textOnDarkColor : '#18181b' }}>
                  {landingPage.numeral_2}
                </div>
                <div className="text-lg sm:text-xl font-bold" style={{ color: selectedOffer === "offer_2" ? accentColor : accentColor }}>
                  {landingPage.price_2.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_2" && (
                  <div className="mt-1 text-[10px] sm:text-xs font-medium" style={{ color: textOnDarkColor }}>
                    ✓ Selectat
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedOffer("offer_3")}
                className="relative p-3 sm:p-4 pt-5 sm:pt-6 border-2 rounded-lg transition-all text-center"
                style={selectedOffer === "offer_3" ? {
                  borderColor: primaryColor,
                  backgroundColor: backgroundColor,
                } : {
                  borderColor: '#e5e7eb',
                  backgroundColor: '#fff'
                }}
              >
                {/* Label on border */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white uppercase whitespace-nowrap"
                  style={{ backgroundColor: selectedOffer === "offer_3" ? primaryColor : backgroundColor }}
                >
                  {landingPage.offer_heading_3}
                </div>

                <div className="text-base sm:text-lg font-bold mb-1" style={{ color: selectedOffer === "offer_3" ? textOnDarkColor : '#18181b' }}>
                  {landingPage.numeral_3}
                </div>
                <div className="text-lg sm:text-xl font-bold" style={{ color: selectedOffer === "offer_3" ? accentColor : accentColor }}>
                  {landingPage.price_3.toFixed(2)} LEI
                </div>
                {selectedOffer === "offer_3" && (
                  <div className="mt-1 text-[10px] sm:text-xs font-medium" style={{ color: textOnDarkColor }}>
                    ✓ Selectat
                  </div>
                )}
              </button>
            </div>

            {/* Delivery Method - Same card as offers */}
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-base sm:text-lg text-zinc-900">Livrare prin curier rapid (1-3 zile)</div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 whitespace-nowrap">
                  {landingPage.shipping_price.toFixed(2)} Lei
                </div>
              </div>
            </div>
          </div>

          {/* Presale Upsells - COMPACT & ATTRACTIVE */}
          {presaleUpsells.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              {/* Scarcity Header */}
              <div className="mb-4 text-center">
                <p className="text-sm sm:text-base font-semibold text-zinc-600 uppercase tracking-wide mb-1">
                  PRODUSE AFLATE ÎN OFERTĂ
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 flex items-center justify-center gap-2">
                  <span className="text-xl sm:text-2xl">⚡</span>
                  ULTIMELE BUCĂȚI ÎN STOC
                  <span className="text-xl sm:text-2xl">⚡</span>
                </h2>
              </div>

              <style jsx>{`
                @keyframes marchingAnts {
                  0% { stroke-dashoffset: 0; }
                  100% { stroke-dashoffset: 20; }
                }
              `}</style>

              <div className="space-y-3">
                {presaleUpsells.map((upsell) => {
                  const isSelected = selectedUpsells.has(upsell.id);
                  const discount = upsell.srp > upsell.price ? Math.round(((upsell.srp - upsell.price) / upsell.srp) * 100) : 0;

                  return (
                    <button
                      key={upsell.id}
                      type="button"
                      onClick={() => toggleUpsell(upsell.id)}
                      className="relative w-full p-3 sm:p-4 rounded-lg text-left transition-all duration-300"
                      style={{
                        background: isSelected ? backgroundColor : '#fff',
                        border: isSelected
                          ? `3px solid ${primaryColor}`
                          : 'none',
                        boxShadow: isSelected ? '0 4px 12px -1px rgba(0, 0, 0, 0.15)' : 'none',
                      }}
                    >
                      {/* SVG Marching Ants Border for non-selected - uses primaryColor */}
                      {!isSelected && (
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <rect
                            x="1.5"
                            y="1.5"
                            width="calc(100% - 3px)"
                            height="calc(100% - 3px)"
                            fill="none"
                            stroke={primaryColor}
                            strokeWidth="2"
                            strokeDasharray="8 4"
                            rx="8"
                            style={{
                              animation: 'marchingAnts 1s linear infinite',
                            }}
                          />
                        </svg>
                      )}

                      {/* Discount badge - compact */}
                      {discount > 0 && (
                        <div className="absolute -top-2 -right-2 z-20">
                          <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                            REDUCERE -{discount}%
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 relative z-10">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'border-0' : 'border-zinc-300'
                            }`}
                            style={isSelected ? { backgroundColor: primaryColor } : {}}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="text-base sm:text-lg leading-tight" style={{ color: isSelected ? textOnDarkColor : '#18181b' }}>
                                Adaugă <span className="font-bold">{upsell.title}</span> pentru doar{' '}
                                <span
                                  className="font-bold text-lg sm:text-xl"
                                  style={{ color: accentColor }}
                                >
                                  {upsell.price.toFixed(2)} Lei
                                </span>
                                {upsell.srp > upsell.price && (
                                  <span className="text-sm sm:text-base" style={{ color: isSelected ? `${textOnDarkColor}99` : '#71717a' }}>
                                    {' '}(redus de la {upsell.srp.toFixed(2)} Lei)
                                  </span>
                                )}
                              </h3>
                            </div>
                            {upsell.media_url && (
                              <div className="flex-shrink-0">
                                <img
                                  src={upsell.media_url}
                                  alt={upsell.title}
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Summary - Compact */}
          <div className="rounded-lg shadow-lg p-3 sm:p-4" style={{ backgroundColor }}>
            <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: textOnDarkColor }}>
              Rezumatul comenzii
            </h2>
            <div className="space-y-1 mb-2">
              <div className="flex justify-between text-sm sm:text-base" style={{ color: textOnDarkColor, opacity: 0.8 }}>
                <span className="break-words pr-2">• Preț produse:</span>
                <span className="whitespace-nowrap">{currentPrice.toFixed(2)} Lei</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base" style={{ color: textOnDarkColor, opacity: 0.8 }}>
                <span className="break-words pr-2">• Livrare curier rapid</span>
                <span className="whitespace-nowrap">{landingPage.shipping_price.toFixed(2)} Lei</span>
              </div>
              {getUpsellsTotal() > 0 && (
                <div className="flex justify-between text-sm sm:text-base" style={{ color: textOnDarkColor, opacity: 0.8 }}>
                  <span className="break-words pr-2">• Oferte speciale ({selectedUpsells.size})</span>
                  <span className="whitespace-nowrap">{getUpsellsTotal().toFixed(2)} Lei</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t" style={{ borderColor: `${textOnDarkColor}40` }}>
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
              <p className="text-red-800 text-base sm:text-lg">{error}</p>
            </div>
          )}

          {/* Submit Button - Text 50% larger */}
          <div className="space-y-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full text-white font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-lg text-2xl sm:text-3xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 ${
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
            <p className="text-center text-sm sm:text-base text-zinc-600 italic">
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
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: scale(0.95);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes marchingAnts {
              0% {
                stroke-dashoffset: 0;
              }
              100% {
                stroke-dashoffset: 12;
              }
            }
          `}} />

          {/* Success Popup */}
          {showSuccessPopup && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              style={{
                animation: 'fadeIn 0.3s ease-out'
              }}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center"
                style={{
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                {/* Success Icon */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <svg
                    className="w-12 h-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: accentColor }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                {/* Processing Message */}
                <h2
                  className="text-2xl sm:text-3xl font-bold mb-3"
                  style={{ color: accentColor }}
                >
                  FELICITĂRI!
                </h2>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 mb-4">
                  COMANDA ESTE ÎN PROCESARE
                </p>
                <p className="text-sm sm:text-base text-zinc-600">
                  Vă redirecționăm...
                </p>

                {/* Loading Spinner */}
                <div className="mt-6">
                  <div
                    className="animate-spin rounded-full h-10 w-10 border-b-4 mx-auto"
                    style={{ borderColor: accentColor }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Post-Sale Offer Popup - SPECTACULAR DESIGN */}
          {showPostsaleOffer && postsaleUpsells.length > 0 && postsaleUpsells[0] && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{
                animation: 'fadeIn 0.3s ease-out',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
              }}
            >
              {/* Animated sparkles/particles background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                <div className="absolute top-20 right-20 w-3 h-3 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
                <div className="absolute bottom-32 left-16 w-2 h-2 bg-yellow-500 rounded-full animate-ping" style={{ animationDuration: '1.8s', animationDelay: '1s' }}></div>
                <div className="absolute top-1/3 right-10 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.3s' }}></div>
                <div className="absolute bottom-40 right-24 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDuration: '2.7s', animationDelay: '0.8s' }}></div>
              </div>

              {/* Main content - fits mobile screen */}
              <div
                className="relative w-full max-w-md mx-4 flex flex-col"
                style={{
                  animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  maxHeight: '100dvh',
                  paddingTop: 'env(safe-area-inset-top, 12px)',
                  paddingBottom: 'env(safe-area-inset-bottom, 12px)'
                }}
              >
                {/* COUNTDOWN TIMER - Top sticky */}
                <div className="flex-shrink-0 mb-3">
                  <div
                    className="mx-auto w-fit px-6 py-2.5 rounded-full shadow-2xl border-2 border-red-400"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}
                  >
                    <div className="flex items-center gap-3 text-white">
                      <svg className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="font-black text-lg tracking-wider">
                        {Math.floor(postsaleCountdown / 60)}:{String(postsaleCountdown % 60).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-sm uppercase">rămase</span>
                    </div>
                  </div>
                </div>

                {/* FELICITĂRI TITLE */}
                <div className="flex-shrink-0 text-center mb-2">
                  <h1
                    className="text-4xl sm:text-5xl font-black tracking-tight"
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #fbbf24 60%, #fcd34d 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 40px rgba(251, 191, 36, 0.5)',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                    }}
                  >
                    FELICITĂRI!
                  </h1>
                </div>

                {/* SUBTITLE */}
                <div className="flex-shrink-0 text-center mb-4">
                  <p className="text-white text-base sm:text-lg font-bold uppercase tracking-wide">
                    <span className="text-yellow-400">★</span> AI DEBLOCAT O REDUCERE LIMITATĂ <span className="text-yellow-400">★</span>
                  </p>
                </div>

                {/* PRODUCT IMAGE - Centered hero */}
                <div className="flex-shrink-0 flex justify-center mb-3">
                  <div className="relative">
                    {/* Glow effect behind image */}
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                      style={{ background: accentColor, transform: 'scale(1.1)' }}
                    ></div>
                    {postsaleUpsells[0].media_url ? (
                      <img
                        src={postsaleUpsells[0].media_url}
                        alt={postsaleUpsells[0].title}
                        className="relative w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-2xl shadow-2xl border-4 border-white/20"
                      />
                    ) : (
                      <div className="relative w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-2xl shadow-2xl border-4 border-white/20 flex items-center justify-center">
                        <span className="text-5xl">🎁</span>
                      </div>
                    )}
                    {/* DISCOUNT BADGE - Overlapping image */}
                    <div
                      className="absolute -top-3 -right-3 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-xl border-2 border-white"
                      style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                        animation: 'bounce 1s ease-in-out infinite'
                      }}
                    >
                      <span className="text-white font-black text-lg sm:text-xl leading-none text-center">
                        -{Math.round(((postsaleUpsells[0].srp - postsaleUpsells[0].price) / postsaleUpsells[0].srp) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* PRODUCT TITLE */}
                <div className="flex-shrink-0 text-center mb-2 px-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                    {postsaleUpsells[0].title}
                  </h2>
                </div>

                {/* PRODUCT DESCRIPTION */}
                {postsaleUpsells[0].description && (
                  <div className="flex-shrink-0 text-center mb-3 px-6">
                    <p className="text-zinc-300 text-sm sm:text-base leading-snug">
                      {postsaleUpsells[0].description}
                    </p>
                  </div>
                )}

                {/* PRICE SECTION */}
                <div className="flex-shrink-0 text-center mb-4">
                  <div className="flex items-center justify-center gap-4">
                    {/* Old price */}
                    <div className="relative">
                      <span className="text-zinc-400 text-lg sm:text-xl font-medium">
                        {postsaleUpsells[0].srp.toFixed(2)} Lei
                      </span>
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -rotate-12"></div>
                    </div>
                    {/* Arrow */}
                    <span className="text-yellow-400 text-2xl">→</span>
                    {/* New price */}
                    <div
                      className="px-4 py-2 rounded-xl"
                      style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
                    >
                      <span className="text-white text-2xl sm:text-3xl font-black">
                        {postsaleUpsells[0].price.toFixed(2)} Lei
                      </span>
                    </div>
                  </div>
                </div>

                {/* URGENCY MESSAGE */}
                <div className="flex-shrink-0 mx-4 mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/50">
                  <p className="text-center text-red-300 text-sm font-semibold">
                    ⚡ Această ofertă dispare pentru totdeauna după {Math.floor(postsaleCountdown / 60)}:{String(postsaleCountdown % 60).padStart(2, '0')} ⚡
                  </p>
                </div>

                {/* ACTION BUTTONS - Stacked vertically */}
                <div className="flex-shrink-0 px-4 space-y-3">
                  {/* ACCEPT BUTTON */}
                  <button
                    onClick={async () => {
                      if (postsaleProcessing) return;

                      if (!createdOrderId || !postsaleUpsells[0]) {
                        console.error('Missing order ID or upsell');
                        redirectToThankYouPage();
                        return;
                      }

                      setPostsaleProcessing(true);

                      try {
                        const response = await fetch(`/api/orders/${createdOrderId}/add-postsale-upsell`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ upsellId: postsaleUpsells[0].id }),
                        });

                        if (!response.ok) {
                          console.error('Failed to add postsale upsell');
                        } else {
                          console.log('Postsale upsell added successfully!');
                          const postsaleTotal = getTotalPrice() + (postsaleUpsells[0].price * postsaleUpsells[0].quantity);
                          await sendClientSidePurchaseEvent(createdOrderId, postsaleTotal);
                        }
                      } catch (error) {
                        console.error('Error adding postsale upsell:', error);
                      }

                      redirectToThankYouPage();
                    }}
                    disabled={postsaleProcessing}
                    className={`w-full py-4 sm:py-5 rounded-2xl font-black text-xl sm:text-2xl text-white shadow-2xl transition-all relative overflow-hidden ${
                      postsaleProcessing ? 'opacity-60 cursor-not-allowed' : 'transform hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                      boxShadow: `0 10px 40px -10px ${accentColor}80`
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {postsaleProcessing ? (
                        <>
                          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          SE PROCESEAZĂ...
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">✓</span>
                          DA, ADAUGĂ LA OFERTĂ
                        </>
                      )}
                    </span>
                    {!postsaleProcessing && (
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)',
                          animation: 'shimmer 2s infinite'
                        }}
                      ></div>
                    )}
                  </button>

                  {/* DECLINE BUTTON */}
                  <button
                    onClick={finalizeOrderAndRedirect}
                    disabled={postsaleProcessing}
                    className={`w-full py-3 rounded-xl font-medium text-base transition-all ${
                      postsaleProcessing
                        ? 'text-zinc-600 cursor-not-allowed'
                        : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    NU MĂ INTERESEAZĂ
                  </button>
                </div>

                {/* TRUST BADGE */}
                <div className="flex-shrink-0 text-center mt-3 pb-2">
                  <p className="text-zinc-500 text-xs">
                    ✓ Plata la livrare • ✓ Retur gratuit 14 zile
                  </p>
                </div>
              </div>

              {/* CSS for shimmer animation */}
              <style jsx>{`
                @keyframes shimmer {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
            </div>
          )}
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
