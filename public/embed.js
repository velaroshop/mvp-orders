/**
 * Widget Embed Script
 *
 * Handles iframe initialization, tracking parameter propagation,
 * and Meta Pixel relay — pixel runs first-party on the parent page,
 * iframe sends pixel events via postMessage, embed.js calls fbq.
 *
 * Usage:
 * <script src="https://app.ecom-society.com/embed.js"></script>
 * <div id="{ORG_SLUG}-widget-{LANDING_PAGE_SLUG}"></div>
 *
 * Optional pixel override on the container div:
 * <div id="..." data-pixel-id="123456789" data-pixel-test-event-code="TEST12345"></div>
 */

(function() {
  'use strict';

  // Auto-detect domain from the script's own URL (works with any domain)
  var WIDGET_DOMAIN = (function() {
    try {
      var scriptSrc = document.currentScript && document.currentScript.src;
      if (scriptSrc) {
        var url = new URL(scriptSrc);
        return url.origin;
      }
    } catch (e) {}
    return 'https://mvp-orders.vercel.app';
  })();

  // ─── Pixel relay state ───────────────────────────────────────────────────────
  var pixelReady = false;
  var pixelEventQueue = [];   // Buffers pixel_event messages until fbq is initialized
  var pixelTestEventCode = null;
  var allIframes = [];        // All iframe elements managed by this embed (for tracking_update)

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  /**
   * Send _fbp and _fbc cookies to all iframes so the widget can include
   * them in the CAPI request body at form submission time.
   * Called after fbevents.js loads (cookies are first-party at that point).
   */
  function sendTrackingUpdate() {
    var fbp = getCookie('_fbp');
    var fbc = getCookie('_fbc');
    allIframes.forEach(function(iframe) {
      try {
        iframe.contentWindow.postMessage({
          type: 'tracking_update',
          fbp: fbp || undefined,
          fbc: fbc || undefined,
        }, WIDGET_DOMAIN);
      } catch (e) {}
    });
  }

  /**
   * Relay a single pixel event from the widget to fbq on the parent page.
   * Standard events use fbq('track', ...), custom events use fbq('trackCustom', ...).
   */
  var STANDARD_EVENTS = [
    'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'
  ];

  function relayPixelEvent(data) {
    if (!window.fbq) return;

    var event = data.event;
    var params = data.params || {};
    var eventID = data.eventID;

    var options = {};
    if (eventID) options.eventID = eventID;
    if (pixelTestEventCode) options.test_event_code = pixelTestEventCode;
    var hasOptions = Object.keys(options).length > 0;

    if (STANDARD_EVENTS.indexOf(event) !== -1) {
      if (hasOptions) {
        window.fbq('track', event, params, options);
      } else {
        window.fbq('track', event, params);
      }
    } else {
      // Custom events (FormSubmit, OfferSelected, etc.)
      if (hasOptions) {
        window.fbq('trackCustom', event, params, options);
      } else {
        window.fbq('trackCustom', event, params);
      }
    }
  }

  /**
   * Initialize Meta Pixel on the parent page.
   * Called when the widget sends a pixel_init postMessage.
   * After fbevents.js loads, flushes queued events and sends _fbp to iframes.
   */
  function initPixel(pixelId, testEventCode) {
    if (pixelReady || !pixelId) return;

    pixelTestEventCode = testEventCode || null;

    // Standard Meta Pixel base code (synchronous setup — fbq accepts queued calls immediately)
    var fbq = function() {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;

    // Initialize pixel and fire PageView (queued internally until script loads)
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');

    if (testEventCode) {
      console.log('[Embed] Meta Pixel test mode:', testEventCode);
    }

    // Mark pixel as ready — subsequent pixel_event messages relay immediately.
    // fbq() calls queue internally until fbevents.js loads, so this is safe.
    pixelReady = true;

    // Flush buffered events (events that arrived before pixel_init)
    pixelEventQueue.forEach(function(queued) { relayPixelEvent(queued); });
    pixelEventQueue = [];

    // Load fbevents.js async — after load, _fbp cookie is written first-party
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.onload = function() {
      // _fbp is now set first-party on this domain — send it to the widget
      sendTrackingUpdate();
    };
    document.head.appendChild(script);

    var noscript = document.createElement('noscript');
    var img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = 'https://www.facebook.com/tr?id=' + pixelId + '&ev=PageView&noscript=1';
    noscript.appendChild(img);
    document.body.appendChild(noscript);
  }

  // ─── Tracking parameters ──────────────────────────────────────────────────────

  /**
   * Extract URL tracking params and construct fbc from fbclid.
   * NOTE: _fbp is NOT read here — it's read after pixel init and sent via
   * tracking_update postMessage, so it's always first-party on this domain.
   */
  function getTrackingParams() {
    var params = new URLSearchParams(window.location.search);
    var tracking = {};

    // Facebook click ID
    var fbclid = params.get('fbclid');
    if (fbclid) {
      tracking.fbclid = fbclid;
      // Construct _fbc if cookie not yet written (race condition / ITP fallback)
      var fbcCookie = getCookie('_fbc');
      tracking.fbc = fbcCookie || ('fb.1.' + Date.now() + '.' + fbclid);
    }

    // UTM parameters
    var utmSource = params.get('utm_source');
    if (utmSource) tracking.utm_source = utmSource;
    var utmMedium = params.get('utm_medium');
    if (utmMedium) tracking.utm_medium = utmMedium;
    var utmCampaign = params.get('utm_campaign');
    if (utmCampaign) tracking.utm_campaign = utmCampaign;
    var utmTerm = params.get('utm_term');
    if (utmTerm) tracking.utm_term = utmTerm;
    var utmContent = params.get('utm_content');
    if (utmContent) tracking.utm_content = utmContent;

    // Google Ads
    var gclid = params.get('gclid');
    if (gclid) tracking.gclid = gclid;

    // TikTok
    var ttclid = params.get('ttclid');
    if (ttclid) tracking.ttclid = ttclid;

    // Full landing page URL (for event_source_url in CAPI)
    tracking.landing_url = window.location.href;

    return tracking;
  }

  // ─── Iframe management ────────────────────────────────────────────────────────

  function buildIframeSrc(slug, orgSlug, trackingParams) {
    var url = new URL(WIDGET_DOMAIN + '/widget');
    url.searchParams.set('slug', slug);
    if (orgSlug) url.searchParams.set('org', orgSlug);
    Object.keys(trackingParams).forEach(function(key) {
      if (trackingParams[key]) url.searchParams.set(key, trackingParams[key]);
    });
    return url.toString();
  }

  function createSkeleton() {
    var skeleton = document.createElement('div');
    skeleton.style.cssText = 'width:100%;font-family:sans-serif;box-sizing:border-box;padding:12px;background:#f4f4f5;border-radius:8px;';
    var style = document.createElement('style');
    style.textContent = '@keyframes velaro-pulse{0%,100%{opacity:1}50%{opacity:.4}}.velaro-bone{background:#d4d4d8;border-radius:6px;animation:velaro-pulse 1.5s ease-in-out infinite;}';
    skeleton.appendChild(style);
    skeleton.innerHTML += '\n      <div style="background:#27272a;border-radius:8px;padding:16px 12px 12px;margin-bottom:10px;text-align:center;">\n        <div class="velaro-bone" style="height:22px;width:110px;margin:0 auto 10px;"></div>\n        <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:8px;">\n          <div class="velaro-bone" style="height:20px;width:70px;"></div>\n          <div class="velaro-bone" style="height:28px;width:90px;"></div>\n        </div>\n        <div class="velaro-bone" style="height:12px;width:180px;margin:0 auto;"></div>\n      </div>\n      <div style="background:#fff;border-radius:8px;padding:16px;">\n        <div class="velaro-bone" style="height:18px;width:200px;margin:0 auto 16px;"></div>\n        ' + [1,2,3,4,5].map(function() { return '\n          <div style="margin-bottom:12px;">\n            <div class="velaro-bone" style="height:12px;width:100px;margin-bottom:6px;"></div>\n            <div class="velaro-bone" style="height:42px;width:100%;border-radius:8px;"></div>\n          </div>\n        '; }).join('') + '\n        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:16px 0;">\n          ' + [1,2,3].map(function() { return '<div class="velaro-bone" style="height:72px;border-radius:8px;"></div>'; }).join('') + '\n        </div>\n        <div class="velaro-bone" style="height:52px;width:60%;margin:0 auto;border-radius:8px;"></div>\n      </div>\n    ';
    return skeleton;
  }

  function initializeWidget(container, slug, orgSlug) {
    var tracking = getTrackingParams();
    var iframeSrc = buildIframeSrc(slug, orgSlug, tracking);

    var skeleton = createSkeleton();
    container.innerHTML = '';
    container.appendChild(skeleton);

    var iframe = document.createElement('iframe');
    iframe.id = container.id + '-iframe';
    iframe.src = iframeSrc;
    iframe.width = '100%';
    iframe.style.cssText = 'border:none;display:block;min-height:600px;opacity:0;position:absolute;top:0;left:0;width:100%;transition:opacity 0.3s ease;';
    iframe.scrolling = 'no';
    iframe.loading = 'eager';

    container.style.position = 'relative';
    container.appendChild(iframe);

    return iframe;
  }

  // ─── postMessage handler ──────────────────────────────────────────────────────

  function handlePostMessage(event, iframes) {
    // Security: only accept messages from the widget domain
    if (event.origin !== WIDGET_DOMAIN) return;

    var data = event.data;
    if (!data || typeof data !== 'object') return;

    // ── Pixel relay ──────────────────────────────────────────────────────────────
    if (data.type === 'pixel_init') {
      initPixel(data.pixelId, data.testEventCode);
      return;
    }

    if (data.type === 'pixel_event') {
      if (!pixelReady) {
        pixelEventQueue.push(data);
      } else {
        relayPixelEvent(data);
      }
      return;
    }

    // ── Layout / UX ──────────────────────────────────────────────────────────────
    if ((data.type === 'resize' || data.type === 'velaro-widget-height') && data.height) {
      iframes.forEach(function(iframe) {
        if (event.source === iframe.contentWindow) {
          iframe.style.height = data.height + 'px';
          if (iframe.style.opacity === '0') {
            iframe.style.opacity = '1';
            iframe.style.position = 'static';
            var container = iframe.parentNode;
            if (container) {
              Array.from(container.children).forEach(function(child) {
                if (child !== iframe) child.remove();
              });
              container.style.position = '';
            }
          }
        }
      });
      return;
    }

    if (data.type === 'scroll-to-widget') {
      iframes.forEach(function(iframe) {
        if (event.source === iframe.contentWindow) {
          iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }

    // ── Purchase redirect ────────────────────────────────────────────────────────
    if (data.type === 'purchase' && data.thankYouUrl) {
      window.location.href = data.thankYouUrl;
    }
  }

  // ─── Container parsing ────────────────────────────────────────────────────────

  function parseContainerId(id) {
    var widgetIndex = id.indexOf('-widget-');
    if (widgetIndex === -1) return null;
    var orgSlug = id.substring(0, widgetIndex);
    var lpSlug = id.substring(widgetIndex + '-widget-'.length);
    if (!orgSlug || !lpSlug) return null;
    return { orgSlug: orgSlug, lpSlug: lpSlug };
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    var containers = document.querySelectorAll('[id*="-widget-"]');
    var iframes = [];

    containers.forEach(function(container) {
      var parsed = parseContainerId(container.id);
      if (!parsed) {
        console.error('Widget: Invalid container ID format. Expected: {org-slug}-widget-{landing-page-slug}');
        return;
      }
      var iframe = initializeWidget(container, parsed.lpSlug, parsed.orgSlug);
      iframes.push(iframe);
    });

    // Keep module-level reference for sendTrackingUpdate
    allIframes = iframes;

    if (iframes.length > 0) {
      window.addEventListener('message', function(event) {
        handlePostMessage(event, iframes);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.VelaroWidget = {
    init: init,
    version: '2.1.0',
  };
})();
