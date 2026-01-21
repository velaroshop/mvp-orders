/**
 * Velaro Widget Embed Script
 *
 * This script handles iframe initialization with tracking parameter propagation
 * from the parent landing page URL to the embedded widget iframe.
 *
 * Usage:
 * <script src="https://mvp-orders.vercel.app/embed.js"></script>
 * <div id="velaro-widget-YOUR_SLUG"></div>
 */

(function() {
  'use strict';

  const WIDGET_DOMAIN = 'https://mvp-orders.vercel.app';

  /**
   * Get cookie value by name
   */
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  /**
   * Extract tracking parameters from current URL
   */
  function getTrackingParams() {
    const params = new URLSearchParams(window.location.search);
    const tracking = {};

    // Facebook tracking
    const fbclid = params.get('fbclid');
    if (fbclid) tracking.fbclid = fbclid;

    const fbp = getCookie('_fbp');
    if (fbp) tracking.fbp = fbp;

    // UTM parameters
    const utmSource = params.get('utm_source');
    if (utmSource) tracking.utm_source = utmSource;

    const utmMedium = params.get('utm_medium');
    if (utmMedium) tracking.utm_medium = utmMedium;

    const utmCampaign = params.get('utm_campaign');
    if (utmCampaign) tracking.utm_campaign = utmCampaign;

    const utmTerm = params.get('utm_term');
    if (utmTerm) tracking.utm_term = utmTerm;

    const utmContent = params.get('utm_content');
    if (utmContent) tracking.utm_content = utmContent;

    // Google Ads tracking
    const gclid = params.get('gclid');
    if (gclid) tracking.gclid = gclid;

    // TikTok tracking
    const ttclid = params.get('ttclid');
    if (ttclid) tracking.ttclid = ttclid;

    // Landing page URL (for reference)
    tracking.landing_url = window.location.href;

    return tracking;
  }

  /**
   * Build iframe src URL with tracking params
   */
  function buildIframeSrc(slug, trackingParams) {
    const url = new URL(`${WIDGET_DOMAIN}/widget`);
    url.searchParams.set('slug', slug);

    // Add all tracking params to URL
    Object.keys(trackingParams).forEach(key => {
      if (trackingParams[key]) {
        url.searchParams.set(key, trackingParams[key]);
      }
    });

    return url.toString();
  }

  /**
   * Initialize iframe with tracking
   */
  function initializeWidget(container, slug) {
    const tracking = getTrackingParams();
    const iframeSrc = buildIframeSrc(slug, tracking);

    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.id = `velaro-widget-${slug}-iframe`;
    iframe.src = iframeSrc;
    iframe.width = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.style.minHeight = '600px';
    iframe.scrolling = 'no';
    iframe.loading = 'lazy';

    // Clear container and append iframe
    container.innerHTML = '';
    container.appendChild(iframe);

    return iframe;
  }

  /**
   * Handle postMessage events from iframe
   */
  function handlePostMessage(event, iframes) {
    // Security: Verify origin
    if (event.origin !== WIDGET_DOMAIN) {
      return;
    }

    const data = event.data;

    // Handle height adjustment
    if (data.type === 'resize' && data.height) {
      // Find the iframe that sent this message
      iframes.forEach(iframe => {
        if (event.source === iframe.contentWindow) {
          iframe.style.height = `${data.height}px`;
        }
      });
    }

    // Handle purchase redirect to thank you page
    if (data.type === 'purchase' && data.thankYouUrl) {
      window.location.href = data.thankYouUrl;
    }
  }

  /**
   * Initialize all widgets on page load
   */
  function init() {
    // Find all widget containers
    const containers = document.querySelectorAll('[id^="velaro-widget-"]');
    const iframes = [];

    containers.forEach(container => {
      // Extract slug from container ID
      // Format: velaro-widget-{slug}
      const slug = container.id.replace('velaro-widget-', '');

      if (!slug) {
        console.error('Velaro Widget: Invalid container ID format. Expected: velaro-widget-{slug}');
        return;
      }

      // Initialize widget
      const iframe = initializeWidget(container, slug);
      iframes.push(iframe);
    });

    // Set up postMessage listener
    if (iframes.length > 0) {
      window.addEventListener('message', (event) => handlePostMessage(event, iframes));
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global API for manual initialization if needed
  window.VelaroWidget = {
    init: init,
    version: '1.0.0'
  };
})();
