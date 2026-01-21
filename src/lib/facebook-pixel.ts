/**
 * Facebook Pixel Client-side Tracking
 * Handles browser-side Meta Pixel events
 */

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export interface FBPixelConfig {
  pixelId: string;
  enabled: boolean;
}

/**
 * Initialize Facebook Pixel
 */
export function initFacebookPixel(pixelId: string): void {
  if (typeof window === 'undefined' || !pixelId) return;

  // Check if already initialized
  if (window.fbq) {
    console.log('[FB Pixel] Already initialized');
    return;
  }

  console.log('[FB Pixel] Initializing pixel:', pixelId);

  // Facebook Pixel base code
  const fbq: any = function() {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments);
    } else {
      fbq.queue.push(arguments);
    }
  };

  if (!window._fbq) {
    window._fbq = fbq;
  }

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  window.fbq = fbq;

  // Load the pixel script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  // Add noscript tracking pixel
  const noscript = document.createElement('noscript');
  const img = document.createElement('img');
  img.height = 1;
  img.width = 1;
  img.style.display = 'none';
  img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
  noscript.appendChild(img);
  document.body.appendChild(noscript);

  // Initialize the pixel
  window.fbq('init', pixelId);
}

/**
 * Track PageView event
 */
export function trackPageView(): void {
  if (typeof window !== 'undefined' && window.fbq) {
    console.log('[FB Pixel] PageView');
    window.fbq('track', 'PageView');
  }
}

/**
 * Track ViewContent event
 * @param params - Event parameters
 */
export function trackViewContent(params?: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
}): void {
  if (typeof window !== 'undefined' && window.fbq) {
    console.log('[FB Pixel] ViewContent', params);
    window.fbq('track', 'ViewContent', params || {});
  }
}

/**
 * Track InitiateCheckout event
 * @param params - Event parameters
 */
export function trackInitiateCheckout(params?: {
  content_ids?: string[];
  content_name?: string;
  num_items?: number;
  value?: number;
  currency?: string;
}): void {
  if (typeof window !== 'undefined' && window.fbq) {
    console.log('[FB Pixel] InitiateCheckout', params);
    window.fbq('track', 'InitiateCheckout', params || {});
  }
}

/**
 * Track Purchase event (client-side)
 * @param params - Event parameters
 */
export function trackPurchase(params: {
  value: number;
  currency: string;
  content_ids?: string[];
  content_name?: string;
  num_items?: number;
  eventID?: string; // For deduplication with CAPI
}): void {
  if (typeof window !== 'undefined' && window.fbq) {
    console.log('[FB Pixel] Purchase', params);

    // Extract eventID if provided (for CAPI deduplication)
    const { eventID, ...eventParams } = params;

    if (eventID) {
      // Track with eventID for deduplication
      window.fbq('track', 'Purchase', eventParams, { eventID });
    } else {
      // Track without eventID
      window.fbq('track', 'Purchase', eventParams);
    }
  }
}

/**
 * Track custom event
 * @param eventName - Custom event name
 * @param params - Event parameters
 */
export function trackCustomEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.fbq) {
    console.log('[FB Pixel] Custom Event:', eventName, params);
    window.fbq('trackCustom', eventName, params || {});
  }
}
