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
   * Initialize iframe with tracking
   */
  function initializeWidget(container, slug, orgSlug) {
    const tracking = getTrackingParams();
    const iframeSrc = buildIframeSrc(slug, orgSlug, tracking);

    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.id = `${container.id}-iframe`;
    iframe.src = iframeSrc;
    iframe.width = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.style.minHeight = '600px';
    iframe.scrolling = 'no';
    iframe.loading = 'eager';

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

    // Handle height adjustment (support both 'resize' and 'velaro-widget-height' for backward compatibility)
    if ((data.type === 'resize' || data.type === 'velaro-widget-height') && data.height) {
      // Find the iframe that sent this message
      iframes.forEach(iframe => {
        if (event.source === iframe.contentWindow) {
          iframe.style.height = `${data.height}px`;
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
      // Send analytics with purchased outcome before redirecting
      if (analyticsEnabled) {
        analyticsFinalOutcome = 'purchased';
        sendAnalyticsSession('purchased');
      }
      window.location.href = data.thankYouUrl;
    }

    // Handle analytics activation from widget
    if (data.type === 'analytics-config' && data.enabled && data.landingPageId) {
      console.log('[Analytics] Received config from widget, LP:', data.landingPageId);
      if (!analyticsEnabled) {
        startAnalyticsTracking(data.landingPageId);
      }
    }

    // Handle analytics form data update from widget
    if (data.type === 'analytics-form-update' && analyticsEnabled && analyticsSessionId) {
      // Track if purchase happened to prevent beforeunload overwrite
      if (data.formData && data.formData.outcome === 'purchased') {
        analyticsFinalOutcome = 'purchased';
      }
      const formData = {
        sessionId: analyticsSessionId,
        landingPageId: analyticsLandingPageId,
        ...data.formData,
      };
      // Send update via sendBeacon (text/plain to avoid CORS preflight)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          WIDGET_DOMAIN + '/api/analytics/sessions',
          new Blob([JSON.stringify(formData)], { type: 'text/plain' })
        );
      }
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

  // ==========================================
  // Analytics Tracking (activated via postMessage from widget)
  // ==========================================
  let analyticsEnabled = false;
  let analyticsSessionId = null;
  let analyticsLandingPageId = null;
  let analyticsStartTime = Date.now();
  let analyticsMaxScroll = 0;
  let analyticsClicks = 0;
  let analyticsScrolledToForm = false;
  let analyticsFinalOutcome = null;

  function generateSessionId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  function startAnalyticsTracking(landingPageId) {
    analyticsEnabled = true;
    analyticsLandingPageId = landingPageId;
    analyticsSessionId = generateSessionId();
    analyticsStartTime = Date.now();

    // Track scroll
    window.addEventListener('scroll', function() {
      if (!analyticsEnabled) return;
      const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > analyticsMaxScroll) analyticsMaxScroll = scrollPercent;

      // Check if scrolled to form (iframe visible in viewport)
      const iframes = document.querySelectorAll('[id*="-widget-"] iframe');
      iframes.forEach(function(iframe) {
        const rect = iframe.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          analyticsScrolledToForm = true;
        }
      });
    }, { passive: true });

    // Track clicks
    document.addEventListener('click', function() {
      if (analyticsEnabled) analyticsClicks++;
    });

    // Send session data on page unload (don't overwrite purchased)
    window.addEventListener('beforeunload', function() {
      if (analyticsFinalOutcome !== 'purchased') {
        sendAnalyticsSession('abandoned');
      }
    });

    // Also send via visibilitychange for mobile (don't overwrite purchased)
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden' && analyticsEnabled && analyticsFinalOutcome !== 'purchased') {
        sendAnalyticsSession('abandoned');
      }
    });

    // Pass session ID to widget iframe
    const iframes = document.querySelectorAll('[id*="-widget-"] iframe');
    iframes.forEach(function(iframe) {
      iframe.contentWindow.postMessage({
        type: 'analytics-session',
        sessionId: analyticsSessionId,
        landingPageId: analyticsLandingPageId,
      }, '*');
    });

    // Initial save after 5 seconds (confirms tracking works)
    setTimeout(function() {
      if (analyticsEnabled) sendAnalyticsSession('browsing');
    }, 5000);

    // Periodic save every 30 seconds (safety net)
    setInterval(function() {
      if (analyticsEnabled) sendAnalyticsSession('browsing');
    }, 30000);

    console.log('[Analytics] Tracking started for LP:', landingPageId, 'Session:', analyticsSessionId);
  }

  function sendAnalyticsSession(outcome) {
    if (!analyticsEnabled || !analyticsSessionId) return;

    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other';

    const data = {
      sessionId: analyticsSessionId,
      landingPageId: analyticsLandingPageId,
      device: isMobile ? 'mobile' : 'desktop',
      browser: browser,
      screen_size: window.innerWidth + 'x' + window.innerHeight,
      referrer: document.referrer || null,
      time_on_page: Math.round((Date.now() - analyticsStartTime) / 1000),
      scroll_max: analyticsMaxScroll,
      scroll_to_form: analyticsScrolledToForm,
      clicks_on_page: analyticsClicks,
      outcome: outcome || 'abandoned',
    };

    // Use sendBeacon with text/plain to avoid CORS preflight
    console.log('[Analytics] Sending session:', outcome, data);
    const sent = navigator.sendBeacon && navigator.sendBeacon(
      WIDGET_DOMAIN + '/api/analytics/sessions',
      new Blob([JSON.stringify(data)], { type: 'text/plain' })
    );
    console.log('[Analytics] sendBeacon result:', sent);
    if (!sent) {
      fetch(WIDGET_DOMAIN + '/api/analytics/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
        keepalive: true,
        mode: 'no-cors',
      }).catch(function() {});
    }
  }

  // Make sendAnalyticsSession accessible for widget postMessage updates
  window.__analyticsSession = {
    getSessionId: function() { return analyticsSessionId; },
    sendSession: sendAnalyticsSession,
    updateOutcome: function(outcome) {
      sendAnalyticsSession(outcome);
    }
  };

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
