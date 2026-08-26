/**
 * Widget Embed Script
 *
 * This script handles iframe initialization with tracking parameter propagation
 * from the parent landing page URL to the embedded widget iframe.
 *
 * Usage:
 * <script src="https://app.ecom-society.com/embed.js"></script>
 * <div id="{ORG_SLUG}-widget-{LANDING_PAGE_SLUG}"></div>
 */

(function() {
  'use strict';

  // Auto-detect domain from the script's own URL (works with any domain)
  const WIDGET_DOMAIN = (function() {
    try {
      const scriptSrc = document.currentScript && document.currentScript.src;
      if (scriptSrc) {
        const url = new URL(scriptSrc);
        return url.origin;
      }
    } catch (e) {}
    return 'https://mvp-orders.vercel.app';
  })();

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

    // _fbc: try cookie first, construct from fbclid as fallback
    // Format: fb.1.{timestamp_ms}.{fbclid}
    const fbcCookie = getCookie('_fbc');
    if (fbcCookie) {
      tracking.fbc = fbcCookie;
    } else if (fbclid) {
      // Construct _fbc manually if pixel hasn't written the cookie yet (race condition / ITP)
      tracking.fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    }

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
  function buildIframeSrc(slug, orgSlug, trackingParams) {
    const url = new URL(`${WIDGET_DOMAIN}/widget`);
    url.searchParams.set('slug', slug);
    if (orgSlug) {
      url.searchParams.set('org', orgSlug);
    }

    // Add all tracking params to URL
    Object.keys(trackingParams).forEach(key => {
      if (trackingParams[key]) {
        url.searchParams.set(key, trackingParams[key]);
      }
    });

    return url.toString();
  }

  /**
   * Create skeleton placeholder shown while iframe loads
   */
  function createSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.style.cssText = 'width:100%;font-family:sans-serif;box-sizing:border-box;padding:12px;background:#f4f4f5;border-radius:8px;';

    const style = document.createElement('style');
    style.textContent = '@keyframes velaro-pulse{0%,100%{opacity:1}50%{opacity:.4}}.velaro-bone{background:#d4d4d8;border-radius:6px;animation:velaro-pulse 1.5s ease-in-out infinite;}';
    skeleton.appendChild(style);

    skeleton.innerHTML += `
      <div style="background:#27272a;border-radius:8px;padding:16px 12px 12px;margin-bottom:10px;text-align:center;">
        <div class="velaro-bone" style="height:22px;width:110px;margin:0 auto 10px;"></div>
        <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:8px;">
          <div class="velaro-bone" style="height:20px;width:70px;"></div>
          <div class="velaro-bone" style="height:28px;width:90px;"></div>
        </div>
        <div class="velaro-bone" style="height:12px;width:180px;margin:0 auto;"></div>
      </div>
      <div style="background:#fff;border-radius:8px;padding:16px;">
        <div class="velaro-bone" style="height:18px;width:200px;margin:0 auto 16px;"></div>
        ${[1,2,3,4,5].map(() => `
          <div style="margin-bottom:12px;">
            <div class="velaro-bone" style="height:12px;width:100px;margin-bottom:6px;"></div>
            <div class="velaro-bone" style="height:42px;width:100%;border-radius:8px;"></div>
          </div>
        `).join('')}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:16px 0;">
          ${[1,2,3].map(() => `<div class="velaro-bone" style="height:72px;border-radius:8px;"></div>`).join('')}
        </div>
        <div class="velaro-bone" style="height:52px;width:60%;margin:0 auto;border-radius:8px;"></div>
      </div>
    `;

    return skeleton;
  }

  /**
   * Initialize iframe with tracking
   */
  function initializeWidget(container, slug, orgSlug) {
    const tracking = getTrackingParams();
    const iframeSrc = buildIframeSrc(slug, orgSlug, tracking);

    // Show skeleton immediately
    const skeleton = createSkeleton();
    container.innerHTML = '';
    container.appendChild(skeleton);

    // Create iframe element (hidden initially)
    const iframe = document.createElement('iframe');
    iframe.id = `${container.id}-iframe`;
    iframe.src = iframeSrc;
    iframe.width = '100%';
    iframe.style.cssText = 'border:none;display:block;min-height:600px;opacity:0;position:absolute;top:0;left:0;width:100%;transition:opacity 0.3s ease;';
    iframe.scrolling = 'no';
    iframe.loading = 'eager';

    // Wrap in relative container so absolute positioning works
    container.style.position = 'relative';
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

    // Handle height adjustment (support both 'resize' and 'velaro-widget-height' for backward compatibility)
    if ((data.type === 'resize' || data.type === 'velaro-widget-height') && data.height) {
      // Find the iframe that sent this message
      iframes.forEach(iframe => {
        if (event.source === iframe.contentWindow) {
          iframe.style.height = `${data.height}px`;

          // First height message = widget is rendered — show iframe, remove skeleton
          if (iframe.style.opacity === '0') {
            iframe.style.opacity = '1';
            iframe.style.position = 'static';
            // Remove skeleton (first child before iframe)
            const container = iframe.parentNode;
            if (container) {
              Array.from(container.children).forEach(child => {
                if (child !== iframe) child.remove();
              });
              container.style.position = '';
            }
          }
        }
      });
    }

    // Handle scroll to widget (when popups appear)
    if (data.type === 'scroll-to-widget') {
      iframes.forEach(iframe => {
        if (event.source === iframe.contentWindow) {
          // Scroll to iframe with smooth animation and center it in viewport
          iframe.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      });
    }

    // Handle purchase redirect to thank you page
    if (data.type === 'purchase' && data.thankYouUrl) {
      window.location.href = data.thankYouUrl;
    }
  }

  /**
   * Parse container ID to extract org slug and landing page slug
   * Format: {org-slug}-widget-{lp-slug}
   * Example: velaro-widget-goldfoil → org: "velaro", slug: "goldfoil"
   * Example: my-shop-widget-cream → org: "my-shop", slug: "cream"
   */
  function parseContainerId(id) {
    const widgetIndex = id.indexOf('-widget-');
    if (widgetIndex === -1) return null;
    const orgSlug = id.substring(0, widgetIndex);
    const lpSlug = id.substring(widgetIndex + '-widget-'.length);
    if (!orgSlug || !lpSlug) return null;
    return { orgSlug, lpSlug };
  }

  /**
   * Initialize all widgets on page load
   */
  function init() {
    // Find all widget containers matching {org}-widget-{slug} pattern
    const containers = document.querySelectorAll('[id*="-widget-"]');
    const iframes = [];

    containers.forEach(container => {
      // Parse org slug and landing page slug from container ID
      const parsed = parseContainerId(container.id);

      if (!parsed) {
        console.error('Widget: Invalid container ID format. Expected: {org-slug}-widget-{landing-page-slug}');
        return;
      }

      // Initialize widget
      const iframe = initializeWidget(container, parsed.lpSlug, parsed.orgSlug);
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
    version: '2.0.0'
  };
})();
